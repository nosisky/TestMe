"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../components/Header';
import styles from './review.module.scss';
import { handleApiResponse, handleFetchError } from "@/lib/api-utils";

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface Quiz {
  id: string;
  title: string;
  sourceType: string;
  questions: QuizQuestion[];
  createdAt: string;
}

export default function QuizReviewPage() {
  const params = useParams();
  const quizId = params.id as string;
  const router = useRouter();
  const { status } = useSession();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push('/login');
    }
  }, [status, router]);
  
  useEffect(() => {
    if (status !== "loading") {
      fetchQuiz();
    }
  }, [quizId, status]);
  
  const fetchQuiz = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/quiz/${quizId}`);
      const data = await handleApiResponse<{quiz: Quiz}>(response);
      setQuiz(data.quiz);
    } catch (err) {
      setError('Failed to load quiz. Please try again.');
      handleFetchError(err);
    } finally {
      setLoading(false);
    }
  };
  
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
  
  return (
    <div className={styles.reviewContainer}>
      <Header />
      
      <main className={styles.reviewMain}>
        <div className={styles.reviewHeader}>
          <Link href={`/quiz/${quizId}`} className={styles.backButton}>
            ← Back to Quiz
          </Link>
          <h1>Quiz Review: {quiz.title}</h1>
          <p className={styles.subheading}>
            Review all {quiz.questions?.length ?? 0} questions and answers below.
          </p>
        </div>
        
        <div className={styles.questionsContainer}>
          {(quiz.questions ?? []).map((question, index) => (
            <div key={index} className={styles.questionCard}>
              <h3 className={styles.questionNumber}>Question {index + 1}</h3>
              <h2 className={styles.question}>{question.question}</h2>
              
              <div className={styles.options}>
                {(question.options ?? []).map((option, optIndex) => (
                  <div
                    key={optIndex}
                    className={`${styles.optionItem} ${
                      optIndex === question.correctAnswer ? styles.correctOption : ''
                    }`}
                  >
                    <span className={styles.optionLetter}>
                      {String.fromCharCode(65 + optIndex)}
                    </span>
                    <span className={styles.optionText}>{option}</span>
                    {optIndex === question.correctAnswer && (
                      <span className={styles.correctBadge}>Correct Answer</span>
                    )}
                  </div>
                ))}
              </div>
              
              <div className={styles.explanation}>
                <h3>Explanation:</h3>
                <p>{question.explanation}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className={styles.actionButtons}>
          <Link href="/dashboard" className={styles.primaryButton}>
            Back to Dashboard
          </Link>
          <Link href={`/quiz/${quizId}`} className={styles.secondaryButton}>
            Retry Quiz
          </Link>
        </div>
      </main>
    </div>
  );
} 