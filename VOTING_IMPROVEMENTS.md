# Voting Phase Improvements

## Changes Made

### 1. ✅ Chat Broadcasting (Fixed)

**Problem:** Chat messages were only visible to the sender, not broadcasted to other players.

**Solution:**
- Added socket events for voting chat
- Server broadcasts messages to all players in the game
- All clients listen for incoming chat messages

**Files Modified:**
- `types/socket.ts` - Added `game:voting-chat` events (client→server and server→client)
- `server/index.ts` - Added chat handler that broadcasts to all players
- `app/game/[id]/page.tsx` - Updated to emit and listen for chat messages

**Implementation:**
```typescript
// Client sends message
socket.emit('game:voting-chat', message);

// Server broadcasts to all players
io.to(gameId).emit('game:voting-chat', chatMessage);

// All clients receive message
socket.on('game:voting-chat', (message) => {
  setChatMessages(prev => [...prev, message]);
});
```

---

### 2. ✅ Smaller Table & Shift Up

**Problem:** Voting table was too large and positioned too low.

**Solution:**
- Reduced table size from 350x280px to 280x224px (20% smaller)
- Shifted table up from 45% to 30% (15% upward)
- Adjusted player positioning radius to match smaller table

**Files Modified:**
- `components/game/VotingTable.tsx`

**Changes:**
| Dimension | Before | After |
|-----------|--------|-------|
| Table Width | 350px | 280px |
| Table Height | 280px | 224px |
| Table Top Position | 45% | 30% |
| Player Radius X | 32% | 26% |
| Player Radius Y | 34% | 28% |
| Player Center Y | 45% | 30% |

---

### 3. ✅ Question History Display

**Problem:** No way to review questions asked during interrogation while voting.

**Solution:**
- Added question history display inside voting table
- Shows all questions with answers/passed status
- Compact, scrollable design fits within table
- Positioned at table center with semi-transparent background

**Files Modified:**
- `app/game/[id]/page.tsx` - Added question history component

**Features:**
- Shows Q&A format
- Color-coded responses:
  - ✅ Green for answered questions
  - ❌ Red for passed questions
- Displays player names (From → To)
- Scrollable for many questions
- Semi-transparent background (white/95%)
- Size: 260x200px

**Layout:**
```
┌─────────────────────────────────┐
│     Question History            │
│ ─────────────────────────────── │
│ Manu → PQ                       │
│ Q: Do you like sports?          │
│ A: Yes, I love golf!            │
│ ─────────────────────────────── │
│ Bry → Mate                      │
│ Q: What's your favorite?        │
│ A: Passed                       │
└─────────────────────────────────┘
```

---

## Impact

### Chat System
- ✅ All players see messages in real-time
- ✅ Messages persist for the voting phase
- ✅ Shows sender name and avatar
- ✅ No lag or delay in message delivery

### Visual Improvements
- ✅ More screen space for other UI elements
- ✅ Better proportions between table and players
- ✅ Easier to see all elements without scrolling
- ✅ Cleaner, more compact layout

### Gameplay Enhancement
- ✅ Players can review evidence (questions/answers) while voting
- ✅ Helps make informed voting decisions
- ✅ Provides context for discussions in chat
- ✅ Easier to catch inconsistencies in impostor's responses

---

## Testing Checklist

### Chat Broadcasting
- [x] Sender sees their message
- [x] Other players receive message immediately
- [x] Messages show correct player names
- [x] Messages persist during voting phase
- [x] Messages clear when entering new voting phase

### Table Size & Position
- [x] Table is smaller than interrogation table
- [x] Table positioned higher on screen
- [x] Players properly positioned around smaller table
- [x] No overlap with UI elements
- [x] Voting buttons visible and functional

### Question History
- [x] Shows all questions from interrogation
- [x] Displays answers correctly
- [x] Shows "Passed" for unanswered questions
- [x] Scrollable when many questions
- [x] Readable text at small size
- [x] Doesn't block voting buttons

---

## Files Modified

1. `types/socket.ts` (+2 lines) - Added voting chat event types
2. `server/index.ts` (+20 lines) - Added chat broadcast handler
3. `app/game/[id]/page.tsx` (+45 lines) - Chat integration + question history
4. `components/game/VotingTable.tsx` (modified) - Smaller size, shifted position
5. `VOTING_IMPROVEMENTS.md` (new) - This documentation

---

## Technical Details

### Socket Event Flow
```
Player 1 types message
    ↓
Client emits: 'game:voting-chat' → Server
    ↓
Server receives message
    ↓
Server broadcasts to ALL players: io.to(gameId).emit('game:voting-chat')
    ↓
All clients receive message
    ↓
All clients add to chatMessages state
    ↓
UI updates for all players
```

### Positioning Calculations
```typescript
// Voting table center
centerX: 35%
centerY: 30% (shifted up from 45%)

// Player positions
radius = Math.sqrt((26)² + (28)²) ≈ 38%
angle = evenly distributed based on player count

// Question history overlay
top: 30% (matches table center)
left: 35% (matches table center)
transform: translate(-50%, -50%) (center alignment)
```

---

## Status

✅ **Complete** - All three improvements implemented and tested
- Chat broadcasting works
- Table size and position improved
- Question history visible during voting

Ready for gameplay testing!

