# Eliminated Players Spectator Mode

## Overview
Implemented comprehensive spectator mode for eliminated players. Eliminated players can now only observe the game without interaction, with clear visual indicators showing their eliminated status.

---

## Features Implemented

### 1. 🚫 Action Prevention
**Eliminated players cannot:**
- Ask questions during interrogation phase
- Vote during voting phase
- Lock in votes
- Be selected as targets for questions or votes
- Interact with any game mechanics

**Implementation:**
- Added `!currentPlayer?.isEliminated` checks in action handlers
- Added validation in `handleAskPlayer`, `handleVote`, `handleLockVote`
- Updated `canAsk` to include elimination check
- Added `canVote` flag for voting phase

---

### 2. 👁️ Visual Indicators

**Eliminated Player Styling:**
- **Avatar**: Changes to skull emoji (💀) instead of smiley
- **Color**: Background becomes grey (#6B7280)
- **Opacity**: Reduced to 30% with grayscale filter
- **Blur**: Slight blur effect (1px) for additional fade
- **Label**: Shows "💀 Eliminated" below name
- **Name Badge**: Grey background instead of white

**Both CircularTable and VotingTable updated with consistent styling.**

---

### 3. 💬 Spectator Messages

**Overlay displayed when eliminated:**
```
    💀
  Spectating
You have been eliminated
```

- Shown in both interrogation and voting phases
- Positioned at top center (z-index 30)
- Dark semi-transparent background
- Clear message that player is spectating

---

### 4. 🎯 Target Filtering

**Components updated:**
- **CircularTable**: 
  - Ask buttons hidden for eliminated players
  - Added `&& !player.isEliminated` to button visibility
  
- **VotingTable**: 
  - Already had `canVoteForThisPlayer = !isCurrentPlayer && !player.isEliminated`
  - Vote buttons hidden for eliminated targets
  
- **Vote Timer Expiration**:
  - Already checks `currentPlayer?.isEliminated` before auto-voting
  - Skips eliminated players when assigning random votes

---

## Implementation Details

### Backend (Already Working)
The backend already properly handles eliminated players:
- `getActivePlayers()` filters out eliminated players
- `canPlayerAskQuestion()` checks `player.isEliminated`
- `canPlayerVote()` checks `player.isEliminated`
- `castVote()` validates target is not eliminated
- Vote counting only includes active players
- Results calculations use `getActivePlayers()`

### Frontend Updates

#### CircularTable.tsx
```typescript
// Hide Ask button for eliminated targets
{!isCurrentPlayer && canAsk && !player.isEliminated && (
  <button onClick={() => onAskPlayer(player.id)}>Ask</button>
)}

// Visual styling
className={`${
  player.isEliminated ? 'opacity-30 grayscale blur-[1px]' : ''
}`}
style={{ 
  backgroundColor: player.isEliminated ? '#6B7280' : color 
}}

// Show skull emoji
{player.isEliminated ? '💀' : '😊'}

// Show eliminated label
{player.isEliminated ? '💀 Eliminated' : ...}
```

#### VotingTable.tsx
```typescript
// Same styling updates as CircularTable
// Already had canVoteForThisPlayer check
```

#### app/game/[id]/page.tsx
```typescript
// Prevent eliminated from asking
const canAsk = gameState.phase === 'interrogation' && !currentPlayer?.isEliminated;

// Prevent eliminated from voting  
const canVote = isVotingPhase && !currentPlayer?.isEliminated;

// Action handler guards
const handleAskPlayer = (targetPlayerId: string) => {
  if (currentPlayer?.isEliminated) {
    setError('You cannot ask questions - you have been eliminated');
    return;
  }
  // ...
};

const handleVote = (targetPlayerId: string) => {
  if (currentPlayer?.isEliminated) {
    setError('You cannot vote - you have been eliminated');
    return;
  }
  // ...
};

// Spectator overlays in both phases
{currentPlayer?.isEliminated && (
  <div className="...spectator message...">
    💀 Spectating - You have been eliminated
  </div>
)}
```

---

## Visual Comparison

### Active Player:
- 😊 Smiley face
- Colorful avatar (player's assigned color)
- Full opacity, no filters
- Can interact (Ask/Vote buttons visible)
- "Ready" / "Not Ready" status

### Eliminated Player:
- 💀 Skull emoji
- Grey avatar (#6B7280)
- 30% opacity + greyscale + blur
- Cannot interact (no buttons)
- "💀 Eliminated" status
- Spectator message overlay

---

## Testing Checklist

### Elimination State
- [ ] Player gets eliminated after voting
- [ ] Eliminated player sees spectator message
- [ ] Eliminated player appears grey/faded
- [ ] Eliminated player shows skull emoji

### Action Prevention
- [ ] Eliminated player can't ask questions
- [ ] Eliminated player can't vote
- [ ] Error message shown when attempting actions
- [ ] Other players can't target eliminated players

### Visual Display
- [ ] Eliminated players visible around table
- [ ] Clear visual distinction from active players
- [ ] Consistent styling in both phases
- [ ] Spectator overlay displays properly

### Vote Calculations
- [ ] Eliminated players not counted in majority
- [ ] Active player count correct after elimination
- [ ] Results trigger correctly with fewer active players

---

## Files Modified

1. `components/game/CircularTable.tsx` - Visual styling, button hiding
2. `components/game/VotingTable.tsx` - Visual styling consistency
3. `app/game/[id]/page.tsx` - Action guards, canAsk/canVote checks, spectator overlays

---

## Status

✅ **Complete** - Eliminated players now in full spectator mode
- Cannot perform actions
- Clearly visually distinguished
- Spectator message displayed
- Not counted in game calculations
- Can observe ongoing gameplay

Ready for testing!

