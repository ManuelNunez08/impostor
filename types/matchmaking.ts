/**
 * Matchmaking Type Definitions
 */

export interface QueuedPlayer {
  playerId: string;
  playerName: string;
  socketId: string;
  joinedAt: number;
  preferences?: MatchmakingPreferences;
}

export interface MatchmakingPreferences {
  preferredPlayerCount?: 4 | 5 | 6;
}

export interface LobbyState {
  lobbyId: string;
  players: QueuedPlayer[];
  maxPlayers: number;
  minPlayers: number;
  createdAt: number;
  isStarting: boolean;
}

export type MatchmakingStatus = 
  | 'queued'
  | 'matched'
  | 'in-lobby'
  | 'playing';

