"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header';
import styles from './quiz.module.scss';

interface QuizQuestion {
  _id?: string; // Assuming questions might have IDs if fetched individually or for keys
  question: string;
  options: string[];
  correctAnswer: number; // Index of the correct option
  explanation?: string;
}

interface Quiz {
  id: string;
  title?: string; // Title might be fetched for context
  questions: QuizQuestion[];
  // any other relevant quiz properties
}

// To store answers. Key is question index, value is selected option index.
type UserAnswers = Record<number, number | null>;

export default function QuizPage() {
  const params = useParams();
  const quizId = params?.id as string;
  const router = useRouter();
  const { status } = useSession();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
  // No more selectedOption or showExplanation for immediate feedback
  // const [selectedOption, setSelectedOption] = useState<number | null>(null);
  // const [showExplanation, setShowExplanation] = useState(false);
  
  // quizCompleted and score will be handled by the results page
  // const [score, setScore] = useState(0);
  // const [quizCompleted, setQuizCompleted] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/quiz/${quizId}`);
    }
  }, [status, router, quizId]);
  
  useEffect(() => {
    if (status === 'authenticated' && quizId) {
      fetchQuiz();
    }
  }, [quizId, status]); // fetchQuiz will be defined below
  
  useEffect(() => {
    if (status === 'authenticated' && quizId && quiz && quiz.questions.length > 0) {
      // Save start time for calculating time taken
      localStorage.setItem(`quizStartTime_${quizId}`, Date.now().toString());
    }
  }, [status, quizId, quiz]);
  
  const fetchQuiz = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/quiz/take/${quizId}`); // New endpoint for full quiz data
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load quiz for taking');
      }
      const data = await response.json();
      setQuiz(data.quiz);
      // Initialize answers object
      const initialAnswers: UserAnswers = {};
      data.quiz.questions.forEach((_: QuizQuestion, index: number) => {
        initialAnswers[index] = null;
      });
      setUserAnswers(initialAnswers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quiz. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleOptionSelect = (questionIndex: number, optionIndex: number) => {
    setUserAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionIndex]: optionIndex,
    }));
    
    // Auto proceed to next question after a short delay
    if (currentQuestionIndex < quiz!.questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }, 500); // Half-second delay to show selection before moving on
    } else {
      // If it's the last question, finish the quiz after a delay
      setTimeout(() => {
        localStorage.setItem(`quizAnswers_${quizId}`, JSON.stringify({
          ...userAnswers,
          [questionIndex]: optionIndex
        }));
        router.push(`/quiz/${quizId}/results`);
      }, 800); // Slightly longer delay for the last question
    }
  };
  
  const handleNextQuestion = () => {
    if (!quiz) return;
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // All questions answered, navigate to results page
      // Pass answers and quizId to the results page via router state or query params
      // For simplicity with large answer sets, we might use localStorage or a context here,
      // but for now, let's plan to pass via router state if small enough or re-fetch on results page.
      localStorage.setItem(`quizAnswers_${quizId}`, JSON.stringify(userAnswers));
      router.push(`/quiz/${quizId}/results`);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  if (status === 'loading' || loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading quiz...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={styles.quizContainer}> {/* Ensure consistent container */}
        <Header />
        <main className={styles.quizMain}>
          <div className={styles.errorState}> {/* Consistent error display */}
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

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className={styles.quizContainer}>
        <Header />
        <main className={styles.quizMain}>
          <div className={styles.errorState}> 
            <h2>Quiz Not Found</h2>
            <p>The quiz is empty or could not be loaded.</p>
            <Link href="/dashboard" className={styles.buttonPrimary}>
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }
  
  const currentQuestion = quiz.questions[currentQuestionIndex];
  const selectedOptionForCurrentQuestion = userAnswers[currentQuestionIndex];

  return (
    <div className={styles.quizContainer}>
      <Header />
      <main className={styles.quizMain}>
        <div className={styles.quizHeader}>
          <h1>{quiz.title || 'Quiz'}</h1>
          <div className={styles.quizProgress}>
            <div className={styles.progressTrack}>
              <div 
                className={styles.progressBar} 
                style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
              ></div>
            </div>
            <div className={styles.questionCounter}>
              Question {currentQuestionIndex + 1} of {quiz.questions.length}
            </div>
          </div>
        </div>
        
        <div className={styles.questionCard}>
          <h2 className={styles.question}>{currentQuestion.question}</h2>
          
          <div className={styles.options}>
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                className={`${styles.optionButton} ${
                  selectedOptionForCurrentQuestion === index ? styles.selectedOption : ''
                }`}
                onClick={() => handleOptionSelect(currentQuestionIndex, index)}
              >
                <span className={styles.optionLetter}>{String.fromCharCode(65 + index)}</span>
                <span className={styles.optionText}>{option}</span>
              </button>
            ))}
          </div>
          
          <div className={styles.navigationButtons}>
            {currentQuestionIndex > 0 ? (
              <button
                className={`${styles.navButton} ${styles.prevButton}`}
                onClick={handlePreviousQuestion}
              >
                Previous
              </button>
            ) : (
              <div className={styles.spacer}></div> /* Empty spacer for layout balance */
            )}
            <button
              className={`${styles.navButton} ${styles.nextButton}`}
              onClick={handleNextQuestion}
              disabled={selectedOptionForCurrentQuestion === null}
            >
              {currentQuestionIndex < quiz.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
} 