import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Database connection configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'two_truths_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Database schema initialization
const initSchema = async () => {
  const client = await pool.connect();

  try {
    // Create games table
    await client.query(`
      CREATE TABLE IF NOT EXISTS games (
        id VARCHAR(255) PRIMARY KEY,
        teammate_name VARCHAR(255) NOT NULL,
        teammate_picture TEXT,
        statement_1 TEXT NOT NULL,
        statement_2 TEXT NOT NULL,
        statement_3 TEXT NOT NULL,
        lie_index INTEGER NOT NULL CHECK (lie_index >= 0 AND lie_index <= 2),
        timer_duration INTEGER,
        timer_start_time BIGINT,
        background_music TEXT,
        lie_revealed BOOLEAN DEFAULT FALSE,
        game_started BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create votes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS votes (
        id SERIAL PRIMARY KEY,
        game_id VARCHAR(255) REFERENCES games(id) ON DELETE CASCADE,
        user_session VARCHAR(255) NOT NULL,
        voted_statement INTEGER NOT NULL CHECK (voted_statement >= 0 AND voted_statement <= 2),
        user_ip VARCHAR(45),
        user_agent TEXT,
        voted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(game_id, user_session)
      )
    `);

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_votes_game_id ON votes(game_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);
    `);

    // Migration: Add creator_session column to existing games table
    try {
      await client.query(`
        ALTER TABLE games ADD COLUMN IF NOT EXISTS creator_session VARCHAR(255);
      `);

      // Update existing games without creator_session (set to a default value)
      await client.query(`
        UPDATE games SET creator_session = 'legacy_admin' WHERE creator_session IS NULL;
      `);

      // Make creator_session NOT NULL after migration
      await client.query(`
        ALTER TABLE games ALTER COLUMN creator_session SET NOT NULL;
      `);

      // Create index for creator_session AFTER ensuring the column exists
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_games_creator_session ON games(creator_session);
      `);

      console.log('✅ Database migration completed: added creator_session field');
    } catch (migrationError) {
      console.log('ℹ️ Migration already applied or column exists:', migrationError.message);
    }

    // Create updated_at trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create trigger for games table
    await client.query(`
      DROP TRIGGER IF EXISTS update_games_updated_at ON games;
      CREATE TRIGGER update_games_updated_at
        BEFORE UPDATE ON games
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ Database schema initialized successfully');

  } catch (error) {
    console.error('❌ Error initializing database schema:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection test successful:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    throw error;
  }
};

// Initialize database
export const initializeDatabase = async () => {
  await testConnection();
  await initSchema();
};

// Export pool for queries
export default pool;
