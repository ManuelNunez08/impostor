/**
 * Socket.io Event Type Definitions
 */

import { GameState, PlayerView, PlayerId, QuestionId } from './game.js';

/**
 * Server → Client Events
 */
export interface ServerToClientEvents {
  // Game state updates
  'game:state-update': (playerView: PlayerView) => void;
  'game:full-state': (state: GameState) => void;
  'game:phase-change': (phase: string, timeRemaining?: number) => void;

  // Player events
  'game:player-joined': (playerId: PlayerId, playerName: string) => void;
  'game:player-left': (playerId: PlayerId) => void;
  'game:player-reconnected': (playerId: PlayerId) => void;

  // Question/Answer events
  'game:question-asked': (questionId: QuestionId) => void;
  'game:answer-given': (questionId: QuestionId, answer: string) => void;
  'game:question-passed': (questionId: QuestionId) => void;

  // Voting events
  'game:vote-cast': (fromPlayerId: PlayerId) => void;
  'game:voting-complete': () => void;
  'game:voting-chat': (message: { id: string; playerId: PlayerId; playerName: string; message: string; timestamp: number }) => void;

  // Timer events
  'game:timer-update': (timeRemaining: number) => void;
  'game:timer-expired': () => void;

  // Game end events
  'game:ended': (winner: 'impostor' | 'players', reason: string) => void;
  'game:topic-revealed': (topic: string) => void;

  // Error events
  'error': (message: string) => void;
  'game:error': (error: string) => void;
}

/**
 * Client → Server Events
 */
export interface ClientToServerEvents {
  // Lobby events
  'lobby:join': (playerName: string, callback: (response: JoinResponse) => void) => void;
  'lobby:ready': () => void;
  'lobby:leave': () => void;

  // Game actions
  'game:ask-question': (data: AskQuestionData, callback: (response: ActionResponse) => void) => void;
  'game:answer-question': (data: AnswerQuestionData, callback: (response: ActionResponse) => void) => void;
  'game:pass-question': (questionId: QuestionId, callback: (response: ActionResponse) => void) => void;
  'game:ready-to-vote': (callback: (response: ActionResponse) => void) => void;
  'game:vote': (targetPlayerId: PlayerId, callback: (response: ActionResponse) => void) => void;
  'game:voting-chat': (message: string) => void;
  'game:guess-topic': (guess: string, callback: (response: GuessResponse) => void) => void;
  'game:continue-to-next-round': () => void;

  // Utility
  'game:get-state': (callback: (state: PlayerView) => void) => void;
  'ping': () => void;
}

/**
 * Request/Response Types
 */
export interface JoinResponse {
  success: boolean;
  playerId?: PlayerId;
  gameId?: string;
  error?: string;
}

export interface ActionResponse {
  success: boolean;
  error?: string;
}

export interface GuessResponse {
  success: boolean;
  isCorrect?: boolean;
  error?: string;
}

export interface AskQuestionData {
  toPlayerId: PlayerId;
  question: string;
}

export interface AnswerQuestionData {
  questionId: QuestionId;
  answer: string;
}

/**
 * Matchmaking Events
 */
export interface MatchmakingEvents {
  'matchmaking:join': (playerName: string, preferences?: MatchmakingPreferencesSocket) => void;
  'matchmaking:leave': () => void;
  'matchmaking:found': (gameId: string) => void;
  'matchmaking:status': (queuePosition: number, estimatedWait: number) => void;
}

export interface MatchmakingPreferencesSocket {
  preferredPlayerCount?: 4 | 5 | 6;
}

