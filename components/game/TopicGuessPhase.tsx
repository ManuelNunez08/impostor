'use client';

import { useState } from 'react';
import { PlayerView } from '@/types/game';

interface TopicGuessPhaseProps {
  gameState: PlayerView;
  onGuess: (topic: string) => void;
}

export default function TopicGuessPhase({ gameState, onGuess }: TopicGuessPhaseProps) {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const isImpostor = gameState.isImpostor;
  const topics = gameState.category.topics;
  const timeRemaining = gameState.timeRemaining || 0;

  const handleSubmit = () => {
    if (selectedTopic && !hasSubmitted) {
      setHasSubmitted(true);
      onGuess(selectedTopic);
    }
  };

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

