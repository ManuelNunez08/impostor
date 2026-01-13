'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket, connectSocket } from '@/lib/socket/client';
import { CATEGORIES } from '@/lib/game-engine/categories';
import { Category } from '@/types/game';
import TopicDropdown from '@/components/shared/TopicDropdown';

interface RoundConfig {
  interrogationTime: number; // in minutes
  maxQuestionsPerPlayer: number;
  votingTime: number; // in seconds
  impostorCanGuess: boolean;
}

export default function CreatePartyPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [partySize, setPartySize] = useState<'regular' | 'large'>('regular');
  const [selectedCategory, setSelectedCategory] = useState<Category>(() => 
    CATEGORIES.find(c => c.id === 'sports') || CATEGORIES[0]
  );
  const [showRoundConfig, setShowRoundConfig] = useState(false);
  const [rounds, setRounds] = useState<RoundConfig[]>([
    {
      interrogationTime: 3,
      maxQuestionsPerPlayer: 2,
      votingTime: 60,
      impostorCanGuess: true,
    },
    {
      interrogationTime: 2,
      maxQuestionsPerPlayer: 1,
      votingTime: 30,
      impostorCanGuess: false,
    },
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleAddRound = () => {
    if (rounds.length >= 5) return;
    setRounds([...rounds, {
      interrogationTime: 3,
      maxQuestionsPerPlayer: 2,
      votingTime: 60,
      impostorCanGuess: true,
    }]);
  };

  const handleRemoveRound = (index: number) => {
    if (rounds.length <= 2) return;
    setRounds(rounds.filter((_, i) => i !== index));
  };

  const handleUpdateRound = (index: number, updates: Partial<RoundConfig>) => {
    const newRounds = [...rounds];
    newRounds[index] = { ...newRounds[index], ...updates };
    setRounds(newRounds);
  };

  const handleCreate = () => {
    // Validation
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    // Party size validation is handled by the selection

    if (rounds.length < 2 || rounds.length > 5) {
      setError('Must have between 2 and 5 rounds');
      return;
    }

    setError('');
    setIsCreating(true);

    const socket = getSocket();
    
    const connectionTimeout = setTimeout(() => {
      setIsCreating(false);
      setError('Connection timeout. Make sure the server is running (npm run dev:all)');
    }, 10000);

    socket.once('connect_error', (err) => {
      clearTimeout(connectionTimeout);
      setIsCreating(false);
      setError('Cannot connect to server. Make sure the server is running (npm run dev:all)');
      console.error('Connection error:', err);
    });

    socket.once('connect', () => {
      clearTimeout(connectionTimeout);
      
      socket.emit('lobby:create', {
        playerName: playerName.trim(),
        mode,
        numPlayers: partySize === 'regular' ? 5 : 7,
        categoryId: selectedCategory.id,
        rounds: rounds.map((r, index) => ({
          interrogationTime: r.interrogationTime * 60, // convert to seconds
          maxQuestionsPerPlayer: r.maxQuestionsPerPlayer,
          votingTime: r.votingTime,
          impostorCanGuess: r.impostorCanGuess,
        })),
      }, (response) => {
        if (response.success && response.playerId && response.gameId) {
          localStorage.setItem('playerId', response.playerId);
          localStorage.setItem('gameId', response.gameId);
          localStorage.setItem('playerName', playerName.trim());
          
          router.push(`/lobby`);
        } else {
          setError(response.error || 'Failed to create party');
          setIsCreating(false);
        }
      });
    });

    connectSocket();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <h1 className="text-4xl font-bold text-white mb-6">Create Party</h1>

        <div className="grid grid-cols-[2fr_1fr] gap-8 items-start">
          {/* Left Column - Game Settings */}
          <div className="space-y-4 min-w-0">
            {/* Player Name */}
            <div>
              <label className="block text-white text-sm font-medium mb-1.5">
                Your Name *
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name..."
                maxLength={20}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-800"
                disabled={isCreating}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-white text-sm font-medium mb-1.5">
                Category:
              </label>
              <select
                value={selectedCategory.id}
                onChange={(e) => {
                  const category = CATEGORIES.find(c => c.id === e.target.value);
                  if (category) setSelectedCategory(category);
                }}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-800 bg-white"
                disabled={isCreating}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {selectedCategory && (
                <div className="mt-1.5">
                  <TopicDropdown category={selectedCategory} />
                </div>
              )}
            </div>

            {/* Party Size */}
            <div>
              <label className="block text-white text-sm font-medium mb-1.5">
                Party Size:
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPartySize('regular')}
                  disabled={isCreating}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    partySize === 'regular'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-800 hover:bg-gray-100 border border-gray-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Regular (4-5)
                </button>
                <button
                  type="button"
                  onClick={() => setPartySize('large')}
                  disabled={isCreating}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    partySize === 'large'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-800 hover:bg-gray-100 border border-gray-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Large (6-7)
                </button>
              </div>
            </div>

            {/* Round Configuration Toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowRoundConfig(!showRoundConfig)}
                className="text-white text-sm font-medium hover:underline flex items-center gap-2"
                disabled={isCreating}
              >
                Change default round configs
                <span>{showRoundConfig ? '▲' : '▼'}</span>
              </button>
            </div>

            {/* Round Configuration Box */}
            {showRoundConfig && (
              <div className="bg-white border-2 border-black rounded-lg p-4 overflow-x-auto w-full">
              <div className="flex gap-6" style={{ width: 'max-content' }}>
                {rounds.map((round, index) => (
                  <div key={index} className="flex-shrink-0 w-[280px] relative">
                    {index > 0 && (
                      <div className="absolute left-[-12px] top-0 bottom-0 w-px bg-gray-300"></div>
                    )}
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-bold text-gray-800">Round {index + 1}</h3>
                      {rounds.length > 2 && (
                        <button
                          onClick={() => handleRemoveRound(index)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                          disabled={isCreating}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      {/* Interrogation Time */}
                      <div>
                        <label className="block text-gray-700 text-sm font-medium mb-1.5">
                          Interrogation Time:
                        </label>
                        <div className="flex gap-2">
                          {[2, 3, 4, 5].map(min => (
                            <button
                              key={min}
                              type="button"
                              onClick={() => handleUpdateRound(index, { interrogationTime: min })}
                              disabled={isCreating}
                              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                round.interrogationTime === min
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {min}m
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Questions Per Player */}
                      <div>
                        <label className="block text-gray-700 text-sm font-medium mb-1.5">
                          Interrogation Questions Per Player:
                        </label>
                        <div className="flex gap-2">
                          {[1, 2, 3].map(num => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => handleUpdateRound(index, { maxQuestionsPerPlayer: num })}
                              disabled={isCreating}
                              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                round.maxQuestionsPerPlayer === num
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-gray-300 my-2"></div>

                      {/* Voting Time */}
                      <div>
                        <label className="block text-gray-700 text-sm font-medium mb-1.5">
                          Voting Time:
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateRound(index, { votingTime: 30 })}
                            disabled={isCreating}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              round.votingTime === 30
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            30s
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateRound(index, { votingTime: 60 })}
                            disabled={isCreating}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              round.votingTime === 60
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            1m
                          </button>
                        </div>
                      </div>

                      {/* Impostor Can Guess */}
                      <div>
                        <label className="flex items-center gap-2 text-gray-700 text-sm font-medium">
                          <input
                            type="checkbox"
                            checked={round.impostorCanGuess}
                            onChange={(e) => handleUpdateRound(index, { impostorCanGuess: e.target.checked })}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            disabled={isCreating}
                          />
                          Impostor can Guess to win:
                        </label>
                      </div>
                    </div>
                  </div>
                ))}

                {rounds.length < 5 && (
                  <div className="flex-shrink-0 flex items-center pl-2">
                    <button
                      onClick={handleAddRound}
                      className="w-16 h-16 text-4xl text-blue-600 font-bold hover:text-blue-800 transition-colors flex items-center justify-center"
                      disabled={isCreating}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>

          {/* Right Column - Mode Selection and Action */}
          <div className="flex flex-col gap-6">
            {/* Mode Selection */}
            <div>
              <h2 className="text-white text-lg font-semibold mb-4">Game Mode</h2>
              <div className="space-y-4">
                <button
                  onClick={() => setMode('text')}
                  className={`w-full p-6 rounded-lg border-2 transition-all ${
                    mode === 'text'
                      ? 'bg-blue-600 border-blue-800 text-white'
                      : 'bg-white border-gray-300 text-gray-800 hover:border-blue-400'
                  }`}
                  disabled={isCreating}
                >
                  <h3 className="font-bold text-lg mb-2">Text Chat (Classic)</h3>
                  <p className="text-sm opacity-90">
                    Ask questions through text. Perfect for players who prefer typing and reading.
                  </p>
                </button>

                <button
                  onClick={() => setMode('voice')}
                  className={`w-full p-6 rounded-lg border-2 transition-all ${
                    mode === 'voice'
                      ? 'bg-blue-600 border-blue-800 text-white'
                      : 'bg-white border-gray-300 text-gray-800 hover:border-blue-400'
                  }`}
                  disabled={isCreating}
                >
                  <h3 className="font-bold text-lg mb-2">Voice Chat</h3>
                  <p className="text-sm opacity-90">
                    Talk directly with your voice. More natural conversation and faster gameplay.
                  </p>
                </button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Start Party Button */}
            <button
              onClick={handleCreate}
              disabled={isCreating || !playerName.trim()}
              className="mt-auto bg-black text-white font-bold text-xl py-5 px-8 rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? 'Creating...' : 'Start Party'}
            </button>

            <a
              href="/"
              className="text-center text-white/80 hover:text-white font-medium"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

