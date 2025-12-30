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
import ResultsPhase from '@/components/game/ResultsPhase';
import TopicGuessPhase from '@/components/game/TopicGuessPhase';

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
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    playerId: string;
    playerName: string;
    message: string;
    timestamp: number;
  }>>([]);

  // Results state
  const [resultsTimer, setResultsTimer] = useState(5);

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

    socket.on('game:voting-chat', (message) => {
      setChatMessages(prev => [...prev, message]);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('game:state-update');
      socket.off('game:phase-change');
      socket.off('game:ended');
      socket.off('error');
      socket.off('game:voting-chat');
    };
  }, [gameId, router]);

  // Reset voting state when entering voting phase
  useEffect(() => {
    if (gameState && gameState.phase === 'voting') {
      setSelectedVote(null);
      setIsVoteLocked(false);
      // Get voting time from current round config
      const votingTime = gameState.settings?.rounds[gameState.currentRoundIndex]?.votingTime || 30;
      setVotingTimer(votingTime);
      setChatMessages([]);
    }
  }, [gameState?.phase, gameState?.currentRoundIndex]);

  // Voting timer countdown
  useEffect(() => {
    if (!gameState) return;
    const isVoting = gameState.phase === 'voting';

    if (!isVoting || votingTimer <= 0) return;

    const timer = setInterval(() => {
      setVotingTimer(prev => {
        if (prev <= 1) {
          // Timer expired, trigger results
          handleVotingTimerExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState?.phase, votingTimer]);

  // Reset results timer when entering results phase
  useEffect(() => {
    if (gameState && gameState.phase === 'results') {
      setResultsTimer(5);
    }
  }, [gameState?.phase]);

  // Results phase auto-progression
  useEffect(() => {
    if (!gameState || gameState.phase !== 'results') return;
    if (gameState.winner !== null) return; // Don't auto-progress if game over

    const timer = setInterval(() => {
      setResultsTimer(prev => {
        if (prev <= 1) {
          // Trigger transition to next round
          const socket = getSocket();
          socket.emit('game:continue-to-next-round');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState?.phase, gameState?.winner, resultsTimer]);

  const handleAskPlayer = (targetPlayerId: string) => {
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
    setSelectedVote(targetPlayerId);
    setIsVoteLocked(false);
  };

  const handleLockVote = () => {
    if (!selectedVote || !gameState) return;

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
    // Only cast vote if current player is not eliminated and hasn't voted/locked
    if (!selectedVote && !isVoteLocked && gameState) {
      const currentPlayer = gameState.players.find(p => p.id === gameState.playerId);

      // Skip if current player is eliminated
      if (currentPlayer?.isEliminated) {
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
            console.error('Failed to cast random vote:', response.error);
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
  const canAsk = gameState.phase === 'interrogation';
  const isVotingPhase = gameState.phase === 'voting';

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
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-4">
      {/* Interrogation Timer (only shown during interrogation) */}
      {canAsk && gameState.timeRemaining !== null && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40">
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
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40">
          <div className="bg-white rounded-full shadow-2xl px-8 py-4 border-4 border-purple-600">
            <div className="text-center">
              <div className="text-5xl font-bold text-gray-800">{Math.floor(votingTimer / 60)}:{String(votingTimer % 60).padStart(2, '0')}</div>
              <div className="text-sm text-gray-600 mt-1">Voting - Round {gameState.currentRound}</div>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="max-w-7xl mx-auto mb-4 flex justify-between items-start">
        {/* Left: Category and Topic */}
        <div className="bg-white rounded-lg shadow-lg p-4">
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
          {isVotingPhase && (
            <div className="text-sm font-bold text-purple-600 mt-2">
              🗳️ Voting Phase
            </div>
          )}
        </div>

        {/* Right: Conditional sidebar */}
        {!isVotingPhase ? (
          // Question phase sidebar
          <div className="space-y-4">
            <QuestionTracker
              players={gameState.players}
              maxQuestionsPerPlayer={maxQuestions}
            />
            {canAsk && (
              <ReadyToVoteBox
                players={gameState.players}
                currentPlayerId={gameState.playerId}
                isCurrentPlayerReady={currentPlayer?.isReadyToVote || false}
                onReadyClick={handleReadyToVote}
              />
            )}
          </div>
        ) : (
          // Voting phase sidebar
          <div className="space-y-4 w-80">
            <CurrentVotes
              players={gameState.players}
              currentPlayerId={gameState.playerId}
              votes={displayVotes}
            />
          </div>
        )}
      </div>

      {/* Main Game Area */}
      <div className="max-w-7xl mx-auto">
        {!isVotingPhase ? (
          // Question/Answer Phase
          <div className="relative">
            {/* Circular Table with Players */}
            <CircularTable
              players={gameState.players}
              currentPlayerId={gameState.playerId}
              onAskPlayer={handleAskPlayer}
              canAsk={canAsk && gameState.canAskQuestion}
            />

            {/* Center Dialogue */}
            <CenterDialogue
              questions={gameState.questions}
              players={gameState.players}
            />
          </div>
        ) : (
          // Voting Phase
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 relative">
              <VotingTable
                players={gameState.players}
                currentPlayerId={gameState.playerId}
                selectedVote={selectedVote}
                isVoteLocked={isVoteLocked}
                onVote={handleVote}
                onLockVote={handleLockVote}
                onChangeVote={handleChangeVote}
              />
              {/* Question History inside voting table */}
              <div
                className="absolute"
                style={{
                  top: '0%',
                  left: '35%',
                  transform: 'translate(-50%, -50%)',
                  width: '300px',
                  height: '230px',
                  pointerEvents: 'none'
                }}
              >
                <div className="bg-white/95 rounded-lg shadow-lg p-3 h-full overflow-y-auto pointer-events-auto">
                  <h4 className="text-xs font-bold text-gray-700 mb-2 text-center">Question History</h4>
                  <div className="space-y-2">
                    {gameState.questions.length === 0 ? (
                      <p className="text-[10px] text-gray-400 text-center">No questions asked</p>
                    ) : (
                      gameState.questions.map((q) => {
                        const fromPlayer = gameState.players.find(p => p.id === q.fromPlayerId);
                        const toPlayer = gameState.players.find(p => p.id === q.toPlayerId);
                        return (
                          <div key={q.id} className="text-[10px] border-b border-gray-200 pb-1">
                            <div className="text-gray-600">
                              <span className="font-semibold">{fromPlayer?.name}</span> → <span className="font-semibold">{toPlayer?.name}</span>
                            </div>
                            <div className="text-gray-800 font-medium">Q: {q.question}</div>
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
              </div>
            </div>
            <div>
              <VotingChat
                players={gameState.players}
                currentPlayerId={gameState.playerId}
                messages={chatMessages}
                onSendMessage={handleSendChatMessage}
              />
            </div>
          </div>
        )}
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
        />
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

