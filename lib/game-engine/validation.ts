/**
 * Validation utilities for game actions
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateQuestion(question: string, maxWords: number): ValidationResult {
  const trimmed = question.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'Question cannot be empty' };
  }

  // Count words
  const wordCount = trimmed.split(/\s+/).length;
  
  if (wordCount > maxWords) {
    return { 
      valid: false, 
      error: `Question exceeds maximum length of ${maxWords} words (${wordCount} words)` 
    };
  }

  // Check for inappropriate length (too short)
  if (wordCount < 2) {
    return { valid: false, error: 'Question must be at least 2 words' };
  }

  return { valid: true };
}

export function validateAnswer(answer: string): ValidationResult {
  const trimmed = answer.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'Answer cannot be empty' };
  }

  // Reasonable max length for answers
  if (trimmed.length > 500) {
    return { valid: false, error: 'Answer is too long (max 500 characters)' };
  }

  return { valid: true };
}

export function validatePlayerName(name: string): ValidationResult {
  const trimmed = name.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'Name cannot be empty' };
  }

  if (trimmed.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }

  if (trimmed.length > 20) {
    return { valid: false, error: 'Name must be less than 20 characters' };
  }

  // Only allow alphanumeric and basic punctuation
  const validPattern = /^[a-zA-Z0-9\s_-]+$/;
  if (!validPattern.test(trimmed)) {
    return { valid: false, error: 'Name contains invalid characters' };
  }

  return { valid: true };
}

export function validateTopicGuess(guess: string): ValidationResult {
  const trimmed = guess.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'Guess cannot be empty' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'Guess is too long' };
  }

  return { valid: true };
}

