'use client';

import { Player } from '@/types/game';

interface LobbyStatusProps {
  players: Player[];
  minPlayers: number;
  maxPlayers: number;
  countdown: number | null;
  isCurrentPlayerReady: boolean;
  onReadyToggle: () => void;
}

export default function LobbyStatus({
  players,
  minPlayers,
  maxPlayers,
  countdown,
  isCurrentPlayerReady,
  onReadyToggle,
}: LobbyStatusProps) {
  const playerCount = players.length;
  const readyCount = players.filter(p => p.isReady).length;
  const needsMorePlayers = playerCount < minPlayers;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Status Message */}
      <div className="text-center mb-6">
        {needsMorePlayers ? (
          <>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Waiting for players...
            </h3>
            <p className="text-gray-600">
              {minPlayers - playerCount} more player{minPlayers - playerCount !== 1 ? 's' : ''} needed
            </p>
          </>
        ) : countdown !== null && countdown > 0 ? (
          <>
            <h3 className="text-2xl font-bold text-green-600 mb-2">
              Starting in {countdown}s
            </h3>
            <p className="text-gray-600">
              Get ready!
            </p>
          </>
        ) : (
          <>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Ready to start!
            </h3>
            <p className="text-gray-600">
              Waiting for all players to be ready
            </p>
          </>
        )}
      </div>

      {/* Ready Count */}
      <div className="text-center mb-4">
        <div className="text-lg font-semibold text-gray-700">
          {readyCount} / {playerCount} players ready
        </div>
        {readyCount === playerCount && playerCount >= minPlayers && (
          <div className="text-sm text-green-600 font-medium mt-1">
            All ready! Starting soon...
          </div>
        )}
      </div>

      {/* Ready Button */}
      <button
        onClick={onReadyToggle}
        className={`w-full py-3 rounded-lg font-bold text-lg transition-colors ${
          isCurrentPlayerReady
            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            : 'bg-green-600 text-white hover:bg-green-700'
        }`}
      >
        {isCurrentPlayerReady ? '✓ I\'m Ready (Click to Unready)' : 'I\'m Ready!'}
      </button>

      {/* Player count info */}
      <div className="text-xs text-center text-gray-500 mt-4">
        {playerCount} / {maxPlayers} players in lobby
      </div>
    </div>
  );
}

