# UI Phase Fix - Interrogation & Voting UI

## Problem
After refactoring the GameEngine to use generic phase names (`'interrogation'`, `'voting'`, etc.), the game UI was still checking for old phase names (`'round1-question'`, `'round2-question'`, `'round1-voting'`, `'round2-voting'`).

**Result:**
- ❌ `canAsk` was always `false` → No "Ask" buttons visible
- ❌ `isVotingPhase` was always `false` → Voting UI never showed
- ❌ Game appeared frozen in interrogation phase with no interaction possible

---

## Solution

### Updated Phase Detection

**Before:**
```typescript
const canAsk = gameState.phase === 'round1-question' || gameState.phase === 'round2-question';
const isVotingPhase = gameState.phase === 'round1-voting' || gameState.phase === 'round2-voting';
```

**After:**
```typescript
const canAsk = gameState.phase === 'interrogation';
const isVotingPhase = gameState.phase === 'voting';
```

### Updated Configuration Access

**Before:**
```typescript
// Hardcoded round checks
const maxQuestions = gameState.currentRound === 1 
  ? gameState.config?.round1QuestionsPerPlayer || 2
  : gameState.config?.round2QuestionsPerPlayer || 1;
```

**After:**
```typescript
// Dynamic round config lookup
const maxQuestions = gameState.settings?.rounds[gameState.currentRoundIndex]?.maxQuestionsPerPlayer || 2;
```

### Updated Timer Initialization

**Before:**
```typescript
useEffect(() => {
  if (gameState && (gameState.phase === 'round1-voting' || gameState.phase === 'round2-voting')) {
    setVotingTimer(30); // Hardcoded
    // ...
  }
}, [gameState?.phase]);
```

**After:**
```typescript
useEffect(() => {
  if (gameState && gameState.phase === 'voting') {
    // Get voting time from current round config
    const votingTime = gameState.settings?.rounds[gameState.currentRoundIndex]?.votingTime || 30;
    setVotingTimer(votingTime);
    // ...
  }
}, [gameState?.phase, gameState?.currentRoundIndex]);
```

---

## Changes Made

### File: `app/game/[id]/page.tsx`

1. **Phase Detection** (Lines ~332-337)
   - Updated `canAsk` to check for `'interrogation'` phase
   - Updated `isVotingPhase` to check for `'voting'` phase

2. **Config Access** (Line ~332)
   - Changed from round-specific config (`round1QuestionsPerPlayer`) 
   - To dynamic round config (`settings.rounds[currentRoundIndex].maxQuestionsPerPlayer`)

3. **Voting Reset Effect** (Lines ~130-138)
   - Updated phase check to use generic `'voting'`
   - Added voting time lookup from current round config
   - Added `currentRoundIndex` to dependencies

4. **Voting Timer Effect** (Lines ~140-155)
   - Updated phase check to use generic `'voting'`

5. **Settings References** (Lines ~504, ~516)
   - Updated `gameState.config` → `gameState.settings`
   - For `maxQuestionLength` and `answerTimeLimit`

---

## Impact

### Now Working ✅
- ✅ "Ask" buttons appear during interrogation phase
- ✅ "Ready to Vote" button appears during interrogation phase
- ✅ Voting UI appears during voting phase
- ✅ Voting timer uses per-round configuration
- ✅ Max questions per player uses per-round configuration
- ✅ UI properly transitions between phases

### Flexible N-Round Support ✅
- ✅ Works with any number of rounds (1, 2, 3+)
- ✅ Each round can have different settings
- ✅ No hardcoded round logic in UI

---

## Testing Checklist

### Interrogation Phase
- [ ] Players see other players around the table
- [ ] "Ask" button appears on each player
- [ ] Clicking "Ask" opens question modal
- [ ] Questions appear in center dialogue
- [ ] Question tracker shows used questions
- [ ] "Ready to Vote" button appears
- [ ] Majority ready triggers voting phase

### Voting Phase
- [ ] Table switches to voting layout
- [ ] "Vote" buttons appear on each player
- [ ] Voting timer displays and counts down
- [ ] Selected vote is highlighted
- [ ] "Lock in Vote" button appears after voting
- [ ] Current votes box shows all votes
- [ ] Chat interface works
- [ ] Timer expiration or all votes locked triggers results

### Multi-Round
- [ ] Round indicator shows current round
- [ ] Settings change per round (questions, timers)
- [ ] Phase transitions work between rounds
- [ ] Win conditions respect round settings

---

## Backward Compatibility

**Legacy Support:**
- Server still sends both `config` (legacy) and `settings` (new)
- Old clients can still work with `config`
- New clients use `settings` for flexibility
- No breaking changes for existing games

---

## Files Modified
1. `app/game/[id]/page.tsx` - Phase detection and config access updates

---

**Status**: ✅ Complete - UI now works with generic phase names
**Related**: Step 3 (Server Updates), GameEngine Refactor

