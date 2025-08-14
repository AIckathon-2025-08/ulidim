-- Database initialization script
-- This file is automatically executed when the database container starts

-- Create the database if it doesn't exist
CREATE DATABASE two_truths_db;

-- Connect to the database
\c two_truths_db;

-- Create tables (these will be created by the application migration as well)
-- This is just a backup in case the application doesn't run migrations

-- Games table
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
);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(255) REFERENCES games(id) ON DELETE CASCADE,
    user_session VARCHAR(255) NOT NULL,
    voted_statement INTEGER NOT NULL CHECK (voted_statement >= 0 AND voted_statement <= 2),
    user_ip VARCHAR(45),
    user_agent TEXT,
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, user_session)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_votes_game_id ON votes(game_id);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);
CREATE INDEX IF NOT EXISTS idx_votes_voted_at ON votes(voted_at);
CREATE INDEX IF NOT EXISTS idx_games_lie_revealed ON games(lie_revealed);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for games table
DROP TRIGGER IF EXISTS update_games_updated_at ON games;
CREATE TRIGGER update_games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing (optional)
-- INSERT INTO games (id, teammate_name, teammate_picture, statement_1, statement_2, statement_3, lie_index, timer_duration)
-- VALUES ('sample-game-id', 'John Doe', 'data:image/jpeg;base64,...', 'I have visited 15 countries', 'I can speak 3 languages', 'I once met a celebrity', 1, 120);

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
