import express from 'express';
import pool from '../database/connection.js';

export function createVoteRoutes(io) {
  const router = express.Router();

// Submit a vote
router.post('/', async (req, res) => {
  try {
    const { game_id, voted_statement, user_session } = req.body;
    const user_ip = req.ip || req.connection.remoteAddress;
    const user_agent = req.get('User-Agent');

    // Validate required fields
    if (!game_id || voted_statement === undefined || !user_session) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['game_id', 'voted_statement', 'user_session']
      });
    }

    // Validate voted_statement
    if (voted_statement < 0 || voted_statement > 2) {
      return res.status(400).json({
        error: 'voted_statement must be between 0 and 2'
      });
    }

    // Check if game exists
    const gameExists = await pool.query('SELECT id FROM games WHERE id = $1', [game_id]);
    if (gameExists.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Check if user has already voted
    const existingVote = await pool.query(
      'SELECT id FROM votes WHERE game_id = $1 AND user_session = $2',
      [game_id, user_session]
    );

    if (existingVote.rows.length > 0) {
      return res.status(409).json({
        error: 'User has already voted for this game'
      });
    }

    // Insert the vote
    const insertQuery = `
      INSERT INTO votes (game_id, user_session, voted_statement, user_ip, user_agent)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      game_id,
      user_session,
      voted_statement,
      user_ip,
      user_agent
    ]);

    const vote = result.rows[0];

    // Get updated vote counts
    const voteCountQuery = `
      SELECT voted_statement, COUNT(*) as count
      FROM votes
      WHERE game_id = $1
      GROUP BY voted_statement
      ORDER BY voted_statement
    `;
    const voteCountResult = await pool.query(voteCountQuery, [game_id]);

    // Initialize vote counts array [0, 0, 0]
    const votes = [0, 0, 0];
    voteCountResult.rows.forEach(row => {
      votes[row.voted_statement] = parseInt(row.count);
    });

    // Broadcast updated vote counts to all clients in the game room
    const voteUpdateData = {
      gameId: game_id,
      votes,
      totalVotes: votes.reduce((a, b) => a + b, 0),
      timestamp: new Date()
    };

    console.log(`📡 Broadcasting vote update to game-${game_id}:`, voteUpdateData);
    io?.to(`game-${game_id}`).emit('voteUpdate', voteUpdateData);

    res.status(201).json({
      success: true,
      vote: {
        id: vote.id,
        game_id: vote.game_id,
        voted_statement: vote.voted_statement,
        voted_at: vote.voted_at
      },
      currentVotes: votes
    });

  } catch (error) {
    console.error('Error submitting vote:', error);

    // Handle duplicate vote error specifically
    if (error.code === '23505') { // PostgreSQL unique violation
      return res.status(409).json({
        error: 'User has already voted for this game'
      });
    }

    res.status(500).json({ error: 'Failed to submit vote' });
  }
});

// Get votes for a specific game
router.get('/game/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;

    // Check if game exists
    const gameExists = await pool.query('SELECT id FROM games WHERE id = $1', [gameId]);
    if (gameExists.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Get vote counts
    const voteQuery = `
      SELECT voted_statement, COUNT(*) as count
      FROM votes
      WHERE game_id = $1
      GROUP BY voted_statement
      ORDER BY voted_statement
    `;
    const result = await pool.query(voteQuery, [gameId]);

    // Initialize vote counts array [0, 0, 0]
    const votes = [0, 0, 0];
    result.rows.forEach(row => {
      votes[row.voted_statement] = parseInt(row.count);
    });

    const totalVotes = votes.reduce((a, b) => a + b, 0);

    res.json({
      success: true,
      votes,
      totalVotes,
      breakdown: votes.map((count, index) => ({
        statement: index,
        votes: count,
        percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
      }))
    });

  } catch (error) {
    console.error('Error fetching votes:', error);
    res.status(500).json({ error: 'Failed to fetch votes' });
  }
});

// Check if user has voted
router.get('/check/:gameId/:userSession', async (req, res) => {
  try {
    const { gameId, userSession } = req.params;

    const result = await pool.query(
      'SELECT voted_statement FROM votes WHERE game_id = $1 AND user_session = $2',
      [gameId, userSession]
    );

    if (result.rows.length > 0) {
      res.json({
        success: true,
        hasVoted: true,
        votedStatement: result.rows[0].voted_statement
      });
    } else {
      res.json({
        success: true,
        hasVoted: false
      });
    }

  } catch (error) {
    console.error('Error checking vote status:', error);
    res.status(500).json({ error: 'Failed to check vote status' });
  }
});

// Get all votes for a game (admin only - with more details)
router.get('/admin/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;

    // Check if game exists
    const gameExists = await pool.query('SELECT id FROM games WHERE id = $1', [gameId]);
    if (gameExists.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const voteQuery = `
      SELECT
        id,
        user_session,
        voted_statement,
        user_ip,
        voted_at
      FROM votes
      WHERE game_id = $1
      ORDER BY voted_at ASC
    `;

    const result = await pool.query(voteQuery, [gameId]);

    res.json({
      success: true,
      votes: result.rows,
      totalVotes: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching admin votes:', error);
    res.status(500).json({ error: 'Failed to fetch vote details' });
  }
});

  return router;
}
