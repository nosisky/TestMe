'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Header from '@/app/components/Header'; // Assuming a global Header component
import MetaTags from '@/app/components/MetaTags';
import styles from './instructions.module.scss'; // We'll create this SCSS module

interface QuizInstructionDetails {
  id: string;
  title: string;
  description: string;
  sourceType: string;
  sourceImage?: string;
  difficulty: string;
  numQuestions: number;
  createdAt: string;
  isPublic: boolean;
  tags: string[];
  createdBy?: string; // Add the createdBy field
}

export default function QuizInstructionsPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;
  const { status, data: session } = useSession();

  const [quizDetails, setQuizDetails] = useState<QuizInstructionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [userName, setUserName] = useState('');
  const [nameError, setNameError] = useState('');

  const fetchQuizDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/quiz/${quizId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load quiz details');
      }
      const data = await response.json();
      setQuizDetails(data.quiz);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    if (quizId) {
      fetchQuizDetails();
    }
  }, [quizId, fetchQuizDetails]);

  // Show login prompt for unauthenticated users after quiz loads
  useEffect(() => {
    // Remove automatic modal popup - let users read instructions first
    // Modal will show when they click "Start Quiz"
  }, [status, quizDetails, showLoginPrompt]);

  const handleStartQuiz = () => {
    if (status === 'authenticated') {
      // Authenticated user can start immediately
      router.push(`/quiz/${quizId}`);
    } else {
      // Show login prompt for unauthenticated users
      setShowLoginPrompt(true);
    }
  };

  const handleProceedWithoutLogin = () => {
    setShowLoginPrompt(false);
    setShowNameModal(true);
  };

  const handleLogin = () => {
    router.push(`/login?callbackUrl=/quiz/${quizId}/instructions`);
  };

  const handleNameSubmit = () => {
    const trimmedName = userName.trim();
    if (!trimmedName) {
      setNameError('Please enter your name');
      return;
    }
    if (trimmedName.length < 2) {
      setNameError('Name must be at least 2 characters long');
      return;
    }
    if (trimmedName.length > 50) {
      setNameError('Name must be less than 50 characters');
      return;
    }
    
    // Store the name in localStorage for the quiz taking session
    localStorage.setItem(`quizUserName_${quizId}`, trimmedName);
    
    // Start the quiz
    router.push(`/quiz/${quizId}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className={styles.pageContainer}>
        <MetaTags 
          title={`${quizDetails?.title || 'Loading Quiz'} | TestMe Quiz`}
          description={`Take this ${quizDetails?.numQuestions || 'unknown'}-question ${quizDetails?.difficulty || 'unknown'} quiz on ${quizDetails?.title || 'unknown quiz'}. Test your knowledge now!`}
          url={typeof window !== 'undefined' ? window.location.href : `${process.env.NEXT_PUBLIC_SITE_URL || ''}/quiz/${quizId}/instructions`}
        />
        <Header />
        <main className={styles.mainContent}>
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Loading quiz instructions...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <MetaTags 
          title={`${quizDetails?.title || 'Error Loading Quiz'} | TestMe Quiz`}
          description={`Failed to load quiz details. Error: ${error}`}
          url={typeof window !== 'undefined' ? window.location.href : `${process.env.NEXT_PUBLIC_SITE_URL || ''}/quiz/${quizId}/instructions`}
        />
        <Header />
        <main className={styles.mainContent}>
          <div className={styles.errorState}>
            <h2>Error Loading Quiz</h2>
            <p>{error}</p>
            <Link href="/dashboard" className={styles.buttonPrimary}>
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!quizDetails) {
    return (
      <div className={styles.pageContainer}>
        <MetaTags 
          title="Quiz Not Found | TestMe Quiz"
          description={`The quiz you are looking for could not be found.`}
          url={typeof window !== 'undefined' ? window.location.href : `${process.env.NEXT_PUBLIC_SITE_URL || ''}/quiz/${quizId}/instructions`}
        />
        <Header />
        <main className={styles.mainContent}>
          <div className={styles.errorState}> {/* Re-use error state for not found */}
            <h2>Quiz Not Found</h2>
            <p>The quiz you are looking for could not be found.</p>
            <Link href="/dashboard" className={styles.buttonPrimary}>
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Helper to format difficulty
  const formatDifficulty = (difficulty: string) => {
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  };

  // Check if the current user is the quiz creator
  const isCreator = quizDetails && session?.user?.email === quizDetails.createdBy;

  return (
    <div className={styles.pageContainer}>
      <MetaTags 
        title={`${quizDetails.title} | TestMe Quiz`}
        description={`Take this ${quizDetails.numQuestions}-question ${quizDetails.difficulty} quiz on ${quizDetails.title}. Test your knowledge now!`}
        url={typeof window !== 'undefined' ? window.location.href : `${process.env.NEXT_PUBLIC_SITE_URL || ''}/quiz/${quizId}/instructions`}
      />
      <Header />
      <main className={styles.mainContent}>
        <div className={styles.instructionsCard}>
          <h1 className={styles.quizTitle}>{quizDetails.title}</h1>
          
          <div className={styles.quizMeta}>
            <span className={styles.metaItem}>Questions: {quizDetails.numQuestions}</span>
            <span className={styles.metaItem}>Difficulty: {formatDifficulty(quizDetails.difficulty)}</span>
          </div>

          {quizDetails.tags && quizDetails.tags.length > 0 && (
            <div className={styles.tagsContainer}>
              {quizDetails.tags.map(tag => (
                <span key={tag} className={styles.tag}>{tag}</span>
              ))}
            </div>
          )}
          
          <div className={styles.quizInstructions}>
            <h3>Quiz Instructions</h3>
            <ul>
              <li>Read each question carefully before selecting your answer.</li>
              <li>Once you select an answer, you&apos;ll automatically proceed to the next question.</li>
              <li>You can use the navigation buttons to move between questions.</li>
              <li>Your score will be calculated at the end of the quiz.</li>
              <li>Good luck!</li>
            </ul>
          </div>
          
          <div className={styles.actions}>
            <button onClick={handleStartQuiz} className={`${styles.button} ${styles.buttonPrimary}`}>
              Start Quiz
            </button>
            <Link href="/dashboard" className={`${styles.button} ${styles.buttonSecondary}`}>
              Back to Dashboard
            </Link>
            {isCreator && (
              <Link href={`/dashboard/analytics/${quizId}`} className={`${styles.button} ${styles.buttonTertiary}`}>
                View Analytics
              </Link>
            )}
          </div>
          
          <p className={styles.note}>
            You are about to start a quiz on &quot;{quizDetails.title}&quot;. 
            Ensure you are ready before you begin.
          </p>
        </div>

        {/* Login Prompt Modal */}
        {showLoginPrompt && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h3>Ready to take the quiz?</h3>
              </div>
              <div className={styles.modalBody}>
                <p>You can either login to track your progress and compare with others, or take the quiz anonymously.</p>
                <div className={styles.modalActions}>
                  <button onClick={handleLogin} className={`${styles.button} ${styles.buttonPrimary}`}>
                    Login & Take Quiz
                  </button>
                  <button onClick={handleProceedWithoutLogin} className={`${styles.button} ${styles.buttonSecondary}`}>
                    Take Quiz Anonymously
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Name Input Modal */}
        {showNameModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h3>What should we call you?</h3>
              </div>
              <div className={styles.modalBody}>
                <p>Enter your name so the quiz creator can see who took their quiz:</p>
                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter your name..."
                    className={styles.nameInput}
                    maxLength={50}
                    autoFocus
                  />
                  {nameError && <p className={styles.errorMessage}>{nameError}</p>}
                </div>
                <div className={styles.modalActions}>
                  <button onClick={handleNameSubmit} className={`${styles.button} ${styles.buttonPrimary}`}>
                    Start Quiz
                  </button>
                  <button onClick={() => setShowNameModal(false)} className={`${styles.button} ${styles.buttonSecondary}`}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 