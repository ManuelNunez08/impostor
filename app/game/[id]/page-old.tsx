'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket/client';
import { PlayerView } from '@/types/game';

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  const [gameState, setGameState] = useState<PlayerView | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    // Check if player has credentials
    const playerId = localStorage.getItem('playerId');
    const storedGameId = localStorage.getItem('gameId');

    if (!playerId || storedGameId !== gameId) {
      router.push('/lobby');
      return;
    }

    // Check if socket is already connected
    if (socket.connected) {
      setIsConnected(true);
      // Request current game state
      socket.emit('game:get-state', (state) => {
        setGameState(state);
      });
    }

    socket.on('connect', () => {
      setIsConnected(true);
      // Request current game state
      socket.emit('game:get-state', (state) => {
        setGameState(state);
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('game:state-update', (state: PlayerView) => {
      setGameState(state);
    });

    socket.on('game:phase-change', (phase) => {
      console.log('Phase changed to:', phase);
    });

    socket.on('game:ended', (winner, reason) => {
      console.log('Game ended:', winner, reason);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('game:state-update');
      socket.off('game:phase-change');
      socket.off('game:ended');
    };
  }, [gameId, router]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Connecting to game...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-xl">Loading game state...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {gameState.category.name}
              </h1>
              <p className="text-gray-600">
                Phase: {gameState.phase} | Round: {gameState.currentRound}
              </p>
            </div>
            <div className="text-right">
              {gameState.isImpostor ? (
                <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-bold">
                  You are the IMPOSTOR
                </div>
              ) : (
                <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold">
                  Topic: {gameState.topic}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Players */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Players</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {gameState.players.map((player) => (
              <div
                key={player.id}
                className={`p-4 rounded-lg text-center ${player.isEliminated
                  ? 'bg-gray-200 opacity-50'
                  : 'bg-purple-50'
                  } ${player.id === gameState.playerId ? 'ring-2 ring-purple-600' : ''}`}
              >
                <div className="font-semibold text-gray-800">{player.name}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {player.isEliminated ? 'Eliminated' :
                    player.isReady ? 'Ready' : 'Not Ready'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Questions */}
        {gameState.questions.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Questions & Answers</h2>
            <div className="space-y-3">
              {gameState.questions.slice().reverse().map((q) => {
                const fromPlayer = gameState.players.find(p => p.id === q.fromPlayerId);
                const toPlayer = gameState.players.find(p => p.id === q.toPlayerId);

                return (
                  <div key={q.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-gray-800">
                        {fromPlayer?.name} → {toPlayer?.name}
                      </div>
                      <div className="text-xs text-gray-500">Round {q.round}</div>
                    </div>
                    <div className="text-gray-700 mb-2">
                      <span className="font-medium">Q:</span> {q.question}
                    </div>
                    {q.answer && (
                      <div className="text-gray-700 bg-gray-50 p-2 rounded">
                        <span className="font-medium">A:</span> {q.answer}
                      </div>
                    )}
                    {q.isPassed && (
                      <div className="text-gray-500 italic">Passed</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Game Status */}
        {gameState.phase === 'lobby' && (
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Waiting for players...
            </h2>
            <p className="text-gray-600 mb-6">
              {gameState.players.length} players in lobby
            </p>

            {(() => {
              const currentPlayer = gameState.players.find(p => p.id === gameState.playerId);
              const allReady = gameState.players.every(p => p.isReady);
              const readyCount = gameState.players.filter(p => p.isReady).length;

              return (
                <div className="space-y-4">
                  <div className="text-lg font-semibold text-gray-700">
                    {readyCount} of {gameState.players.length} players ready
                  </div>

                  {currentPlayer && !currentPlayer.isReady && (
                    <button
                      onClick={() => {
                        const socket = getSocket();
                        socket.emit('lobby:ready');
                      }}
                      className="bg-green-600 text-white font-bold px-8 py-3 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      I'm Ready!
                    </button>
                  )}

                  {currentPlayer && currentPlayer.isReady && (
                    <div className="text-green-600 font-bold text-lg">
                      ✓ You are ready! Waiting for others...
                    </div>
                  )}

                  {allReady && gameState.players.length >= 4 && (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
                      All players ready! Game starting soon...
                    </div>
                  )}

                  {gameState.players.length < 4 && (
                    <div className="text-sm text-gray-500">
                      Minimum 4 players required to start
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {gameState.phase === 'ended' && (
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Game Over!
            </h2>
            <p className="text-xl text-gray-700 mb-6">
              {gameState.winner === 'impostor' ? 'Impostor Wins!' : 'Players Win!'}
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-purple-600 text-white font-bold px-8 py-3 rounded-lg hover:bg-purple-700"
            >
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

