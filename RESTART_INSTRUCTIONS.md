# 🔄 Restart Instructions

## Changes Made

I've fixed two critical issues:

### 1. ✅ Fixed Socket.io Server Import Issues
- Added `.js` extensions to all imports in server files (required for ESM)
- Updated `package.json` to use `"type": "module"`
- Modified `tsconfig.server.json` for proper ESM support
- Updated npm script to use `node --loader ts-node/esm`

### 2. ✅ Fixed Shared Lobby System
- All players now join the **same game** instead of separate games
- Up to 6 players can join one lobby
- After 6 players, a new lobby is automatically created
- Added console logging to track lobby creation and player joins

## How to Restart

### Step 1: Stop Current Process
In your terminal where `npm run dev:all` is running:
1. Press `Ctrl+C` to stop both servers

### Step 2: Restart Everything
```bash
npm run dev:all
```

### Step 3: Watch the Terminal
You should now see:
```
[1] 🚀 Socket.io server running on port 3001
```

Instead of the previous error!

### Step 4: Test with Multiple Tabs
1. Open http://localhost:3000 in 5 different browser tabs (incognito recommended)
2. Click "Play Now" in each tab
3. Enter different names
4. Watch the terminal - you should see:
   ```
   Created new lobby: game_xxxxx
   Lobby game_xxxxx now has 1 players
   Player joining existing lobby: game_xxxxx
   Lobby game_xxxxx now has 2 players
   Player joining existing lobby: game_xxxxx
   Lobby game_xxxxx now has 3 players
   ...
   ```

### Step 5: Verify All Players in Same Game
- All 5 tabs should show the same game ID in the URL
- Example: `/game/game_abc123` (same ID for all)
- All players should see each other in the player list

## What to Expect

✅ **Server starts without errors**  
✅ **All players join the same lobby**  
✅ **Player list updates in real-time**  
✅ **Console shows lobby activity**  

## Troubleshooting

### If server still won't start:
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev:all
```

### If players still in separate games:
- Make sure you restarted the server after the changes
- Check terminal for "Created new lobby" vs "Player joining existing lobby"
- Clear browser cache and try again

## Next Steps

Once this is working, the next features to implement are:
1. **Ready button** - Players mark themselves ready
2. **Auto-start** - Game starts when all players ready
3. **Question/Answer UI** - The actual gameplay interface

---

**Ready to test? Stop the current process and restart!** 🚀

