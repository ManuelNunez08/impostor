'use client';

import { Player, PlayerId } from '@/types/game';

interface VoteData {
  voterId: PlayerId;
  targetId: PlayerId | null; // null means player hasn't voted yet
  isLocked: boolean;
}

interface CurrentVotesProps {
  players: Player[];
  currentPlayerId: PlayerId;
  votes: VoteData[];
}

const PLAYER_COLORS = [
  '#F59E0B', // yellow/orange
  '#8B5CF6', // purple
  '#F97316', // orange
  '#10B981', // green
  '#EF4444', // red
  '#3B82F6', // blue
];

export default function CurrentVotes({ players, currentPlayerId, votes }: CurrentVotesProps) {
  // Put current player's vote first
  const sortedVotes = [...votes].sort((a, b) => {
    if (a.voterId === currentPlayerId) return -1;
    if (b.voterId === currentPlayerId) return 1;
    return 0;
  });

  const getPlayerColor = (playerId: PlayerId) => {
    const index = players.findIndex(p => p.id === playerId);
    return index !== -1 ? PLAYER_COLORS[index % PLAYER_COLORS.length] : '#999';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-3">
      <h3 className="text-sm font-bold text-gray-800 mb-2">Current Votes</h3>
      
      <div className="space-y-1.5">
        {sortedVotes.map((vote) => {
          const voter = players.find(p => p.id === vote.voterId);
          
          if (!voter) return null;

          return (
            <div
              key={vote.voterId}
              className="flex items-center gap-1.5 p-1.5 bg-gray-50 rounded"
            >
              {/* Voter */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                style={{ backgroundColor: getPlayerColor(voter.id) }}
              >
                😊
              </div>
              
              {/* Arrow */}
              <div className="text-gray-600 text-base">👉</div>
              
              {/* Target or Placeholder */}
              {vote.targetId ? (
                // Show actual target
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                  style={{ backgroundColor: getPlayerColor(vote.targetId) }}
                >
                  😊
                </div>
              ) : (
                // Show grey placeholder for no vote yet
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-sm bg-gray-300 border-2 border-dashed border-gray-400"
                >
                  <span className="text-gray-500 text-[10px]">?</span>
                </div>
              )}
              
              {/* Lock status */}
              <div className="ml-auto text-base">
                {vote.targetId ? (vote.isLocked ? '🔒' : '🔓') : '⏳'}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="text-[10px] text-gray-500 mt-2 text-center">
        {votes.filter(v => v.isLocked && v.targetId !== null).length} / {players.filter(p => !p.isEliminated).length} locked
      </div>
    </div>
  );
}

