'use client';

import { useState } from 'react';

export default function DevAutoJoinPage() {
  const [isOpening, setIsOpening] = useState(false);
  const [opened, setOpened] = useState(false);

  const playerNames = ['Player1', 'Player2', 'Player3', 'Player4', 'Player5'];

  const handleOpenTabs = () => {
    setIsOpening(true);
    
    // Open each tab with a small delay to avoid popup blocker issues
    // First player (Player1) will create the party, others will join
    playerNames.forEach((name, index) => {
      setTimeout(() => {
        const url = `/dev/auto-join/${encodeURIComponent(name)}`;
        window.open(url, `player-${index + 1}`, 'noopener,noreferrer');
      }, index * 200); // 200ms delay between each tab
    });

    setTimeout(() => {
      setIsOpening(false);
      setOpened(true);
    }, playerNames.length * 200 + 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center">
          🧪 Dev Auto-Join
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          This will open 5 tabs, each with a different player that automatically joins the lobby.
        </p>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Players:</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            {playerNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>

        <button
          onClick={handleOpenTabs}
          disabled={isOpening || opened}
          className={`w-full py-3 px-6 rounded-lg font-bold text-white transition-colors ${
            isOpening || opened
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {isOpening
            ? 'Opening tabs...'
            : opened
            ? '✓ Tabs Opened'
            : 'Open 5 Player Tabs'}
        </button>

        {opened && (
          <p className="mt-4 text-sm text-gray-500 text-center">
            If popups were blocked, allow them and try again.
          </p>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <a
            href="/lobby"
            className="block text-center text-purple-600 hover:text-purple-700 font-semibold"
          >
            ← Back to Lobby
          </a>
        </div>
      </div>
    </div>
  );
}

