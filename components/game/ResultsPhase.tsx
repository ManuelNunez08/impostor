'use client';

import { useRouter } from 'next/navigation';
import { PlayerView } from '@/types/game';

interface ResultsPhaseProps {
  gameState: PlayerView;
}

export default function ResultsPhase({ gameState }: ResultsPhaseProps) {
  const router = useRouter();
  const isImpostor = gameState.isImpostor;
  const winner = gameState.winner;
  const hasNextRound = gameState.settings && 
    gameState.currentRoundIndex < gameState.settings.rounds.length - 1;

  // Determine message based on outcome
  const getMessage = () => {
    if (isImpostor) {
      if (winner === 'impostor') {
        return {
          title: "🎭 Victory!",
          message: "You win the game!",
          color: "text-red-600"
        };
      } else if (winner === 'players') {
        return {
          title: "💀 Caught!",
          message: "You've been caught!",
          color: "text-gray-700"
        };
      } else {
        // No winner yet - impostor survived this round
        return {
          title: "😎 Safe... For Now",
          message: hasNextRound 
            ? "You live on to see another day... Moving on to next round"
            : "You live on to see another day... You win the game!",
          color: "text-orange-600"
        };
      }
    } else {
      // Regular players
      if (winner === 'players') {
        return {
          title: "🎉 Victory!",
          message: "The impostor has been caught! You win!",
          color: "text-green-600"
        };
      } else if (winner === 'impostor') {
        return {
          title: "😞 Defeat",
          message: "The impostor wins!",
          color: "text-red-600"
        };
      } else {
        // No winner yet - check if impostor was caught
        // Find the impostor ID from the game state
        const impostorId = gameState.players.find(p => {
          // The impostor is the one whose ID matches the game's impostorId
          // We need to check if they're in eliminatedPlayers
          return gameState.eliminatedPlayers.includes(p.id);
        })?.id;
        
        const impostorCaught = impostorId !== undefined && gameState.eliminatedPlayers.includes(impostorId);
        
        if (impostorCaught) {
          // Check if impostor can guess topic in current round
          const currentRoundConfig = gameState.settings?.rounds[gameState.currentRoundIndex];
          const canGuess = currentRoundConfig?.impostorCanGuess ?? false;
          
          if (canGuess) {
            // Impostor can still guess - they should be in topic-guess phase
            // But if we're in results phase, it means they're about to get a chance
            return {
              title: "🎯 Impostor Caught!",
              message: "The impostor has been caught, but they still have a chance to escape if they choose the right topic...",
              color: "text-green-600"
            };
          } else {
            // Impostor caught but cannot guess - game should be over
            // Note: The game engine should have called endGame, but if we're still in results phase,
            // show the correct message
            return {
              title: "🎯 Impostor Caught!",
              message: "The impostor has been caught! The game is over.",
              color: "text-green-600"
            };
          }
        } else {
          return {
            title: "⚠️ Still at Large",
            message: hasNextRound
              ? "The impostor remains at large. Moving on to next round"
              : "The impostor remains at large. They win the game!",
            color: "text-orange-600"
          };
        }
      }
    }
  };

  const { title, message, color } = getMessage();
  const gameIsOver = winner !== null;

  const handleReturnToLobby = () => {
    localStorage.removeItem('playerId');
    localStorage.removeItem('gameId');
    localStorage.removeItem('playerName');
    router.push('/');
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl w-full mx-4 text-center">
        <h2 className={`text-6xl font-bold ${color} mb-6`}>
          {title}
        </h2>
        <p className="text-2xl text-gray-700 mb-8">
          {message}
        </p>

        {gameIsOver ? (
          <button
            onClick={handleReturnToLobby}
            className="bg-purple-600 text-white font-bold text-xl px-12 py-4 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Return to Lobby
          </button>
        ) : (
          <div className="text-gray-500 text-lg animate-pulse">
            Continuing in a moment...
          </div>
        )}
      </div>
    </div>
  );
}

