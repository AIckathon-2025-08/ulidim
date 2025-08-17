Link to the demo video: https://drive.google.com/file/d/1VCYe3CKY03eXvpTVRl5WegnMoka0P6G6/view?usp=sharing

![Two Truths and a Lie Game Demo](Screen%20Recording%202025-08-14%20at%2017.35.12.gif)

# Two Truths and a Lie Game

A modern, full-stack interactive web application for playing "Two Truths and a Lie" with teams. Built with Vite, vanilla JavaScript, Phaser 3 for animations, Express.js backend, PostgreSQL database, and real-time WebSocket communication with secure admin authentication.

![TestIO Squirrel](assets/images/TestIO_squirel.png)

## Features

### 🎮 **Four-Page Experience**
1. **Login Page** - Secure admin authentication with username/password
2. **Admin Setup Page** - Configure games with teammate info and statements
3. **Voting Page** - Let participants guess which statement is the lie
4. **Results Page** - Display real-time voting results with animations

### 🔐 **Security & Authentication**
- **Admin Authentication**: Secure login system with session-based authentication
- **Session Management**: Automatic session timeout and validation
- **Protected Routes**: Game creation requires authentication
- **Rate Limiting**: Comprehensive rate limiting for different endpoint types
- **CORS Protection**: Configurable cross-origin resource sharing
- **Input Validation**: Comprehensive server-side validation

### ✨ **Core Functionality**
- **File Uploads**: Profile pictures (images) and background music (MP3/audio files)
- **Timer System**: Optional synchronized voting timers (30s, 1min, 2min, 5min)
- **Timer Interruption**: Admin can manually reveal lies with confirmation modal
- **Real-time Updates**: Live voting results using WebSocket communication
- **Persistent Storage**: PostgreSQL database with optimized indexing
- **Animations**: Phaser 3 powered fireworks for correct votes, thumbs-down rain for incorrect votes
- **Responsive Design**: Modern, mobile-friendly interface with pop-art styling
- **Music Control**: Centralized music service with user controls
- **Multi-user Support**: Multiple participants can join and vote simultaneously
- **Vote Tracking**: Prevent duplicate voting with session-based tracking

### 🎨 **Pop-Art Design System**
- **Pointillism Style**: Animated dotted overlays and pop-art aesthetics
- **Comic Sans Typography**: Playful, friendly font choices
- **Vibrant Color Palette**: Pop-art inspired gradient backgrounds
- **Interactive Animations**: Hover effects, transitions, and particle systems
- **Glassmorphism Cards**: Modern card designs with backdrop blur effects
- **TestIO Branding**: Integrated squirrel mascot background

## How to Play

### As an Admin (Game Creator):
1. **Login**:
   - Navigate to the application
   - Enter admin credentials (username/password)
   - Authenticate to access game creation

2. **Set Up Game**:
   - Enter teammate name
   - Upload a profile picture (required)
   - Write three statements (two truths, one lie)
   - Select which statement is the lie
   - Optionally set a voting timer (30s-5min)
   - Optionally upload background music (MP3/audio files)

3. **Manage Game**:
   - Click "Start Game" to create and launch
   - Share the auto-generated link with participants
   - Monitor real-time vote counts and statistics
   - Click "Show the Lie" when ready (with timer interruption option)
   - Logout when finished

### As a Participant:
1. **Join Game**:
   - Click the shared link (no login required)
   - View the teammate's profile and statements
   - See live participant count

2. **Vote**:
   - Select which statement you think is the lie
   - Submit your vote (one vote per session)
   - View real-time results with live updates
   - Enjoy animations based on correct/incorrect guesses

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

# Default admin credentials:
# Username: admin
# Password: secure_password_123
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

# 4. Configure environment variables
cp server/env.example server/.env
# Edit server/.env with your settings

# 5. Start backend server
npm run backend:dev

# 6. In a new terminal, start frontend
npm run dev
```

### Available Scripts
- `npm run docker:up` - Start all services with Docker
- `npm run docker:down` - Stop all Docker services
- `npm run docker:logs` - View Docker logs
- `npm run docker:build` - Build Docker containers
- `npm run dev` - Start frontend development server
- `npm run backend:dev` - Start backend development server
- `npm run fullstack:dev` - Start database + frontend (hybrid approach)
- `npm run build` - Build frontend for production
- `npm run preview` - Preview production build

## Technical Stack

### Frontend
- **Framework**: Vite 7.1.2 for build tooling and development server
- **Language**: Vanilla JavaScript (ES6+ modules)
- **UI**: HTML5, CSS3 with pop-art pointillism design system
- **Animations**: Phaser 3.88.2 game engine for particle effects and fireworks
- **Real-time**: Socket.IO 4.7.4 client for WebSocket communication
- **Typography**: Comic Sans MS and modern web fonts
- **Styling**: CSS custom properties, glassmorphism, and gradient backgrounds

### Backend
- **Runtime**: Node.js with Express.js 4.18.2 framework
- **Database**: PostgreSQL 15 with connection pooling and optimized indexing
- **Real-time**: Socket.IO 4.7.4 for WebSocket communication
- **Security**: Helmet 7.1.0, CORS 2.8.5, comprehensive rate limiting
- **Authentication**: Session-based admin authentication with crypto tokens
- **Session Management**: In-memory session store with timeout management
- **API**: RESTful endpoints with real-time WebSocket events
- **Validation**: Server-side input validation and sanitization
- **Monitoring**: Health check endpoints and detailed logging

### Infrastructure
- **Containerization**: Docker and Docker Compose with multi-service setup
- **Database**: PostgreSQL 15-alpine with automatic initialization
- **Networking**: Custom Docker network with service communication
- **Development**: Hot reload for both frontend and backend
- **Production**: Optimized container builds with health checks
- **Storage**: Volume persistence for database data

## Project Structure

```
ulidim/
├── index.html                          # Main HTML entry point with pop-art UI
├── style.css                           # Pop-art pointillism CSS design system
├── vite.config.js                      # Vite configuration with proxy setup
├── package.json                        # Frontend dependencies and Docker scripts
├── docker-compose.yml                  # Multi-service Docker orchestration
├── Dockerfile.frontend                 # Optimized frontend container
│
├── src/                                # Frontend source code
│   ├── main.js                        # Main game logic with authentication
│   ├── api.js                         # API service with auth headers
│   ├── phaser-config.js               # Phaser 3 configuration
│   └── services/                      # Modular services
│       └── music.js                   # Centralized music control service
│
├── server/                             # Backend server
│   ├── server.js                      # Express server with security middleware
│   ├── package.json                   # Backend dependencies
│   ├── Dockerfile                     # Backend container config
│   ├── env.example                    # Environment variables template
│   ├── healthcheck.js                 # Docker health check script
│   │
│   ├── database/                      # Database configuration
│   │   ├── connection.js              # PostgreSQL connection pool
│   │   └── init.sql                   # Database schema with indexes
│   │
│   ├── middleware/                    # Authentication middleware
│   │   └── auth.js                    # Session-based admin authentication
│   │
│   ├── routes/                        # API route modules
│   │   ├── auth.js                    # Authentication endpoints
│   │   ├── games.js                   # Game management with auth protection
│   │   └── votes.js                   # Voting system with duplicate prevention
│   │
│   └── websocket/                     # Real-time communication
│       └── handlers.js                # WebSocket event management
│
├── assets/                             # Static assets
│   ├── images/                         # Images and UI assets
│   │   ├── TestIO_squirel.png         # Branded background mascot
│   │   ├── favicon.svg                # Site icon
│   │   ├── star.svg                   # Fireworks particle asset
│   │   └── confetti.svg               # Celebration particle asset
│   └── audio/                          # Audio assets
│       └── elevator_music.mp3         # Default background music
│
├── memory_bank/                        # Development documentation
├── custom_modes/                       # Custom game mode configurations
└── generated-docs/                     # Auto-generated documentation
```

## Game Flow

1. **Admin Authentication**: Admin logs in with username/password credentials
2. **Session Management**: Secure session created with 24-hour timeout
3. **Game Creation**: Admin creates game with teammate info and statements (protected route)
4. **Database Storage**: Game data stored in PostgreSQL with optimized indexing
5. **Link Generation**: System generates unique shareable UUID-based game link
6. **WebSocket Connection**: Participants establish real-time connection via Socket.IO
7. **Participant Voting**: Participants access voting page via link (no auth required)
8. **Vote Validation**: Server prevents duplicate votes using session tracking
9. **Real-time Updates**: Votes stored in database and instantly broadcast via WebSocket
10. **Timer Management**: Optional countdown timer with admin interruption capability
11. **Lie Revelation**: Admin can reveal answer manually with confirmation modal
12. **Animation Feedback**: Phaser 3 powered fireworks/thumbs-down based on vote accuracy
13. **Session Cleanup**: Automatic session cleanup and graceful shutdown

## Browser Compatibility

- Modern browsers supporting ES6+ features
- Chrome 70+, Firefox 65+, Safari 12+, Edge 79+
- Mobile browsers supported with responsive design

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login with username/password
- `POST /api/auth/logout` - Admin logout and session invalidation
- `GET /api/auth/validate` - Validate current session token
- `POST /api/auth/validate` - Alternative session validation
- `GET /api/auth/info` - Authentication service information

### Game Management (Protected)
- `POST /api/games` - Create a new game (requires authentication)
- `GET /api/games/:id` - Get game details (public)
- `PUT /api/games/:id/reveal-lie` - Reveal the lie (creator only)
- `GET /api/games/:id/stats` - Get detailed game statistics

### Voting System
- `POST /api/votes` - Submit a vote with duplicate prevention
- `GET /api/votes/game/:id` - Get vote counts for a game
- `GET /api/votes/check/:gameId/:session` - Check if user has voted
- `GET /api/votes/admin/:gameId` - Get detailed vote information (admin)

### System
- `GET /api/health` - Health check endpoint

### WebSocket Events
- `joinGame` - Join a game room with session tracking
- `voteUpdate` - Real-time vote count broadcasts
- `lieRevealed` - Lie revelation with animation triggers
- `gameUpdate` - General game state updates
- `userJoined` - New participant notifications
- `userLeft` - Participant departure notifications
- `participantCountUpdate` - Live participant count updates
- `timerUpdate` - Synchronized countdown timer updates

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
SESSION_SECRET=your-super-secret-session-key-change-in-production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure_password_123
```

### Key Features Implemented
- ✅ **Authentication System**: Secure admin login with session management
- ✅ **Full-stack Architecture**: Real-time communication with WebSocket
- ✅ **Database**: PostgreSQL with optimized indexing and constraints
- ✅ **Security**: Rate limiting, CORS, input validation, session timeout
- ✅ **File Uploads**: Image and audio file handling with validation
- ✅ **Real-time Voting**: WebSocket-based live vote updates
- ✅ **Timer System**: Synchronized countdown with admin interruption
- ✅ **Animations**: Phaser 3 powered fireworks and particle effects
- ✅ **Pop-art Design**: Pointillism styling with Comic Sans typography
- ✅ **Music Service**: Centralized audio control with user preferences
- ✅ **Game Management**: UUID-based game sharing with creator validation
- ✅ **Docker**: Complete containerization with health checks
- ✅ **Duplicate Prevention**: Session-based vote tracking
- ✅ **Error Handling**: Comprehensive error responses and logging

## Production Deployment

### Using Docker Compose
```bash
# Build and start all services
docker-compose up -d

# View logs for debugging
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f database

# Stop all services
docker-compose down

# Rebuild containers after code changes
docker-compose build && docker-compose up -d
```

### Environment Configuration
1. Copy `server/env.example` to `server/.env`
2. Update production values:
   - Set strong `SESSION_SECRET` (use crypto.randomBytes)
   - Set secure `ADMIN_USERNAME` and `ADMIN_PASSWORD`
   - Configure database credentials if needed
   - Set proper `FRONTEND_URL` for your domain
   - Set `NODE_ENV=production`

### Security Considerations
- Change default admin credentials immediately
- Use HTTPS in production (configure reverse proxy)
- Set strong session secrets
- Configure firewall rules for database port
- Enable logging and monitoring
- Regular security updates for dependencies

### Database Management
The database automatically initializes with schema and indexes:
```bash
# Connect to the database container
docker exec -it two_truths_db psql -U postgres -d two_truths_db

# View tables and data
\dt
SELECT * FROM games ORDER BY created_at DESC LIMIT 5;
SELECT * FROM votes ORDER BY voted_at DESC LIMIT 10;

# Database backup
docker exec two_truths_db pg_dump -U postgres two_truths_db > backup.sql
```

## Customization

### Adding Custom Animations
Modify the Phaser 3 particle systems in `src/main.js`:
- `createFireworks()` - Celebration animations for correct answers
- `createThumbsDownRain()` - Feedback for incorrect answers
- `showFireworksAnimation()` - Admin lie reveal animations
- Add new particle textures in `assets/images/`

### API Extensions
1. Add new endpoints in `server/routes/`
2. Update authentication middleware in `server/middleware/auth.js`
3. Add corresponding WebSocket events in `server/websocket/handlers.js`
4. Update database schema in `server/database/init.sql`

### Music and Audio
- Replace `assets/audio/elevator_music.mp3` with custom default music
- Modify `src/services/music.js` for different audio controls
- Add sound effects for UI interactions

### Pop-Art Design Customization
Update `style.css` for visual modifications:
- Change color palette in CSS custom properties
- Modify pointillism dot patterns and animations
- Update gradient backgrounds and glassmorphism effects
- Customize Comic Sans typography and spacing

### Authentication System
- Modify session timeout in `server/middleware/auth.js`
- Add multi-factor authentication
- Integrate with external OAuth providers
- Implement role-based access control

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│    Backend      │────▶│   PostgreSQL    │
│   (Vite +       │     │   (Express +    │     │   Database      │
│   Vanilla JS +  │     │   Socket.IO +   │     │   (Optimized    │
│   Phaser 3)     │     │   Auth System)  │     │    Indexing)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                        │                        │
         │ WebSocket              │ Session-based          │ Connection
         │ + REST API             │ Authentication         │ Pooling
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Pop-Art UI +   │     │  Rate Limited   │     │  ACID Compliant │
│  Real-time      │     │  Event Handler  │     │  Data Storage   │
│  Animations     │     │  + Security     │     │  + Constraints  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Music Service  │     │  Docker         │     │  Health Checks  │
│  + File Upload  │     │  Orchestration  │     │  + Monitoring   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Demo

The application provides a complete full-stack "Two Truths and a Lie" experience with secure authentication:

### Features in Action:
1. **Secure Admin Experience**:
   - Login with username/password authentication
   - Create games with file upload validation
   - Real-time vote monitoring and statistics
   - Manual lie revelation with timer interruption
   - Session management with automatic logout

2. **Participant Experience**:
   - Join via unique UUID-based links (no login required)
   - View participant profiles with uploaded images
   - Vote with duplicate prevention
   - Real-time results with live animations
   - Music controls and responsive design

3. **Real-time Features**:
   - WebSocket-based live vote updates
   - Synchronized countdown timers across all participants
   - Instant lie revelation with animation triggers
   - Participant session tracking
   - Admin-controlled game flow

4. **Visual & Audio Feedback**:
   - Phaser 3 powered fireworks for correct answers
   - Thumbs-down rain animation for incorrect votes
   - Pop-art pointillism design with Comic Sans typography
   - Centralized music service with user controls
   - Background music upload with MP3 validation

5. **Enterprise-Ready Features**:
   - PostgreSQL with optimized indexing and constraints
   - Comprehensive rate limiting for different endpoint types
   - Session-based authentication with 24-hour timeout
   - Docker containerization with health checks
   - Error handling and logging throughout

### Technical Highlights:
- **Security First**: Authentication, rate limiting, input validation
- **Real-time Architecture**: Socket.IO with automatic reconnection
- **Database Optimization**: PostgreSQL with connection pooling
- **Modern Development**: Vite with hot reload and ES6+ modules
- **Production Ready**: Docker Compose with multi-service orchestration
- **Performance**: Optimized queries, indexes, and efficient WebSocket handling

---

Built with ❤️ for team building and fun interactive experiences!

**TestIO Team** - Transforming team interactions through engaging technology.
