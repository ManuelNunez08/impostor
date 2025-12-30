'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket, connectSocket } from '@/lib/socket/client';

export default function LobbyPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    connectSocket();
    
    const socket = getSocket();
    
    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('error', (message) => {
      setError(message);
      setIsConnecting(false);
    });

    return () => {
      socket.off('connect');
      socket.off('error');
    };
  }, []);

  const handleJoinGame = () => {
    if (!playerName.trim()) {
      setError('Please enter a name');
      return;
    }

    setIsConnecting(true);
    setError('');

    const socket = getSocket();
    
    socket.emit('lobby:join', playerName, (response) => {
      if (response.success && response.gameId && response.playerId) {
        // Store player info in localStorage
        localStorage.setItem('playerId', response.playerId);
        localStorage.setItem('gameId', response.gameId);
        localStorage.setItem('playerName', playerName);
        
        // Navigate to game room
        router.push(`/game/${response.gameId}`);
      } else {
        setError(response.error || 'Failed to join game');
        setIsConnecting(false);
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Join Game</h1>
          <p className="text-gray-600">Enter your name to start playing</p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
              placeholder="Enter your name..."
              maxLength={20}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-800"
              disabled={isConnecting}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleJoinGame}
            disabled={isConnecting || !playerName.trim()}
            className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isConnecting ? 'Connecting...' : 'Join Game'}
          </button>

          <a
            href="/"
            className="block text-center text-purple-600 hover:text-purple-700 font-medium"
          >
            ← Back to Home
          </a>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-2">Quick Tips:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Choose a memorable name</li>
            <li>• You'll be matched with 3-5 other players</li>
            <li>• The game starts when everyone is ready</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

