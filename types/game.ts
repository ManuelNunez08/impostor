/**
 * Core Game Type Definitions for Impostor
 */

export type PlayerId = string;
export type GameId = string;
export type QuestionId = string;
export type VoteId = string;

// ============= NEW: Flexible Game Configuration Types =============

export interface RoundConfig {
  roundNumber: number;
  interrogationTime: number;      // seconds for questioning phase
  maxQuestionsPerPlayer: number;  // questions each player can ask
  votingTime: number;             // seconds for voting phase
  impostorCanGuess: boolean;      // if voted out, can impostor guess topic to win?
}

export interface GameSettings {
  minPlayers: number;
  maxPlayers: number;
  rounds: RoundConfig[];          // Array of round configurations
  lobbyCountdownDuration: number; // seconds
  maxQuestionLength: number;      // words
  answerTimeLimit: number;        // seconds to answer questions
}

// ============= Game Phase Types =============

// New generic phases (for flexible round system)
export type GamePhase =
  | 'lobby'           // Waiting for players
  | 'starting'        // Game is starting, roles being assigned
  | 'interrogation'   // Questioning phase (generic for any round)
  | 'voting'          // Voting phase (generic for any round)
  | 'topic-guess'     // Impostor guessing topic
  | 'results'         // Show round results
  | 'ended';          // Game over

// Legacy phases (kept for backward compatibility during migration)
export type LegacyGamePhase =
  | 'lobby'
  | 'starting'
  | 'round1-question'
  | 'round1-voting'
  | 'topic-guess'
  | 'round2-question'
  | 'round2-voting'
  | 'ended';

export type Round = number; // Changed from 1 | 2 to support N rounds

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
  responseType: ResponseType | null;  // Type of response
  isPassed: boolean;                   // Keep for backwards compat
  isTimedOut: boolean;                 // True if timed out
  askedAt: number;
  answeredAt: number | null;
  round: number;                       // Round number (1, 2, 3, etc.)
}

export interface Vote {
  id: VoteId;
  fromPlayerId: PlayerId;
  targetPlayerId: PlayerId;
  round: number;                       // Round number (1, 2, 3, etc.)
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

// ============= Legacy Config (kept for backward compatibility) =============

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
  currentRound: number;              // Current round number (1, 2, 3, etc.)
  currentRoundIndex: number;         // NEW: Index in settings.rounds array
  
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
  interrogationStartedAt: number | null;  // When current interrogation phase started
  interrogationEndsAt: number | null;     // When current interrogation phase should end
  endedAt: number | null;
  currentPhaseStartedAt: number;
  lobbyCountdownStarted: number | null;
  
  // Config - supports both old and new during migration
  config: GameConfig;                // Legacy config (will be deprecated)
  settings?: GameSettings;           // NEW: Flexible settings (optional during migration)
}

export interface PlayerView {
  gameId: GameId;
  playerId: PlayerId;
  phase: GamePhase;
  currentRound: number;              // Current round number
  currentRoundIndex: number;         // NEW: Index in settings.rounds array
  category: Category;
  topic: string | null;              // Null if player is impostor
  isImpostor: boolean;
  players: Player[];
  questions: Question[];
  votes: Vote[];
  canAskQuestion: boolean;
  canVote: boolean;
  eliminatedPlayers: PlayerId[];
  winner: WinnerSide;
  timeRemaining: number | null;
  lobbyCountdown: number | null;
  config: GameConfig;                // Legacy config
  settings?: GameSettings;           // NEW: Flexible settings (optional during migration)
}

// ============= Default Configurations =============

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

// NEW: Default flexible game settings (matches image specifications)
export const DEFAULT_GAME_SETTINGS: GameSettings = {
  minPlayers: 4,
  maxPlayers: 6,
  rounds: [
    {
      roundNumber: 1,
      interrogationTime: 180,         // 3:00 minutes
      maxQuestionsPerPlayer: 2,
      votingTime: 30,                 // 0:30 seconds
      impostorCanGuess: true          // Impostor can guess to win if voted out
    },
    {
      roundNumber: 2,
      interrogationTime: 120,         // 2:00 minutes
      maxQuestionsPerPlayer: 1,
      votingTime: 30,                 // 0:30 seconds
      impostorCanGuess: false         // Game ends if impostor voted out
    }
  ],
  lobbyCountdownDuration: 30,
  maxQuestionLength: 15,
  answerTimeLimit: 30
};

