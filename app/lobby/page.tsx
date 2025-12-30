'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket, connectSocket } from '@/lib/socket/client';
import { PlayerView } from '@/types/game';
import LobbyTable from '@/components/lobby/LobbyTable';
import LobbySettings from '@/components/lobby/LobbySettings';
import LobbyStatus from '@/components/lobby/LobbyStatus';

export default function LobbyPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [gameState, setGameState] = useState<PlayerView | null>(null);
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    // Check if already in a game
    const storedGameId = localStorage.getItem('gameId');
    const storedPlayerId = localStorage.getItem('playerId');
    
    if (storedGameId && storedPlayerId) {
      setHasJoined(true);
      connectSocket();
      
      const socket = getSocket();
      socket.on('connect', () => {
        socket.emit('game:get-state', (state) => {
          // Check if game still exists on server
          if (!state || !state.gameId) {
            console.log('Game no longer exists on server, clearing localStorage');
            localStorage.removeItem('playerId');
            localStorage.removeItem('gameId');
            localStorage.removeItem('playerName');
            setHasJoined(false);
            setGameState(null);
            setError('Previous game session ended. Please join a new game.');
          } else {
            setGameState(state);
          }
        });
      });

      // Handle connection errors
      socket.on('error', (message) => {
        console.error('Socket error:', message);
        localStorage.removeItem('playerId');
        localStorage.removeItem('gameId');
        localStorage.removeItem('playerName');
        setHasJoined(false);
        setGameState(null);
        setError('Connection error. Please join a new game.');
      });
    }
  }, []);

  useEffect(() => {
    if (!hasJoined) return;

    connectSocket();
    
    const socket = getSocket();
    
    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('game:state-update', (state: PlayerView) => {
      // Validate state
      if (!state || !state.gameId) {
        console.log('Invalid game state received, clearing session');
        localStorage.removeItem('playerId');
        localStorage.removeItem('gameId');
        localStorage.removeItem('playerName');
        setHasJoined(false);
        setGameState(null);
        setError('Game session lost. Please join a new game.');
        return;
      }

      setGameState(state);
      
      // If game started, navigate to game page
      if (state.phase !== 'lobby') {
        router.push(`/game/${state.gameId}`);
      }
    });

    socket.on('game:phase-change', (phase) => {
      console.log('Phase changed to:', phase);
      if (phase !== 'lobby') {
        const gameId = localStorage.getItem('gameId');
        if (gameId) {
          router.push(`/game/${gameId}`);
        }
      }
    });

    socket.on('error', (message) => {
      setError(message);
      setIsConnecting(false);
    });

    return () => {
      socket.off('connect');
      socket.off('game:state-update');
      socket.off('game:phase-change');
      socket.off('error');
    };
  }, [hasJoined, router]);

  const handleJoinGame = () => {
    if (!playerName.trim()) {
      setError('Please enter a name');
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
      
      socket.emit('lobby:join', playerName, (response) => {
        if (response.success && response.gameId && response.playerId) {
          localStorage.setItem('playerId', response.playerId);
          localStorage.setItem('gameId', response.gameId);
          localStorage.setItem('playerName', playerName);
          
          setHasJoined(true);
          setIsConnecting(false);
        } else {
          setError(response.error || 'Failed to join game');
          setIsConnecting(false);
        }
      });
    });

    connectSocket();
  };

  const handleReadyToggle = () => {
    const socket = getSocket();
    socket.emit('lobby:ready');
  };

  const handleLeaveLobby = () => {
    const socket = getSocket();
    socket.emit('lobby:leave');
    
    localStorage.removeItem('playerId');
    localStorage.removeItem('gameId');
    localStorage.removeItem('playerName');
    
    setHasJoined(false);
    setGameState(null);
    router.push('/');
  };

  // Show join form if not in game yet
  if (!hasJoined || !gameState) {
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
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players.find(p => p.id === gameState.playerId);
  const lobbyCode = gameState.gameId.substring(gameState.gameId.length - 4).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              LOBBY CODE: {lobbyCode}
            </h1>
            <p className="text-gray-600">Share this code with friends to join</p>
          </div>

          <button
            onClick={handleLeaveLobby}
            className="bg-red-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-600 transition-colors"
          >
            Leave Lobby
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Lobby Table */}
          <div className="lg:col-span-2 flex items-center justify-center">
            <LobbyTable
              players={gameState.players}
              currentPlayerId={gameState.playerId}
              lobbyCode={lobbyCode}
            />
          </div>

          {/* Right: Settings and Status */}
          <div className="space-y-6">
            <LobbySettings
              category={gameState.category}
              minPlayers={gameState.config.minPlayers}
              maxPlayers={gameState.config.maxPlayers}
            />

            <LobbyStatus
              players={gameState.players}
              minPlayers={gameState.config.minPlayers}
              maxPlayers={gameState.config.maxPlayers}
              countdown={gameState.lobbyCountdown}
              isCurrentPlayerReady={currentPlayer?.isReady || false}
              onReadyToggle={handleReadyToggle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

