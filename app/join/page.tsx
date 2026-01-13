'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket, connectSocket } from '@/lib/socket/client';

export default function JoinPartyPage() {
  const router = useRouter();
  const [partyCode, setPartyCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = () => {
    if (!partyCode.trim()) {
      setError('Please enter a party code');
      return;
    }

    setIsConnecting(true);
    setError('');

    const socket = getSocket();
    
    // Add connection error handlers
    const connectionTimeout = setTimeout(() => {
      setIsConnecting(false);
      setError('Connection timeout. Make sure the server is running (npm run dev:all)');
    }, 10000); // 10 second timeout

    socket.once('connect_error', (err) => {
      clearTimeout(connectionTimeout);
      setIsConnecting(false);
      setError('Cannot connect to server. Make sure the server is running (npm run dev:all)');
      console.error('Connection error:', err);
    });

    socket.once('connect', () => {
      clearTimeout(connectionTimeout);
      
      // Use join-by-code event (will be implemented on server)
      // For now, we'll extract gameId from code and use regular join
      // Server will handle generating default name if needed
      socket.emit('lobby:join-by-code', partyCode.toUpperCase().trim(), playerName.trim() || undefined, (response) => {
        if (response.success && response.playerId && response.gameId) {
          localStorage.setItem('playerId', response.playerId);
          localStorage.setItem('gameId', response.gameId);
          localStorage.setItem('playerName', response.playerName || playerName || '');
          
          router.push(`/lobby`);
        } else {
          setError(response.error || 'Failed to join party');
          setIsConnecting(false);
        }
      });
    });

    connectSocket();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Join Party</h1>
          <p className="text-gray-600">Enter the party code to join</p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="partyCode" className="block text-sm font-medium text-gray-700 mb-2">
              Party Code *
            </label>
            <input
              id="partyCode"
              type="text"
              value={partyCode}
              onChange={(e) => setPartyCode(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="Enter party code..."
              maxLength={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-800 text-center text-2xl font-bold tracking-wider"
              disabled={isConnecting}
            />
          </div>

          <div>
            <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name (Optional)
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="Enter your name..."
              maxLength={20}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-800"
              disabled={isConnecting}
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to use a default name</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={isConnecting || !partyCode.trim()}
            className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isConnecting ? 'Joining...' : 'Join'}
          </button>

          <a
            href="/"
            className="block text-center text-purple-600 hover:text-purple-700 font-medium"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}

