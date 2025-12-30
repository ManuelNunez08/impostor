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
                setGameState(state);
            });
        }

        socket.on('connect', () => {
            setIsConnected(true);
            socket.emit('game:get-state', (state) => {
                setGameState(state);
            });
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        socket.on('game:state-update', (state: PlayerView) => {
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
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('game:state-update');
            socket.off('game:phase-change');
            socket.off('game:ended');
            socket.off('error');
        };
    }, [gameId, router]);

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

    const maxQuestions = gameState.currentRound === 1
        ? gameState.config?.round1QuestionsPerPlayer || 2
        : gameState.config?.round2QuestionsPerPlayer || 1;

    const canAsk = gameState.phase === 'round1-question' || gameState.phase === 'round2-question';

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-4">
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
                </div>

                {/* Right: Question Tracker and Ready to Vote */}
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
            </div>

            {/* Main Game Area */}
            <div className="max-w-7xl mx-auto">
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
                    maxWords={gameState.config?.maxQuestionLength || 15}
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
                    timeLimit={gameState.config?.answerTimeLimit || 30}
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

