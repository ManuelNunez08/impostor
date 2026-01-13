'use client';

import { PlayerView } from '@/types/game';

interface PrepareToVoteProps {
  gameState: PlayerView;
}

export default function PrepareToVote({ gameState }: PrepareToVoteProps) {
  const timeRemaining = gameState.timeRemaining ?? 5;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl w-full mx-4 text-center">
        <p className="text-3xl text-gray-700 mb-4 whitespace-pre-line">
          Prepare to vote,{'\n'}continuing in {timeRemaining} seconds...
        </p>
        <div className="text-6xl font-bold text-purple-600 mt-8">
          {timeRemaining}
        </div>
      </div>
    </div>
  );
}

