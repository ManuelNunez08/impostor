/**
 * Socket.io Server Setup
 * Run this separately from Next.js: ts-node server/index.ts
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents } from '../types/socket.js';
import { GameEngine } from '../lib/game-engine/GameEngine.js';
import { getRandomCategory } from '../lib/game-engine/categories.js';
import { validatePlayerName, validateAnswer } from '../lib/game-engine/validation.js';
import { PlayerId } from '../types/game.js';

const PORT = process.env.PORT || 3001;

const httpServer = createServer();
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Store active games
const games = new Map<string, GameEngine>();
const playerToGame = new Map<string, string>(); // socketId -> gameId
const playerIdMap = new Map<string, PlayerId>(); // socketId -> playerId

// Shared waiting lobby
let waitingLobby: { game: GameEngine; gameId: string } | null = null;

// Countdown timers
const countdownTimers = new Map<string, NodeJS.Timeout>();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // ============= Lobby Events =============

  socket.on('lobby:join', (playerName, callback) => {
    const validation = validatePlayerName(playerName);
    if (!validation.valid) {
      callback({ success: false, error: validation.error });
      return;
    }

    try {
      let game: GameEngine;
      let gameId: string;

      // Check if there's a waiting lobby with space
      if (waitingLobby && Object.keys(waitingLobby.game.getState().players).length < 6) {
        game = waitingLobby.game;
        gameId = waitingLobby.gameId;
        console.log(`Player joining existing lobby: ${gameId}`);
      } else {
        // Create new game
        const category = getRandomCategory();
        game = new GameEngine(category);
        gameId = game.getState().id;
        games.set(gameId, game);
        waitingLobby = { game, gameId };
        console.log(`Created new lobby: ${gameId}`);
      }

      const playerId = game.addPlayer(playerName, socket.id);
      playerToGame.set(socket.id, gameId);
      playerIdMap.set(socket.id, playerId);
      socket.join(gameId);

      callback({ success: true, playerId, gameId });

      // Notify all players in the lobby
      io.to(gameId).emit('game:player-joined', playerId, playerName);
      
      const playerCount = Object.keys(game.getState().players).length;
      console.log(`Lobby ${gameId} now has ${playerCount} players`);

      // Start countdown if minimum players reached
      if (game.shouldStartCountdown()) {
        game.startLobbyCountdown();
        console.log(`Starting 30s countdown for lobby ${gameId} (${playerCount} players)`);
        startCountdownTimer(gameId);
      }

      broadcastGameState(gameId);

      // If lobby is full (6 players), clear waiting lobby so next player creates new one
      if (playerCount >= 6) {
        console.log(`Lobby ${gameId} is full, clearing waiting lobby`);
        waitingLobby = null;
      }
    } catch (error) {
      console.error('Error in lobby:join:', error);
      callback({ success: false, error: String(error) });
    }
  });

  socket.on('lobby:ready', () => {
    const gameId = playerToGame.get(socket.id);
    const playerId = playerIdMap.get(socket.id);
    
    console.log(`Player ${playerId} toggling ready in game ${gameId}`);
    
    if (!gameId || !playerId) {
      console.log('No gameId or playerId found');
      return;
    }
    
    const game = games.get(gameId);
    if (!game) {
      console.log('Game not found');
      return;
    }

    const player = game.getPlayer(playerId);
    if (!player) return;

    // Toggle ready state
    const newReadyState = !player.isReady;
    game.setPlayerReady(playerId, newReadyState);
    console.log(`Player ${playerId} is now ${newReadyState ? 'ready' : 'not ready'}`);
    
    const state = game.getState();
    const playerCount = Object.keys(state.players).length;
    const allReady = Object.values(state.players).every(p => p.isReady);
    const readyCount = Object.values(state.players).filter(p => p.isReady).length;
    
    console.log(`Ready status: ${readyCount}/${playerCount} players ready`);
    
    // Check if all players ready → instant start
    if (allReady && playerCount >= state.config.minPlayers && game.canStartGame()) {
      console.log(`All players ready in lobby ${gameId}, starting game immediately!`);
      
      // Clear this from waiting lobby if it's there
      if (waitingLobby && waitingLobby.gameId === gameId) {
        waitingLobby = null;
      }
      
      try {
        game.startGame();
        console.log(`Game ${gameId} started! Impostor: ${game.getImpostorId()}`);
        io.to(gameId).emit('game:phase-change', game.getPhase());
        broadcastGameState(gameId);
      } catch (error) {
        console.error('Error starting game:', error);
      }
      return;
    }

    // Start countdown if enough players and not started yet
    if (game.shouldStartCountdown()) {
      game.startLobbyCountdown();
      console.log(`Starting 30s countdown for lobby ${gameId}`);
      startCountdownTimer(gameId);
    }
    
    // Broadcast state update
    broadcastGameState(gameId);
  });

  socket.on('lobby:leave', () => {
    const gameId = playerToGame.get(socket.id);
    const playerId = playerIdMap.get(socket.id);
    
    if (!gameId || !playerId) return;
    
    const game = games.get(gameId);
    if (!game) return;

    game.removePlayer(playerId);
    socket.leave(gameId);
    playerToGame.delete(socket.id);
    playerIdMap.delete(socket.id);
    
    // Check if we need to cancel countdown
    const state = game.getState();
    const playerCount = Object.keys(state.players).length;
    
    if (playerCount < state.config.minPlayers && state.lobbyCountdownStarted) {
      game.cancelLobbyCountdown();
      cancelCountdownTimer(gameId);
      console.log(`Player left, below minimum. Cancelled countdown for ${gameId}`);
    }
    
    io.to(gameId).emit('game:player-left', playerId);
    broadcastGameState(gameId);
  });

  // ============= Game Actions =============

  socket.on('game:ask-question', (data, callback) => {
    const gameId = playerToGame.get(socket.id);
    const playerId = playerIdMap.get(socket.id);

    if (!gameId || !playerId) {
      callback({ success: false, error: 'Not in a game' });
      return;
    }

    const game = games.get(gameId);
    if (!game) {
      callback({ success: false, error: 'Game not found' });
      return;
    }

    try {
      const question = game.askQuestion(playerId, data.toPlayerId, data.question);
      io.to(gameId).emit('game:question-asked', question.id);
      broadcastGameState(gameId);
      callback({ success: true });
    } catch (error) {
      callback({ success: false, error: String(error) });
    }
  });

  socket.on('game:answer-question', (data, callback) => {
    const gameId = playerToGame.get(socket.id);
    const playerId = playerIdMap.get(socket.id);

    if (!gameId || !playerId) {
      callback({ success: false, error: 'Not in a game' });
      return;
    }

    const game = games.get(gameId);
    if (!game) {
      callback({ success: false, error: 'Game not found' });
      return;
    }

    const validation = validateAnswer(data.answer);
    if (!validation.valid) {
      callback({ success: false, error: validation.error });
      return;
    }

    try {
      game.answerQuestion(data.questionId, data.answer);
      io.to(gameId).emit('game:answer-given', data.questionId, data.answer);
      broadcastGameState(gameId);
      callback({ success: true });
    } catch (error) {
      callback({ success: false, error: String(error) });
    }
  });

  socket.on('game:pass-question', (questionId, callback) => {
    const gameId = playerToGame.get(socket.id);
    const playerId = playerIdMap.get(socket.id);

    if (!gameId || !playerId) {
      callback({ success: false, error: 'Not in a game' });
      return;
    }

    const game = games.get(gameId);
    if (!game) {
      callback({ success: false, error: 'Game not found' });
      return;
    }

    try {
      game.passQuestion(questionId);
      io.to(gameId).emit('game:question-passed', questionId);
      broadcastGameState(gameId);
      callback({ success: true });
    } catch (error) {
      callback({ success: false, error: String(error) });
    }
  });

  socket.on('game:ready-to-vote', (callback) => {
    const gameId = playerToGame.get(socket.id);
    const playerId = playerIdMap.get(socket.id);

    if (!gameId || !playerId) {
      if (callback) callback({ success: false, error: 'Not in a game' });
      return;
    }

    const game = games.get(gameId);
    if (!game) {
      if (callback) callback({ success: false, error: 'Game not found' });
      return;
    }

    try {
      game.setPlayerReadyToVote(playerId, true);
      console.log(`Player ${playerId} is ready to vote`);

      broadcastGameState(gameId);

      // Check if majority is ready to vote
      if (game.shouldForceVoting()) {
        console.log(`Majority ready to vote in ${gameId}, forcing voting phase`);
        game.timeoutAllPendingQuestions();
        game.transitionToVoting();
        io.to(gameId).emit('game:phase-change', game.getPhase());
        broadcastGameState(gameId);
      }

      if (callback) callback({ success: true });
    } catch (error) {
      console.error('Error in ready-to-vote:', error);
      if (callback) callback({ success: false, error: String(error) });
    }
  });

  socket.on('game:vote', (targetPlayerId, callback) => {
    const gameId = playerToGame.get(socket.id);
    const playerId = playerIdMap.get(socket.id);

    if (!gameId || !playerId) {
      callback({ success: false, error: 'Not in a game' });
      return;
    }

    const game = games.get(gameId);
    if (!game) {
      callback({ success: false, error: 'Game not found' });
      return;
    }

    try {
      game.castVote(playerId, targetPlayerId);
      io.to(gameId).emit('game:vote-cast', playerId);

      // Check if all players have voted
      const allVoted = game.getActivePlayers().every(p => p.hasVoted);
      if (allVoted) {
        game.processVotingResults();
        io.to(gameId).emit('game:voting-complete');
      }

      broadcastGameState(gameId);
      callback({ success: true });
    } catch (error) {
      callback({ success: false, error: String(error) });
    }
  });

  socket.on('game:guess-topic', (guess, callback) => {
    const gameId = playerToGame.get(socket.id);
    const playerId = playerIdMap.get(socket.id);

    if (!gameId || !playerId) {
      callback({ success: false, error: 'Not in a game' });
      return;
    }

    const game = games.get(gameId);
    if (!game) {
      callback({ success: false, error: 'Game not found' });
      return;
    }

    try {
      const isCorrect = game.guessTopicAsImpostor(guess);
      broadcastGameState(gameId);
      callback({ success: true, isCorrect });
    } catch (error) {
      callback({ success: false, error: String(error) });
    }
  });

  socket.on('game:get-state', (callback) => {
    const gameId = playerToGame.get(socket.id);
    const playerId = playerIdMap.get(socket.id);
    
    if (!gameId || !playerId) {
      console.log('game:get-state - No gameId or playerId found');
      callback(null);
      return;
    }
    
    const game = games.get(gameId);
    if (!game) {
      console.log(`game:get-state - Game ${gameId} not found`);
      // Clean up stale mappings
      playerToGame.delete(socket.id);
      playerIdMap.delete(socket.id);
      callback(null);
      return;
    }

    const playerView = getPlayerView(game, playerId);
    callback(playerView);
  });

  // ============= Disconnection =============

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    const gameId = playerToGame.get(socket.id);
    const playerId = playerIdMap.get(socket.id);
    
    if (gameId && playerId) {
      const game = games.get(gameId);
      if (game) {
        const player = game.getPlayer(playerId);
        if (player) {
          player.isConnected = false;
          
          // Check if we need to cancel countdown
          const state = game.getState();
          const connectedCount = Object.values(state.players).filter(p => p.isConnected).length;
          
          if (connectedCount < state.config.minPlayers && state.lobbyCountdownStarted) {
            game.cancelLobbyCountdown();
            cancelCountdownTimer(gameId);
            console.log(`Player disconnected, below minimum. Cancelled countdown for ${gameId}`);
          }
          
          io.to(gameId).emit('game:player-left', playerId);
          broadcastGameState(gameId);
        }
      }
    }
    
    playerToGame.delete(socket.id);
    playerIdMap.delete(socket.id);
  });
});

// ============= Helper Functions =============

function broadcastGameState(gameId: string) {
  const game = games.get(gameId);
  if (!game) return;

  const state = game.getState();

  // Send personalized view to each player
  Object.keys(state.players).forEach(playerId => {
    const player = state.players[playerId];
    const playerView = getPlayerView(game, playerId);
    io.to(player.socketId).emit('game:state-update', playerView);
  });
}

function getPlayerView(game: GameEngine, playerId: PlayerId) {
  const state = game.getState();
  const isImpostor = playerId === state.impostorId;
  
  return {
    gameId: state.id,
    playerId,
    phase: state.phase,
    currentRound: state.currentRound,
    category: state.category,
    topic: isImpostor ? null : state.topic,
    isImpostor,
    players: Object.values(state.players),
    questions: state.questions,
    votes: state.votes,
    canAskQuestion: game.canPlayerAskQuestion(playerId).can,
    canVote: game.canPlayerVote(playerId).can,
    eliminatedPlayers: state.eliminatedPlayers,
    winner: state.winner,
    timeRemaining: null,
    lobbyCountdown: game.getLobbyCountdownRemaining(),
    config: state.config,
  };
}

function startCountdownTimer(gameId: string) {
  // Clear existing timer if any
  if (countdownTimers.has(gameId)) {
    clearInterval(countdownTimers.get(gameId)!);
  }

  const timer = setInterval(() => {
    const game = games.get(gameId);
    if (!game) {
      clearInterval(timer);
      countdownTimers.delete(gameId);
      return;
    }

    const remaining = game.getLobbyCountdownRemaining();
    
    if (remaining === null || remaining <= 0) {
      // Countdown finished, start game (force start regardless of ready states)
      clearInterval(timer);
      countdownTimers.delete(gameId);
      
      if (waitingLobby && waitingLobby.gameId === gameId) {
        waitingLobby = null;
      }
      
      try {
        game.startGame(true); // Force start when countdown expires
        console.log(`Countdown expired for ${gameId}, starting game! Impostor: ${game.getImpostorId()}`);
        io.to(gameId).emit('game:phase-change', game.getPhase());
        broadcastGameState(gameId);
      } catch (error) {
        console.error('Error starting game after countdown:', error);
      }
    } else {
      // Broadcast updated countdown
      broadcastGameState(gameId);
    }
  }, 1000); // Update every second

  countdownTimers.set(gameId, timer);
}

function cancelCountdownTimer(gameId: string) {
  if (countdownTimers.has(gameId)) {
    clearInterval(countdownTimers.get(gameId)!);
    countdownTimers.delete(gameId);
    console.log(`Cancelled countdown for ${gameId}`);
  }
}

// Graceful error handling for port conflicts
httpServer.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Error: Port ${PORT} is already in use!`);
    console.error(`   Please run: lsof -ti:${PORT} | xargs kill -9`);
    console.error(`   Or use the cleanup script: npm run cleanup`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Socket.io server running on port ${PORT}`);
  console.log(`📡 Accepting connections from: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
});

