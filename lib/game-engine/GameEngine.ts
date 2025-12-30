/**
 * Core Game Engine - Manages game state and rules
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
  Category,
  WinnerSide,
  Round
} from '../../types/game.js';
import { generateId } from '../utils/id.js';
import { validateQuestion } from './validation.js';

export class GameEngine {
  private state: GameState;

  constructor(category: Category, playerCount: number = 6) {
    // Select random topic from category
    const topic = category.topics[Math.floor(Math.random() * category.topics.length)];

    this.state = {
      id: generateId(),
      phase: 'lobby',
      currentRound: 1,
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
      config: DEFAULT_GAME_CONFIG,
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
    
    return (
      playerCount >= this.state.config.minPlayers &&
      playerCount <= this.state.config.maxPlayers &&
      allReady &&
      this.state.phase === 'lobby'
    );
  }

  shouldStartCountdown(): boolean {
    const playerCount = Object.keys(this.state.players).length;
    return (
      playerCount >= this.state.config.minPlayers &&
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
    
    const elapsed = (Date.now() - this.state.lobbyCountdownStarted) / 1000;
    const remaining = Math.max(0, this.state.config.lobbyCountdownDuration - elapsed);
    return Math.ceil(remaining);
  }

  startGame(forceStart: boolean = false): void {
    const playerCount = Object.keys(this.state.players).length;
    
    // Check basic requirements
    if (this.state.phase !== 'lobby') {
      throw new Error('Game is not in lobby phase');
    }
    
    if (playerCount < this.state.config.minPlayers || playerCount > this.state.config.maxPlayers) {
      throw new Error('Invalid player count');
    }
    
    // Check ready state only if not forcing start (e.g., countdown expired)
    if (!forceStart && !this.canStartGame()) {
      throw new Error('Cannot start game - not all players are ready');
    }

    // Select random impostor
    const playerIds = Object.keys(this.state.players);
    this.state.impostorId = playerIds[Math.floor(Math.random() * playerIds.length)];

    this.state.phase = 'round1-question';
    this.state.startedAt = Date.now();
    this.state.currentPhaseStartedAt = Date.now();
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

    if (this.state.phase !== 'round1-question' && this.state.phase !== 'round2-question') {
      return { can: false, reason: 'Not in questioning phase' };
    }

    const maxQuestions = this.state.currentRound === 1
      ? this.state.config.round1QuestionsPerPlayer
      : this.state.config.round2QuestionsPerPlayer;

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
    const questionValidation = validateQuestion(question, this.state.config.maxQuestionLength);
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

    if (this.state.phase !== 'round1-voting' && this.state.phase !== 'round2-voting') {
      return { can: false, reason: 'Not in voting phase' };
    }

    if (player.hasVoted) {
      return { can: false, reason: 'Already voted' };
    }

    return { can: true };
  }

  castVote(fromPlayerId: PlayerId, targetPlayerId: PlayerId): Vote {
    const validation = this.canPlayerVote(fromPlayerId);
    if (!validation.can) {
      throw new Error(validation.reason);
    }

    const targetPlayer = this.state.players[targetPlayerId];
    if (!targetPlayer || targetPlayer.isEliminated) {
      throw new Error('Target player not found or eliminated');
    }

    const vote: Vote = {
      id: generateId(),
      fromPlayerId,
      targetPlayerId,
      round: this.state.currentRound,
      timestamp: Date.now(),
    };

    this.state.votes.push(vote);
    this.state.players[fromPlayerId].hasVoted = true;

    return vote;
  }

  // ============= Phase Transitions =============

  transitionToVoting(): void {
    if (this.state.currentRound === 1) {
      this.state.phase = 'round1-voting';
    } else {
      this.state.phase = 'round2-voting';
    }

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
    const maxVotes = Math.max(...Object.values(voteCounts));
    const playersWithMaxVotes = Object.keys(voteCounts).filter(
      pid => voteCounts[pid] === maxVotes
    );

    const activePlayers = this.getActivePlayers();
    const majorityThreshold = Math.ceil(activePlayers.length / 2);

    // Check if impostor received majority
    if (playersWithMaxVotes.includes(this.state.impostorId) && maxVotes >= majorityThreshold) {
      if (this.state.currentRound === 1) {
        // Round 1: Impostor gets to guess
        this.state.phase = 'topic-guess';
      } else {
        // Round 2: Impostor loses immediately
        this.endGame('players', 'Impostor identified in Round 2');
      }
    } else if (this.state.currentRound === 1) {
      // Eliminate player with most votes (or no one if tie)
      if (playersWithMaxVotes.length === 1) {
        const eliminatedId = playersWithMaxVotes[0];
        this.state.players[eliminatedId].isEliminated = true;
        this.state.eliminatedPlayers.push(eliminatedId);
      }

      // Move to Round 2
      this.state.currentRound = 2;
      this.state.phase = 'round2-question';

      // Reset questions asked count
      Object.values(this.state.players).forEach(p => {
        p.questionsAsked = 0;
      });
    } else {
      // Round 2: Impostor not identified, impostor wins
      this.endGame('impostor', 'Impostor survived final vote');
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

