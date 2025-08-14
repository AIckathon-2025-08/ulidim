import pool from '../database/connection.js';

export const setupWebSocket = (io) => {
  // Track connected users per game
  const gameRooms = new Map();

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    // Join a game room
    socket.on('joinGame', async (data) => {
      try {
        const { gameId, userSession, isAdmin = false } = data;

        if (!gameId) {
          socket.emit('error', { message: 'Game ID is required' });
          return;
        }

        // Check if game exists
        const gameResult = await pool.query('SELECT id FROM games WHERE id = $1', [gameId]);
        if (gameResult.rows.length === 0) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        // Join the game room
        socket.join(`game-${gameId}`);
        socket.gameId = gameId;
        socket.userSession = userSession;
        socket.isAdmin = isAdmin;

        // Track users in game
        if (!gameRooms.has(gameId)) {
          gameRooms.set(gameId, new Set());
        }
        gameRooms.get(gameId).add({
          socketId: socket.id,
          userSession,
          isAdmin,
          joinedAt: new Date()
        });

        console.log(`👥 User ${userSession} joined game ${gameId} (Admin: ${isAdmin})`);

        // Send current game state to the newly joined user
        await sendGameUpdate(socket, gameId);

        // Notify other users in the room about new participant
        socket.to(`game-${gameId}`).emit('userJoined', {
          userSession,
          isAdmin,
          timestamp: new Date()
        });

        // Send updated participant count
        const participantCount = gameRooms.get(gameId).size;
        io.to(`game-${gameId}`).emit('participantCountUpdate', {
          count: participantCount
        });

      } catch (error) {
        console.error('Error joining game:', error);
        socket.emit('error', { message: 'Failed to join game' });
      }
    });

    // Request real-time updates for votes
    socket.on('requestVoteUpdate', async (data) => {
      try {
        const { gameId } = data;

        if (socket.gameId !== gameId) {
          socket.emit('error', { message: 'Not authorized for this game' });
          return;
        }

        await sendVoteUpdate(socket, gameId);
      } catch (error) {
        console.error('Error requesting vote update:', error);
        socket.emit('error', { message: 'Failed to get vote update' });
      }
    });

    // Admin reveals the lie
    socket.on('revealLie', async (data) => {
      try {
        const { gameId } = data;

        if (!socket.isAdmin || socket.gameId !== gameId) {
          socket.emit('error', { message: 'Not authorized to reveal lie' });
          return;
        }

        // Update database to mark lie as revealed
        const result = await pool.query(
          'UPDATE games SET lie_revealed = true WHERE id = $1 AND lie_revealed = false RETURNING lie_index',
          [gameId]
        );

        if (result.rows.length === 0) {
          socket.emit('error', { message: 'Game not found or lie already revealed' });
          return;
        }

        const lieIndex = result.rows[0].lie_index;

        // Notify all clients in the game room
        io.to(`game-${gameId}`).emit('lieRevealed', {
          gameId,
          lieIndex,
          revealedBy: 'admin',
          timestamp: new Date()
        });

        console.log(`🎯 Admin revealed lie for game ${gameId}: statement ${lieIndex}`);

      } catch (error) {
        console.error('Error revealing lie:', error);
        socket.emit('error', { message: 'Failed to reveal lie' });
      }
    });

    // Handle timer updates
    socket.on('timerUpdate', (data) => {
      try {
        const { gameId, timeRemaining } = data;

        if (!socket.isAdmin || socket.gameId !== gameId) {
          return;
        }

        // Broadcast timer update to all participants
        socket.to(`game-${gameId}`).emit('timerUpdate', {
          timeRemaining,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Error updating timer:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.id}`);

      if (socket.gameId && gameRooms.has(socket.gameId)) {
        const gameUsers = gameRooms.get(socket.gameId);

        // Remove user from game room tracking
        const userToRemove = Array.from(gameUsers).find(user => user.socketId === socket.id);
        if (userToRemove) {
          gameUsers.delete(userToRemove);

          // Notify remaining users
          socket.to(`game-${socket.gameId}`).emit('userLeft', {
            userSession: socket.userSession,
            isAdmin: socket.isAdmin,
            timestamp: new Date()
          });

          // Send updated participant count
          const participantCount = gameUsers.size;
          io.to(`game-${socket.gameId}`).emit('participantCountUpdate', {
            count: participantCount
          });

          // Clean up empty game rooms
          if (gameUsers.size === 0) {
            gameRooms.delete(socket.gameId);
            console.log(`🧹 Cleaned up empty game room: ${socket.gameId}`);
          }
        }
      }
    });

    // Ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
    });

  });

  // Helper function to send complete game state
  const sendGameUpdate = async (socket, gameId) => {
    try {
      const gameQuery = 'SELECT * FROM games WHERE id = $1';
      const gameResult = await pool.query(gameQuery, [gameId]);

      if (gameResult.rows.length === 0) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const game = gameResult.rows[0];

      // Get current vote counts
      const voteQuery = `
        SELECT voted_statement, COUNT(*) as count
        FROM votes
        WHERE game_id = $1
        GROUP BY voted_statement
        ORDER BY voted_statement
      `;
      const voteResult = await pool.query(voteQuery, [gameId]);

      const votes = [0, 0, 0];
      voteResult.rows.forEach(row => {
        votes[row.voted_statement] = parseInt(row.count);
      });

      socket.emit('gameUpdate', {
        gameId: game.id,
        teammate_name: game.teammate_name,
        teammate_picture: game.teammate_picture,
        statements: [game.statement_1, game.statement_2, game.statement_3],
        lie_index: game.lie_revealed ? game.lie_index : null,
        timer_duration: game.timer_duration,
        timer_start_time: game.timer_start_time,
        lie_revealed: game.lie_revealed,
        votes,
        totalVotes: votes.reduce((a, b) => a + b, 0),
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error sending game update:', error);
      socket.emit('error', { message: 'Failed to get game update' });
    }
  };

  // Helper function to send vote updates
  const sendVoteUpdate = async (socket, gameId) => {
    try {
      const voteQuery = `
        SELECT voted_statement, COUNT(*) as count
        FROM votes
        WHERE game_id = $1
        GROUP BY voted_statement
        ORDER BY voted_statement
      `;
      const result = await pool.query(voteQuery, [gameId]);

      const votes = [0, 0, 0];
      result.rows.forEach(row => {
        votes[row.voted_statement] = parseInt(row.count);
      });

      socket.emit('voteUpdate', {
        gameId,
        votes,
        totalVotes: votes.reduce((a, b) => a + b, 0),
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error sending vote update:', error);
      socket.emit('error', { message: 'Failed to get vote update' });
    }
  };

  // Periodic cleanup of inactive games (every 30 minutes)
  setInterval(async () => {
    try {
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const result = await pool.query(
        'DELETE FROM games WHERE created_at < $1 AND lie_revealed = true',
        [cutoffTime]
      );

      if (result.rowCount > 0) {
        console.log(`🧹 Cleaned up ${result.rowCount} old games`);
      }
    } catch (error) {
      console.error('Error cleaning up old games:', error);
    }
  }, 30 * 60 * 1000); // 30 minutes

  console.log('🔌 WebSocket handlers setup complete');
};
