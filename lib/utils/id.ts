/**
 * ID generation utilities
 */

export function generateId(prefix?: string): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 9);
  const id = `${timestamp}${randomStr}`;
  
  return prefix ? `${prefix}_${id}` : id;
}

export function generateGameId(): string {
  return generateId('game');
}

export function generatePlayerId(): string {
  return generateId('player');
}

export function generateQuestionId(): string {
  return generateId('q');
}

export function generateVoteId(): string {
  return generateId('vote');
}

