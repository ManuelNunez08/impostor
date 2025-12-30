# Impostor - Social Deduction Game

A multiplayer web-based social deduction game built with Next.js, TypeScript, and Socket.io.

## 🎮 Game Overview

Impostor is a social deduction game for 4-6 players where all players share the same secret topic—except one, the Impostor, who must deduce the topic without being exposed. Players ask and answer short, directed questions to identify the Impostor before time runs out.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd impostor
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env.local
```

### Running the Application

#### Development Mode

Run both the Next.js frontend and Socket.io server concurrently:

```bash
npm run dev:all
```

Or run them separately:

```bash
# Terminal 1 - Next.js frontend
npm run dev

# Terminal 2 - Socket.io server
npm run dev:server
```

The application will be available at:
- Frontend: http://localhost:3000
- Socket.io Server: http://localhost:3001

## 📁 Project Structure

```
impostor/
├── app/                    # Next.js app router pages
│   ├── page.tsx           # Landing page
│   ├── lobby/             # Lobby/join page
│   ├── game/[id]/         # Game room page
│   └── rules/             # Rules page
├── components/            # React components
│   ├── game/             # Game-specific components
│   ├── lobby/            # Lobby components
│   └── ui/               # Reusable UI components
├── lib/                   # Core logic
│   ├── game-engine/      # Game state and rules
│   ├── socket/           # Socket.io client setup
│   ├── db/               # Database utilities
│   └── matchmaking/      # Matchmaking logic
├── types/                 # TypeScript type definitions
├── server/                # Socket.io server
├── prisma/                # Database schema
└── public/                # Static assets
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Socket.io Client** - Real-time communication

### Backend
- **Node.js** - Runtime
- **Socket.io** - WebSocket server
- **Prisma** - Database ORM (ready to configure)
- **Redis** - Session management (ready to configure)

## 🎯 Current Features

- ✅ Landing page with game overview
- ✅ Lobby system for joining games
- ✅ Real-time game state synchronization
- ✅ Core game engine with full rule implementation
- ✅ Question/answer system
- ✅ Voting mechanism
- ✅ Win condition handling
- ✅ Full game rules page

## 🚧 Roadmap

### Phase 1: Core Functionality (Current)
- [x] Project structure
- [x] Game engine
- [x] Basic UI pages
- [ ] Complete game flow implementation
- [ ] Timer system
- [ ] Question/answer UI components
- [ ] Voting UI

### Phase 2: Matchmaking
- [ ] Queue system
- [ ] Auto-matching
- [ ] Private rooms

### Phase 3: Persistence
- [ ] Database setup (Prisma + PostgreSQL)
- [ ] User accounts
- [ ] Game history
- [ ] Statistics

### Phase 4: Polish
- [ ] Animations
- [ ] Sound effects
- [ ] Mobile optimization
- [ ] Tutorial/onboarding

## 🎮 How to Play

1. Visit the home page and click "Play Now"
2. Enter your name in the lobby
3. Wait for 4-6 players to join
4. Once everyone is ready, the game begins
5. If you're the Impostor, try to blend in without knowing the topic
6. If you're a regular player, ask strategic questions to find the Impostor
7. Vote for who you think is the Impostor
8. Win by correctly identifying the Impostor or surviving as the Impostor!

## 📝 Development Notes

### Adding New Categories/Topics

Edit `lib/game-engine/categories.ts` to add new categories and topics:

```typescript
{
  id: 'your-category',
  name: 'Your Category Name',
  description: 'Description',
  topics: ['Topic 1', 'Topic 2', ...],
}
```

### Socket Events

All socket events are typed in `types/socket.ts`. The server implementation is in `server/index.ts`.

### Game State Management

The game engine (`lib/game-engine/GameEngine.ts`) manages all game logic and state transitions. It's framework-agnostic and can be tested independently.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Inspired by social deduction games like Spyfall and Among Us
- Built with modern web technologies for real-time multiplayer experiences
