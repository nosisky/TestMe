"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header';
import styles from './quiz.module.scss';
import { MathJax } from 'better-react-mathjax';

interface QuizQuestion {
  _id?: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'math';
  options: string[];
  correctAnswer: number;
  explanation?: string;
  formula?: string;
  isTrue?: boolean;
}

interface Quiz {
  _id: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  difficulty: string;
  createdAt: string;
  createdBy: string;
}

interface UserAnswers {
  [questionIndex: number]: number | null;
}

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
  
  useEffect(() => {
    if (quizId) {
      fetchQuiz();
    }
  }, [quizId]);
  
  useEffect(() => {
    if (quizId && quiz && quiz.questions.length > 0) {
      // Save start time for calculating time taken
      localStorage.setItem(`quizStartTime_${quizId}`, Date.now().toString());
    }
  }, [quizId, quiz]);
  
  const fetchQuiz = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/quiz/take/${quizId}`);
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
      localStorage.setItem(`quizAnswers_${quizId}`, JSON.stringify(userAnswers));
      router.push(`/quiz/${quizId}/results`);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  // Render different question types
  const renderQuestion = (question: QuizQuestion) => {
    console.log(question.type, 'question.type', question)
    switch (question.type) {
      case 'true_false':
        return renderTrueFalseQuestion(question);
      case 'math':
        return renderMathQuestion(question);
      case 'multiple_choice':
      default:
        return renderMultipleChoiceQuestion(question);
    }
  };
  
  const renderMultipleChoiceQuestion = (question: QuizQuestion) => {
    return (
      <>
        <h2 className={styles.question}><MathJax>{question.question}</MathJax></h2>
        <div className={styles.options}>
          {question.options.map((option, index) => (
            <button
              key={index}
              className={`${styles.optionButton} ${
                userAnswers[currentQuestionIndex] === index ? styles.selectedOption : ''
              }`}
              onClick={() => handleOptionSelect(currentQuestionIndex, index)}
            >
              <span className={styles.optionLetter}>{String.fromCharCode(65 + index)}</span>
              <span className={styles.optionText}><MathJax>{option}</MathJax></span>
            </button>
          ))}
        </div>
      </>
    );
  };
  
  const renderTrueFalseQuestion = (question: QuizQuestion) => {
    return (
      <>
        <h2 className={styles.question}><MathJax>{question.question}</MathJax></h2>
        <div className={styles.trueFalseOptions}>
          <button
            className={`${styles.trueFalseButton} ${
              userAnswers[currentQuestionIndex] === 0 ? styles.selectedOption : ''
            }`}
            onClick={() => handleOptionSelect(currentQuestionIndex, 0)}
          >
            <span className={styles.truthValue}>True</span>
          </button>
          <button
            className={`${styles.trueFalseButton} ${
              userAnswers[currentQuestionIndex] === 1 ? styles.selectedOption : ''
            }`}
            onClick={() => handleOptionSelect(currentQuestionIndex, 1)}
          >
            <span className={styles.truthValue}>False</span>
          </button>
        </div>
      </>
    );
  };
  
  const renderMathQuestion = (question: QuizQuestion) => {
    return (
      <>
        <h2 className={styles.question}><MathJax>{question.question}</MathJax></h2>
        {question.formula && (
          <div className={styles.mathFormula}>
            <MathJax>
              {question.formula}
            </MathJax>
          </div>
        )}
        <div className={styles.options}>
          {question.options.map((option, index) => (
            <button
              key={index}
              className={`${styles.optionButton} ${
                userAnswers[currentQuestionIndex] === index ? styles.selectedOption : ''
              }`}
              onClick={() => handleOptionSelect(currentQuestionIndex, index)}
            >
              <span className={styles.optionLetter}>{String.fromCharCode(65 + index)}</span>
              <span className={styles.optionText}>
                <MathJax>{option}</MathJax>
              </span>
            </button>
          ))}
        </div>
      </>
    );
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
      <div className={styles.quizContainer}>
        <Header />
        <main className={styles.quizMain}>
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
          {renderQuestion(currentQuestion)}
          
          <div className={styles.navigationButtons}>
            {currentQuestionIndex > 0 ? (
              <button
                className={`${styles.navButton} ${styles.prevButton}`}
                onClick={handlePreviousQuestion}
              >
                Previous
              </button>
            ) : (
              <div className={styles.spacer}></div>
            )}
            <button
              className={`${styles.navButton} ${styles.nextButton}`}
              onClick={handleNextQuestion}
              disabled={selectedOptionForCurrentQuestion === null}
            >
              {currentQuestionIndex < quiz.questions.length - 1 ? 'Next' : 'Finish Quiz'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
} 