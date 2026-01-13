'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket/client';
import { PlayerView, Player, Question } from '@/types/game';
import CircularTable from '@/components/game/CircularTable';
import CenterDialogue from '@/components/game/CenterDialogue';
import AskModal from '@/components/game/AskModal';
import AnswerPanel from '@/components/game/AnswerPanel';
import QuestionTracker from '@/components/game/QuestionTracker';
import ReadyToVoteBox from '@/components/game/ReadyToVoteBox';
import VotingTable from '@/components/game/VotingTable';
import CurrentVotes from '@/components/game/CurrentVotes';
import VotingChat from '@/components/game/VotingChat';
import PrepareToVote from '@/components/game/PrepareToVote';
import ResultsPhase from '@/components/game/ResultsPhase';
import TopicGuessPhase from '@/components/game/TopicGuessPhase';
import TopicDropdown from '@/components/shared/TopicDropdown';

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  const [gameState, setGameState] = useState<PlayerView | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // UI state
  const [askingPlayerId, setAskingPlayerId] = useState<string | null>(null);
  const [draftQuestions, setDraftQuestions] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>('');

  // Voting state
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [isVoteLocked, setIsVoteLocked] = useState(false);
  const [votingTimer, setVotingTimer] = useState(30);

  useEffect(() => {
    const socket = getSocket();

    // Check if player has credentials
    const playerId = localStorage.getItem('playerId');
    const storedGameId = localStorage.getItem('gameId');

    if (!playerId || storedGameId !== gameId) {
      router.push('/lobby');
      return;
    }

    // Check if socket is already connected
    if (socket.connected) {
      setIsConnected(true);
      socket.emit('game:get-state', (state) => {
        if (!state || !state.gameId) {
          console.log('Game no longer exists, redirecting to lobby');
          localStorage.removeItem('playerId');
          localStorage.removeItem('gameId');
          localStorage.removeItem('playerName');
          router.push('/lobby');
          return;
        }
        setGameState(state);
      });
    }

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('game:get-state', (state) => {
        if (!state || !state.gameId) {
          console.log('Game no longer exists, redirecting to lobby');
          localStorage.removeItem('playerId');
          localStorage.removeItem('gameId');
          localStorage.removeItem('playerName');
          router.push('/lobby');
          return;
        }
        setGameState(state);
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('game:state-update', (state: PlayerView) => {
      if (!state || !state.gameId) {
        console.log('Invalid game state received, redirecting to lobby');
        localStorage.removeItem('playerId');
        localStorage.removeItem('gameId');
        localStorage.removeItem('playerName');
        router.push('/lobby');
        return;
      }
      setGameState(state);
    });

    socket.on('game:phase-change', (phase) => {
      console.log('Phase changed to:', phase);
    });

    socket.on('game:timer-update', (timeRemaining: number) => {
      // Update voting timer from server (only timer that needs client-side state)
      // Results, interrogation, and topic-guess timers are in gameState.timeRemaining
      // and will be updated via state-update broadcasts
      setVotingTimer(timeRemaining);
    });

    socket.on('game:ended', (winner, reason) => {
      console.log('Game ended:', winner, reason);
    });

    socket.on('error', (message) => {
      setError(message);
      // If it's a critical error, clear session and redirect
      if (message.includes('not found') || message.includes('does not exist')) {
        localStorage.removeItem('playerId');
        localStorage.removeItem('gameId');
        localStorage.removeItem('playerName');
        setTimeout(() => router.push('/lobby'), 2000);
      }
    });

    // Chat messages are now included in gameState.chatMessages
    // Still listen to real-time updates for immediate UI feedback
    socket.on('game:voting-chat', () => {
      // Chat message already added to gameState via broadcastGameState
      // This listener is kept for potential future real-time optimizations
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('game:state-update');
      socket.off('game:phase-change');
      socket.off('game:ended');
      socket.off('error');
      socket.off('game:voting-chat');
      socket.off('game:timer-update');
    };
  }, [gameId, router]);

  // Reset voting state when entering voting phase
  useEffect(() => {
    if (gameState && gameState.phase === 'voting') {
      setSelectedVote(null);
      setIsVoteLocked(false);
      // Get initial voting time from current round config (server will sync via timer-update)
      const votingTime = gameState.settings?.rounds[gameState.currentRoundIndex]?.votingTime || 30;
      setVotingTimer(votingTime);
      // Chat messages are now persisted in gameState, no need to clear
    }
  }, [gameState?.phase, gameState?.currentRoundIndex]);

  // Voting timer - now synced from server via game:timer-update events
  // No local countdown needed, server sends updates every second

  // Results phase auto-progression - now handled by server timer
  // Server will automatically transition when timer expires
  // No client-side countdown needed

  const handleAskPlayer = (targetPlayerId: string) => {
    // Prevent eliminated players from asking questions
    if (currentPlayer?.isEliminated) {
      setError('You cannot ask questions - you have been eliminated');
      return;
    }
    setAskingPlayerId(targetPlayerId);
    setError('');
  };

  const handleSubmitQuestion = (question: string) => {
    if (!askingPlayerId) return;

    const socket = getSocket();
    socket.emit('game:ask-question', { toPlayerId: askingPlayerId, question }, (response) => {
      if (response.success) {
        // Save draft for this player
        setDraftQuestions(prev => ({ ...prev, [askingPlayerId]: '' }));
        setAskingPlayerId(null);
      } else {
        setError(response.error || 'Failed to ask question');
        // Keep modal open, save draft
        setDraftQuestions(prev => ({ ...prev, [askingPlayerId]: question }));
      }
    });
  };

  const handleCancelAsk = () => {
    // Save draft before closing
    if (askingPlayerId) {
      const currentQuestion = draftQuestions[askingPlayerId] || '';
      setDraftQuestions(prev => ({ ...prev, [askingPlayerId]: currentQuestion }));
    }
    setAskingPlayerId(null);
  };

  const handleAnswerQuestion = (answer: string) => {
    const pendingQuestion = getPendingQuestionForCurrentPlayer();
    if (!pendingQuestion) return;

    const socket = getSocket();
    socket.emit('game:answer-question', { questionId: pendingQuestion.id, answer }, (response) => {
      if (!response.success) {
        setError(response.error || 'Failed to answer question');
      }
    });
  };

  const handlePassQuestion = () => {
    const pendingQuestion = getPendingQuestionForCurrentPlayer();
    if (!pendingQuestion) return;

    const socket = getSocket();
    socket.emit('game:pass-question', pendingQuestion.id, (response) => {
      if (!response.success) {
        setError(response.error || 'Failed to pass question');
      }
    });
  };

  const handleReadyToVote = () => {
    const socket = getSocket();
    socket.emit('game:ready-to-vote', (response) => {
      if (response && !response.success) {
        setError(response.error || 'Failed to mark ready');
      }
    });
  };

  const getPendingQuestionForCurrentPlayer = (): Question | null => {
    if (!gameState) return null;
    return gameState.questions.find(
      q => q.toPlayerId === gameState.playerId && q.answer === null && !q.isPassed && !q.isTimedOut
    ) || null;
  };

  // Voting handlers
  const handleVote = (targetPlayerId: string) => {
    // Prevent eliminated players from voting
    if (currentPlayer?.isEliminated) {
      setError('You cannot vote - you have been eliminated');
      return;
    }
    setSelectedVote(targetPlayerId);
    setIsVoteLocked(false);
  };

  const handleLockVote = () => {
    if (!selectedVote || !gameState) return;

    // Prevent eliminated players from locking votes
    if (currentPlayer?.isEliminated) {
      setError('You cannot vote - you have been eliminated');
      return;
    }

    setIsVoteLocked(true);

    // Send vote to server with locked flag
    const socket = getSocket();
    socket.emit('game:vote', { targetPlayerId: selectedVote, isLocked: true }, (response) => {
      if (!response.success) {
        setError(response.error || 'Failed to cast vote');
        setIsVoteLocked(false);
      }
    });
  };

  const handleChangeVote = () => {
    setSelectedVote(null);
    setIsVoteLocked(false);
  };

  const handleSendChatMessage = (message: string) => {
    const socket = getSocket();
    if (!gameState) return;

    // Emit to server - server will broadcast to all players
    socket.emit('game:voting-chat', message);
    // socket.emit('voting:chat', message);
  };

  const handleVotingTimerExpired = () => {
    // Check if we're still in voting phase before attempting to cast vote
    if (!gameState || gameState.phase !== 'voting') {
      handleVotingComplete();
      return;
    }

    // Only cast vote if current player is not eliminated and hasn't voted/locked
    if (!selectedVote && !isVoteLocked && gameState) {
      const currentPlayer = gameState.players.find(p => p.id === gameState.playerId);

      // Skip if current player is eliminated
      if (currentPlayer?.isEliminated) {
        handleVotingComplete();
        return;
      }

      const eligibleTargets = gameState.players.filter(
        p => p.id !== gameState.playerId && !p.isEliminated
      );

      if (eligibleTargets.length > 0) {
        const randomTarget = eligibleTargets[Math.floor(Math.random() * eligibleTargets.length)];
        setSelectedVote(randomTarget.id);
        setIsVoteLocked(true);

        // Send random vote to server with locked flag
        const socket = getSocket();
        socket.emit('game:vote', { targetPlayerId: randomTarget.id, isLocked: true }, (response) => {
          if (!response.success) {
            // Silently handle errors - phase might have changed or vote already cast
            // Only log in development for debugging
            if (process.env.NODE_ENV === 'development') {
              console.warn('Failed to cast random vote (phase may have changed):', response.error);
            }
            // Reset vote state on error
            setSelectedVote(null);
            setIsVoteLocked(false);
          }
        });
      }
    }

    handleVotingComplete();
  };

  const handleVotingComplete = () => {
    console.log('Voting complete!');
    // Results will be processed by the server
    // Server will trigger phase change and update game state
  };

  const handleTopicGuess = (topic: string) => {
    const socket = getSocket();
    socket.emit('game:guess-topic', topic, (response) => {
      if (!response.success) {
        setError(response.error || 'Failed to submit guess');
      }
    });
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Connecting to game...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-xl">Loading game state...</p>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players.find(p => p.id === gameState.playerId);
  const askingPlayer = askingPlayerId ? gameState.players.find(p => p.id === askingPlayerId) : null;
  const pendingQuestion = getPendingQuestionForCurrentPlayer();
  const fromPlayer = pendingQuestion ? gameState.players.find(p => p.id === pendingQuestion.fromPlayerId) : null;

  // Get max questions from current round config
  const maxQuestions = gameState.settings?.rounds[gameState.currentRoundIndex]?.maxQuestionsPerPlayer || 2;

  // Use generic phase names (new flexible system)
  // Only allow actions if current player is not eliminated
  const canAsk = gameState.phase === 'interrogation' && !currentPlayer?.isEliminated;
  const isVotingPhase = gameState.phase === 'voting';
  const isInterrogationPhase = gameState.phase === 'interrogation';
  const canVote = isVotingPhase && !currentPlayer?.isEliminated;

  // Compute votes for display: show ALL players (with placeholders for those who haven't voted)
  const displayVotes = (() => {
    if (!isVotingPhase) return [];

    const activePlayers = gameState.players.filter(p => !p.isEliminated);
    const currentRoundVotes = gameState.votes.filter(v => v.round === gameState.currentRound);

    // Create a vote entry for each active player
    return activePlayers.map(player => {
      // Check if this player has voted on the server
      const serverVote = currentRoundVotes.find(v => v.fromPlayerId === player.id);

      if (serverVote) {
        // Player has locked their vote
        return {
          voterId: player.id,
          targetId: serverVote.targetPlayerId,
          isLocked: true
        };
      } else if (player.id === gameState.playerId && selectedVote) {
        // Current player has selected but not locked
        return {
          voterId: player.id,
          targetId: selectedVote,
          isLocked: false
        };
      } else {
        // Player hasn't voted yet - show placeholder
        return {
          voterId: player.id,
          targetId: null, // null means no vote yet
          isLocked: false
        };
      }
    });
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-4 relative">
      {/* Main Grid Layout - Two Columns */}
      <div className="max-w-7xl mx-auto grid grid-cols-[2fr_1fr] gap-6 h-[calc(100vh-2rem)] relative">
      {/* Interrogation Timer (only shown during interrogation) */}
      {canAsk && gameState.timeRemaining !== null && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40">
          <div className="bg-white rounded-full shadow-2xl px-8 py-4 border-4 border-green-600">
            <div className="text-center">
              <div className="text-5xl font-bold text-gray-800">{Math.floor(gameState.timeRemaining / 60)}:{String(gameState.timeRemaining % 60).padStart(2, '0')}</div>
              <div className="text-sm text-gray-600 mt-1">Interrogation - Round {gameState.currentRound}</div>
            </div>
          </div>
        </div>
      )}

      {/* Voting Timer (only shown during voting) */}
      {isVotingPhase && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40">
          <div className="bg-white rounded-full shadow-2xl px-8 py-4 border-4 border-purple-600">
            <div className="text-center">
              <div className="text-5xl font-bold text-gray-800">{Math.floor(votingTimer / 60)}:{String(votingTimer % 60).padStart(2, '0')}</div>
              <div className="text-sm text-gray-600 mt-1">Voting - Round {gameState.currentRound}</div>
            </div>
          </div>
        </div>
      )}
        {/* Left Column - Larger */}
        <div className="grid grid-rows-[auto_1fr] gap-4">
          {/* Top Row: Category/Topic Panel - only left side */}
          <div className="grid grid-cols-[auto_1fr] gap-4">
            <div className="bg-white rounded-lg shadow-lg p-4 w-fit">
          <div className="text-sm text-gray-600">Category: {gameState.category.name}</div>
          {gameState.isImpostor ? (
            <div className="bg-red-100 text-red-700 px-3 py-2 rounded-lg font-bold mt-2">
              You are the IMPOSTOR
            </div>
          ) : (
            <div className="bg-green-100 text-green-700 px-3 py-2 rounded-lg font-bold mt-2">
              Topic: {gameState.topic}
            </div>
          )}
          <div className="text-xs text-gray-500 mt-2">
            Phase: {gameState.phase} | Round: {gameState.currentRound}
          </div>
          {(isVotingPhase || isInterrogationPhase) && (
            <div className="mt-2">
              <TopicDropdown category={gameState.category} />
            </div>
          )}
          {isVotingPhase && (
            <div className="text-sm font-bold text-purple-600 mt-2">
              🗳️ Voting Phase
            </div>
          )}
        </div>
      </div>

          {/* Bottom Row: Table Container - Fixed dimensions for strict positioning */}
          <div className="relative w-full h-full min-h-[700px]">
        {!isVotingPhase ? (
          // Question/Answer Phase
              <>
            {currentPlayer?.isEliminated && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 bg-gray-800/90 text-white px-6 py-3 rounded-lg shadow-xl">
                <div className="text-center">
                  <div className="text-2xl mb-1">💀</div>
                  <div className="font-bold">Spectating</div>
                  <div className="text-sm text-gray-300">You have been eliminated</div>
                </div>
              </div>
            )}
            <CircularTable
              players={gameState.players}
              currentPlayerId={gameState.playerId}
              onAskPlayer={handleAskPlayer}
              canAsk={canAsk && gameState.canAskQuestion}
            />
            <CenterDialogue
              questions={gameState.questions}
              players={gameState.players}
            />
              </>
        ) : (
          // Voting Phase
              <>
              {currentPlayer?.isEliminated && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 bg-gray-800/90 text-white px-6 py-3 rounded-lg shadow-xl">
                  <div className="text-center">
                    <div className="text-2xl mb-1">💀</div>
                    <div className="font-bold">Spectating</div>
                    <div className="text-sm text-gray-300">You have been eliminated</div>
                  </div>
                </div>
              )}
              <VotingTable
                players={gameState.players}
                currentPlayerId={gameState.playerId}
                selectedVote={selectedVote}
                isVoteLocked={isVoteLocked}
                onVote={handleVote}
                onLockVote={handleLockVote}
                onChangeVote={handleChangeVote}
              />
              {/* Voting Chat overlay - positioned over the table */}
              <div
                className="absolute z-20"
                  style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', marginTop: '-60px' }}
              >
                <VotingChat
                  players={gameState.players}
                  currentPlayerId={gameState.playerId}
                  messages={gameState.chatMessages?.filter(msg => msg.round === gameState.currentRound) || []}
                  onSendMessage={handleSendChatMessage}
                />
                </div>
              </>
            )}
              </div>
            </div>

        {/* Right Column - Smaller */}
        <div className="grid grid-rows-[auto_auto_1fr] gap-4">
          {/* Top Row: First Component */}
          {!isVotingPhase ? (
            <QuestionTracker
              players={gameState.players}
              maxQuestionsPerPlayer={maxQuestions}
            />
          ) : (
            /* Question History - top right during voting phase */
            <div className="w-[400px] h-[350px] overflow-y-auto bg-white/95 backdrop-blur rounded-lg shadow-inner p-3">
              <h4 className="text-sm font-bold text-gray-700 mb-2 text-center">Question History</h4>
              <div className="space-y-2">
                {gameState.questions.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center">No questions asked</p>
                ) : (
                  gameState.questions.map((q) => {
                    const fromPlayer = gameState.players.find(p => p.id === q.fromPlayerId);
                    const toPlayer = gameState.players.find(p => p.id === q.toPlayerId);
                    return (
                      <div key={q.id} className="text-xs border-b border-gray-200 pb-2 pt-1">
                        <div className="text-gray-600 mb-1">
                          <span className="font-semibold">{fromPlayer?.name}</span> → <span className="font-semibold">{toPlayer?.name}</span>
                        </div>
                        <div className="text-gray-800 font-medium mb-1">Q: {q.question}</div>
                        {q.answer && (
                          <div className="text-green-600">A: {q.answer}</div>
                        )}
                        {q.isPassed && (
                          <div className="text-red-500">A: Passed</div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Top Row: Second Component (only in interrogation) */}
          {!isVotingPhase && canAsk && (
            <ReadyToVoteBox
              players={gameState.players}
              currentPlayerId={gameState.playerId}
              isCurrentPlayerReady={currentPlayer?.isReadyToVote || false}
              onReadyClick={handleReadyToVote}
            />
          )}

          {/* Bottom Row: Current Votes (only in voting phase) */}
          {isVotingPhase && (
            <div>
              <CurrentVotes
                players={gameState.players}
                currentPlayerId={gameState.playerId}
                votes={displayVotes}
              />
            </div>
          )}
          </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {error}
          <button onClick={() => setError('')} className="ml-4 font-bold">✕</button>
        </div>
      )}

      {/* Ask Modal */}
      {askingPlayerId && askingPlayer && (
        <AskModal
          targetPlayer={askingPlayer}
          onSubmit={handleSubmitQuestion}
          onCancel={handleCancelAsk}
          maxWords={gameState.settings?.maxQuestionLength || 15}
          savedDraft={draftQuestions[askingPlayerId]}
        />
      )}

      {/* Answer Panel */}
      {pendingQuestion && fromPlayer && (
        <AnswerPanel
          question={pendingQuestion}
          fromPlayer={fromPlayer}
          onAnswer={handleAnswerQuestion}
          onPass={handlePassQuestion}
          timeLimit={gameState.settings?.answerTimeLimit || 30}
          timeRemaining={gameState.pendingQuestionTimeRemaining}
        />
      )}

      {/* Prepare to Vote Phase */}
      {gameState.phase === 'prepare-to-vote' && (
        <PrepareToVote gameState={gameState} />
      )}

      {/* Results Phase */}
      {gameState.phase === 'results' && (
        <ResultsPhase gameState={gameState} />
      )}

      {/* Topic Guess Phase */}
      {gameState.phase === 'topic-guess' && (
        <TopicGuessPhase
          gameState={gameState}
          onGuess={handleTopicGuess}
        />
      )}

      {/* Game Over Screen */}
      {gameState.phase === 'ended' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Game Over!
            </h2>
            <p className="text-2xl text-gray-700 mb-6">
              {gameState.winner === 'impostor' ? '🎭 Impostor Wins!' : '🕵️ Players Win!'}
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-purple-600 text-white font-bold px-8 py-3 rounded-lg hover:bg-purple-700"
            >
              Back to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

