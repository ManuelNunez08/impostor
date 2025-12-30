# 🚀 Quick Start Guide

Get your Impostor game up and running in 5 minutes!

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Run the Application

### Option A: Clean Restart (Recommended)

```bash
npm run restart
```

This will:
1. Kill any zombie processes holding ports 3000/3001
2. Start both servers fresh

### Option B: Just Start Servers

```bash
npm run dev:all
```

This will start both:
- Next.js frontend on http://localhost:3000
- Socket.io server on http://localhost:3001

### Option B: Run Separately

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Backend:**
```bash
npm run dev:server
```

## Step 3: Open Your Browser

1. Navigate to http://localhost:3000
2. Click "Play Now"
3. Enter your name
4. Open multiple browser tabs/windows to simulate multiple players
5. Start playing!

## Testing Locally

To test the full multiplayer experience:

1. Open 4-6 browser tabs (or use incognito windows)
2. In each tab, go to http://localhost:3000
3. Click "Play Now" and enter different names
4. Join the same game
5. Mark all players as ready
6. The game will start automatically

## Environment Variables

The default configuration works out of the box. If you need to customize:

```bash
# .env.local
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

## Troubleshooting

### "Stuck on Connecting..." or Connection Issues

**Quick Fix:**
```bash
npm run restart
```

This kills any zombie processes and restarts everything fresh.

### Port Already in Use

If you see `EADDRINUSE` errors:

```bash
# Option 1: Use the cleanup script
npm run cleanup

# Option 2: Manual cleanup
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# Option 3: Nuclear option (kills all Node processes)
killall node
```

Then restart:
```bash
npm run dev:all
```

### Socket Connection Issues

1. **Check both servers are running**
   - Look for: `🚀 Socket.io server running on port 3001`
   - And: `▲ Next.js` starting message

2. **Check browser console**
   - Should see: `✅ Socket connected`
   - If you see connection errors, the server isn't running

3. **Verify ports are correct**
   - Socket server: http://localhost:3001
   - Frontend: http://localhost:3000

4. **Create environment file** (optional)
   ```bash
   cp .env.local.example .env.local
   ```

### TypeScript Errors

If you see TypeScript errors:
```bash
npm run build
```

This will show any type errors that need to be fixed.

## Next Steps

Now that you have the basic setup running:

1. **Read the full rules**: Visit http://localhost:3000/rules
2. **Explore the code**: Check out the project structure in README.md
3. **Add features**: See the roadmap in README.md for ideas
4. **Deploy**: Ready to deploy? See DEPLOYMENT.md (coming soon)

## Development Tips

### Hot Reload

- Frontend changes reload automatically
- Backend changes require restarting the server (Ctrl+C and run again)

### Debugging

**Frontend:**
- Use React DevTools
- Check browser console for errors
- Socket events are logged to console

**Backend:**
- Server logs appear in the terminal
- Add `console.log()` statements in `server/index.ts`

### Testing Game Logic

The game engine is independent of the UI. You can test it directly:

```typescript
import { GameEngine } from '@/lib/game-engine/GameEngine';
import { getRandomCategory } from '@/lib/game-engine/categories';

const category = getRandomCategory();
const game = new GameEngine(category);

// Add players, ask questions, etc.
```

## Common Commands

```bash
# Development
npm run restart         # Clean restart (kills zombies + starts both)
npm run cleanup         # Kill zombie processes on ports 3000/3001
npm run dev:all         # Start both servers
npm run dev             # Start Next.js only
npm run dev:server      # Start Socket.io server only

# Production
npm run build           # Build for production
npm start              # Start production server
npm run start:server   # Start production Socket.io server

# Utilities
npm run lint           # Run linter
```

## Need Help?

- Check the README.md for detailed documentation
- Review the game rules at /rules
- Inspect the code - it's well-commented!

Happy gaming! 🎮

