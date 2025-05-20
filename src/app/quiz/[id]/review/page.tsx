"use client";
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../components/Header';
import styles from './review.module.scss';
import { handleFetchError } from "@/lib/api-utils";
import { MathJax } from 'better-react-mathjax';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  type?: 'multiple_choice' | 'true_false' | 'math';
  formula?: string;
}

interface Quiz {
  _id?: string;
  id?: string;
  title: string;
  sourceType: string;
  questions: QuizQuestion[];
  createdAt: string;
}

// Type for user answers stored in localStorage
type UserAnswers = Record<number, number | null>;

export default function QuizReviewPage() {
  const params = useParams();
  const quizId = params.id as string;
  const router = useRouter();
  const { status } = useSession();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [hasAnswers, setHasAnswers] = useState(false);
  
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push('/login');
    }
  }, [status, router]);
  
  // Load user answers from localStorage
  useEffect(() => {
    if (quizId) {
      try {
        const savedAnswers = localStorage.getItem(`quizAnswers_${quizId}`);
        if (savedAnswers) {
          setUserAnswers(JSON.parse(savedAnswers));
          setHasAnswers(true);
        }
      } catch (err) {
        console.error('Error loading saved answers:', err);
      }
    }
  }, [quizId]);
  
  const fetchQuiz = useCallback(async () => {
    setLoading(true);
    try {
      // Use the quiz/take endpoint which returns the full quiz data with questions
      const response = await fetch(`/api/quiz/take/${quizId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load quiz');
      }
      const data = await response.json();
      
      // Transform the data to match expected Quiz interface
      const quizData: Quiz = {
        id: data.quiz._id?.toString() || data.quiz.id,
        title: data.quiz.title || 'Untitled Quiz',
        sourceType: data.quiz.sourceType || 'unknown',
        questions: data.quiz.questions || [],
        createdAt: data.quiz.createdAt || new Date().toISOString()
      };
      
      setQuiz(quizData);
    } catch (err) {
      setError('Failed to load quiz. Please try again.');
      handleFetchError(err);
    } finally {
      setLoading(false);
    }
  }, [quizId]);
  
  useEffect(() => {
    if (status !== "loading") {
      fetchQuiz();
    }
  }, [quizId, status, fetchQuiz]);
  
  // Calculate score when quiz and user answers are loaded
  useEffect(() => {
    if (quiz && Object.keys(userAnswers).length > 0) {
      let correctCount = 0;
      
      quiz.questions.forEach((question, index) => {
        if (userAnswers[index] === question.correctAnswer) {
          correctCount++;
        }
      });
      
      setScore({
        correct: correctCount,
        total: quiz.questions.length
      });
    }
  }, [quiz, userAnswers]);
  
  if (status === "loading" || loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading quiz review...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={styles.reviewContainer}>
        <Header />
        <main className={styles.reviewMain}>
          <div className={styles.errorMessage}>
            <h2>Error</h2>
            <p>{error}</p>
            <Link href="/dashboard" className={styles.backButton}>
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }
  
  if (!quiz) {
    return (
      <div className={styles.reviewContainer}>
        <Header />
        <main className={styles.reviewMain}>
          <div className={styles.errorMessage}>
            <h2>Quiz Not Found</h2>
            <p>The quiz you are looking for does not exist or has been removed.</p>
            <Link href="/dashboard" className={styles.backButton}>
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Check for missing or empty questions (API or data issue)
  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    return (
      <div className={styles.reviewContainer}>
        <Header />
        <main className={styles.reviewMain}>
          <div className={styles.errorMessage}>
            <h2>No Questions Found</h2>
            <p>This quiz does not have any questions. There may have been an error loading the quiz data. Please try again later.</p>
            <Link href="/dashboard" className={styles.backButton}>
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }
  
  if (!hasAnswers) {
    return (
      <div className={styles.reviewContainer}>
        <Header />
        <main className={styles.reviewMain}>
          <div className={styles.errorMessage}>
            <h2>No Answers Found</h2>
            <p>We couldn&apos;t find your answers for this quiz. You may need to complete the quiz first.</p>
            <div className={styles.actionButtons}>
              <Link href="/dashboard" className={styles.primaryButton}>
                Back to Dashboard
              </Link>
              <Link href={`/quiz/${quizId}`} className={styles.secondaryButton}>
                Take Quiz
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  return (
    <div className={styles.reviewContainer}>
      <Header />
      
      <main className={styles.reviewMain}>
        <div className={styles.reviewHeader}>
          <Link href={`/dashboard`} className={styles.backButton}>
            ← Back
          </Link>
          <h1>Quiz Review: {quiz.title}</h1>
          
          <div className={styles.scoreCard}>
            <div className={styles.scoreValue}>
              {score.correct}/{score.total}
            </div>
            <div className={styles.scoreLabel}>
              {Math.round((score.correct / score.total) * 100)}% Correct
            </div>
          </div>
          
          <p className={styles.subheading}>
            Review all {quiz.questions?.length ?? 0} questions and answers below.
          </p>
        </div>
        
        <div className={styles.questionsContainer}>
          {(quiz.questions ?? []).map((question, index) => {
            const userAnswer = userAnswers[index];
            const isCorrect = userAnswer === question.correctAnswer;
            
            return (
              <div 
                key={index} 
                className={`${styles.questionCard} ${
                  isCorrect ? styles.correctQuestion : styles.incorrectQuestion
                }`}
              >
                <div className={styles.questionStatus}>
                  {isCorrect ? (
                    <span className={styles.correctBadge}>✓ Correct</span>
                  ) : (
                    <span className={styles.incorrectBadge}>✗ Incorrect</span>
                  )}
                </div>
                
                <h3 className={styles.questionNumber}>Question {index + 1}</h3>
                <h2 className={styles.question}>
                  <MathJax>{question.question}</MathJax>
                </h2>
                
                {/* Display formula for math questions */}
                {question.type === 'math' && question.formula && (
                  <div className={styles.mathFormula}>
                    <MathJax>{question.formula}</MathJax>
                  </div>
                )}
                
                <div className={styles.options}>
                  {(question.options ?? []).map((option, optIndex) => (
                    <div
                      key={optIndex}
                      className={`${styles.option} ${
                        optIndex === question.correctAnswer ? styles.correctOption : ''
                      } ${
                        optIndex === userAnswer && optIndex !== question.correctAnswer ? styles.incorrectOption : ''
                      } ${
                        optIndex === userAnswer && optIndex === question.correctAnswer ? styles.selectedCorrectOption : ''
                      }`}
                    >
                      <span className={styles.optionLetter}>
                        {String.fromCharCode(65 + optIndex)}
                      </span>
                      <span className={styles.optionText}>
                        <MathJax>{option}</MathJax>
                      </span>
                      {optIndex === question.correctAnswer && (
                        <span className={styles.correctMark}>✓ Correct Answer</span>
                      )}
                      {optIndex === userAnswer && optIndex !== question.correctAnswer && (
                        <span className={styles.incorrectMark}>✗ Your Answer</span>
                      )}
                    </div>
                  ))}
                </div>
                
                {question.explanation && (
                  <div className={styles.explanation}>
                    <h4>Explanation:</h4>
                    <p><MathJax>{question.explanation}</MathJax></p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className={styles.actionsFooter}>
          <Link href="/dashboard" className={styles.primaryButton}>
            Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
} 