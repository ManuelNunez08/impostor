# Stale Session Fix

## Problem
After restarting the server, players would see "ghost players" from previous sessions in the lobby. This happened because:
1. Player data was stored in `localStorage` in the browser
2. Server state was cleared on restart (in-memory storage)
3. Client tried to reconnect using old credentials
4. Server didn't properly validate that the game still existed

## Solution Implemented

### 1. Server-Side Changes (`server/index.ts`)
- Modified `game:get-state` handler to return `null` when game doesn't exist
- Added cleanup of stale player mappings when game not found
- Added debug logging for better troubleshooting

### 2. Client-Side Changes

#### Lobby Page (`app/lobby/page.tsx`)
- Added validation when receiving game state
- Clears `localStorage` if game no longer exists on server
- Shows user-friendly error message
- Handles both initial connection and state updates

#### Game Page (`app/game/[id]/page.tsx`)
- Added validation when receiving game state
- Redirects to lobby if game no longer exists
- Clears `localStorage` on invalid state
- Handles error messages that indicate missing game

## What Happens Now

### Scenario 1: Server Restart
1. User has old session data in `localStorage`
2. Client tries to reconnect
3. Server returns `null` (game doesn't exist)
4. Client clears `localStorage` and shows error message
5. User can join a fresh game

### Scenario 2: Game Ended
1. Game ends or is deleted
2. Client receives invalid state
3. Client clears session and redirects to lobby
4. User can join a new game

## Testing

To test the fix:
1. Join a game with 4 players
2. Stop the server (Ctrl+C)
3. Restart the server
4. Refresh the browser
5. You should see an error message and be able to join a new game
6. No "ghost players" should appear

## Manual Clear (If Needed)

If you ever need to manually clear your session:
1. Open browser console (F12)
2. Run: `localStorage.clear()`
3. Refresh the page

## Future Improvements

Consider implementing:
- Server-side session persistence (Redis/Database)
- Session expiration timestamps
- Automatic reconnection with validation
- Server restart notifications to connected clients

