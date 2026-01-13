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
  const [error, setError] = useState('');
  const [gameState, setGameState] = useState<PlayerView | null>(null);
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    // Check if already in a game
    const storedGameId = localStorage.getItem('gameId');
    const storedPlayerId = localStorage.getItem('playerId');
    
    if (!storedGameId || !storedPlayerId) {
      // No valid session, redirect to home
      router.push('/');
      return;
    }

    setHasJoined(true);
    connectSocket();
    
    const socket = getSocket();
    
    const fetchGameState = () => {
      socket.emit('game:get-state', (state) => {
        // Check if game still exists on server
        if (!state || !state.gameId) {
          console.log('Game no longer exists on server, clearing localStorage');
          localStorage.removeItem('playerId');
          localStorage.removeItem('gameId');
          localStorage.removeItem('playerName');
          setHasJoined(false);
          setGameState(null);
          router.push('/');
        } else {
          setGameState(state);
        }
      });
    };

    // If already connected, fetch state immediately
    if (socket.connected) {
      setTimeout(fetchGameState, 100);
    } else {
      // Otherwise wait for connection
      socket.on('connect', () => {
        setTimeout(fetchGameState, 100);
      });
    }

    // Handle connection errors
    const errorHandler = (message: string) => {
      console.error('Socket error:', message);
      localStorage.removeItem('playerId');
      localStorage.removeItem('gameId');
      localStorage.removeItem('playerName');
      setHasJoined(false);
      setGameState(null);
      router.push('/');
    };
    
    socket.on('error', errorHandler);

    return () => {
      socket.off('connect');
      socket.off('error', errorHandler);
    };
  }, [router]);

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
        // Removed error message for quick testing - silently clear and allow new join
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

  // Show loading state if not in game yet
  if (!hasJoined || !gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <p className="text-gray-600">Loading lobby...</p>
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

