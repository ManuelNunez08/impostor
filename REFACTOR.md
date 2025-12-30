# 🔄 Game Settings Refactor

## Branch: `refractor`

This document tracks the refactoring of the game to support flexible, configurable rounds.

---

## 🎯 Goals

1. **Flexible Round System**: Support N rounds instead of hardcoded 2 rounds
2. **Configurable Settings**: Each round can have different:
   - Interrogation time
   - Max questions per player
   - Voting time
   - Win conditions (impostor can guess or not)
3. **Lobby Creation**: Players can customize game settings before starting
4. **Cleaner Architecture**: Generic phases instead of round1-question, round2-question, etc.

---

## 📋 Progress

### ✅ Step 1: Type Definitions (COMPLETED)

**Files Modified:**
- `types/game.ts`
  - Added `RoundConfig` interface
  - Added `GameSettings` interface (replaces GameConfig)
  - Updated `GamePhase` to use generic phases (interrogation, voting, results)
  - Added `LegacyGamePhase` for backward compatibility
  - Changed `Round` from `1 | 2` to `number` (supports N rounds)
  - Added `currentRoundIndex` to GameState and PlayerView
  - Added `DEFAULT_GAME_SETTINGS` constant

**Files Created:**
- `lib/game-engine/settingsHelper.ts`
  - `getRoundConfig()` - Get config for specific round
  - `getCurrentRoundConfig()` - Get current round config
  - `hasNextRound()` - Check if more rounds exist
  - `validateRoundConfig()` - Validate round settings
  - `validateGameSettings()` - Validate full game settings
  - `legacyConfigToSettings()` - Migration helper
  - `createDefaultRound()` - Create new round with defaults

**Default Settings (matches game design):**
```typescript
Round 1:
  - Interrogation: 3:00
  - Max Questions: 2
  - Voting: 0:30
  - Impostor Can Guess: True

Round 2:
  - Interrogation: 2:00
  - Max Questions: 1
  - Voting: 0:30
  - Impostor Can Guess: False
```

---

### ✅ Step 2: GameEngine Refactor (COMPLETED)

**Files Modified:**
- `lib/game-engine/GameEngine.ts`

**Changes Made:**
1. **Updated Constructor**
   - Now accepts optional `GameSettings` parameter
   - Falls back to `DEFAULT_GAME_SETTINGS` if not provided
   - Initializes `currentRoundIndex` to 0
   - Stores both legacy `config` and new `settings`

2. **Updated Phase Logic**
   - `startGame()` → Uses generic 'interrogation' phase
   - `transitionToVoting()` → Uses generic 'voting' phase
   - `canPlayerAskQuestion()` → Checks for 'interrogation' phase
   - `canPlayerVote()` → Checks for 'voting' phase

3. **Updated Configuration Usage**
   - All methods now use `settings` instead of hardcoded `config`
   - `canPlayerAskQuestion()` → Uses current round's maxQuestionsPerPlayer
   - `canStartGame()` → Uses settings.minPlayers/maxPlayers
   - `getLobbyCountdownRemaining()` → Uses settings.lobbyCountdownDuration

4. **Rewrote Win Condition Logic**
   - `processVotingResults()` → Implements flexible win conditions:
     - If impostor NOT voted out:
       - Has more rounds → Go to 'results' phase
       - No more rounds → Impostor wins
     - If impostor voted out:
       - Round config allows guess → Go to 'topic-guess' phase
       - No guess allowed → Players win

5. **Added New Methods**
   - `transitionToNextRound()` → Moves to next round from results
   - `getCurrentRoundConfig()` → Gets current round configuration
   - `hasMoreRounds()` → Checks if more rounds exist

**Backward Compatibility:**
- Constructor still works with no parameters (uses defaults)
- Both `config` and `settings` stored in state
- Legacy phases can still be handled by UI during migration

---

### ✅ Step 3: Server Updates (COMPLETED)

**Files Modified:**
- `server/index.ts`
  - Updated all `state.config` references to `state.settings`
  - Updated `getPlayerView()` to return both `currentRound` (display) and `currentRoundIndex`
  - Updated `getPlayerView()` to include both legacy `config` and new `settings`
  - Enhanced voting handler to emit phase changes after `processVotingResults()`
  - Added logging for voting results and phase transitions
  
- `types/socket.ts`
  - Added missing `game:ready-to-vote` event to ClientToServerEvents

**Key Changes:**
1. **Config → Settings Migration**
   - All server code now uses `state.settings` instead of `state.config`
   - PlayerView includes both for backward compatibility during migration
   
2. **Phase Transitions**
   - Voting handler properly emits `game:phase-change` after results are processed
   - GameEngine automatically handles phase transitions based on win conditions
   - Server logs phase transitions for debugging
   
3. **PlayerView Updates**
   - Returns `currentRound` (1-based display: "Round 1", "Round 2")
   - Returns `currentRoundIndex` (0-based array index: 0, 1, 2...)
   - Includes both `config` (legacy) and `settings` (new) fields

**No Breaking Changes:**
- All existing socket events still work
- Backward compatible with old client code
- Topic guess handler already existed and works with new logic

---

### 🔜 Step 4: Lobby Creation UI (TODO)

**Planned Components:**
- `LobbyCreation.tsx` - Main lobby creation page
- `RoundConfigPanel.tsx` - Configure individual round
- `GameSettingsForm.tsx` - Overall game settings

**Features:**
- Up/down arrows for numeric values
- Add/Remove rounds
- Default configurations
- Validation feedback
- Visual round preview

---

### 🔜 Step 5: Game UI Updates (TODO)

**Planned Changes:**
- Update game page to use generic phases
- Remove round-specific logic
- Add results phase UI
- Add topic guess phase UI
- Update timer displays to use round config

---

### 🔜 Step 6: Testing (TODO)

**Test Cases:**
- [ ] 1-round game
- [ ] 2-round game (default)
- [ ] 3+ round game
- [ ] Different configs per round
- [ ] Win conditions work correctly
- [ ] Topic guess phase
- [ ] Results phase
- [ ] Edge cases (all rounds, no rounds, etc.)

---

## 🎮 Win Conditions Logic

**Per Round After Voting:**

```
IF impostor NOT voted out:
  IF hasNextRound():
    → Continue to results phase → Next round
  ELSE:
    → Impostor wins (game ends)

ELSE IF impostor voted out:
  IF round.impostorCanGuess == false:
    → Players win (game ends)
  ELSE:
    → Topic guess phase
      IF guess correct:
        → Impostor wins
      ELSE:
        → Players win
```

---

## 📝 Migration Strategy

1. **Phase 1**: Add new types alongside old (✅ DONE)
2. **Phase 2**: Update GameEngine to support both configs
3. **Phase 3**: Create adapter layer if needed
4. **Phase 4**: Update UI components gradually
5. **Phase 5**: Remove legacy code

**Backward Compatibility:**
- Old `GameConfig` still works
- Legacy phases still recognized
- Migration helper converts old → new

---

## 🚀 Next Actions

1. Update `GameEngine.ts` to use `GameSettings`
2. Test with existing games still work
3. Add new win condition logic
4. Build lobby creation UI
5. Test complete game flow

---

## 📚 Resources

- Main types: `types/game.ts`
- Helper functions: `lib/game-engine/settingsHelper.ts`
- Game engine: `lib/game-engine/GameEngine.ts`
- Server: `server/index.ts`

---

**Last Updated**: Step 3 Complete - Server Updated
**Next Step**: Lobby Creation UI

