# 🎮 Ready to Test the New Game UI!

## 🔄 Step 1: Restart the Server

The game logic and UI have been completely rebuilt. You need to restart:

```bash
# In your terminal, press Ctrl+C to stop the current server
# Then run:
npm run dev:all
```

Wait for both servers to start:
```
[0] ✓ Ready in XXXXms
[1] 🚀 Socket.io server running on port 3001
```

## 🎯 Step 2: Test the Game

### Open 4-5 Browser Tabs
1. Go to http://localhost:3000 in each tab
2. Click "Play Now"
3. Enter different names (e.g., Alice, Bob, Charlie, Diana, Eve)
4. All players join the same lobby

### Start the Game
1. Click "I'm Ready!" in each tab
2. When all ready, game auto-starts
3. One random player becomes the Impostor

## 🎨 What You'll See

### The New Circular Table Layout

**Top Left:**
- Category name
- Your topic (or "You are the IMPOSTOR")
- Phase and round info

**Top Right:**
- Question tracker (checkboxes for each player)
- Ready to Vote box (shows avatars of ready players)

**Center:**
- Players arranged in a circle with colored avatars
- "Ask" buttons above each player
- Center dialogue showing all Q&A

**Bottom (when you're asked a question):**
- Question panel with 30-second timer
- Text input for your answer
- Submit and Pass buttons

## 🧪 Test Scenarios

### Scenario 1: Ask a Question
1. **In Tab 1:** Click "Ask" button next to another player
2. **Modal appears:** Type a question (e.g., "Is this big?")
3. **Watch word counter:** Must be 2-15 words
4. **Click Submit**
5. **In Tab 2 (target player):** See question appear at bottom
6. **Type answer and Submit**
7. **All tabs:** See Q&A appear in center dialogue

### Scenario 2: Pass a Question
1. When asked a question, click "Pass" instead of answering
2. See "Passed" appear in center dialogue with gray background

### Scenario 3: Draft Saving
1. Click "Ask" on a player
2. Start typing a question
3. Click "Cancel"
4. Click "Ask" on the same player again
5. Your draft should still be there!

### Scenario 4: Ready to Vote
1. After asking some questions, click "I'm Ready to Vote"
2. See your avatar appear in the Ready to Vote box
3. When 3+ players (majority) are ready:
   - Voting phase starts automatically
   - All pending questions get "Timed out" response

### Scenario 5: Question Locking
1. **Tab 1:** Click "Ask" on Player 3
2. **Tab 2:** Click "Ask" on Player 3 at the same time
3. **First to submit wins**
4. **Second player gets error:** "Player is busy"
5. **Their draft is saved** for next time

## 🎭 Role-Specific Testing

### If You're the Impostor:
- Top left shows "You are the IMPOSTOR" (red badge)
- You DON'T see the topic
- Try to blend in by asking clever questions
- Deduce the topic from others' answers

### If You're a Regular Player:
- Top left shows "Topic: [topic name]" (green badge)
- Ask questions to identify the Impostor
- Watch for suspicious answers

## 📊 What to Watch in Terminal

You should see logs like:
```
Player player_xxx clicked ready in game game_yyy
Game game_yyy started! Impostor: player_zzz
Player player_xxx is ready to vote
Majority ready to vote in game_yyy, forcing voting phase
```

## 🐛 Troubleshooting

### "Connecting to game..." forever
- Check terminal for server errors
- Make sure Socket.io server started (port 3001)
- Refresh the page

### Can't click "Ask" button
- Make sure game has started (not in lobby)
- Check if you've used all your questions (see tracker)
- Verify you're not eliminated

### Question not appearing
- Check browser console for errors
- Make sure target player isn't already answering
- Try asking a different player

### Draft not saving
- This is per-session only (not persistent)
- Refreshing page clears drafts
- Working as designed for MVP

## 🎉 Success Criteria

You've successfully tested when:
- ✅ All players see the circular table
- ✅ Questions appear in center dialogue
- ✅ Answers update in real-time
- ✅ Question tracker updates correctly
- ✅ Ready to vote triggers majority vote
- ✅ No console errors

## 🚀 What's Next

After confirming everything works:
1. **Voting UI** - Click players to vote
2. **Round timer** - Countdown for entire round
3. **Topic guess** - Modal for Impostor
4. **Results screen** - Winner announcement
5. **Polish** - Animations, sounds, mobile

---

**Ready? Restart the server and start testing!** 🎮

The game is now playable from start to questioning phase. Have fun! 🎉

