import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../database/connection.js';
import { authenticateAdmin } from '../middleware/auth.js';

export function createGameRoutes(io) {
  const router = express.Router();

// Create a new game (Protected route - requires authentication)
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const {
      teammate_name,
      teammate_picture,
      statement_1,
      statement_2,
      statement_3,
      lie_index,
      timer_duration,
      background_music,
      creator_session
    } = req.body;

    // Validate required fields
    if (!teammate_name || !statement_1 || !statement_2 || !statement_3 || lie_index === undefined || !creator_session) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['teammate_name', 'statement_1', 'statement_2', 'statement_3', 'lie_index', 'creator_session']
      });
    }

    // Validate lie_index
    if (lie_index < 0 || lie_index > 2) {
      return res.status(400).json({
        error: 'lie_index must be between 0 and 2'
      });
    }

    const gameId = uuidv4();

    const query = `
      INSERT INTO games (
        id, creator_session, teammate_name, teammate_picture, statement_1, statement_2, statement_3,
        lie_index, timer_duration, background_music, game_started
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      RETURNING *
    `;

    const values = [
      gameId,
      creator_session,
      teammate_name,
      teammate_picture,
      statement_1,
      statement_2,
      statement_3,
      lie_index,
      timer_duration,
      background_music
    ];

    const result = await pool.query(query, values);
    const game = result.rows[0];

    // Start timer if specified
    if (timer_duration) {
      const timerStartTime = Date.now();
      await pool.query(
        'UPDATE games SET timer_start_time = $1 WHERE id = $2',
        [timerStartTime, gameId]
      );

      // Set automatic lie reveal when timer expires
      setTimeout(async () => {
        try {
          await pool.query(
            'UPDATE games SET lie_revealed = true WHERE id = $1 AND lie_revealed = false',
            [gameId]
          );

          // Notify all clients about lie reveal
          io?.to(`game-${gameId}`).emit('lieRevealed', {
            gameId,
            lieIndex: lie_index,
            revealedBy: 'timer'
          });
        } catch (error) {
          console.error('Error auto-revealing lie:', error);
        }
      }, timer_duration * 1000);
    }

    res.status(201).json({
      success: true,
      game: {
        id: game.id,
        teammate_name: game.teammate_name,
        teammate_picture: game.teammate_picture,
        statements: [game.statement_1, game.statement_2, game.statement_3],
        timer_duration: game.timer_duration,
        timer_start_time: game.timer_start_time,
        background_music: game.background_music,
        created_at: game.created_at
      }
    });

  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Get game by ID
router.get('/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;

    const gameQuery = 'SELECT * FROM games WHERE id = $1';
    const gameResult = await pool.query(gameQuery, [gameId]);

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = gameResult.rows[0];

    // Get vote counts
    const voteQuery = `
      SELECT voted_statement, COUNT(*) as count
      FROM votes
      WHERE game_id = $1
      GROUP BY voted_statement
      ORDER BY voted_statement
    `;
    const voteResult = await pool.query(voteQuery, [gameId]);

    // Initialize vote counts array [0, 0, 0]
    const votes = [0, 0, 0];
    voteResult.rows.forEach(row => {
      votes[row.voted_statement] = parseInt(row.count);
    });

    res.json({
      success: true,
      game: {
        id: game.id,
        teammate_name: game.teammate_name,
        teammate_picture: game.teammate_picture,
        statements: [game.statement_1, game.statement_2, game.statement_3],
        lie_index: game.lie_revealed ? game.lie_index : null,
        timer_duration: game.timer_duration,
        timer_start_time: game.timer_start_time,
        background_music: game.background_music,
        lie_revealed: game.lie_revealed,
        game_started: game.game_started,
        votes,
        created_at: game.created_at
      }
    });

  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// Reveal the lie (admin action)
router.put('/:gameId/reveal-lie', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { creator_session } = req.body;

    // Verify creator session is provided
    if (!creator_session) {
      return res.status(400).json({ error: 'Creator session required' });
    }

    // Verify that this user is actually the creator of the game
    const creatorCheck = await pool.query(
      'SELECT creator_session FROM games WHERE id = $1',
      [gameId]
    );

    if (creatorCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (creatorCheck.rows[0].creator_session !== creator_session) {
      return res.status(403).json({ error: 'Only the game creator can reveal the lie' });
    }

    const result = await pool.query(
      'UPDATE games SET lie_revealed = true WHERE id = $1 AND lie_revealed = false RETURNING lie_index',
      [gameId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found or lie already revealed' });
    }

    const lieIndex = result.rows[0].lie_index;

    // Notify all clients about lie reveal
    io?.to(`game-${gameId}`).emit('lieRevealed', {
      gameId,
      lieIndex,
      revealedBy: 'admin'
    });

    res.json({
      success: true,
      message: 'Lie revealed successfully',
      lieIndex
    });

  } catch (error) {
    console.error('Error revealing lie:', error);
    res.status(500).json({ error: 'Failed to reveal lie' });
  }
});

// Get game statistics
router.get('/:gameId/stats', async (req, res) => {
  try {
    const { gameId } = req.params;

    // Check if game exists
    const gameExists = await pool.query('SELECT id FROM games WHERE id = $1', [gameId]);
    if (gameExists.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Get detailed vote statistics
    const statsQuery = `
      SELECT
        voted_statement,
        COUNT(*) as vote_count,
        ARRAY_AGG(voted_at ORDER BY voted_at) as vote_times
      FROM votes
      WHERE game_id = $1
      GROUP BY voted_statement
      ORDER BY voted_statement
    `;

    const statsResult = await pool.query(statsQuery, [gameId]);

    const totalVotesQuery = 'SELECT COUNT(*) as total FROM votes WHERE game_id = $1';
    const totalResult = await pool.query(totalVotesQuery, [gameId]);
    const totalVotes = parseInt(totalResult.rows[0].total);

    const stats = {
      totalVotes,
      breakdown: [
        { statement: 0, votes: 0, percentage: 0, voteTimes: [] },
        { statement: 1, votes: 0, percentage: 0, voteTimes: [] },
        { statement: 2, votes: 0, percentage: 0, voteTimes: [] }
      ]
    };

    statsResult.rows.forEach(row => {
      const votes = parseInt(row.vote_count);
      const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

      stats.breakdown[row.voted_statement] = {
        statement: row.voted_statement,
        votes,
        percentage,
        voteTimes: row.vote_times
      };
    });

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error fetching game stats:', error);
    res.status(500).json({ error: 'Failed to fetch game statistics' });
  }
});

  return router;
}
