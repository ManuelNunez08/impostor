'use client';

import { useState, useEffect } from 'react';
import { PlayerView } from '@/types/game';

interface TopicGuessPhaseProps {
  gameState: PlayerView;
  onGuess: (topic: string) => void;
}

export default function TopicGuessPhase({ gameState, onGuess }: TopicGuessPhaseProps) {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [warningPhase, setWarningPhase] = useState(true);
  const [warningTimer, setWarningTimer] = useState(3); // 3 second warning phase
  const isImpostor = gameState.isImpostor;
  const topics = gameState.category.topics;
  const timeRemaining = gameState.timeRemaining || 0;
  const topicGuess = gameState.topicGuess;
  const winner = gameState.winner;

  // Warning phase countdown
  useEffect(() => {
    if (warningPhase && isImpostor) {
      const timer = setInterval(() => {
        setWarningTimer((prev) => {
          if (prev <= 1) {
            setWarningPhase(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [warningPhase, isImpostor]);

  // Check if guess result should be shown
  const showResult = winner !== null && topicGuess !== null;

  const handleSubmit = () => {
    if (selectedTopic && !hasSubmitted) {
      setHasSubmitted(true);
      onGuess(selectedTopic);
    }
  };

  // Show result if guess has been made
  if (showResult) {
    const isCorrect = topicGuess?.isCorrect ?? false;
    if (isImpostor) {
      return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl w-full mx-4 text-center">
            <h2 className={`text-6xl font-bold mb-6 ${isCorrect ? 'text-red-600' : 'text-gray-700'}`}>
              {isCorrect ? '🎭 Victory!' : '💀 Defeat'}
            </h2>
            <p className="text-2xl text-gray-700 mb-8">
              {isCorrect 
                ? "You chose the right topic, you win the game!"
                : "You chose the wrong topic, players win the game!"
              }
            </p>
          </div>
        </div>
      );
    } else {
      return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl w-full mx-4 text-center">
            <h2 className={`text-6xl font-bold mb-6 ${isCorrect ? 'text-red-600' : 'text-green-600'}`}>
              {isCorrect ? '😞 Defeat' : '🎉 Victory!'}
            </h2>
            <p className="text-2xl text-gray-700 mb-8">
              {isCorrect
                ? "The impostor chose the right topic, they win the game!"
                : "The impostor chose the wrong topic, players win the game!"
              }
            </p>
          </div>
        </div>
      );
    }
  }

  // Warning phase for impostor
  if (warningPhase && isImpostor) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl w-full mx-4 text-center">
          <h2 className="text-5xl font-bold text-gray-700 mb-6">
            💀 Caught!
          </h2>
          <p className="text-2xl text-gray-700 mb-8 whitespace-pre-line">
            You've been caught, but you have a chance to guess the topic, get ready to guess in {warningTimer} seconds...
          </p>
          <div className="text-6xl font-bold text-purple-600">
            {warningTimer}
          </div>
        </div>
      </div>
    );
  }

  if (!isImpostor) {
    // Non-impostors wait
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl w-full mx-4 text-center">
          <h2 className="text-5xl font-bold text-purple-600 mb-6">
            🤔 Waiting...
          </h2>
          <p className="text-2xl text-gray-700 mb-8">
            The impostor is attempting to guess the topic!
          </p>
          <div className="text-6xl font-bold text-gray-800">
            {timeRemaining}s
          </div>
        </div>
      </div>
    );
  }

  // Impostor's turn to guess
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full my-4">
        <div className="text-center mb-6">
          <h2 className="text-4xl font-bold text-red-600 mb-4">
            🎭 Last Chance to Escape!
          </h2>
          <p className="text-xl text-gray-700 mb-2">
            {hasSubmitted 
              ? "Waiting for results..." 
              : "Choose the correct topic to win"
            }
          </p>
          <div className="text-5xl font-bold text-gray-800 mb-2">
            {timeRemaining}s
          </div>
          <p className="text-lg text-gray-600">
            Category: <span className="font-bold">{gameState.category.name}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {topics.map((topic) => (
            <button
              key={topic}
              onClick={() => !hasSubmitted && setSelectedTopic(topic)}
              disabled={hasSubmitted}
              className={`
                p-6 rounded-lg font-semibold text-lg transition-all
                ${hasSubmitted ? 'cursor-not-allowed opacity-50' : ''}
                ${selectedTopic === topic && !hasSubmitted
                  ? 'bg-red-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200 hover:shadow-md'
                }
              `}
            >
              {topic}
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!selectedTopic || hasSubmitted}
          className="w-full bg-green-600 text-white font-bold text-xl px-8 py-4 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {hasSubmitted 
            ? 'Submitted!' 
            : selectedTopic 
              ? `Submit: ${selectedTopic}` 
              : 'Select a Topic'
          }
        </button>
      </div>
    </div>
  );
}

