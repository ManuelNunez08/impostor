# Interrogation Phase Countdown Timer

## Overview
Added a countdown timer to the interrogation phase that uses each round's `interrogationTime` setting. When the timer expires, the game automatically transitions to the voting phase.

---

## Changes Made

### 1. GameState Updates (`types/game.ts`)

**Added Timer Tracking Fields:**
```typescript
interface GameState {
  // ... existing fields ...
  interrogationStartedAt: number | null;  // When current interrogation phase started
  interrogationEndsAt: number | null;     // When current interrogation phase should end
}
```

---

### 2. GameEngine Updates (`lib/game-engine/GameEngine.ts`)

**A. Constructor Initialization:**
- Added `interrogationStartedAt: null` and `interrogationEndsAt: null` to initial state

**B. New Method - `getInterrogationTimeRemaining()`:**
```typescript
getInterrogationTimeRemaining(): number | null {
  if (!this.state.interrogationEndsAt || this.state.phase !== 'interrogation') {
    return null;
  }
  
  const remaining = Math.max(0, this.state.interrogationEndsAt - Date.now());
  return Math.ceil(remaining / 1000); // Return seconds
}
```

**C. Updated `startGame()` Method:**
- Starts interrogation timer when game begins
- Uses `settings.rounds[0].interrogationTime` for duration
- Sets `interrogationStartedAt` and `interrogationEndsAt`

```typescript
// Start interrogation timer
const roundConfig = settings.rounds[0];
const interrogationDuration = roundConfig.interrogationTime * 1000;
this.state.interrogationStartedAt = Date.now();
this.state.interrogationEndsAt = Date.now() + interrogationDuration;
```

**D. Updated `transitionToNextRound()` Method:**
- Restarts interrogation timer for new rounds
- Uses current round's `interrogationTime` setting

---

### 3. Server Updates (`server/index.ts`)

**A. Added Interrogation Timer Storage:**
```typescript
const interrogationTimers = new Map<string, NodeJS.Timeout>();
```

**B. New Function - `startInterrogationTimer(gameId)`:**
- Creates interval that checks time remaining every second
- When timer expires:
  - Timeouts all pending questions
  - Forces transition to voting phase
  - Broadcasts phase change to all clients
- Updates game state every second

**C. New Function - `cancelInterrogationTimer(gameId)`:**
- Clears interrogation timer when needed
- Cleanup function for timer management

**D. Updated Game Start Handlers:**
- Calls `startInterrogationTimer(gameId)` after `game.startGame()`
- Works for both manual start (all ready) and countdown expiration

**E. Updated `getPlayerView()`:**
- Changed `timeRemaining: null` to `timeRemaining: game.getInterrogationTimeRemaining()`
- Sends actual timer value to clients

---

### 4. Client UI Updates (`app/game/[id]/page.tsx`)

**Added Interrogation Timer Display:**
```tsx
{/* Interrogation Timer (only shown during interrogation) */}
{canAsk && gameState.timeRemaining !== null && (
  <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40">
    <div className="bg-white rounded-full shadow-2xl px-8 py-4 border-4 border-green-600">
      <div className="text-center">
        <div className="text-5xl font-bold text-gray-800">
          {Math.floor(gameState.timeRemaining / 60)}:{String(gameState.timeRemaining % 60).padStart(2, '0')}
        </div>
        <div className="text-sm text-gray-600 mt-1">
          Interrogation - Round {gameState.currentRound}
        </div>
      </div>
    </div>
  </div>
)}
```

**Visual Styling:**
- Green border (vs purple for voting) to distinguish phases
- Shows minutes:seconds format (e.g., "3:00", "0:45")
- Displays "Interrogation - Round X"
- Positioned at top center of screen
- Only visible during interrogation phase

---

## How It Works

### Flow Diagram:
```
Game Starts
    ↓
GameEngine.startGame() called
    ↓
Sets interrogationEndsAt = now + (interrogationTime * 1000)
    ↓
Server calls startInterrogationTimer(gameId)
    ↓
Every 1 second:
  - Check getInterrogationTimeRemaining()
  - Broadcast updated gameState to all clients
  - Clients display updated timer
    ↓
When timer reaches 0:
  - game.timeoutAllPendingQuestions()
  - game.transitionToVoting()
  - Emit 'game:phase-change'
  - broadcastGameState()
    ↓
Voting Phase Begins
```

### Timer Duration Per Round:
Round configurations determine interrogation time:
```typescript
Round 1: 180 seconds (3 minutes)
Round 2: 120 seconds (2 minutes)
Round N: settings.rounds[N-1].interrogationTime seconds
```

---

## Features

### ✅ Dynamic Per-Round Timers
- Each round can have different interrogation duration
- Configured via `RoundConfig.interrogationTime`
- Flexible N-round support

### ✅ Automatic Phase Transition
- No manual intervention needed
- Game flow continues smoothly
- Pending questions automatically timed out

### ✅ Real-Time Updates
- Timer updates every second
- All clients stay synchronized
- Server broadcasts to all players

### ✅ Visual Feedback
- Large, prominent timer display
- Color-coded (green for interrogation)
- Shows current round
- Minutes:seconds format

### ✅ Graceful Handling
- Works with ready-to-vote system (majority can still force early)
- Cleans up timers properly
- Error handling for edge cases

---

## Testing Checklist

### Interrogation Timer
- [ ] Timer appears when interrogation phase starts
- [ ] Timer counts down from configured time (e.g., 3:00 for Round 1)
- [ ] Timer updates every second
- [ ] Timer visible to all players
- [ ] All players see same time (synchronized)

### Timer Expiration
- [ ] When timer hits 0:00, voting phase starts automatically
- [ ] Pending questions are timed out
- [ ] Phase change broadcasted to all clients
- [ ] UI switches to voting layout

### Multi-Round
- [ ] Round 2 has different timer (e.g., 2:00 vs 3:00)
- [ ] Timer restarts correctly for new rounds
- [ ] Each round uses its own configured duration

### Ready-to-Vote Override
- [ ] If majority ready before timer expires, voting starts early
- [ ] Interrogation timer is cancelled when voting starts early
- [ ] No conflicts between timer and manual transition

### Edge Cases
- [ ] Player disconnect during countdown
- [ ] Server restart handling
- [ ] Timer accuracy over long durations

---

## Files Modified

1. `types/game.ts` (+2 fields) - Added timer tracking to GameState
2. `lib/game-engine/GameEngine.ts` (+30 lines) - Timer logic and methods
3. `server/index.ts` (+60 lines) - Timer management and broadcasting
4. `app/game/[id]/page.tsx` (+13 lines) - Timer UI display

**Total**: ~105 lines added

---

## Configuration Example

```typescript
const settings: GameSettings = {
  rounds: [
    {
      roundNumber: 1,
      interrogationTime: 180,  // 3 minutes ← Controls timer
      maxQuestionsPerPlayer: 2,
      votingTime: 30,
      impostorCanGuess: true
    },
    {
      roundNumber: 2,
      interrogationTime: 120,  // 2 minutes ← Different timer
      maxQuestionsPerPlayer: 1,
      votingTime: 30,
      impostorCanGuess: false
    }
  ],
  // ... other settings
};
```

---

## Benefits

1. **Keeps Game Moving**: No stalling in interrogation phase
2. **Fair Time Management**: All rounds have consistent timing
3. **Flexible Configuration**: Easy to adjust per game/round
4. **Better UX**: Players always know how much time remains
5. **Competitive Balance**: Prevents endless questioning

---

## Status

✅ **Complete** - Interrogation timer fully implemented and integrated
- Timer starts automatically with game
- Displays in UI during interrogation
- Forces voting when time expires
- Works with multi-round system

Ready for gameplay testing!

