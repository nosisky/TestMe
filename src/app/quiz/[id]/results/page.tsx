'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Header from '@/app/components/Header';
import SocialShareButtons from '@/app/components/SocialShareButtons';
import MetaTags from '@/app/components/MetaTags';
import styles from './results.module.scss'; // To be created

interface QuizQuestion {
  _id?: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index of the correct option
  explanation?: string;
}

interface Quiz {
  _id: string; // Use _id from fetched data
  title: string;
  questions: QuizQuestion[];
}

type UserAnswers = Record<number, number | null>;

interface Score {
  correct: number;
  total: number;
  percentage: number;
}

export default function QuizResultsPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;
  const { status } = useSession();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswers | null>(null);
  const [score, setScore] = useState<Score | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/quiz/${quizId}/results`);
    } else if (status === 'authenticated' && quizId) {
      loadResults();
    }
  }, [status, quizId, router]);

  const loadResults = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch full quiz data
      const quizResponse = await fetch(`/api/quiz/take/${quizId}`);
      if (!quizResponse.ok) {
        const errorData = await quizResponse.json();
        throw new Error(errorData.error || 'Failed to load quiz data for results');
      }
      const quizData = await quizResponse.json();
      setQuiz(quizData.quiz as Quiz);

      // Try to get answers from localStorage first (for quiz takers who just completed the quiz)
      const storedAnswers = localStorage.getItem(`quizAnswers_${quizId}`);
      if (storedAnswers) {
        const parsedAnswers = JSON.parse(storedAnswers) as UserAnswers;
        setUserAnswers(parsedAnswers);

        // Calculate score with local answers
        if (quizData.quiz && parsedAnswers) {
          calculateAndSaveScore(quizData.quiz as Quiz, parsedAnswers);
        }
      } else {
        // For quiz creators viewing analytics, fetch the correct answers directly
        // We'll show them the correct answers for each question
        const demoAnswers: UserAnswers = {};
        
        // Set all answers to the correct answers
        quizData.quiz.questions.forEach((q: QuizQuestion, index: number) => {
          demoAnswers[index] = q.correctAnswer;
        });
        
        setUserAnswers(demoAnswers);
        
        // Create a perfect score for display
        const calculatedScore: Score = {
          correct: quizData.quiz.questions.length,
          total: quizData.quiz.questions.length,
          percentage: 100
        };
        setScore(calculatedScore);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while loading results.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateAndSaveScore = (currentQuiz: Quiz, currentAnswers: UserAnswers) => {
    let correctCount = 0;
    currentQuiz.questions.forEach((q, index) => {
      if (currentAnswers[index] === q.correctAnswer) {
        correctCount++;
      }
    });
    const totalQuestions = currentQuiz.questions.length;
    const calculatedScore: Score = {
      correct: correctCount,
      total: totalQuestions,
      percentage: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0,
    };
    setScore(calculatedScore);

    // Optionally, save the score to the backend
    saveQuizResultToDb(currentQuiz._id, calculatedScore, totalQuestions);
  };

  const saveQuizResultToDb = async (quizIdToSave: string, currentScore: Score, totalQuestions: number) => {
    try {
      // Calculate time taken in seconds (if stored in localStorage)
      const startTime = localStorage.getItem(`quizStartTime_${quizIdToSave}`);
      const timeTaken = startTime ? Math.floor((Date.now() - parseInt(startTime)) / 1000) : undefined;
      
      // Prepare detailed answers data from localStorage
      const storedAnswers = localStorage.getItem(`quizAnswers_${quizIdToSave}`);
      const userAnswers = storedAnswers ? JSON.parse(storedAnswers) : {};
      
      // Create an array of answer details
      const detailedAnswers = quiz?.questions.map((question, index) => {
        const selectedOption = userAnswers[index];
        const isCorrect = selectedOption === question.correctAnswer;
        return {
          questionIndex: index,
          selectedOption: selectedOption !== undefined ? selectedOption : -1,
          isCorrect: isCorrect
        };
      }).filter(answer => answer.selectedOption >= 0) || [];
      
      await fetch('/api/quiz/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: quizIdToSave,
          score: currentScore.correct,
          totalQuestions: totalQuestions,
          timeTaken: timeTaken,
          answers: detailedAnswers
        }),
      });
      // console.log('Quiz result saved');
    } catch (err) {
      console.error('Failed to save quiz result:', err);
      // Non-critical error, so don't necessarily show to user
    }
  };

  // Check if this is a quiz creator viewing analytics (no localStorage data)
  const isCreatorView = !localStorage.getItem(`quizAnswers_${quizId}`);

  if (status === 'loading' || loading) {
    return (
      <div className={styles.pageContainer}>
        <MetaTags 
          title="Loading Quiz Results | TestMe"
          description="Loading your quiz results on TestMe."
          url={typeof window !== 'undefined' ? window.location.href : `${process.env.NEXT_PUBLIC_SITE_URL || ''}/quiz/${quizId}/results`}
        />
        <Header />
        <main className={styles.mainContent}>
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Loading your results...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <MetaTags 
          title="Error Loading Quiz Results | TestMe"
          description="Failed to load quiz results on TestMe."
          url={typeof window !== 'undefined' ? window.location.href : `${process.env.NEXT_PUBLIC_SITE_URL || ''}/quiz/${quizId}/results`}
        />
        <Header />
        <main className={styles.mainContent}>
          <div className={styles.errorState}>
            <h2>Error Loading Results</h2>
            <p>{error}</p>
            <Link href={`/quiz/${quizId}/instructions`} className={styles.button}>Try Quiz Again</Link>
            <Link href="/dashboard" className={styles.buttonSecondary}>Back to Dashboard</Link>
          </div>
        </main>
      </div>
    );
  }

  if (!quiz || !userAnswers || !score) {
    return (
      <div className={styles.pageContainer}>
        <MetaTags 
          title="Results Incomplete | TestMe"
          description="Quiz results data might be missing on TestMe."
          url={typeof window !== 'undefined' ? window.location.href : `${process.env.NEXT_PUBLIC_SITE_URL || ''}/quiz/${quizId}/results`}
        />
        <Header />
        <main className={styles.mainContent}>
          <div className={styles.errorState}> 
            <h2>Results Incomplete</h2>
            <p>Could not display your quiz results. Data might be missing.</p>
            <Link href={`/quiz/${quizId}/instructions`} className={styles.button}>Try Quiz Again</Link>
            <Link href="/dashboard" className={styles.buttonSecondary}>Back to Dashboard</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <MetaTags 
        title={`${isCreatorView ? 'Quiz Review' : 'Quiz Completed!'} | ${quiz.title}`}
        description={`${isCreatorView ? 'Review' : 'You scored'} ${score.correct}/${score.total} (${score.percentage}%) on "${quiz.title}" quiz. ${isCreatorView ? 'View detailed answers.' : 'Check out your results!'}`}
        url={typeof window !== 'undefined' ? window.location.href : `${process.env.NEXT_PUBLIC_SITE_URL || ''}/quiz/${quizId}/results`}
      />
      <Header />
      <main className={styles.mainContent}>
        <div className={styles.resultsSummaryCard}>
          <h1>{isCreatorView ? 'Quiz Review' : 'Quiz Completed!'}</h1>
          <h2>{quiz.title}</h2>
          <div className={styles.scoreDisplay}>
            <p className={styles.scoreText}>{isCreatorView ? 'Correct Answers' : 'You Scored'}</p>
            <div className={styles.scoreCircle}>
              <span className={styles.scoreValue}>{score.correct}</span>
              <span className={styles.scoreTotal}>/{score.total}</span>
            </div>
            <p className={styles.scorePercentage}>{score.percentage}%</p>
          </div>
          <div className={styles.summaryActions}>
            {isCreatorView ? (
              <Link href={`/dashboard/analytics/${quizId}`} className={`${styles.button} ${styles.buttonPrimary}`}>
                Back to Analytics
              </Link>
            ) : (
              <Link href={`/quiz/${quizId}/instructions`} className={`${styles.button} ${styles.buttonPrimary}`}>
                Retry Quiz
              </Link>
            )}
            <Link href="/dashboard" className={`${styles.button} ${styles.buttonSecondary}`}>
              Back to Dashboard
            </Link>
          </div>

          <SocialShareButtons 
            url={`/quiz/${quizId}/instructions`}
            title={`Check out this quiz: ${quiz.title}`}
            description={`I scored ${score.correct}/${score.total} (${score.percentage}%) on "${quiz.title}" quiz. Can you beat my score?`}
            hashtags={['quiz', 'testme']}
          />
        </div>

        <div className={styles.detailedReviewSection}>
          <h2>Detailed Review</h2>
          {isCreatorView && (
            <div className={styles.creatorNote}>
              <p>You are viewing this quiz as a creator. This view shows all correct answers and explanations.</p>
            </div>
          )}
          {quiz.questions.map((q, index) => {
            const userAnswerIndex = userAnswers[index];
            const isCorrect = userAnswerIndex === q.correctAnswer;
            return (
              <div key={q._id || index} className={`${styles.questionReviewCard} ${isCorrect ? styles.correct : styles.incorrect}`}>
                <h3>Question {index + 1}: {q.question}</h3>
                <ul className={styles.optionsList}>
                  {q.options.map((option, optIndex) => (
                    <li key={optIndex} className={
                      `${styles.optionItem} 
                       ${optIndex === q.correctAnswer ? styles.correctAnswerOption : ''} 
                       ${optIndex === userAnswerIndex && !isCorrect ? styles.incorrectUserOption : ''}
                       ${optIndex === userAnswerIndex && isCorrect ? styles.correctUserOption : ''}`
                    }>
                      <span className={styles.optionLetter}>{String.fromCharCode(65 + optIndex)}</span> {option}
                      {optIndex === q.correctAnswer && <span className={styles.badgeCorrect}> Correct Answer</span>}
                      {!isCreatorView && optIndex === userAnswerIndex && !isCorrect && <span className={styles.badgeUserChoice}> Your Answer</span>}
                      {!isCreatorView && optIndex === userAnswerIndex && isCorrect && <span className={styles.badgeUserChoiceCorrect}> Your Answer (Correct)</span>}
                    </li>
                  ))}
                </ul>
                {q.explanation && (
                  <div className={styles.explanation}>
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
} 