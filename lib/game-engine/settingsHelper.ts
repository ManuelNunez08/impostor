/**
 * Helper functions for working with GameSettings
 */

import { GameSettings, RoundConfig, GameConfig } from '@/types/game';

/**
 * Get the configuration for a specific round
 */
export function getRoundConfig(settings: GameSettings, roundIndex: number): RoundConfig | null {
  if (roundIndex < 0 || roundIndex >= settings.rounds.length) {
    return null;
  }
  return settings.rounds[roundIndex];
}

/**
 * Get the current round configuration
 */
export function getCurrentRoundConfig(settings: GameSettings, currentRoundIndex: number): RoundConfig {
  const config = getRoundConfig(settings, currentRoundIndex);
  if (!config) {
    throw new Error(`Invalid round index: ${currentRoundIndex}`);
  }
  return config;
}

/**
 * Check if there are more rounds after the current one
 */
export function hasNextRound(settings: GameSettings, currentRoundIndex: number): boolean {
  return currentRoundIndex < settings.rounds.length - 1;
}

/**
 * Get the total number of rounds
 */
export function getTotalRounds(settings: GameSettings): number {
  return settings.rounds.length;
}

/**
 * Validate round configuration
 */
export function validateRoundConfig(config: RoundConfig): { valid: boolean; error?: string } {
  if (config.roundNumber < 1) {
    return { valid: false, error: 'Round number must be at least 1' };
  }
  if (config.interrogationTime < 30) {
    return { valid: false, error: 'Interrogation time must be at least 30 seconds' };
  }
  if (config.interrogationTime > 600) {
    return { valid: false, error: 'Interrogation time cannot exceed 10 minutes' };
  }
  if (config.maxQuestionsPerPlayer < 1) {
    return { valid: false, error: 'Max questions must be at least 1' };
  }
  if (config.maxQuestionsPerPlayer > 5) {
    return { valid: false, error: 'Max questions cannot exceed 5' };
  }
  if (config.votingTime < 15) {
    return { valid: false, error: 'Voting time must be at least 15 seconds' };
  }
  if (config.votingTime > 120) {
    return { valid: false, error: 'Voting time cannot exceed 2 minutes' };
  }
  return { valid: true };
}

/**
 * Validate game settings
 */
export function validateGameSettings(settings: GameSettings): { valid: boolean; error?: string } {
  if (settings.minPlayers < 4 || settings.minPlayers > 6) {
    return { valid: false, error: 'Min players must be between 4 and 6' };
  }
  if (settings.maxPlayers < 4 || settings.maxPlayers > 6) {
    return { valid: false, error: 'Max players must be between 4 and 6' };
  }
  if (settings.minPlayers > settings.maxPlayers) {
    return { valid: false, error: 'Min players cannot exceed max players' };
  }
  if (settings.rounds.length < 1) {
    return { valid: false, error: 'Must have at least 1 round' };
  }
  if (settings.rounds.length > 5) {
    return { valid: false, error: 'Cannot have more than 5 rounds' };
  }
  
  // Validate each round
  for (let i = 0; i < settings.rounds.length; i++) {
    const validation = validateRoundConfig(settings.rounds[i]);
    if (!validation.valid) {
      return { valid: false, error: `Round ${i + 1}: ${validation.error}` };
    }
  }
  
  return { valid: true };
}

/**
 * Convert legacy GameConfig to new GameSettings
 * Used for migration
 */
export function legacyConfigToSettings(config: GameConfig): GameSettings {
  return {
    minPlayers: config.minPlayers,
    maxPlayers: config.maxPlayers,
    rounds: [
      {
        roundNumber: 1,
        interrogationTime: 180,
        maxQuestionsPerPlayer: config.round1QuestionsPerPlayer,
        votingTime: config.votingTimeLimit,
        impostorCanGuess: true
      },
      {
        roundNumber: 2,
        interrogationTime: 120,
        maxQuestionsPerPlayer: config.round2QuestionsPerPlayer,
        votingTime: config.votingTimeLimit,
        impostorCanGuess: false
      }
    ],
    lobbyCountdownDuration: config.lobbyCountdownDuration,
    maxQuestionLength: config.maxQuestionLength,
    answerTimeLimit: config.answerTimeLimit
  };
}

/**
 * Create a new round configuration with default values
 */
export function createDefaultRound(roundNumber: number): RoundConfig {
  return {
    roundNumber,
    interrogationTime: 120,     // 2:00 default
    maxQuestionsPerPlayer: 2,
    votingTime: 30,             // 0:30 default
    impostorCanGuess: roundNumber === 1  // Only first round allows guessing by default
  };
}

