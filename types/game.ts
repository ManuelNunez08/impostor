/**
 * Core Game Type Definitions for Impostor
 */

export type PlayerId = string;
export type GameId = string;
export type QuestionId = string;
export type VoteId = string;

export type GamePhase =
  | 'lobby'           // Waiting for players
  | 'starting'        // Game is starting, roles being assigned
  | 'round1-question' // Round 1 questioning phase
  | 'round1-voting'   // Round 1 voting phase
  | 'topic-guess'     // Impostor guessing topic
  | 'round2-question' // Round 2 questioning phase
  | 'round2-voting'   // Round 2 voting (final)
  | 'ended';          // Game over

export type Round = 1 | 2;

export type WinnerSide = 'impostor' | 'players' | null;

export interface Player {
  id: PlayerId;
  name: string;
  socketId: string;
  isConnected: boolean;
  isReady: boolean;
  isEliminated: boolean;
  questionsAsked: number;      // Track questions asked in current round
  hasVoted: boolean;
  isReadyToVote: boolean;      // NEW: Track ready to vote status
  joinedAt: number;
}

export type ResponseType = 'typed' | 'pass' | 'timed-out';

export interface Question {
  id: QuestionId;
  fromPlayerId: PlayerId;
  toPlayerId: PlayerId;
  question: string;
  answer: string | null;
  responseType: ResponseType | null;  // NEW: Type of response
  isPassed: boolean;                   // Keep for backwards compat
  isTimedOut: boolean;                 // NEW: True if timed out
  askedAt: number;
  answeredAt: number | null;
  round: Round;
}

export interface Vote {
  id: VoteId;
  fromPlayerId: PlayerId;
  targetPlayerId: PlayerId;
  round: Round;
  timestamp: number;
}

export interface TopicGuess {
  guess: string;
  isCorrect: boolean;
  timestamp: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  topics: string[];
}

export interface GameConfig {
  maxPlayers: number;           // 4-6 players
  minPlayers: number;           // 4 players minimum
  maxQuestionLength: number;    // 15 words
  round1QuestionsPerPlayer: number; // 2 questions
  round2QuestionsPerPlayer: number; // 1 question
  answerTimeLimit: number;      // seconds to answer
  votingTimeLimit: number;      // seconds to vote
  lobbyCountdownDuration: number; // 30 seconds countdown in lobby
}

export interface GameState {
  id: GameId;
  phase: GamePhase;
  currentRound: Round;
  
  // Game content
  category: Category;
  topic: string;
  impostorId: PlayerId;
  
  // Players
  players: Record<PlayerId, Player>;
  eliminatedPlayers: PlayerId[];
  
  // Game actions
  questions: Question[];
  votes: Vote[];
  topicGuess: TopicGuess | null;
  
  // Winner info
  winner: WinnerSide;
  
  // Timing
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
  currentPhaseStartedAt: number;
  lobbyCountdownStarted: number | null;  // NEW: When countdown started
  
  // Config
  config: GameConfig;
}

export interface PlayerView {
  gameId: GameId;
  playerId: PlayerId;
  phase: GamePhase;
  currentRound: Round;
  category: Category;
  topic: string | null;  // Null if player is impostor
  isImpostor: boolean;
  players: Player[];
  questions: Question[];
  votes: Vote[];
  canAskQuestion: boolean;
  canVote: boolean;
  eliminatedPlayers: PlayerId[];
  winner: WinnerSide;
  timeRemaining: number | null;
  lobbyCountdown: number | null;  // NEW: Countdown in lobby (seconds remaining)
  config: GameConfig;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  maxPlayers: 6,
  minPlayers: 4,
  maxQuestionLength: 15,
  round1QuestionsPerPlayer: 2,
  round2QuestionsPerPlayer: 1,
  answerTimeLimit: 30,      // 30 seconds to answer
  votingTimeLimit: 45,      // 45 seconds to vote
  lobbyCountdownDuration: 30, // 30 seconds lobby countdown
};

