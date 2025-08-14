Link to the demo video: https://drive.google.com/file/d/1VCYe3CKY03eXvpTVRl5WegnMoka0P6G6/view?usp=sharing

![Two Truths and a Lie Game Demo](Screen%20Recording%202025-08-14%20at%2017.35.12.gif)


# Two Truths and a Lie Game

A modern, full-stack interactive web application for playing "Two Truths and a Lie" with teams. Built with Vite, vanilla JavaScript, Phaser 3 for animations, Express.js backend, PostgreSQL database, and real-time WebSocket communication.

![TestIO Squirrel](assets/images/TestIO_squirel.png)

## Features

### 🎮 **Three-Page Experience**
1. **Admin Setup Page** - Configure games with teammate info and statements
2. **Voting Page** - Let participants guess which statement is the lie
3. **Results Page** - Display real-time voting results with animations

### ✨ **Key Functionality**
- **File Uploads**: Profile pictures (images) and background music (MP3)
- **Timer System**: Optional synchronized voting timers (30s, 1min, 2min, 5min)
- **Real-time Updates**: Live voting results using WebSocket communication
- **Persistent Storage**: PostgreSQL database for game data and votes
- **Animations**: Fireworks for correct votes, thumbs-down rain for incorrect votes
- **Responsive Design**: Modern, mobile-friendly interface
- **Default Music**: Elevator music plays if no custom music is uploaded
- **Multi-user Support**: Multiple participants can join and vote simultaneously

### 🎨 **Modern Design**
- Mentimeter-inspired UI with glassmorphism effects
- Gradient backgrounds and smooth animations
- Interactive vote buttons with hover effects
- Real-time progress bars for voting results
- Live participant count updates

## How to Play

### As an Admin (Game Creator):
1. **Set Up Game**:
   - Enter teammate name
   - Upload a profile picture
   - Write three statements (two truths, one lie)
   - Select which statement is the lie
   - Optionally set a voting timer
   - Optionally upload background music

2. **Start Game**:
   - Click "Start Game"
   - Share the generated link with participants
   - Click "Show the Lie" when ready to reveal the answer

### As a Participant:
1. **Join Game**:
   - Click the shared link
   - View the teammate's profile and statements

2. **Vote**:
   - Select which statement you think is the lie
   - Submit your vote
   - View results with animations

## Installation & Setup

### Prerequisites
- Node.js (version 20.15.1 or higher)
- npm or yarn
- Docker and Docker Compose (recommended for easy setup)
- PostgreSQL (if running without Docker)

### Quick Start with Docker (Recommended)
```bash
# Clone or download the project
cd ulidim

# Start all services (database, backend, frontend)
npm run docker:up

# The application will be available at:
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# Database: localhost:5432
```

### Manual Development Setup
```bash
# 1. Start the database
npm run docker:up database

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
cd server
npm install
cd ..

# 4. Start backend server
npm run backend:dev

# 5. In a new terminal, start frontend
npm run dev
```

### Available Scripts
- `npm run docker:up` - Start all services with Docker
- `npm run docker:down` - Stop all Docker services
- `npm run docker:logs` - View Docker logs
- `npm run dev` - Start frontend development server
- `npm run backend:dev` - Start backend development server
- `npm run fullstack:dev` - Start database + frontend (hybrid approach)

## Technical Stack

### Frontend
- **Framework**: Vite for build tooling and development server
- **Language**: Vanilla JavaScript (ES6+ modules)
- **UI**: HTML5, CSS3 with glassmorphism effects
- **Animations**: Phaser 3 game engine for particle effects
- **Real-time**: Socket.IO client for WebSocket communication

### Backend
- **Runtime**: Node.js with Express.js framework
- **Database**: PostgreSQL with connection pooling
- **Real-time**: Socket.IO for WebSocket communication
- **Security**: Helmet, CORS, rate limiting
- **Session Management**: User session tracking
- **API**: RESTful endpoints with WebSocket events

### Infrastructure
- **Containerization**: Docker and Docker Compose
- **Database**: PostgreSQL 15 with automatic migrations
- **Caching**: Redis (optional, for production scaling)
- **Development**: Hot reload for both frontend and backend

## Project Structure

```
ulidim/
├── index.html                          # Main HTML entry point
├── style.css                           # Frontend styles
├── vite.config.js                      # Vite configuration
├── package.json                        # Frontend dependencies and scripts
├── docker-compose.yml                  # Multi-service Docker setup
├── Dockerfile.frontend                 # Frontend container config
│
├── src/                                # Frontend source code
│   ├── main.js                        # Main application logic
│   ├── api.js                         # API service and WebSocket client
│   └── phaser-config.js               # Phaser 3 configuration
│
├── server/                             # Backend server
│   ├── server.js                      # Main server entry point
│   ├── package.json                   # Backend dependencies
│   ├── Dockerfile                     # Backend container config
│   ├── env.example                    # Environment variables template
│   ├── healthcheck.js                 # Docker health check
│   │
│   ├── database/                      # Database setup
│   │   ├── connection.js              # PostgreSQL connection
│   │   └── init.sql                   # Database initialization
│   │
│   ├── routes/                        # API routes
│   │   ├── games.js                   # Game management endpoints
│   │   └── votes.js                   # Voting endpoints
│   │
│   └── websocket/                     # Real-time communication
│       └── handlers.js                # WebSocket event handlers
│
└── assets/                             # Static assets
    ├── images/                         # Images and icons
    │   ├── TestIO_squirel.png         # Background images
    │   ├── favicon.svg                # Site icon
    │   └── ...                        # Other images
    └── audio/                          # Audio files
        └── elevator_music.mp3         # Default background music
```

## Game Flow

1. **Admin Setup**: Admin creates game with teammate info and statements
2. **Database Storage**: Game data is stored in PostgreSQL database
3. **Link Generation**: System generates unique shareable link with game ID
4. **WebSocket Connection**: Participants establish real-time connection
5. **Participant Voting**: Participants access voting page via link
6. **Real-time Updates**: Votes are stored in database and broadcast via WebSocket
7. **Live Participant Count**: Real-time tracking of active participants
8. **Timer Synchronization**: Optional countdown timer synchronized across all clients
9. **Lie Revelation**: Admin can reveal the correct answer, triggering animations
10. **Persistent Results**: All game data and votes are persistently stored

## Browser Compatibility

- Modern browsers supporting ES6+ features
- Chrome 70+, Firefox 65+, Safari 12+, Edge 79+
- Mobile browsers supported with responsive design

## API Endpoints

### Game Management
- `POST /api/games` - Create a new game
- `GET /api/games/:id` - Get game details
- `PUT /api/games/:id/reveal-lie` - Reveal the lie (admin only)
- `GET /api/games/:id/stats` - Get game statistics

### Voting
- `POST /api/votes` - Submit a vote
- `GET /api/votes/game/:id` - Get all votes for a game
- `GET /api/votes/check/:gameId/:session` - Check if user has voted

### WebSocket Events
- `joinGame` - Join a game room
- `voteUpdate` - Real-time vote updates
- `lieRevealed` - Lie revelation broadcast
- `participantCountUpdate` - Live participant count
- `timerUpdate` - Timer synchronization

## Development

### Environment Variables
Create a `.env` file in the `server/` directory:
```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=two_truths_db
DB_USER=postgres
DB_PASSWORD=password
SESSION_SECRET=your-secret-key
```

### Key Features Implemented
- ✅ Full-stack architecture with real-time communication
- ✅ PostgreSQL database with persistent storage
- ✅ File upload handling (images and audio)
- ✅ WebSocket-based real-time voting system
- ✅ Timer synchronization across all clients
- ✅ Phaser 3 particle animations
- ✅ Responsive design with modern UI
- ✅ Game state management with database persistence
- ✅ URL-based game sharing with unique IDs
- ✅ Docker containerization for easy deployment
- ✅ Live participant tracking
- ✅ Rate limiting and security measures

## Production Deployment

### Using Docker Compose
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Environment Configuration
1. Copy `server/env.example` to `server/.env`
2. Update production values:
   - Set strong `SESSION_SECRET`
   - Configure database credentials
   - Set proper `FRONTEND_URL`

### Database Migration
The database will automatically initialize when the PostgreSQL container starts. For manual migration:
```bash
# Connect to the database container
docker exec -it two_truths_db psql -U postgres -d two_truths_db

# Run custom SQL commands if needed
```

## Customization

### Adding Custom Animations
Modify the Phaser 3 animations in `src/phaser-config.js` and related methods in `src/main.js`.

### API Extensions
Add new endpoints in `server/routes/` and corresponding WebSocket events in `server/websocket/handlers.js`.

### Database Schema
Modify `server/database/init.sql` to add new tables or columns as needed.

### Styling Changes
Update `style.css` to modify the visual appearance. The design uses CSS custom properties for easy theming.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│    Backend      │────▶│   PostgreSQL    │
│   (Vite +       │     │   (Express +    │     │   Database      │
│   Vanilla JS)   │     │   Socket.IO)    │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                        │                        │
         │ WebSocket              │ WebSocket              │
         │ Communication          │ Events                 │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Real-time UI   │     │  Event Handler  │     │  Data Storage   │
│  Updates        │     │  (Game State)   │     │  (Games/Votes)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Demo

The application provides a complete full-stack "Two Truths and a Lie" experience:

### Features in Action:
1. **Admin Experience**: Create games, upload files, manage settings, control reveals
2. **Participant Experience**: Join via unique links, vote in real-time, see live results
3. **Real-time Features**:
   - Live voting updates via WebSocket
   - Synchronized timers across all participants
   - Real-time participant count
   - Instant lie revelation
4. **Visual Feedback**: Phaser 3 animations for correct/incorrect votes
5. **Persistent Data**: All games and votes stored in PostgreSQL
6. **Scalable Architecture**: Ready for production deployment

### Technical Highlights:
- **Real-time Communication**: WebSocket-based updates
- **Database Persistence**: PostgreSQL with proper schema
- **Modern Development**: Vite build system with hot reload
- **Containerized Deployment**: Docker Compose for easy setup
- **Security**: Rate limiting, CORS, and input validation

---

Built with ❤️ for team building and fun interactive experiences!

**TestIO Team** - Transforming team interactions through engaging technology.
