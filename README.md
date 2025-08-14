# Two Truths and a Lie Game

A modern, interactive web application for playing "Two Truths and a Lie" with teams. Built with vanilla JavaScript, Phaser 3 for animations, and featuring a sleek Mentimeter-inspired design.

![TestIO Squirrel](TestIO_squirel.png)

## Features

### 🎮 **Three-Page Experience**
1. **Admin Setup Page** - Configure games with teammate info and statements
2. **Voting Page** - Let participants guess which statement is the lie
3. **Results Page** - Display real-time voting results with animations

### ✨ **Key Functionality**
- **File Uploads**: Profile pictures (images) and background music (MP3)
- **Timer System**: Optional synchronized voting timers (30s, 1min, 2min, 5min)
- **Real-time Updates**: Live voting results using localStorage
- **Animations**: Fireworks for correct votes, thumbs-down rain for incorrect votes
- **Responsive Design**: Modern, mobile-friendly interface
- **Default Music**: Elevator music plays if no custom music is uploaded

### 🎨 **Modern Design**
- Mentimeter-inspired UI with glassmorphism effects
- Gradient backgrounds and smooth animations
- Interactive vote buttons with hover effects
- Real-time progress bars for voting results

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

### Quick Start
```bash
# Clone or download the project
cd ulidim

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000` (or the port shown in terminal).

## Technical Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Animations**: Phaser 3 game engine
- **Styling**: Modern CSS with glassmorphism and gradients
- **Data Storage**: Browser localStorage for game state
- **Development Server**: alive-server
- **Real-time Features**: Polling-based updates

## Project Structure

```
ulidim/
├── index.html              # Main HTML file with all three pages
├── style.css               # Modern CSS styles
├── src/
│   └── main.js            # Main application logic
├── package.json           # Dependencies and scripts
├── TestIO_squirel.png     # Background image
├── elevator_music.mp3     # Default background music
├── favicon.png            # Site icon
└── README.md              # This file
```

## Game Flow

1. **Admin Setup**: Admin creates game with teammate info and statements
2. **Link Generation**: System generates unique shareable link
3. **Participant Voting**: Participants access voting page via link
4. **Real-time Results**: Votes are stored and displayed in real-time
5. **Timer Management**: Optional countdown timer for voting deadline
6. **Lie Revelation**: Admin can reveal the correct answer
7. **Feedback Animations**: Visual feedback based on voting accuracy

## Browser Compatibility

- Modern browsers supporting ES6+ features
- Chrome 70+, Firefox 65+, Safari 12+, Edge 79+
- Mobile browsers supported with responsive design

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm start` - Alias for dev command

### Key Features Implemented
- ✅ File upload handling (images and audio)
- ✅ Real-time voting system
- ✅ Timer synchronization
- ✅ Phaser 3 particle animations
- ✅ Responsive design
- ✅ Game state management
- ✅ URL-based game sharing

## Customization

### Adding Custom Animations
Modify the `createFireworks()` and `createThumbsDownRain()` methods in `src/main.js` to customize feedback animations.

### Styling Changes
Update `style.css` to modify the visual appearance. The design uses CSS custom properties for easy theming.

### Timer Options
Add more timer options by modifying the select options in `index.html` and updating the timer logic in `main.js`.

## Demo

The application provides a complete "Two Truths and a Lie" experience:

1. **Admin Experience**: Create games, manage settings, control reveals
2. **Participant Experience**: Join via link, vote, see results
3. **Real-time Features**: Live voting updates and synchronized timers
4. **Visual Feedback**: Celebrating correct votes, showing incorrect votes

---

Built with ❤️ for team building and fun interactive experiences!
