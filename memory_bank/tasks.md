# tasks.md (Source of Truth)

## Completed
- Integrate Phaser and organize assets
- Data visibility across pages (name, picture, options)
- Highlight lie on results + animations after reveal
- Music only on voting/results + toggle
- Real-time updates (votes, lie reveal override)
- Backend + DB + WebSockets + Docker Compose
- Fix API base URL (/api), CORS, and build issues
- Refactor route IO injection to factories
- VAN: Apply TestIO squirrel background and pointillism/pop-art styling

## In Progress
- Monitor backend healthcheck occasionally reporting unhealthy; logs show service OK

## Backlog
- Accessibility polish (contrast, focus states)
- Browser testing matrix
- Optional: Persist user sessions in Redis

---

## PLAN: Bug Fixes and Code Cleanup (Level 3)

### Requirements
- Fix known reliability issues without changing product behavior
- Remove unused/dead code and heavy unused assets
- Keep Docker-based dev flow working end-to-end

### Bugs Identified
1. Backend healthcheck flapping/unhealthy in compose
   - Cause: docker-compose uses `curl` which is not installed in Node alpine image
   - Fix: Switch compose healthcheck to `node healthcheck.js` (already present in Dockerfile)
2. Duplicate route/WebSocket setup in `server/server.js`
   - Issue: `setupRoutes()` and `setupWebSocket(io)` are called twice (top-level and inside `startServer()`)
   - Risk: Routes registered twice; potential double WS handlers
   - Fix: Remove top-level await block and keep single initialization in `startServer()`
3. Favicon PNG fallback 404
   - `index.html` references `assets/images/favicon.png` which does not exist
   - Fix: Remove PNG fallback or add a PNG asset; proposed: remove fallback tag
4. Unused/heavy assets in `assets/images/`
   - `TestIO_squirel1.png` (duplicate), `Bildschirmfoto *.png` (screenshots), `Screen Recording *.gif` in root
   - Fix: Remove from repo to reduce size and noise
5. CDN duplicates vs NPM
   - Index loads Socket.IO and Phaser via CDN; we also have deps in package.json
   - Decision: Leave as-is for now (works), consider future consolidation to ESM imports via Vite

### Code/Asset Cleanup Targets
- Remove: `assets/images/TestIO_squirel1.png`, `assets/images/Bildschirmfoto *.png`, `Screen Recording *.gif`
- Remove PNG favicon fallback link in `index.html`
- Keep: `assets/images/TestIO_squirel.png`, `assets/images/confetti.svg`, `assets/images/star.svg`, `assets/audio/elevator_music.mp3`

### Implementation Steps
1. Healthcheck fix (compose)
   - Edit `docker-compose.yml` backend service healthcheck to: `["CMD", "node", "healthcheck.js"]`
2. De-duplicate route/WS setup
   - Edit `server/server.js`: delete the top-level `await setupRoutes(); setupWebSocket(io);` block (lines ~84-87)
   - Ensure only the `startServer()` path sets up routes and WS once
3. Favicon fallback cleanup
   - Edit `index.html`: remove the `<link rel="alternate icon" type="image/png" ...>`
4. Remove unused assets
   - Delete `assets/images/TestIO_squirel1.png`
   - Delete `assets/images/Bildschirmfoto 2025-08-14 um *.png`
   - Delete `Screen Recording 2025-08-14 at 17.35.12.gif`
5. Verify
   - `docker-compose up -d --build`
   - Confirm backend is healthy; visit `/api/health`
   - Load app at `http://localhost:3000`; ensure no 404s for favicon
   - Start a game, vote, show lie; confirm no duplicate event logs

### Risks & Mitigations
- Removing assets: verify not referenced anywhere; we confirmed in `index.html`/`style.css`
- Healthcheck: use Node-based checker to avoid curl dependency

### Mode Recommendation
- Next Mode: IMPLEMENT MODE (apply edits + cleanup)
