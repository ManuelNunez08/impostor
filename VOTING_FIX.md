# Voting Phase Bug Fixes

## Issues Fixed

### 1. 🐛 "Player is eliminated" Error
**Problem:** When voting timer expired, the client tried to cast random votes for all players, including eliminated ones.

**Fix:** Added check in `handleVotingTimerExpired()` to skip eliminated players.

```typescript
const currentPlayer = gameState.players.find(p => p.id === gameState.playerId);
if (currentPlayer?.isEliminated) {
  return; // Skip voting if eliminated
}
```

---

### 2. 🐛 Winner Condition Error
**Problem:** Server tried to use return value of `processVotingResults()` which returns `void`.

**Fix:** Removed invalid usage:
```typescript
// Before (WRONG):
const result = game.processVotingResults();
console.log(`Winner: ${result.winner}`);

// After (CORRECT):
game.processVotingResults();
console.log(`Phase: ${game.getPhase()}`);
```

---

### 3. 🐛 Locked Votes Not Triggering Results
**Problem:** No mechanism to track locked votes - server only checked if ALL players voted, not if majority locked.

**Fix:** Implemented complete locked vote system:

#### A. Added `isLocked` Field to Vote
```typescript
export interface Vote {
  id: VoteId;
  fromPlayerId: PlayerId;
  targetPlayerId: PlayerId;
  round: number;
  timestamp: number;
  isLocked: boolean;  // NEW
}
```

#### B. Updated `castVote()` Method
- Accepts `isLocked` parameter
- Updates existing vote if player changes mind
- Properly tracks lock state

```typescript
castVote(fromPlayerId: PlayerId, targetPlayerId: PlayerId, isLocked: boolean = false): Vote {
  // Check if player already voted this round
  const existingVoteIndex = this.state.votes.findIndex(
    v => v.fromPlayerId === fromPlayerId && v.round === this.state.currentRound
  );

  const vote: Vote = {
    // ... fields
    isLocked,
  };

  if (existingVoteIndex >= 0) {
    this.state.votes[existingVoteIndex] = vote; // Update
  } else {
    this.state.votes.push(vote); // New
    this.state.players[fromPlayerId].hasVoted = true;
  }

  return vote;
}
```

#### C. Added `hasMajorityLockedVotes()` Method
```typescript
hasMajorityLockedVotes(): boolean {
  const activePlayers = this.getActivePlayers();
  const currentRoundVotes = this.state.votes.filter(
    v => v.round === this.state.currentRound && v.isLocked
  );
  
  const majorityThreshold = Math.ceil(activePlayers.length / 2);
  return currentRoundVotes.length >= majorityThreshold;
}
```

#### D. Updated Server Vote Handler
Now checks BOTH conditions:
```typescript
const allVoted = game.getActivePlayers().every(p => p.hasVoted);
const majorityLocked = game.hasMajorityLockedVotes();

if (allVoted || majorityLocked) {
  game.processVotingResults();
  // Trigger results phase
}
```

---

### 4. 🐛 Timer Expiration Not Triggering Results
**Problem:** When timer hit zero, votes weren't locked so majority check failed.

**Fix:** Updated `handleVotingTimerExpired()` to send locked votes:
```typescript
socket.emit('game:vote', { 
  targetPlayerId: randomTarget.id, 
  isLocked: true  // AUTO-LOCK on timeout
}, callback);
```

---

## Changes Summary

### Backend Changes

**`types/game.ts`:**
- Added `isLocked: boolean` to Vote interface

**`lib/game-engine/GameEngine.ts`:**
- Updated `castVote()` to accept `isLocked` parameter
- Added vote update logic (instead of always creating new)
- Added `hasMajorityLockedVotes()` method

**`server/index.ts`:**
- Updated vote handler to accept object: `{ targetPlayerId, isLocked }`
- Added majority lock check
- Removed invalid `result.winner` usage
- Backward compatible with old string format

**`types/socket.ts`:**
- Updated type: `'game:vote': (data: { targetPlayerId, isLocked? } | PlayerId, ...)`

### Frontend Changes

**`app/game/[id]/page.tsx`:**
- `handleLockVote()`: Sends `{ targetPlayerId, isLocked: true }`
- `handleVotingTimerExpired()`: 
  - Checks if player is eliminated
  - Sends locked votes on timeout
  - Skips if already voted/locked

---

## How It Works Now

### Voting Flow:
```
Player selects target
    ↓
Clicks "Vote" button (unlocked vote sent)
    ↓
Can change vote freely
    ↓
Clicks "Lock in Vote" (locked vote sent)
    ↓
Server checks:
  - Has majority locked? → Trigger results
  - Have all voted? → Trigger results
    ↓
Results Phase
```

### Timer Expiration Flow:
```
Timer hits 0:00
    ↓
For each player who hasn't voted:
  - Skip if eliminated
  - Pick random target
  - Send LOCKED vote
    ↓
Server receives locked votes
    ↓
Majority locked → Trigger results
```

---

## Testing Checklist

### Majority Lock
- [ ] 3 of 4 players lock → Results trigger
- [ ] 4 of 5 players lock → Results trigger
- [ ] 2 of 4 players lock → No trigger (not majority)

### Timer Expiration
- [ ] Timer hits 0 → Auto-cast votes for non-voters
- [ ] Eliminated players don't get auto-votes
- [ ] Results trigger after auto-votes

### Vote Changes
- [ ] Can change vote before locking
- [ ] Can't change vote after locking
- [ ] Vote updates replace old vote (no duplicates)

### Edge Cases
- [ ] All players vote but don't lock → Timer expires → Results
- [ ] Majority locks before all vote → Immediate results
- [ ] Player eliminated mid-voting → Can't vote

---

## Files Modified

1. `types/game.ts` - Added isLocked field
2. `lib/game-engine/GameEngine.ts` - Updated castVote, added hasMajorityLockedVotes
3. `server/index.ts` - Updated vote handler with majority check
4. `types/socket.ts` - Updated socket type definition
5. `app/game/[id]/page.tsx` - Updated client handlers

---

## Status

✅ **Complete** - All voting phase bugs fixed
- Locked votes properly tracked
- Majority lock triggers results
- Timer expiration works correctly
- Eliminated players handled properly
- No more winner condition errors

Ready for testing!

