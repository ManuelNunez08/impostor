/**
 * Core Game Engine - Manages game state and rules
 * Refactored to support flexible N-round configuration
 */

import {
  GameState,
  Player,
  Question,
  Vote,
  GamePhase,
  PlayerId,
  QuestionId,
  DEFAULT_GAME_CONFIG,
  DEFAULT_GAME_SETTINGS,
  Category,
  WinnerSide,
  GameSettings,
  RoundConfig,
  TOPIC_GUESS_TIME
} from '../../types/game.js';
import { generateId } from '../utils/id.js';
import { validateQuestion } from './validation.js';
import { 
  getCurrentRoundConfig, 
  hasNextRound, 
  legacyConfigToSettings 
} from './settingsHelper.js';

export class GameEngine {
  private state: GameState;

  constructor(category: Category, settings?: GameSettings) {
    // Select random topic from category
    const topic = category.topics[Math.floor(Math.random() * category.topics.length)];

    // Use provided settings or default, and create legacy config for backward compatibility
    const gameSettings = settings || DEFAULT_GAME_SETTINGS;
    const legacyConfig = DEFAULT_GAME_CONFIG; // Keep for backward compatibility

    this.state = {
      id: generateId(),
      phase: 'lobby',
      currentRound: 1,
      currentRoundIndex: 0,        // NEW: Track position in rounds array
      category,
      topic,
      impostorId: '', // Will be set when game starts
      players: {},
      eliminatedPlayers: [],
      questions: [],
      votes: [],
      topicGuess: null,
      winner: null,
      createdAt: Date.now(),
      startedAt: null,
      endedAt: null,
      currentPhaseStartedAt: Date.now(),
      lobbyCountdownStarted: null,
      interrogationStartedAt: null,
      interrogationEndsAt: null,
      topicGuessStartedAt: null,
      topicGuessEndsAt: null,
      config: legacyConfig,        // Legacy config
      settings: gameSettings,      // NEW: Flexible settings
    };
  }

  // ============= Player Management =============

  addPlayer(name: string, socketId: string): PlayerId {
    const playerId = generateId();

    this.state.players[playerId] = {
      id: playerId,
      name,
      socketId,
      isConnected: true,
      isReady: false,
      isEliminated: false,
      questionsAsked: 0,
      hasVoted: false,
      isReadyToVote: false,
      joinedAt: Date.now(),
    };

    return playerId;
  }

  removePlayer(playerId: PlayerId): void {
    delete this.state.players[playerId];
  }

  setPlayerReady(playerId: PlayerId, ready: boolean): void {
    if (this.state.players[playerId]) {
      this.state.players[playerId].isReady = ready;
    }
  }

  getPlayer(playerId: PlayerId): Player | undefined {
    return this.state.players[playerId];
  }

  getActivePlayers(): Player[] {
    return Object.values(this.state.players).filter(p => !p.isEliminated);
  }

  // ============= Game Flow =============

  canStartGame(): boolean {
    const playerCount = Object.keys(this.state.players).length;
    const allReady = Object.values(this.state.players).every(p => p.isReady);
    const settings = this.state.settings!;
    
    return (
      playerCount >= settings.minPlayers &&
      playerCount <= settings.maxPlayers &&
      allReady &&
      this.state.phase === 'lobby'
    );
  }

  shouldStartCountdown(): boolean {
    const playerCount = Object.keys(this.state.players).length;
    const settings = this.state.settings!;
    return (
      playerCount >= settings.minPlayers &&
      this.state.phase === 'lobby' &&
      this.state.lobbyCountdownStarted === null
    );
  }

  startLobbyCountdown(): void {
    this.state.lobbyCountdownStarted = Date.now();
  }

  cancelLobbyCountdown(): void {
    this.state.lobbyCountdownStarted = null;
  }

  getLobbyCountdownRemaining(): number | null {
    if (!this.state.lobbyCountdownStarted) return null;
    const settings = this.state.settings!;
    
    const elapsed = (Date.now() - this.state.lobbyCountdownStarted) / 1000;
    const remaining = Math.max(0, settings.lobbyCountdownDuration - elapsed);
    return Math.ceil(remaining);
  }

  getInterrogationTimeRemaining(): number | null {
    if (!this.state.interrogationEndsAt || this.state.phase !== 'interrogation') {
      return null;
    }
    
    const remaining = Math.max(0, this.state.interrogationEndsAt - Date.now());
    return Math.ceil(remaining / 1000); // Return seconds
  }

  getTopicGuessTimeRemaining(): number | null {
    if (!this.state.topicGuessEndsAt || this.state.phase !== 'topic-guess') {
      return null;
    }
    
    const remaining = Math.max(0, this.state.topicGuessEndsAt - Date.now());
    return Math.ceil(remaining / 1000); // Return seconds
  }

  startGame(forceStart: boolean = false): void {
    const playerCount = Object.keys(this.state.players).length;
    const settings = this.state.settings!;
    
    // Check basic requirements
    if (this.state.phase !== 'lobby') {
      throw new Error('Game is not in lobby phase');
    }
    
    if (playerCount < settings.minPlayers || playerCount > settings.maxPlayers) {
      throw new Error('Invalid player count');
    }
    
    // Check ready state only if not forcing start (e.g., countdown expired)
    if (!forceStart && !this.canStartGame()) {
      throw new Error('Cannot start game - not all players are ready');
    }

    // Select random impostor
    const playerIds = Object.keys(this.state.players);
    this.state.impostorId = playerIds[Math.floor(Math.random() * playerIds.length)];

    // Start with first round
    this.state.currentRound = 1;
    this.state.currentRoundIndex = 0;
    this.state.phase = 'interrogation';  // NEW: Generic phase
    this.state.startedAt = Date.now();
    this.state.currentPhaseStartedAt = Date.now();
    
    // Start interrogation timer
    const roundConfig = settings.rounds[0];
    const interrogationDuration = roundConfig.interrogationTime * 1000; // Convert to milliseconds
    this.state.interrogationStartedAt = Date.now();
    this.state.interrogationEndsAt = Date.now() + interrogationDuration;
  }

  // ============= Question Management =============

  canPlayerAskQuestion(playerId: PlayerId): { can: boolean; reason?: string } {
    const player = this.state.players[playerId];

    if (!player) {
      return { can: false, reason: 'Player not found' };
    }

    if (player.isEliminated) {
      return { can: false, reason: 'Player is eliminated' };
    }

    if (this.state.phase !== 'interrogation') {
      return { can: false, reason: 'Not in questioning phase' };
    }

    // Get max questions from current round config
    const settings = this.state.settings!;
    const roundConfig = getCurrentRoundConfig(settings, this.state.currentRoundIndex);
    const maxQuestions = roundConfig.maxQuestionsPerPlayer;

    if (player.questionsAsked >= maxQuestions) {
      return { can: false, reason: 'Question limit reached' };
    }

    return { can: true };
  }

  askQuestion(fromPlayerId: PlayerId, toPlayerId: PlayerId, question: string): Question {
    const validation = this.canPlayerAskQuestion(fromPlayerId);
    if (!validation.can) {
      throw new Error(validation.reason);
    }

    // Validate question
    const settings = this.state.settings!;
    const questionValidation = validateQuestion(question, settings.maxQuestionLength);
    if (!questionValidation.valid) {
      throw new Error(questionValidation.error);
    }

    const targetPlayer = this.state.players[toPlayerId];
    if (!targetPlayer || targetPlayer.isEliminated) {
      throw new Error('Target player not found or eliminated');
    }

    const newQuestion: Question = {
      id: generateId(),
      fromPlayerId,
      toPlayerId,
      question,
      answer: null,
      responseType: null,
      isPassed: false,
      isTimedOut: false,
      askedAt: Date.now(),
      answeredAt: null,
      round: this.state.currentRound,
    };

    this.state.questions.push(newQuestion);
    this.state.players[fromPlayerId].questionsAsked++;

    return newQuestion;
  }

  answerQuestion(questionId: QuestionId, answer: string): void {
    const question = this.state.questions.find(q => q.id === questionId);

    if (!question) {
      throw new Error('Question not found');
    }

    if (question.answer !== null || question.isPassed || question.isTimedOut) {
      throw new Error('Question already answered or passed');
    }

    question.answer = answer;
    question.responseType = 'typed';
    question.answeredAt = Date.now();
  }

  passQuestion(questionId: QuestionId): void {
    const question = this.state.questions.find(q => q.id === questionId);

    if (!question) {
      throw new Error('Question not found');
    }

    if (question.answer !== null || question.isPassed || question.isTimedOut) {
      throw new Error('Question already answered or passed');
    }

    question.isPassed = true;
    question.responseType = 'pass';
    question.answer = 'Passed';
    question.answeredAt = Date.now();
  }

  timeoutQuestion(questionId: QuestionId): void {
    const question = this.state.questions.find(q => q.id === questionId);

    if (!question) {
      throw new Error('Question not found');
    }

    if (question.answer !== null || question.isPassed || question.isTimedOut) {
      return; // Already answered, skip
    }

    question.isTimedOut = true;
    question.responseType = 'timed-out';
    question.answer = 'Timed out';
    question.answeredAt = Date.now();
  }

  setPlayerReadyToVote(playerId: PlayerId, ready: boolean): void {
    if (this.state.players[playerId]) {
      this.state.players[playerId].isReadyToVote = ready;
    }
  }

  getReadyToVoteCount(): number {
    return Object.values(this.state.players).filter(p => !p.isEliminated && p.isReadyToVote).length;
  }

  shouldForceVoting(): boolean {
    const activePlayers = this.getActivePlayers();
    const readyCount = this.getReadyToVoteCount();
    return readyCount > activePlayers.length / 2;
  }

  timeoutAllPendingQuestions(): void {
    this.state.questions
      .filter(q => q.answer === null && !q.isPassed && !q.isTimedOut)
      .forEach(q => this.timeoutQuestion(q.id));
  }

  // ============= Voting =============

  canPlayerVote(playerId: PlayerId): { can: boolean; reason?: string } {
    const player = this.state.players[playerId];

    if (!player) {
      return { can: false, reason: 'Player not found' };
    }

    if (player.isEliminated) {
      return { can: false, reason: 'Player is eliminated' };
    }

    if (this.state.phase !== 'voting') {
      return { can: false, reason: 'Not in voting phase' };
    }

    if (player.hasVoted) {
      return { can: false, reason: 'Already voted' };
    }

    return { can: true };
  }

  castVote(fromPlayerId: PlayerId, targetPlayerId: PlayerId, isLocked: boolean = false): Vote {
    const validation = this.canPlayerVote(fromPlayerId);
    if (!validation.can) {
      throw new Error(validation.reason);
    }

    const targetPlayer = this.state.players[targetPlayerId];
    if (!targetPlayer || targetPlayer.isEliminated) {
      throw new Error('Target player not found or eliminated');
    }

    // Check if player already voted this round
    const existingVoteIndex = this.state.votes.findIndex(
      v => v.fromPlayerId === fromPlayerId && v.round === this.state.currentRound
    );

    const vote: Vote = {
      id: existingVoteIndex >= 0 ? this.state.votes[existingVoteIndex].id : generateId(),
      fromPlayerId,
      targetPlayerId,
      round: this.state.currentRound,
      timestamp: Date.now(),
      isLocked,
    };

    if (existingVoteIndex >= 0) {
      // Update existing vote
      this.state.votes[existingVoteIndex] = vote;
    } else {
      // Add new vote
      this.state.votes.push(vote);
      this.state.players[fromPlayerId].hasVoted = true;
    }

    return vote;
  }

  hasMajorityLockedVotes(): boolean {
    const activePlayers = this.getActivePlayers();
    const currentRoundLockedVotes = this.state.votes.filter(
      v => v.round === this.state.currentRound && v.isLocked
    );
    
    // Count locked votes per target
    const lockedVoteCounts: Record<PlayerId, number> = {};
    currentRoundLockedVotes.forEach(vote => {
      lockedVoteCounts[vote.targetPlayerId] = (lockedVoteCounts[vote.targetPlayerId] || 0) + 1;
    });
    
    // Check if any single target has MORE than 50% of active players' locked votes
    const majorityThreshold = Math.floor(activePlayers.length / 2) + 1; // More than 50%
    const maxLockedVotes = Math.max(...Object.values(lockedVoteCounts), 0);
    
    return maxLockedVotes >= majorityThreshold;
  }

  // ============= Phase Transitions =============

  transitionToVoting(): void {
    this.state.phase = 'voting';  // NEW: Generic voting phase

    // Reset hasVoted for all players
    Object.values(this.state.players).forEach(p => {
      p.hasVoted = false;
    });

    this.state.currentPhaseStartedAt = Date.now();
  }

  processVotingResults(): void {
    const currentRoundVotes = this.state.votes.filter(v => v.round === this.state.currentRound);

    // Count votes per player
    const voteCounts: Record<PlayerId, number> = {};
    currentRoundVotes.forEach(vote => {
      voteCounts[vote.targetPlayerId] = (voteCounts[vote.targetPlayerId] || 0) + 1;
    });

    // Find player(s) with most votes
    const maxVotes = Math.max(...Object.values(voteCounts), 0);
    const playersWithMaxVotes = Object.keys(voteCounts).filter(
      pid => voteCounts[pid] === maxVotes
    );

    const activePlayers = this.getActivePlayers();
    
    // Get current round config for win conditions
    const settings = this.state.settings!;
    const roundConfig = getCurrentRoundConfig(settings, this.state.currentRoundIndex);

    // Check if impostor has most votes (and no tie)
    // Impostor is caught if they have the most votes, regardless of majority threshold
    const impostorVotedOut = playersWithMaxVotes.includes(this.state.impostorId) && 
                             playersWithMaxVotes.length === 1; // Must be sole leader, no tie

    if (!impostorVotedOut) {
      // Impostor NOT voted out
      // Eliminate player with most votes (or no one if tie)
      if (playersWithMaxVotes.length === 1 && maxVotes > 0) {
        const eliminatedId = playersWithMaxVotes[0];
        this.state.players[eliminatedId].isEliminated = true;
        this.state.eliminatedPlayers.push(eliminatedId);
      }

      // Check if there are more rounds
      if (hasNextRound(settings, this.state.currentRoundIndex)) {
        // Move to results phase, then next round
        this.state.phase = 'results';
      } else {
        // No more rounds, impostor wins
        this.endGame('impostor', 'Impostor survived all rounds');
      }
    } else {
      // Impostor WAS voted out
      // Eliminate the impostor
      this.state.players[this.state.impostorId].isEliminated = true;
      this.state.eliminatedPlayers.push(this.state.impostorId);

      // Check if impostor can guess to win
      if (roundConfig.impostorCanGuess) {
        // Give impostor a chance to guess topic
        this.state.phase = 'topic-guess';
        // Start topic guess timer
        const topicGuessDuration = TOPIC_GUESS_TIME * 1000;
        this.state.topicGuessStartedAt = Date.now();
        this.state.topicGuessEndsAt = Date.now() + topicGuessDuration;
      } else {
        // Impostor loses immediately
        this.endGame('players', 'Impostor identified and eliminated');
      }
    }

    this.state.currentPhaseStartedAt = Date.now();
  }

  guessTopicAsImpostor(guess: string): boolean {
    if (this.state.phase !== 'topic-guess') {
      throw new Error('Not in topic guess phase');
    }

    const isCorrect = guess.toLowerCase().trim() === this.state.topic.toLowerCase().trim();

    this.state.topicGuess = {
      guess,
      isCorrect,
      timestamp: Date.now(),
    };

    if (isCorrect) {
      this.endGame('impostor', 'Impostor guessed topic correctly');
    } else {
      this.endGame('players', 'Impostor guessed topic incorrectly');
    }

    return isCorrect;
  }

  // NEW: Transition to the next round
  transitionToNextRound(): void {
    if (this.state.phase !== 'results') {
      throw new Error('Can only transition from results phase');
    }

    const settings = this.state.settings!;
    
    // Check if there is a next round
    if (!hasNextRound(settings, this.state.currentRoundIndex)) {
      throw new Error('No more rounds available');
    }

    // Move to next round
    this.state.currentRoundIndex++;
    this.state.currentRound = this.state.currentRoundIndex + 1;
    this.state.phase = 'interrogation';

    // Reset questions asked count for all players
    Object.values(this.state.players).forEach(p => {
      p.questionsAsked = 0;
      p.isReadyToVote = false;
    });

    this.state.currentPhaseStartedAt = Date.now();
    
    // Start interrogation timer for new round
    const roundConfig = settings.rounds[this.state.currentRoundIndex];
    const interrogationDuration = roundConfig.interrogationTime * 1000;
    this.state.interrogationStartedAt = Date.now();
    this.state.interrogationEndsAt = Date.now() + interrogationDuration;
  }

  // NEW: Get current round configuration
  getCurrentRoundConfig(): RoundConfig {
    const settings = this.state.settings!;
    return getCurrentRoundConfig(settings, this.state.currentRoundIndex);
  }

  // NEW: Check if there are more rounds
  hasMoreRounds(): boolean {
    const settings = this.state.settings!;
    return hasNextRound(settings, this.state.currentRoundIndex);
  }

  endGame(winner: WinnerSide, reason: string): void {
    this.state.phase = 'ended';
    this.state.winner = winner;
    this.state.endedAt = Date.now();
  }

  // ============= State Access =============

  getState(): GameState {
    return { ...this.state };
  }

  getPhase(): GamePhase {
    return this.state.phase;
  }

  getImpostorId(): PlayerId {
    return this.state.impostorId;
  }
}

