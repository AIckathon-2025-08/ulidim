# System Patterns

- Frontend: Vite, ES modules, Socket.IO client, Phaser for animations.
- Backend: Node/Express, Socket.IO server, REST API, CORS, rate limiting.
- Storage: PostgreSQL (games, votes), Redis available for sessions.
- Realtime: Room-per-game with broadcast events (voteUpdate, lieRevealed, timerUpdate).
- Containerization: docker-compose orchestrating frontend, backend, db, redis.
