/**
 * Socket.io Server Setup
 * Run this separately from Next.js: ts-node server/index.ts
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents } from '../types/socket.js';
import { GameEngine } from '../lib/game-engine/GameEngine.js';
import { getRandomCategory, getCategoryById } from '../lib/game-engine/categories.js';
import { validatePlayerName, validateAnswer } from '../lib/game-engine/validation.js';
import { PlayerId, GameSettings, RoundConfig } from '../types/game.js';
import { CreateLobbyData } from '../types/socket.js';

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
const interrogationTimers = new Map<string, NodeJS.Timeout>();
const prepareToVoteTimers = new Map<string, NodeJS.Timeout>();
const votingTimers = new Map<string, NodeJS.Timeout>();
const resultsTimers = new Map<string, NodeJS.Timeout>();
const topicGuessTimers = new Map<string, NodeJS.Timeout>();
const questionTimers = new Map<string, NodeJS.Timeout>(); // questionId -> timeout

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
      if (waitingLobby && Object.keys(waitingLobby.game.getState().players).length < 7) {
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

      // If lobby is full (7 players), clear waiting lobby so next player creates new one
      if (playerCount >= 7) {
        console.log(`Lobby ${gameId} is full, clearing waiting lobby`);
        waitingLobby = null;
      }
    } catch (error) {
      console.error('Error in lobby:join:', error);
      callback({ success: false, error: String(error) });
    }
  });

  socket.on('lobby:create', (data: CreateLobbyData, callback) => {
    const validation = validatePlayerName(data.playerName);
    if (!validation.valid) {
      callback({ success: false, error: validation.error });
      return;
    }

    try {
      // Validate inputs
      if (data.numPlayers < 4 || data.numPlayers > 7) {
        callback({ success: false, error: 'Number of players must be between 4 and 7' });
        return;
      }

      if (data.rounds.length < 2 || data.rounds.length > 5) {
        callback({ success: false, error: 'Must have between 2 and 5 rounds' });
        return;
      }

      // Get category
      const category = getCategoryById(data.categoryId);
      if (!category) {
        callback({ success: false, error: 'Invalid category' });
        return;
      }

      // Build GameSettings
      const settings: GameSettings = {
        mode: data.mode,
        minPlayers: data.numPlayers,
        maxPlayers: data.numPlayers,
        rounds: data.rounds.map((r, index): RoundConfig => ({
          roundNumber: index + 1,
          interrogationTime: r.interrogationTime,
          maxQuestionsPerPlayer: r.maxQuestionsPerPlayer,
          votingTime: r.votingTime,
          impostorCanGuess: r.impostorCanGuess,
        })),
        lobbyCountdownDuration: 30,
        maxQuestionLength: 15,
        answerTimeLimit: 30,
      };

      // Create game
      const game = new GameEngine(category, settings);
      const gameId = game.getState().id;
      games.set(gameId, game);

      // Add creator as player
      const playerId = game.addPlayer(data.playerName, socket.id);
      playerToGame.set(socket.id, gameId);
      playerIdMap.set(socket.id, playerId);
      socket.join(gameId);

      console.log(`Created new lobby ${gameId} with custom settings by player ${playerId}`);

      callback({ success: true, playerId, gameId, playerName: data.playerName });

      // Notify all players (just the creator for now)
      io.to(gameId).emit('game:player-joined', playerId, data.playerName);

      // Start countdown if minimum players reached (won't happen with just creator)
      if (game.shouldStartCountdown()) {
        game.startLobbyCountdown();
        startCountdownTimer(gameId);
      }

      broadcastGameState(gameId);
    } catch (error) {
      console.error('Error in lobby:create:', error);
      callback({ success: false, error: String(error) });
    }
  });

  socket.on('lobby:join-by-code', (code: string, playerName?: string, callback?: (response: any) => void) => {
    // Find game by code (last 4 characters of gameId)
    let targetGame: GameEngine | null = null;
    let targetGameId: string | null = null;

    for (const [gameId, game] of games.entries()) {
      const gameCode = gameId.substring(gameId.length - 4).toUpperCase();
      if (gameCode === code.toUpperCase()) {
        targetGame = game;
        targetGameId = gameId;
        break;
      }
    }

    if (!targetGame || !targetGameId) {
      if (callback) callback({ success: false, error: 'Party code not found' });
      return;
    }

    const state = targetGame.getState();
    const currentPlayerCount = Object.keys(state.players).length;

    // Check if game is full
    if (currentPlayerCount >= state.settings!.maxPlayers) {
      if (callback) callback({ success: false, error: 'This party is full' });
      return;
    }

    // Generate player name if not provided
    let finalPlayerName = playerName?.trim();
    if (!finalPlayerName) {
      let playerIndex = 1;
      while (Object.values(state.players).some(p => p.name === `player_${playerIndex}`)) {
        playerIndex++;
      }
      finalPlayerName = `player_${playerIndex}`;
    }

    const validation = validatePlayerName(finalPlayerName);
    if (!validation.valid) {
      if (callback) callback({ success: false, error: validation.error });
      return;
    }

    try {
      const playerId = targetGame.addPlayer(finalPlayerName, socket.id);
      playerToGame.set(socket.id, targetGameId);
      playerIdMap.set(socket.id, playerId);
      socket.join(targetGameId);

      console.log(`Player ${playerId} joined party ${targetGameId} by code ${code}`);

      if (callback) {
        callback({ success: true, playerId, gameId: targetGameId, playerName: finalPlayerName });
      }

      // Notify all players
      io.to(targetGameId).emit('game:player-joined', playerId, finalPlayerName);

      const playerCount = Object.keys(targetGame.getState().players).length;
      console.log(`Party ${targetGameId} now has ${playerCount} players`);

      // Start countdown if minimum players reached
      if (targetGame.shouldStartCountdown()) {
        targetGame.startLobbyCountdown();
        console.log(`Starting countdown for party ${targetGameId} (${playerCount} players)`);
        startCountdownTimer(targetGameId);
      }

      broadcastGameState(targetGameId);
    } catch (error) {
      console.error('Error in lobby:join-by-code:', error);
      if (callback) callback({ success: false, error: String(error) });
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
    if (allReady && playerCount >= state.settings.minPlayers && game.canStartGame()) {
      console.log(`All players ready in lobby ${gameId}, starting game immediately!`);
      
      // Clear this from waiting lobby if it's there
      if (waitingLobby && waitingLobby.gameId === gameId) {
        waitingLobby = null;
      }
      
      try {
        game.startGame();
        console.log(`Game ${gameId} started! Impostor: ${game.getImpostorId()}`);
        startInterrogationTimer(gameId); // Start interrogation countdown
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
    
    if (playerCount < state.settings.minPlayers && state.lobbyCountdownStarted) {
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
      
      // Set up timeout timer for this question
      const state = game.getState();
      const answerTimeLimit = (state.settings?.answerTimeLimit || 30) * 1000; // Convert to milliseconds
      
      const timer = setTimeout(() => {
        try {
          // Check if question still exists and hasn't been answered
          const currentState = game.getState();
          const currentQuestion = currentState.questions.find(q => q.id === question.id);
          
          if (currentQuestion && currentQuestion.answer === null && !currentQuestion.isPassed && !currentQuestion.isTimedOut) {
            game.timeoutQuestion(question.id);
            io.to(gameId).emit('game:question-timed-out', question.id);
            broadcastGameState(gameId);
            console.log(`Question ${question.id} timed out after ${answerTimeLimit}ms`);
          }
          
          // Clean up timer
          questionTimers.delete(question.id);
        } catch (error) {
          console.error('Error timing out question:', error);
          questionTimers.delete(question.id);
        }
      }, answerTimeLimit);
      
      questionTimers.set(question.id, timer);
      
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
      
      // Clear the timeout timer if it exists
      const timer = questionTimers.get(data.questionId);
      if (timer) {
        clearTimeout(timer);
        questionTimers.delete(data.questionId);
      }
      
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
      
      // Clear the timeout timer if it exists
      const timer = questionTimers.get(questionId);
      if (timer) {
        clearTimeout(timer);
        questionTimers.delete(questionId);
      }
      
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
        // Clear all question timers before timing out questions
        const state = game.getState();
        state.questions.forEach(q => {
          const timer = questionTimers.get(q.id);
          if (timer) {
            clearTimeout(timer);
            questionTimers.delete(q.id);
          }
        });
        game.timeoutAllPendingQuestions();
        game.transitionToPrepareToVote();
        io.to(gameId).emit('game:phase-change', game.getPhase());
        startPrepareToVoteTimer(gameId); // Start prepare-to-vote timer
        broadcastGameState(gameId);
      }

      if (callback) callback({ success: true });
    } catch (error) {
      console.error('Error in ready-to-vote:', error);
      if (callback) callback({ success: false, error: String(error) });
    }
  });

  socket.on('game:vote', (data, callback) => {
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
      // Handle both old format (string) and new format (object)
      const targetPlayerId = typeof data === 'string' ? data : data.targetPlayerId;
      const isLocked = typeof data === 'object' && data.isLocked ? data.isLocked : false;
      
      game.castVote(playerId, targetPlayerId, isLocked);
      io.to(gameId).emit('game:vote-cast', playerId);

      // Check if majority has locked votes OR all players have voted
      const allVoted = game.getActivePlayers().every(p => p.hasVoted);
      const majorityLocked = game.hasMajorityLockedVotes();
      
      if (allVoted || majorityLocked) {
        cancelVotingTimer(gameId); // Cancel timer since voting completed early
        game.processVotingResults();
        io.to(gameId).emit('game:voting-complete');
        io.to(gameId).emit('game:phase-change', game.getPhase());
        
        // Log the voting result
        console.log(`Voting complete in ${gameId}. Phase: ${game.getPhase()}`);
        
        // Handle different phases after voting
        if (game.getPhase() === 'ended') {
          // Game ended immediately (e.g., impostor won on last round)
          const finalState = game.getState();
          io.to(gameId).emit('game:ended', finalState.winner, 'Game completed');
        } else if (game.getPhase() === 'topic-guess') {
          // Start topic guess timer if entering topic-guess phase
          startTopicGuessTimer(gameId);
        } else if (game.getPhase() === 'results') {
          // Start results timer if entering results phase
          startResultsTimer(gameId);
        }
      }

      broadcastGameState(gameId);
      callback({ success: true });
    } catch (error) {
      callback({ success: false, error: String(error) });
    }
  });

  socket.on('game:voting-chat', (message) => {
    const gameId = playerToGame.get(socket.id);
    const playerId = playerIdMap.get(socket.id);

    if (!gameId || !playerId) return;

    const game = games.get(gameId);
    if (!game) return;

    const player = game.getPlayer(playerId);
    if (!player) return;

    try {
      // Store chat message in game state
      const chatMessage = game.addChatMessage(playerId, player.name, message);
      
    // Broadcast chat message to all players in the game
    io.to(gameId).emit('game:voting-chat', chatMessage);
      
      // Broadcast updated game state so all clients get the full chat history
      broadcastGameState(gameId);
    } catch (error) {
      console.error('Error adding chat message:', error);
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
      cancelTopicGuessTimer(gameId); // Cancel timer when guess is submitted
      const isCorrect = game.guessTopicAsImpostor(guess);
      io.to(gameId).emit('game:phase-change', game.getPhase());
      broadcastGameState(gameId);
      callback({ success: true, isCorrect });
    } catch (error) {
      callback({ success: false, error: String(error) });
    }
  });

  socket.on('game:continue-to-next-round', () => {
    const gameId = playerToGame.get(socket.id);
    if (!gameId) return;

    const game = games.get(gameId);
    if (!game) return;

    try {
      cancelResultsTimer(gameId); // Cancel results timer since manually continuing
      const state = game.getState();
      
      // If winner is already set (e.g., impostor caught and can't guess), end the game
      if (state.winner !== null) {
        game.endGame(state.winner, 'Game completed');
        console.log(`Manually continuing in ${gameId}, ending game (winner already determined)`);
        io.to(gameId).emit('game:phase-change', game.getPhase());
        const finalState = game.getState();
        io.to(gameId).emit('game:ended', finalState.winner, 'Game completed');
      } else {
        // No winner yet - check if there's a next round
        const settings = state.settings!;
        const hasNext = state.currentRoundIndex < settings.rounds.length - 1;
        
        if (hasNext) {
      game.transitionToNextRound();
      console.log(`Transitioning to next round in ${gameId}`);
      io.to(gameId).emit('game:phase-change', game.getPhase());
      startInterrogationTimer(gameId); // Start timer for new round
        } else {
          // No more rounds - determine winner and end game
          const activePlayers = game.getActivePlayers();
          const impostorStillAlive = activePlayers.some(p => p.id === state.impostorId);
          
          if (impostorStillAlive) {
            game.endGame('impostor', 'Impostor survived all rounds');
          } else {
            game.endGame('players', 'Impostor was eliminated');
          }
          console.log(`No more rounds in ${gameId}, ending game`);
          io.to(gameId).emit('game:phase-change', game.getPhase());
          const finalState = game.getState();
          io.to(gameId).emit('game:ended', finalState.winner, 'Game completed');
        }
      }
      broadcastGameState(gameId);
    } catch (error) {
      console.error('Error transitioning to next round:', error);
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
          
          if (connectedCount < state.settings.minPlayers && state.lobbyCountdownStarted) {
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
  
  // Calculate currentRound as 1-based display number
  const currentRound = state.currentRoundIndex + 1;
  
  // Find pending question for this player and get its remaining time
  const pendingQuestion = state.questions.find(
    q => q.toPlayerId === playerId && q.answer === null && !q.isPassed && !q.isTimedOut
  );
  const pendingQuestionTimeRemaining = pendingQuestion 
    ? game.getQuestionTimeRemaining(pendingQuestion.id)
    : null;
  
  return {
    gameId: state.id,
    playerId,
    phase: state.phase,
    currentRound,
    currentRoundIndex: state.currentRoundIndex,
    category: state.category,
    topic: isImpostor ? null : state.topic,
    isImpostor,
    players: Object.values(state.players),
    questions: state.questions,
    votes: state.votes,
    chatMessages: state.chatMessages, // Include chat history
    topicGuess: state.topicGuess, // Include topic guess result
    canAskQuestion: game.canPlayerAskQuestion(playerId).can,
    canVote: game.canPlayerVote(playerId).can,
    eliminatedPlayers: state.eliminatedPlayers,
    winner: state.winner,
    timeRemaining: game.getInterrogationTimeRemaining() || game.getPrepareToVoteTimeRemaining() || game.getVotingTimeRemaining() || game.getResultsTimeRemaining() || game.getTopicGuessTimeRemaining(),
    pendingQuestionTimeRemaining, // Remaining time for pending question (if any)
    lobbyCountdown: game.getLobbyCountdownRemaining(),
    config: state.settings, // Legacy field now points to settings
    settings: state.settings,
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
        startInterrogationTimer(gameId); // Start interrogation countdown
        io.to(gameId).emit('game:phase-change', game.getPhase());
        broadcastGameState(gameId);
      } catch (error) {
        console.error('Error starting game after countdown:', error);
      }
    } else {
      // Broadcast timer update
      io.to(gameId).emit('game:timer-update', remaining);
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

function startInterrogationTimer(gameId: string) {
  // Clear existing timer if any
  if (interrogationTimers.has(gameId)) {
    clearInterval(interrogationTimers.get(gameId)!);
  }

  const timer = setInterval(() => {
    const game = games.get(gameId);
    if (!game) {
      clearInterval(timer);
      interrogationTimers.delete(gameId);
      return;
    }

    const remaining = game.getInterrogationTimeRemaining();
    
    if (remaining === null || remaining <= 0) {
      // Interrogation time expired, force transition to voting
      clearInterval(timer);
      interrogationTimers.delete(gameId);
      
      try {
        // Clear all question timers before timing out questions
        const state = game.getState();
        state.questions.forEach(q => {
          const timer = questionTimers.get(q.id);
          if (timer) {
            clearTimeout(timer);
            questionTimers.delete(q.id);
          }
        });
        // Timeout any pending questions
        game.timeoutAllPendingQuestions();
        // Transition to prepare-to-vote phase
        game.transitionToPrepareToVote();
        console.log(`Interrogation time expired for ${gameId}, transitioning to prepare-to-vote phase`);
        io.to(gameId).emit('game:phase-change', game.getPhase());
        startPrepareToVoteTimer(gameId); // Start prepare-to-vote timer
        broadcastGameState(gameId);
      } catch (error) {
        console.error('Error transitioning to voting after timer:', error);
      }
    } else {
      // Broadcast timer update
      io.to(gameId).emit('game:timer-update', remaining);
      broadcastGameState(gameId);
    }
  }, 1000); // Update every second

  interrogationTimers.set(gameId, timer);
}

function cancelInterrogationTimer(gameId: string) {
  if (interrogationTimers.has(gameId)) {
    clearInterval(interrogationTimers.get(gameId)!);
    interrogationTimers.delete(gameId);
    console.log(`Cancelled interrogation timer for ${gameId}`);
  }
}

function startPrepareToVoteTimer(gameId: string) {
  // Clear existing timer if any
  if (prepareToVoteTimers.has(gameId)) {
    clearInterval(prepareToVoteTimers.get(gameId)!);
  }

  const timer = setInterval(() => {
    const game = games.get(gameId);
    if (!game) {
      clearInterval(timer);
      prepareToVoteTimers.delete(gameId);
      return;
    }

    const remaining = game.getPrepareToVoteTimeRemaining();

    if (remaining === null || remaining <= 0) {
      // Prepare-to-vote time expired - transition to voting
      clearInterval(timer);
      prepareToVoteTimers.delete(gameId);

      try {
        // Only transition if still in prepare-to-vote phase
        if (game.getPhase() === 'prepare-to-vote') {
          game.transitionToVoting();
          console.log(`Prepare-to-vote time expired for ${gameId}, transitioning to voting phase`);
          io.to(gameId).emit('game:phase-change', game.getPhase());
          startVotingTimer(gameId); // Start voting timer
          broadcastGameState(gameId);
        }
      } catch (error) {
        console.error('Error transitioning to voting after prepare-to-vote timer:', error);
      }
    } else {
      // Broadcast timer update
      io.to(gameId).emit('game:timer-update', remaining);
      broadcastGameState(gameId);
    }
  }, 1000); // Update every second

  prepareToVoteTimers.set(gameId, timer);
}

function cancelPrepareToVoteTimer(gameId: string) {
  if (prepareToVoteTimers.has(gameId)) {
    clearInterval(prepareToVoteTimers.get(gameId)!);
    prepareToVoteTimers.delete(gameId);
    console.log(`Cancelled prepare-to-vote timer for ${gameId}`);
  }
}

function startVotingTimer(gameId: string) {
  // Clear existing timer if any
  if (votingTimers.has(gameId)) {
    clearInterval(votingTimers.get(gameId)!);
  }

  const timer = setInterval(() => {
    const game = games.get(gameId);
    if (!game) {
      clearInterval(timer);
      votingTimers.delete(gameId);
      return;
    }

    const remaining = game.getVotingTimeRemaining();
    
    if (remaining === null || remaining <= 0) {
      // Voting time expired - process results if not already done
      clearInterval(timer);
      votingTimers.delete(gameId);
      
      try {
        // Only process if still in voting phase (might have been processed by votes)
        if (game.getPhase() === 'voting') {
          game.processVotingResults();
          console.log(`Voting time expired for ${gameId}, processing results`);
          io.to(gameId).emit('game:voting-complete');
          io.to(gameId).emit('game:phase-change', game.getPhase());
          
          // Handle different phases after voting
          if (game.getPhase() === 'ended') {
            // Game ended immediately (e.g., impostor won on last round)
            const finalState = game.getState();
            io.to(gameId).emit('game:ended', finalState.winner, 'Game completed');
          } else if (game.getPhase() === 'topic-guess') {
            // Start topic guess timer if entering topic-guess phase
            startTopicGuessTimer(gameId);
          } else if (game.getPhase() === 'results') {
            // Start results timer if entering results phase
            startResultsTimer(gameId);
          }
        }
        broadcastGameState(gameId);
      } catch (error) {
        console.error('Error processing voting results after timer:', error);
      }
    } else {
      // Broadcast timer update
      io.to(gameId).emit('game:timer-update', remaining);
      broadcastGameState(gameId);
    }
  }, 1000); // Update every second

  votingTimers.set(gameId, timer);
}

function cancelVotingTimer(gameId: string) {
  if (votingTimers.has(gameId)) {
    clearInterval(votingTimers.get(gameId)!);
    votingTimers.delete(gameId);
    console.log(`Cancelled voting timer for ${gameId}`);
  }
}

function startResultsTimer(gameId: string) {
  // Clear existing timer if any
  if (resultsTimers.has(gameId)) {
    clearInterval(resultsTimers.get(gameId)!);
  }

  const timer = setInterval(() => {
    const game = games.get(gameId);
    if (!game) {
      clearInterval(timer);
      resultsTimers.delete(gameId);
      return;
    }

    const remaining = game.getResultsTimeRemaining();
    
    if (remaining === null || remaining <= 0) {
      // Results time expired - transition to next round or end game
      clearInterval(timer);
      resultsTimers.delete(gameId);
      
      try {
        const state = game.getState();
        
        // If winner is already set (e.g., impostor caught and can't guess), end the game
        if (state.winner !== null) {
          game.endGame(state.winner, 'Game completed');
          console.log(`Results time expired for ${gameId}, ending game (winner already determined)`);
          io.to(gameId).emit('game:phase-change', game.getPhase());
          const finalState = game.getState();
          io.to(gameId).emit('game:ended', finalState.winner, 'Game completed');
        } else {
          // No winner yet - check if there's a next round
          const settings = state.settings!;
          const hasNext = state.currentRoundIndex < settings.rounds.length - 1;
          
          if (hasNext) {
            game.transitionToNextRound();
            console.log(`Results time expired for ${gameId}, transitioning to next round`);
            io.to(gameId).emit('game:phase-change', game.getPhase());
            startInterrogationTimer(gameId); // Start interrogation timer for new round
          } else {
            // No more rounds - determine winner and end game
            const activePlayers = game.getActivePlayers();
            const impostorStillAlive = activePlayers.some(p => p.id === state.impostorId);
            
            if (impostorStillAlive) {
              game.endGame('impostor', 'Impostor survived all rounds');
            } else {
              game.endGame('players', 'Impostor was eliminated');
            }
            console.log(`Results time expired for ${gameId}, no more rounds - ending game`);
            io.to(gameId).emit('game:phase-change', game.getPhase());
            const finalState = game.getState();
            io.to(gameId).emit('game:ended', finalState.winner, 'Game completed');
          }
        }
        broadcastGameState(gameId);
      } catch (error) {
        console.error('Error transitioning after results timer:', error);
      }
    } else {
      // Broadcast timer update
      io.to(gameId).emit('game:timer-update', remaining);
      broadcastGameState(gameId);
    }
  }, 1000); // Update every second

  resultsTimers.set(gameId, timer);
}

function cancelResultsTimer(gameId: string) {
  if (resultsTimers.has(gameId)) {
    clearInterval(resultsTimers.get(gameId)!);
    resultsTimers.delete(gameId);
    console.log(`Cancelled results timer for ${gameId}`);
  }
}

function startTopicGuessTimer(gameId: string) {
  // Clear existing timer if any
  if (topicGuessTimers.has(gameId)) {
    clearInterval(topicGuessTimers.get(gameId)!);
  }

  const timer = setInterval(() => {
    const game = games.get(gameId);
    if (!game) {
      clearInterval(timer);
      topicGuessTimers.delete(gameId);
      return;
    }

    const remaining = game.getTopicGuessTimeRemaining();
    
    if (remaining === null || remaining <= 0) {
      // Time expired - impostor loses by default (submit empty guess)
      clearInterval(timer);
      topicGuessTimers.delete(gameId);
      
      try {
        game.guessTopicAsImpostor(''); // Wrong guess
        console.log(`Topic guess time expired for ${gameId}, impostor loses`);
        io.to(gameId).emit('game:phase-change', game.getPhase());
        broadcastGameState(gameId);
      } catch (error) {
        console.error('Error handling topic guess timeout:', error);
      }
    } else {
      // Broadcast timer update
      io.to(gameId).emit('game:timer-update', remaining);
      broadcastGameState(gameId);
    }
  }, 1000); // Update every second

  topicGuessTimers.set(gameId, timer);
}

function cancelTopicGuessTimer(gameId: string) {
  if (topicGuessTimers.has(gameId)) {
    clearInterval(topicGuessTimers.get(gameId)!);
    topicGuessTimers.delete(gameId);
    console.log(`Cancelled topic guess timer for ${gameId}`);
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

