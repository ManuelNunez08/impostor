import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from './GameEngine';
import { GameSettings, PlayerId, Category, DEFAULT_GAME_SETTINGS } from '../../types/game';

describe('GameEngine - Core Logic', () => {
  let gameEngine: GameEngine;
  let player1Id: PlayerId;
  let player2Id: PlayerId;
  let player3Id: PlayerId;
  let player4Id: PlayerId;

  const testCategory: Category = {
    id: 'test-category',
    name: 'Test Category',
    description: 'Category for testing',
    topics: ['Topic A', 'Topic B', 'Topic C', 'Topic D', 'Topic E'],
  };

  // Helper function to add 4 players and mark them ready
  const setupPlayersAndReady = () => {
    player1Id = gameEngine.addPlayer('Alice', 'socket-1');
    player2Id = gameEngine.addPlayer('Bob', 'socket-2');
    player3Id = gameEngine.addPlayer('Charlie', 'socket-3');
    player4Id = gameEngine.addPlayer('David', 'socket-4');
    
    gameEngine.setPlayerReady(player1Id, true);
    gameEngine.setPlayerReady(player2Id, true);
    gameEngine.setPlayerReady(player3Id, true);
    gameEngine.setPlayerReady(player4Id, true);
  };

  beforeEach(() => {
    // Create a custom settings with 1 round for faster testing
    const testSettings: GameSettings = {
      ...DEFAULT_GAME_SETTINGS,
      rounds: [
        {
          roundNumber: 1,
          interrogationTime: 60,
          maxQuestionsPerPlayer: 2,
          votingTime: 30,
          impostorCanGuess: false,
        },
      ],
    };

    gameEngine = new GameEngine(testCategory, testSettings);
  });

  describe('Player Management', () => {
    it('should add players to the game', () => {
      setupPlayersAndReady();
      
      const state = gameEngine.getState();
      const playerList = Object.values(state.players);
      
      expect(playerList).toHaveLength(4);
      expect(playerList[0].name).toBe('Alice');
      expect(playerList[1].name).toBe('Bob');
    });

    it('should mark player as ready', () => {
      setupPlayersAndReady();

      const state = gameEngine.getState();
      expect(state.players[player1Id].isReady).toBe(true);
    });

    it('should not start game with less than minPlayers', () => {
      // Create a fresh game engine with only 1 player
      const freshEngine = new GameEngine(testCategory, DEFAULT_GAME_SETTINGS);
      const singlePlayerId = freshEngine.addPlayer('Solo', 'socket-solo');
      freshEngine.setPlayerReady(singlePlayerId, true);

      expect(() => freshEngine.startGame(false)).toThrow('Invalid player count');
    });
  });

  describe('Game Start', () => {
    it('should start game when all players are ready', () => {
      setupPlayersAndReady();
      
      // Verify all players are ready before starting (matching server logic)
      const stateBeforeStart = gameEngine.getState();
      const allReady = Object.values(stateBeforeStart.players).every(p => p.isReady);
      const playerCount = Object.keys(stateBeforeStart.players).length;
      expect(allReady).toBe(true);
      expect(stateBeforeStart.phase).toBe('lobby');
      
      // The server checks: allReady && playerCount >= minPlayers && canStartGame()
      // Since we've verified allReady and phase, canStartGame() should return true
      // if playerCount and settings are correct. Let's verify canStartGame works.
      // Note: canStartGame() checks: playerCount >= minPlayers && playerCount <= maxPlayers && allReady && phase === 'lobby'
      expect(gameEngine.canStartGame()).toBe(true);

      // Call startGame() without arguments, matching how server calls it (line 143 in server/index.ts)
      // The server only calls startGame() if canStartGame() returns true, so we should be able to call it
      expect(() => gameEngine.startGame()).not.toThrow();

      const state = gameEngine.getState();
      expect(state.phase).toBe('interrogation');
      expect(state.topic).toBeDefined();
      expect(state.impostorId).toBeDefined();
    });

    it('should force start game with forceStart=true', () => {
      setupPlayersAndReady();
      // Mark only 1 player not ready
      gameEngine.setPlayerReady(player1Id, false);
      
      // But force start should work
      expect(() => gameEngine.startGame(true)).not.toThrow();

      const state = gameEngine.getState();
      expect(state.phase).toBe('interrogation');
    });

    it('should assign exactly one impostor', () => {
      setupPlayersAndReady();

      gameEngine.startGame(true); // Force start for testing
      const state = gameEngine.getState();

      expect(state.impostorId).toBeDefined();
      const playerList = Object.values(state.players);
      const impostorCount = playerList.filter((p) => p.id === state.impostorId).length;
      expect(impostorCount).toBe(1);
    });
  });

  describe('Voting Logic', () => {
    beforeEach(() => {
      setupPlayersAndReady();
      gameEngine.startGame(true); // Force start for testing
      
      // Transition to voting phase using the proper method
      gameEngine.transitionToVoting();
    });

    it('should allow players to cast votes', () => {
      expect(() => gameEngine.castVote(player1Id, player2Id, false)).not.toThrow();

      const state = gameEngine.getState();
      expect(state.votes).toHaveLength(1);
      expect(state.votes[0].fromPlayerId).toBe(player1Id);
      expect(state.votes[0].targetPlayerId).toBe(player2Id);
      expect(state.votes[0].isLocked).toBe(false);
    });

    it('should allow updating vote before locking', () => {
      gameEngine.castVote(player1Id, player2Id, false);
      gameEngine.castVote(player1Id, player3Id, false);

      const state = gameEngine.getState();
      expect(state.votes).toHaveLength(1);
      expect(state.votes[0].targetPlayerId).toBe(player3Id);
    });

    it('should lock votes', () => {
      gameEngine.castVote(player1Id, player2Id, false);
      gameEngine.castVote(player1Id, player2Id, true);

      const state = gameEngine.getState();
      expect(state.votes[0].isLocked).toBe(true);
    });

    it('should detect when all players have voted', () => {
      gameEngine.castVote(player1Id, player2Id, false);
      gameEngine.castVote(player2Id, player3Id, false);
      gameEngine.castVote(player3Id, player4Id, false);
      
      const allVoted = gameEngine.haveAllPlayersVoted();
      expect(allVoted).toBe(false); // player4 hasn't voted

      gameEngine.castVote(player4Id, player1Id, false);
      expect(gameEngine.haveAllPlayersVoted()).toBe(true);
    });

    it('should detect majority locked votes towards one player', () => {
      // 4 players: need 3 locked votes on one player for majority (>50%)
      gameEngine.castVote(player1Id, player2Id, true);
      gameEngine.castVote(player2Id, player2Id, true);
      
      expect(gameEngine.hasMajorityLockedVotes()).toBe(false); // Only 2/4

      gameEngine.castVote(player3Id, player2Id, true);
      expect(gameEngine.hasMajorityLockedVotes()).toBe(true); // 3/4 = 75%
    });

    it('should not detect majority with locked votes split between players', () => {
      gameEngine.castVote(player1Id, player2Id, true);
      gameEngine.castVote(player2Id, player3Id, true);
      gameEngine.castVote(player3Id, player4Id, true);

      expect(gameEngine.hasMajorityLockedVotes()).toBe(false);
    });
  });

  describe('Elimination and Spectator Logic', () => {
    beforeEach(() => {
      setupPlayersAndReady();
      gameEngine.startGame(true); // Force start for testing
    });

    it('should mark player as eliminated', () => {
      gameEngine.eliminatePlayer(player1Id);

      const state = gameEngine.getState();
      const player = state.players[player1Id];
      expect(player?.isEliminated).toBe(true);
    });

    it('should not count eliminated players in active player count', () => {
      const beforeElimination = gameEngine.getActivePlayers().length;
      expect(beforeElimination).toBe(4);

      gameEngine.eliminatePlayer(player1Id);

      const afterElimination = gameEngine.getActivePlayers().length;
      expect(afterElimination).toBe(3);
    });

    it('should prevent eliminated players from asking questions', () => {
      gameEngine.eliminatePlayer(player1Id);

      const state = gameEngine.getState();
      state.phase = 'interrogation';

      const result = gameEngine.canPlayerAskQuestion(player1Id);
      expect(result.can).toBe(false);
      expect(result.reason).toContain('eliminated');
    });

    it('should not allow votes from eliminated players', () => {
      gameEngine.eliminatePlayer(player1Id);

      // Transition to voting phase using the proper method
      gameEngine.transitionToVoting();

      expect(() => gameEngine.castVote(player1Id, player2Id, false)).toThrow('eliminated');
    });

    it('should not allow votes towards eliminated players', () => {
      gameEngine.eliminatePlayer(player2Id);

      // Transition to voting phase using the proper method
      gameEngine.transitionToVoting();

      expect(() => gameEngine.castVote(player1Id, player2Id, false)).toThrow('eliminated');
    });
  });

  describe('Phase Transitions', () => {
    beforeEach(() => {
      setupPlayersAndReady();
      gameEngine.startGame(true); // Force start for testing
    });

    it('should transition from interrogation to voting', () => {
      const state = gameEngine.getState();
      expect(state.phase).toBe('interrogation');

      gameEngine.transitionToVoting();

      const updatedState = gameEngine.getState();
      expect(updatedState.phase).toBe('voting');
      expect(updatedState.currentPhaseStartedAt).toBeDefined();
    });

    it('should process voting results and catch impostor (plurality)', () => {
      // Transition to voting phase first
      gameEngine.transitionToVoting();
      
      const state = gameEngine.getState();
      const impostorId = state.impostorId!;

      // Make impostor get most votes with no tie (3 votes to ensure they're caught)
      gameEngine.castVote(player1Id, impostorId, true);
      gameEngine.castVote(player2Id, impostorId, true);
      gameEngine.castVote(player3Id, impostorId, true);
      
      // Player 4 votes for someone else to ensure impostor has the most
      if (impostorId === player4Id) {
        gameEngine.castVote(player4Id, player1Id, true);
      } else {
        gameEngine.castVote(player4Id, player2Id, true);
      }

      gameEngine.processVotingResults();

      const updatedState = gameEngine.getState();
      expect(updatedState.phase).toBe('results');
      
      // Impostor should be eliminated (since impostorCanGuess is false)
      const impostor = updatedState.players[impostorId];
      expect(impostor?.isEliminated).toBe(true);
    });

    it('should handle impostor not caught scenario', () => {
      // Transition to voting phase first
      gameEngine.transitionToVoting();
      
      const state = gameEngine.getState();
      const impostorId = state.impostorId!;
      
      // Get a non-impostor player
      const playerList = Object.values(state.players);
      const nonImpostorId = playerList.find((p) => p.id !== impostorId)!.id;

      // Vote out the non-impostor
      gameEngine.castVote(player1Id, nonImpostorId, true);
      gameEngine.castVote(player2Id, nonImpostorId, true);
      gameEngine.castVote(player3Id, nonImpostorId, true);
      gameEngine.castVote(player4Id, nonImpostorId, true);

      gameEngine.processVotingResults();

      const updatedState = gameEngine.getState();
      expect(updatedState.phase).toBe('results');
      
      // Non-impostor should be eliminated
      const votedOutPlayer = updatedState.players[nonImpostorId];
      expect(votedOutPlayer?.isEliminated).toBe(true);
      
      // Impostor should still be active
      const impostor = updatedState.players[impostorId];
      expect(impostor?.isEliminated).toBe(false);
    });
  });

  describe('Round Progression', () => {
    let multiRoundEngine: GameEngine;
    let p1: PlayerId, p2: PlayerId, p3: PlayerId, p4: PlayerId;

    beforeEach(() => {
      // Create game with 2 rounds
      const multiRoundSettings: GameSettings = {
        ...DEFAULT_GAME_SETTINGS,
        rounds: [
          {
            roundNumber: 1,
            interrogationTime: 60,
            maxQuestionsPerPlayer: 2,
            votingTime: 30,
            impostorCanGuess: false,
          },
          {
            roundNumber: 2,
            interrogationTime: 45,
            maxQuestionsPerPlayer: 1,
            votingTime: 20,
            impostorCanGuess: true,
          },
        ],
      };

      multiRoundEngine = new GameEngine(testCategory, multiRoundSettings);
      
      p1 = multiRoundEngine.addPlayer('Alice', 'socket-1');
      p2 = multiRoundEngine.addPlayer('Bob', 'socket-2');
      p3 = multiRoundEngine.addPlayer('Charlie', 'socket-3');
      p4 = multiRoundEngine.addPlayer('David', 'socket-4');

      multiRoundEngine.setPlayerReady(p1, true);
      multiRoundEngine.setPlayerReady(p2, true);
      multiRoundEngine.setPlayerReady(p3, true);
      multiRoundEngine.setPlayerReady(p4, true);

      multiRoundEngine.startGame(true); // Force start for testing
    });

    it('should start at round 1', () => {
      const state = multiRoundEngine.getState();
      expect(state.currentRound).toBe(1);
    });

    it('should transition to next round', () => {
      const state = multiRoundEngine.getState();
      expect(state.currentRound).toBe(1);

      // Need to be in results phase to transition - access private state for testing
      (multiRoundEngine as any).state.phase = 'results';
      multiRoundEngine.transitionToNextRound();

      const updatedState = multiRoundEngine.getState();
      expect(updatedState.currentRound).toBe(2);
      expect(updatedState.phase).toBe('interrogation');
      expect(updatedState.votes).toHaveLength(0); // Votes should be cleared
    });

    it('should detect when no more rounds exist', () => {
      expect(multiRoundEngine.hasMoreRounds()).toBe(true);

      // Need to be in results phase to transition - access private state for testing
      (multiRoundEngine as any).state.phase = 'results';
      multiRoundEngine.transitionToNextRound();
      expect(multiRoundEngine.hasMoreRounds()).toBe(false);
    });

    it('should use correct round config for each round', () => {
      let config = multiRoundEngine.getCurrentRoundConfig();
      expect(config.roundNumber).toBe(1);
      expect(config.maxQuestionsPerPlayer).toBe(2);

      // Need to be in results phase to transition - access private state for testing
      (multiRoundEngine as any).state.phase = 'results';
      multiRoundEngine.transitionToNextRound();

      config = multiRoundEngine.getCurrentRoundConfig();
      expect(config.roundNumber).toBe(2);
      expect(config.maxQuestionsPerPlayer).toBe(1);
    });
  });

  describe('Win Conditions', () => {
    beforeEach(() => {
      setupPlayersAndReady();
      gameEngine.startGame(true); // Force start for testing
    });

    it('should end game when impostor is caught and cannot guess', () => {
      // Transition to voting phase first
      gameEngine.transitionToVoting();
      
      const state = gameEngine.getState();
      const impostorId = state.impostorId!;

      // Vote out the impostor
      gameEngine.castVote(player1Id, impostorId, true);
      gameEngine.castVote(player2Id, impostorId, true);
      gameEngine.castVote(player3Id, impostorId, true);
      gameEngine.castVote(player4Id, impostorId, true);

      gameEngine.processVotingResults();

      const updatedState = gameEngine.getState();
      // Game goes to 'results' phase first (even for single-round games)
      // This allows for results display before ending
      expect(updatedState.phase).toBe('results');
      // Winner is set when game ends, but we're in results phase now
      // The impostor should be eliminated
      const impostor = updatedState.players[impostorId];
      expect(impostor?.isEliminated).toBe(true);
    });

    it('should trigger topic guess when impostor caught and can guess', () => {
      // Modify settings to allow impostor to guess
      const state = gameEngine.getState();
      state.settings.rounds[0].impostorCanGuess = true;
      
      // Transition to voting phase first
      gameEngine.transitionToVoting();
      
      const impostorId = state.impostorId!;

      // Vote out the impostor
      gameEngine.castVote(player1Id, impostorId, true);
      gameEngine.castVote(player2Id, impostorId, true);
      gameEngine.castVote(player3Id, impostorId, true);
      gameEngine.castVote(player4Id, impostorId, true);

      gameEngine.processVotingResults();

      const updatedState = gameEngine.getState();
      expect(updatedState.phase).toBe('topic-guess');
      expect(updatedState.topicGuessStartedAt).toBeDefined();
    });

    it('should handle correct topic guess', () => {
      const state = gameEngine.getState();
      const correctTopic = state.topic!;
      // Access private state for testing
      (gameEngine as any).state.phase = 'topic-guess';
      (gameEngine as any).state.topicGuessStartedAt = Date.now();

      gameEngine.submitTopicGuess(correctTopic);

      const updatedState = gameEngine.getState();
      expect(updatedState.winner).toBe('impostor');
    });

    it('should handle incorrect topic guess', () => {
      // Access private state for testing
      (gameEngine as any).state.phase = 'topic-guess';
      (gameEngine as any).state.topicGuessStartedAt = Date.now();

      gameEngine.submitTopicGuess('Wrong Topic');

      const updatedState = gameEngine.getState();
      expect(updatedState.winner).toBe('players');
    });
  });

  describe('Timer Management', () => {
    beforeEach(() => {
      setupPlayersAndReady();
      gameEngine.startGame(true); // Force start for testing
    });

    it('should calculate interrogation time remaining', () => {
      const state = gameEngine.getState();
      expect(state.interrogationStartedAt).toBeDefined();

      const timeRemaining = gameEngine.getInterrogationTimeRemaining();
      expect(timeRemaining).toBeGreaterThan(0);
      expect(timeRemaining).toBeLessThanOrEqual(state.settings.rounds[0].interrogationTime);
    });

    it('should calculate topic guess time remaining', () => {
      // Access private state for testing
      (gameEngine as any).state.phase = 'topic-guess';
      (gameEngine as any).state.topicGuessStartedAt = Date.now();
      // Also set topicGuessEndsAt so the method can calculate remaining time
      (gameEngine as any).state.topicGuessEndsAt = Date.now() + (15 * 1000); // 15 seconds from now

      const timeRemaining = gameEngine.getTopicGuessTimeRemaining();
      expect(timeRemaining).toBeGreaterThan(0);
      expect(timeRemaining).toBeLessThanOrEqual(15);
    });
  });
});

