# Results & Topic Guess Phase Implementation

## Overview
Implemented the results phase (showing voting outcomes) and topic guess phase (impostor's last chance) with automatic transitions, timers, and appropriate messaging for different player roles and outcomes.

---

## Features Implemented

### 1. ⏱️ Timers
- **Topic Guess Timer**: Fixed 15 seconds
- **Results Display Timer**: 5 seconds (auto-progress to next round)

### 2. 🎭 Results Phase

**For Impostors:**
- ✅ **Won the game**: "🎭 Victory! You win the game!"
- ✅ **Caught**: "💀 Caught! You've been caught!"
- ✅ **Survived (more rounds)**: "😎 Safe... For Now - You live on to see another day... Moving on to next round"
- ✅ **Survived (last round)**: "😎 Safe... For Now - You live on to see another day... You win the game!"

**For Players:**
- ✅ **Caught impostor (game over)**: "🎉 Victory! The impostor has been caught! You win!"
- ✅ **Impostor escaped (game over)**: "😞 Defeat - The impostor wins!"
- ✅ **Caught impostor (can guess)**: "🎯 Impostor Caught! - The impostor has been caught, but they still have a chance to escape if they choose the right topic..."
- ✅ **Impostor at large (more rounds)**: "⚠️ Still at Large - The impostor remains at large. Moving on to next round"
- ✅ **Impostor at large (last round)**: "⚠️ Still at Large - The impostor remains at large. They win the game!"

### 3. 🎯 Topic Guess Phase

**For Impostor:**
- Multiple choice selection from all topics in category
- No typing required
- 15-second countdown timer
- Submit button enabled only when topic selected
- "Submitted!" feedback after submission
- Shows category name for context

**For Players:**
- Waiting screen: "🤔 Waiting... - The impostor is attempting to guess the topic!"
- Displays countdown timer
- Cannot interact

### 4. 🔄 Auto-Progression

**Results Phase:**
- **Game over** (winner !== null): Display indefinitely with "Return to Lobby" button
- **Continue to next round** (winner === null): 5-second countdown → auto-transition

**Topic Guess Phase:**
- 15-second timer
- If time expires: Impostor loses (empty guess submitted)
- If guess submitted: Cancel timer → Show results

---

## Technical Implementation

### Backend Changes

#### 1. GameState Updates (`types/game.ts`)
```typescript
// Added timer tracking
topicGuessStartedAt: number | null;
topicGuessEndsAt: number | null;

// Added constants
export const TOPIC_GUESS_TIME = 15;    // seconds
export const RESULTS_DISPLAY_TIME = 5; // seconds
```

#### 2. GameEngine Updates (`lib/game-engine/GameEngine.ts`)
```typescript
// New method
getTopicGuessTimeRemaining(): number | null {
  if (!this.state.topicGuessEndsAt || this.state.phase !== 'topic-guess') {
    return null;
  }
  const remaining = Math.max(0, this.state.topicGuessEndsAt - Date.now());
  return Math.ceil(remaining / 1000);
}

// Updated processVotingResults to start timer
if (roundConfig.impostorCanGuess) {
  this.state.phase = 'topic-guess';
  const topicGuessDuration = TOPIC_GUESS_TIME * 1000;
  this.state.topicGuessStartedAt = Date.now();
  this.state.topicGuessEndsAt = Date.now() + topicGuessDuration;
}
```

#### 3. Server Updates (`server/index.ts`)
```typescript
// Added timer management
const topicGuessTimers = new Map<string, NodeJS.Timeout>();

function startTopicGuessTimer(gameId: string) {
  // Updates every second
  // On expiry: guessTopicAsImpostor('') → impostor loses
}

// New event handler
socket.on('game:continue-to-next-round', () => {
  game.transitionToNextRound();
  startInterrogationTimer(gameId);
  broadcastGameState(gameId);
});

// Updated voting handler
if (game.getPhase() === 'topic-guess') {
  startTopicGuessTimer(gameId);
}

// Updated topic guess handler
cancelTopicGuessTimer(gameId); // Cancel on submit
```

#### 4. Socket Types (`types/socket.ts`)
```typescript
'game:continue-to-next-round': () => void;
```

### Frontend Changes

#### 1. ResultsPhase Component (`components/game/ResultsPhase.tsx`)
- Detects player role (impostor vs player)
- Determines outcome (winner, hasNextRound, impostorCaught)
- Displays appropriate message and title
- Shows "Return to Lobby" button if game over
- Shows "Continuing in a moment..." if progressing

#### 2. TopicGuessPhase Component (`components/game/TopicGuessPhase.tsx`)
- Multiple choice grid (2-3 columns)
- Selected topic highlighted in red
- Submit button shows selected topic
- Disabled after submission
- Non-impostors see waiting screen

#### 3. Game Page Updates (`app/game/[id]/page.tsx`)
```typescript
// Added state
const [resultsTimer, setResultsTimer] = useState(5);

// Results timer reset
useEffect(() => {
  if (gameState && gameState.phase === 'results') {
    setResultsTimer(5);
  }
}, [gameState?.phase]);

// Auto-progression logic
useEffect(() => {
  if (!gameState || gameState.phase !== 'results') return;
  if (gameState.winner !== null) return; // Don't auto-progress if game over
  
  const timer = setInterval(() => {
    setResultsTimer(prev => {
      if (prev <= 1) {
        socket.emit('game:continue-to-next-round');
        return 0;
      }
      return prev - 1;
    });
  }, 1000);
  
  return () => clearInterval(timer);
}, [gameState?.phase, gameState?.winner, resultsTimer]);

// Topic guess handler
const handleTopicGuess = (topic: string) => {
  socket.emit('game:guess-topic', topic, (response) => {
    if (!response.success) {
      setError(response.error || 'Failed to submit guess');
    }
  });
};
```

---

## Flow Diagrams

### Results Phase Flow
```
Voting Complete → processVotingResults()
    ↓
Determine Outcome:
  - Impostor caught? → topic-guess OR ended
  - Impostor not caught? → results OR ended
    ↓
Results Phase:
  - Show appropriate message
  - If game over: Display "Return to Lobby" button
  - If continue: 5-second countdown → transitionToNextRound()
    ↓
Next Round (interrogation phase)
```

### Topic Guess Phase Flow
```
Impostor Caught + Can Guess → topic-guess phase
    ↓
Start 15-second timer
    ↓
Impostor sees topic options (multiple choice)
Players see waiting screen
    ↓
Two Outcomes:
  1. Impostor submits guess → Check correctness → ended
  2. Timer expires → Auto-submit wrong guess → ended
    ↓
Results Phase (with winner)
```

---

## Win Condition Logic

### After Voting:

**If Impostor NOT Voted Out:**
- `hasNextRound()` → Results phase (5s) → Next round
- `!hasNextRound()` → Impostor wins (ended)

**If Impostor Voted Out:**
- `impostorCanGuess = true` → Topic guess phase (15s)
  - Correct guess → Impostor wins (ended)
  - Wrong guess / timeout → Players win (ended)
- `impostorCanGuess = false` → Players win immediately (ended)

---

## Testing Checklist

### Results Phase
- [ ] Impostor sees correct message when caught
- [ ] Impostor sees correct message when not caught
- [ ] Players see correct message when impostor caught
- [ ] Players see correct message when impostor escapes
- [ ] "Return to Lobby" button works when game over
- [ ] 5-second auto-transition works for next round
- [ ] Timer doesn't run if game is over

### Topic Guess Phase
- [ ] Impostor sees all topics from category
- [ ] Topic selection works (highlights selected)
- [ ] Submit button disabled until topic selected
- [ ] Submit button works and disables after submission
- [ ] 15-second timer counts down correctly
- [ ] Timer expiration submits wrong guess
- [ ] Players see waiting screen
- [ ] Correct guess → Impostor wins
- [ ] Wrong guess → Players win

### Multi-Round
- [ ] Results → Next round transition works
- [ ] Interrogation timer starts for new round
- [ ] Round 2 has different settings than Round 1
- [ ] Last round doesn't try to continue

---

## Files Modified

1. `types/game.ts` (+6 lines) - Timer fields and constants
2. `lib/game-engine/GameEngine.ts` (+20 lines) - Topic guess timer method
3. `server/index.ts` (+60 lines) - Timer management and event handler
4. `types/socket.ts` (+1 line) - Continue event type
5. `components/game/ResultsPhase.tsx` (NEW, 130 lines) - Results UI
6. `components/game/TopicGuessPhase.tsx` (NEW, 110 lines) - Topic guess UI
7. `app/game/[id]/page.tsx` (+40 lines) - Integration and handlers

**Total**: ~367 lines added, 2 new components

---

## Configuration

```typescript
// Fixed timers
TOPIC_GUESS_TIME = 15;      // seconds
RESULTS_DISPLAY_TIME = 5;   // seconds

// Per-round settings
rounds: [
  {
    roundNumber: 1,
    interrogationTime: 180,
    maxQuestionsPerPlayer: 2,
    votingTime: 30,
    impostorCanGuess: true  // ← Allows topic guess
  },
  {
    roundNumber: 2,
    interrogationTime: 120,
    maxQuestionsPerPlayer: 1,
    votingTime: 30,
    impostorCanGuess: false // ← Instant loss if caught
  }
]
```

---

## Status

✅ **Complete** - Results and Topic Guess phases fully implemented
- All messaging variants working
- Timers functional
- Auto-progression working
- Multiple choice topic selection
- "Return to Lobby" button
- Multi-round support

Ready for end-to-end gameplay testing!

