'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket, connectSocket } from '@/lib/socket/client';
import { PlayerView } from '@/types/game';
import LobbyTable from '@/components/lobby/LobbyTable';
import LobbySettings from '@/components/lobby/LobbySettings';
import LobbyStatus from '@/components/lobby/LobbyStatus';

export default function DevAutoJoinPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const playerName = decodeURIComponent(params.playerName as string);
  const isFirstPlayer = playerName === 'Player1';
  
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState('');
  const [gameState, setGameState] = useState<PlayerView | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [lobbyCode, setLobbyCode] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    
    setIsConnecting(true);
    setError('');

    const connectionTimeout = setTimeout(() => {
      setIsConnecting(false);
      setError('Connection timeout. Make sure the server is running (npm run dev:all)');
    }, 10000);

    socket.once('connect_error', (err) => {
      clearTimeout(connectionTimeout);
      setIsConnecting(false);
      setError('Cannot connect to server. Make sure the server is running (npm run dev:all)');
      console.error('Connection error:', err);
    });

    socket.once('connect', () => {
      clearTimeout(connectionTimeout);
      
      if (isFirstPlayer) {
        // First player creates the party with default settings
        const defaultSettings = {
          playerName: playerName,
          mode: 'text' as const,
          numPlayers: 5,
          categoryId: 'sports',
          rounds: [
            {
              interrogationTime: 180, // 3 minutes in seconds
              maxQuestionsPerPlayer: 2,
              votingTime: 60, // 1 minute in seconds
              impostorCanGuess: true,
            },
            {
              interrogationTime: 120, // 2 minutes in seconds
              maxQuestionsPerPlayer: 1,
              votingTime: 30, // 30 seconds
              impostorCanGuess: false,
            },
          ],
        };

        socket.emit('lobby:create', defaultSettings, (response) => {
          if (response.success && response.gameId && response.playerId) {
            const code = response.gameId.substring(response.gameId.length - 4).toUpperCase();
            setLobbyCode(code);
            // Store in localStorage so other tabs can access it (localStorage is shared across tabs)
            localStorage.setItem('devAutoJoinLobbyCode', code);
            localStorage.setItem('playerId', response.playerId);
            localStorage.setItem('gameId', response.gameId);
            localStorage.setItem('playerName', playerName);
            
            setHasJoined(true);
            setIsConnecting(false);
          } else {
            setError(response.error || 'Failed to create party');
            setIsConnecting(false);
          }
        });
      } else {
        // Other players join using the lobby code
        // Wait for first player to create the lobby
        let retryCount = 0;
        const maxRetries = 20; // 10 seconds max wait (20 * 500ms)
        
        const checkLobbyCode = () => {
          const code = localStorage.getItem('devAutoJoinLobbyCode');
          if (!code) {
            retryCount++;
            if (retryCount < maxRetries) {
              // Retry after a short delay
              setTimeout(checkLobbyCode, 500);
              return;
            } else {
              setError('Could not find lobby code. Make sure Player1 tab is loaded first.');
              setIsConnecting(false);
              return;
            }
          }
          
          socket.emit('lobby:join-by-code', code, playerName, (response) => {
            if (response.success && response.gameId && response.playerId) {
              localStorage.setItem('playerId', response.playerId);
              localStorage.setItem('gameId', response.gameId);
              localStorage.setItem('playerName', response.playerName || playerName);
              
              setHasJoined(true);
              setIsConnecting(false);
            } else {
              setError(response.error || 'Failed to join party');
              setIsConnecting(false);
            }
          });
        };
        
        // Start checking after a short delay
        setTimeout(checkLobbyCode, 500);
      }
    });

    connectSocket();

    return () => {
      clearTimeout(connectionTimeout);
    };
  }, [playerName, isFirstPlayer]);

  useEffect(() => {
    if (!hasJoined) return;

    connectSocket();
    
    const socket = getSocket();
    
    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('game:state-update', (state: PlayerView) => {
      if (!state || !state.gameId) {
        console.log('Invalid game state received, clearing session');
        localStorage.removeItem('playerId');
        localStorage.removeItem('gameId');
        localStorage.removeItem('playerName');
        setHasJoined(false);
        setGameState(null);
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

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Connecting {playerName}...</p>
        </div>
      </div>
    );
  }

  if (error && !hasJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Connection Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-purple-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-xl">Loading game state...</p>
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
            <p className="text-gray-600">Player: <span className="font-bold">{playerName}</span></p>
            <p className="text-xs text-gray-500 mt-2">🧪 Dev Auto-Join Mode</p>
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

