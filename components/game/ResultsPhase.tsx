'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { PlayerView } from '@/types/game';

interface ResultsPhaseProps {
  gameState: PlayerView;
}

type ResultPhase = 1 | 2 | 3; // Phase 1: Initial result, Phase 2: Detailed reason, Phase 3: Countdown

export default function ResultsPhase({ gameState }: ResultsPhaseProps) {
  const router = useRouter();
  const isImpostor = gameState.isImpostor;
  const winner = gameState.winner;
  const hasNextRound = gameState.settings && 
    gameState.currentRoundIndex < gameState.settings.rounds.length - 1;
  const timeRemaining = gameState.timeRemaining ?? 0;

  const [currentPhase, setCurrentPhase] = useState<ResultPhase>(1);
  const [phase2Timer, setPhase2Timer] = useState<number | null>(null);

  // Calculate voting results for current round
  const getVotingResults = () => {
    const currentRoundVotes = gameState.votes.filter(v => v.round === gameState.currentRound);
    
    // Count votes per player
    const voteCounts: Record<string, number> = {};
    currentRoundVotes.forEach(vote => {
      voteCounts[vote.targetPlayerId] = (voteCounts[vote.targetPlayerId] || 0) + 1;
    });

    // Find player(s) with most votes
    const maxVotes = Math.max(...Object.values(voteCounts), 0);
    const playersWithMaxVotes = Object.keys(voteCounts).filter(
      pid => voteCounts[pid] === maxVotes
    );

    // If we're in results phase and winner is null, impostor was NOT caught
    // If we're in results phase and winner is 'players', impostor was caught (can't guess)
    // If we're in topic-guess phase, impostor was caught (can guess)
    const impostorCaught = winner === 'players' || gameState.phase === 'topic-guess';

    // Find eliminated players for this round (those with most votes)
    // In results phase with no winner, someone else was eliminated (not impostor)
    const eliminatedPlayerId = playersWithMaxVotes.length === 1 && maxVotes > 0 && !impostorCaught
      ? playersWithMaxVotes[0]
      : null;

    const eliminatedPlayer = eliminatedPlayerId 
      ? gameState.players.find(p => p.id === eliminatedPlayerId)
      : null;

    // Determine tie information
    const isTie = playersWithMaxVotes.length > 1 && maxVotes > 0;
    const tiedPlayerIds = isTie ? playersWithMaxVotes : [];
    const tiedPlayers = tiedPlayerIds.map(id => gameState.players.find(p => p.id === id)).filter(Boolean);
    const tiedPlayerNames = tiedPlayers.map(p => p!.name);
    
    // Check if impostor is in tie
    const impostorId = gameState.players.find(p => 
      gameState.eliminatedPlayers.includes(p.id)
    )?.id;
    const impostorInTie = impostorId && tiedPlayerIds.includes(impostorId);
    const currentPlayerInTie = tiedPlayerIds.includes(gameState.playerId);

    return {
      impostorCaught,
      eliminatedPlayer,
      isTie,
      tiedPlayerIds,
      tiedPlayers,
      tiedPlayerNames,
      impostorInTie,
      currentPlayerInTie,
      playersWithMaxVotes,
      maxVotes
    };
  };

  const votingResults = getVotingResults();

  // Auto-advance to Phase 2 after 2 seconds, then Phase 3
  useEffect(() => {
    if (currentPhase === 1 && winner === null && !votingResults.impostorCaught) {
      const timer = setTimeout(() => {
        setCurrentPhase(2);
        setPhase2Timer(2); // Show Phase 2 for 2 seconds
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentPhase, winner, votingResults.impostorCaught]);

  useEffect(() => {
    if (currentPhase === 2 && phase2Timer !== null) {
      const timer = setTimeout(() => {
        setCurrentPhase(3);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentPhase, phase2Timer]);

  // Get message for each phase
  const getPhase1Message = () => {
    if (isImpostor) {
      if (winner === 'impostor') {
        return {
          title: "🎭 Victory!",
          message: "You win!",
          color: "text-red-600"
        };
      } else if (winner === 'players') {
        return {
          title: "💀 Caught!",
          message: "You were caught, players win!",
          color: "text-gray-700"
        };
      } else {
        // No winner yet - impostor survived this round
        return {
          title: "😎 Safe... For Now",
          message: "You were not caught...",
          color: "text-orange-600"
        };
      }
    } else {
      // Regular players
      if (winner === 'players') {
        return {
          title: "🎉 Victory!",
          message: "The impostor is caught, players win!",
          color: "text-green-600"
        };
      } else if (winner === 'impostor') {
        // Last round - impostor wins (find which player is the impostor)
        // Since we don't know the impostor ID directly, we can check eliminated players
        // If we're viewing as a regular player, any active player could be the impostor
        // For now, show a generic message (we could enhance this by storing impostor name in state)
        const activePlayers = gameState.players.filter(p => !gameState.eliminatedPlayers.includes(p.id));
        const impostorPlayer = activePlayers.find(p => !gameState.eliminatedPlayers.includes(p.id));
        const impostorName = impostorPlayer?.name || 'Unknown';
        return {
          title: "😞 Defeat",
          message: `The impostor wins! Player ${impostorName} was the impostor.`,
          color: "text-red-600"
        };
      } else {
        // No winner yet
        if (votingResults.impostorCaught) {
          const currentRoundConfig = gameState.settings?.rounds[gameState.currentRoundIndex];
          const canGuess = currentRoundConfig?.impostorCanGuess ?? false;
          
          if (canGuess) {
            return {
              title: "🎯 Impostor Caught!",
              message: `The impostor has been caught, but they have a chance to guess the topic in the next ${timeRemaining} seconds...`,
              color: "text-green-600"
            };
          } else {
            return {
              title: "🎯 Impostor Caught!",
              message: "The impostor is caught, players win!",
              color: "text-green-600"
            };
          }
        } else {
          return {
            title: "⚠️ Still at Large",
            message: "The impostor was not caught...",
            color: "text-orange-600"
          };
        }
      }
    }
  };

  const getPhase2Message = () => {
    if (winner !== null) return null; // Phase 2 only for continuing games
    if (votingResults.impostorCaught) return null; // Phase 2 only for impostor not caught

    if (isImpostor) {
      if (votingResults.eliminatedPlayer) {
        return {
          title: "😎 Safe... For Now",
          message: `Player ${votingResults.eliminatedPlayer.name} was voted out instead`,
          color: "text-orange-600"
        };
      } else if (votingResults.isTie) {
        if (votingResults.impostorInTie) {
          // Impostor is in the tie
          const otherTiedNames = votingResults.tiedPlayers
            .filter(p => p!.id !== gameState.playerId)
            .map(p => p!.name);
          return {
            title: "😎 Safe... For Now",
            message: `There was a tie between you and players: ${otherTiedNames.join(', ')}`,
            color: "text-orange-600"
          };
        } else {
          // Impostor not in tie
          return {
            title: "😎 Safe... For Now",
            message: `There was a tie among players: ${votingResults.tiedPlayerNames.join(', ')}`,
            color: "text-orange-600"
          };
        }
      }
    } else {
      // Regular players
      if (votingResults.eliminatedPlayer) {
        if (votingResults.eliminatedPlayer.id === gameState.playerId) {
          return {
            title: "⚠️ Still at Large",
            message: "You were voted out instead",
            color: "text-orange-600"
          };
        } else {
          return {
            title: "⚠️ Still at Large",
            message: `Player ${votingResults.eliminatedPlayer.name} was voted out instead`,
            color: "text-orange-600"
          };
        }
      } else if (votingResults.isTie) {
        if (votingResults.currentPlayerInTie) {
          // Current player is in the tie
          const otherTiedNames = votingResults.tiedPlayers
            .filter(p => p!.id !== gameState.playerId)
            .map(p => p!.name);
          return {
            title: "⚠️ Still at Large",
            message: `There was a tie between you and: ${otherTiedNames.join(', ')}`,
            color: "text-orange-600"
          };
        } else {
          // Current player not in tie
          return {
            title: "⚠️ Still at Large",
            message: `There was a tie among players: ${votingResults.tiedPlayerNames.join(', ')}`,
            color: "text-orange-600"
          };
        }
      }
    }

    return null;
  };

  const getPhase3Message = () => {
    if (winner !== null) return null; // Phase 3 only for continuing games
    if (votingResults.impostorCaught) return null; // Phase 3 only for impostor not caught

    if (isImpostor) {
      return {
        title: "😎 Safe... For Now",
        message: `Continuing to next round in ${timeRemaining} seconds...`,
        color: "text-orange-600"
      };
    } else {
      return {
        title: "⚠️ Still at Large",
        message: `Continuing to next round in ${timeRemaining} seconds...`,
        color: "text-orange-600"
      };
    }
  };

  const getMessage = () => {
    if (currentPhase === 1) {
      return getPhase1Message();
    } else if (currentPhase === 2) {
      const phase2Msg = getPhase2Message();
      return phase2Msg || getPhase1Message(); // Fallback to Phase 1 if Phase 2 not applicable
    } else {
      const phase3Msg = getPhase3Message();
      return phase3Msg || getPhase1Message(); // Fallback to Phase 1 if Phase 3 not applicable
    }
  };

  const messageData = getMessage();
  if (!messageData) {
    return null; // Should not happen
  }

  const { title, message, color } = messageData;
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
        <p className="text-2xl text-gray-700 mb-8 whitespace-pre-line">
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
            {currentPhase === 3 ? `Continuing in ${timeRemaining} seconds...` : 'Continuing in a moment...'}
          </div>
        )}
      </div>
    </div>
  );
}
