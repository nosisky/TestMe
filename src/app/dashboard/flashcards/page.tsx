"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';
import FlashcardDeck from '@/app/components/FlashcardDeck';
import { FlashcardProps } from '@/app/components/Flashcard';
import styles from './flashcards.module.scss';
import { handleApiResponse, handleFetchError } from '@/lib/api-utils';

interface QuizWithFlashcards {
  id: string;
  title: string;
  flashcardCount: number;
  lastStudied?: string;
}

interface FlashcardData {
  front: string;
  back: string;
  hints?: string[];
}

export default function FlashcardsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<QuizWithFlashcards[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Fetch quizzes with flashcards
  useEffect(() => {
    if (status === "authenticated") {
      fetchQuizzesWithFlashcards();
    }
  }, [status]);

  // Fetch flashcards for a specific quiz
  useEffect(() => {
    if (activeQuizId) {
      fetchFlashcards(activeQuizId);
    }
  }, [activeQuizId]);

  const fetchQuizzesWithFlashcards = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/quiz/list?withFlashcards=true");
      const data = await handleApiResponse<{quizzes: QuizWithFlashcards[]}>(response);
      setQuizzes(data.quizzes);
    } catch (err) {
      setError("Failed to load quizzes with flashcards. Please try again.");
      handleFetchError(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFlashcards = async (quizId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/quiz/${quizId}/flashcards`);
      const data = await handleApiResponse<{flashcards: FlashcardData[]}>(response);
      
      // Transform MongoDB flashcard data to component props
      const flashcardProps: FlashcardProps[] = data.flashcards.map(card => ({
        front: card.front,
        back: card.back,
        hints: card.hints
      }));
      
      setFlashcards(flashcardProps);
    } catch (err) {
      setError("Failed to load flashcards. Please try again.");
      handleFetchError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFlashcards = async (quizId: string) => {
    setLoading(true);
    try {
      await fetch(`/api/quiz/${quizId}/flashcards`, {
        method: 'POST'
      });
      
      // After generating, set this quiz as active and load its flashcards
      setActiveQuizId(quizId);
      
      // Refresh the list of quizzes with flashcards
      fetchQuizzesWithFlashcards();
    } catch (err) {
      setError("Failed to generate flashcards. Please try again.");
      handleFetchError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateFlashcards = async (quizId: string) => {
    setLoading(true);
    try {
      // First delete existing flashcards
      await fetch(`/api/quiz/${quizId}/flashcards`, {
        method: 'DELETE'
      });
      
      // Then generate new ones
      await fetch(`/api/quiz/${quizId}/flashcards`, {
        method: 'POST'
      });
      
      // Refresh the list of quizzes with flashcards
      await fetchQuizzesWithFlashcards();
      
      // Reload flashcards if we're viewing them
      if (activeQuizId === quizId) {
        fetchFlashcards(quizId);
      }
    } catch (err) {
      setError("Failed to regenerate flashcards. Please try again.");
      handleFetchError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStudyComplete = () => {
    // Here you could implement spaced repetition logic or update study statistics
    // For now, just return to the quiz selection
    setActiveQuizId(null);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Never";
    
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(date);
  };

  if (status === "loading") {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading flashcards...</p>
      </div>
    );
  }

  return (
    <div className={styles.flashcardsContainer}>
      <Header />
      
      <main className={styles.flashcardsMain}>
        <div className={styles.pageHeader}>
          <h1>Flashcards</h1>
          <p>Study and review quiz content with flashcards</p>
        </div>

        {activeQuizId ? (
          <div className={styles.studySection}>
            <button 
              className={styles.backButton}
              onClick={() => setActiveQuizId(null)}
            >
              ← Back to Quizzes
            </button>
            
            <div className={styles.studyHeader}>
              <h2>
                {quizzes.find(q => q.id === activeQuizId)?.title || 'Study Flashcards'}
              </h2>
              
              <button 
                className={styles.regenerateButton}
                onClick={() => handleRegenerateFlashcards(activeQuizId)}
                disabled={loading}
              >
                Regenerate Flashcards
              </button>
            </div>
            
            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading flashcards...</p>
              </div>
            ) : error ? (
              <div className={styles.errorState}>
                <p>{error}</p>
                <button 
                  className={styles.retryButton}
                  onClick={() => fetchFlashcards(activeQuizId)}
                >
                  Try Again
                </button>
              </div>
            ) : (
              <FlashcardDeck 
                cards={flashcards}
                onComplete={handleStudyComplete}
              />
            )}
          </div>
        ) : (
          <div className={styles.quizzesSection}>
            <h2>Your Quizzes</h2>
            <p>Select a quiz to study its flashcards</p>
            
            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading quizzes...</p>
              </div>
            ) : error ? (
              <div className={styles.errorState}>
                <p>{error}</p>
                <button 
                  className={styles.retryButton}
                  onClick={fetchQuizzesWithFlashcards}
                >
                  Try Again
                </button>
              </div>
            ) : quizzes.length === 0 ? (
              <div className={styles.emptyState}>
                <p>You don&apos;t have any quizzes with flashcards.</p>
                <Link 
                  href="/dashboard"
                  className={styles.primaryButton}
                >
                  Create a Quiz
                </Link>
              </div>
            ) : (
              <div className={styles.quizzesGrid}>
                {quizzes.map((quiz) => (
                  <div key={quiz.id} className={styles.quizCard}>
                    <h3>{quiz.title}</h3>
                    
                    <div className={styles.quizMeta}>
                      <div className={styles.metaItem}>
                        <span>Flashcards:</span>
                        <span>{quiz.flashcardCount || 0}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span>Last Studied:</span>
                        <span>{formatDate(quiz.lastStudied || '')}</span>
                      </div>
                    </div>
                    
                    <div className={styles.cardActions}>
                      {quiz.flashcardCount > 0 ? (
                        <>
                          <button 
                            className={styles.studyButton}
                            onClick={() => setActiveQuizId(quiz.id)}
                          >
                            Study Flashcards
                          </button>
                          <button 
                            className={styles.regenerateButton}
                            onClick={() => handleRegenerateFlashcards(quiz.id)}
                          >
                            Regenerate
                          </button>
                        </>
                      ) : (
                        <button 
                          className={styles.generateButton}
                          onClick={() => handleGenerateFlashcards(quiz.id)}
                        >
                          Generate Flashcards
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
} 