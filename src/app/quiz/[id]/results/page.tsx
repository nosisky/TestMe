'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Header from '@/app/components/Header';
import MetaTags from '@/app/components/MetaTags';
import styles from './results.module.scss'; // To be created
import { MathJax, MathJaxContext } from 'better-react-mathjax';

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
  const params = useParams();
  const quizId = params.id as string;
  const { status } = useSession();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswers | null>(null);
  const [score, setScore] = useState<Score | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [timeTaken, setTimeTaken] = useState<number | undefined>(undefined);
  
  // Utility function to format time in minutes and seconds
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };
  
  useEffect(() => {
    // Allow any user to view results, regardless of authentication status
    if (quizId) {
      loadResults();
    }
  }, [quizId]);

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
      // Get the start time from localStorage
      const startTime = localStorage.getItem(`quizStartTime_${quizIdToSave}`);
      
      // Check if we already have a stored end time for this quiz
      let quizTimeTaken;
      const storedEndTime = localStorage.getItem(`quizEndTime_${quizIdToSave}`);
      
      if (storedEndTime) {
        // If we have an end time, use the pre-calculated time
        quizTimeTaken = parseInt(localStorage.getItem(`quizTimeTaken_${quizIdToSave}`) || '0');
      } else if (startTime) {
        // If no end time but we have start time, this is the first load of results
        // Calculate and store the time taken and end time
        const endTime = Date.now();
        quizTimeTaken = Math.floor((endTime - parseInt(startTime)) / 1000);
        
        // Store the end time and time taken to prevent recalculation on page refresh
        localStorage.setItem(`quizEndTime_${quizIdToSave}`, endTime.toString());
        localStorage.setItem(`quizTimeTaken_${quizIdToSave}`, quizTimeTaken.toString());
      } else {
        quizTimeTaken = undefined;
      }
      
      // Set the timeTaken state for display
      setTimeTaken(quizTimeTaken);
      
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
          timeTaken: quizTimeTaken,
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

  // Configure MathJax
  const mathJaxConfig = {
    tex: {
      inlineMath: [['$', '$'], ['\\(', '\\)']],
      displayMath: [['$$', '$$'], ['\\[', '\\]']],
    },
    startup: {
      typeset: false
    }
  };

  // Render different question types in the results view
  const renderQuestionResult = (q: QuizQuestion, index: number, userAnswerIndex: number | null) => {
    const isCorrect = userAnswerIndex === q.correctAnswer;
    
    // Common layout for all question types
    return (
      <div key={q._id || index} className={`${styles.questionReviewCard} ${isCorrect ? styles.correct : styles.incorrect}`}>
        <h3>Question {index + 1}: {q.question}</h3>
        
        {/* Display formula for math questions */}
        {q.type === 'math' && q.formula && (
          <div className={styles.mathFormula}>
            <MathJax>{q.formula}</MathJax>
          </div>
        )}
        
        {/* Render options based on question type */}
        {q.type === 'true_false' ? (
          <div className={styles.trueFalseReview}>
            <div className={
              `${styles.tfOption} 
               ${0 === q.correctAnswer ? styles.correctAnswerOption : ''} 
               ${0 === userAnswerIndex && !isCorrect ? styles.incorrectUserOption : ''}
               ${0 === userAnswerIndex && isCorrect ? styles.correctUserOption : ''}`
            }>
              <span className={styles.tfValue}>True</span>
              {0 === q.correctAnswer && <span className={styles.badgeCorrect}> Correct Answer</span>}
              {!isCreatorView && 0 === userAnswerIndex && !isCorrect && <span className={styles.badgeUserChoice}> Your Answer</span>}
              {!isCreatorView && 0 === userAnswerIndex && isCorrect && <span className={styles.badgeUserChoiceCorrect}> Your Answer (Correct)</span>}
            </div>
            <div className={
              `${styles.tfOption} 
               ${1 === q.correctAnswer ? styles.correctAnswerOption : ''} 
               ${1 === userAnswerIndex && !isCorrect ? styles.incorrectUserOption : ''}
               ${1 === userAnswerIndex && isCorrect ? styles.correctUserOption : ''}`
            }>
              <span className={styles.tfValue}>False</span>
              {1 === q.correctAnswer && <span className={styles.badgeCorrect}> Correct Answer</span>}
              {!isCreatorView && 1 === userAnswerIndex && !isCorrect && <span className={styles.badgeUserChoice}> Your Answer</span>}
              {!isCreatorView && 1 === userAnswerIndex && isCorrect && <span className={styles.badgeUserChoiceCorrect}> Your Answer (Correct)</span>}
            </div>
          </div>
        ) : (
          <ul className={styles.optionsList}>
            {q.options.map((option, optIndex) => (
              <li key={optIndex} className={
                `${styles.optionItem} 
                 ${optIndex === q.correctAnswer ? styles.correctAnswerOption : ''} 
                 ${optIndex === userAnswerIndex && !isCorrect ? styles.incorrectUserOption : ''}
                 ${optIndex === userAnswerIndex && isCorrect ? styles.correctUserOption : ''}`
              }>
                <span className={styles.optionLetter}>{String.fromCharCode(65 + optIndex)}</span> 
                {q.type === 'math' ? <MathJax>{option}</MathJax> : option}
                {optIndex === q.correctAnswer && <span className={styles.badgeCorrect}> Correct Answer</span>}
                {!isCreatorView && optIndex === userAnswerIndex && !isCorrect && <span className={styles.badgeUserChoice}> Your Answer</span>}
                {!isCreatorView && optIndex === userAnswerIndex && isCorrect && <span className={styles.badgeUserChoiceCorrect}> Your Answer (Correct)</span>}
              </li>
            ))}
          </ul>
        )}
        
        {q.explanation && (
          <div className={styles.explanation}>
            <strong>Explanation:</strong> {q.explanation}
          </div>
        )}
      </div>
    );
  };

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
            <Link href={status === 'authenticated' ? "/dashboard" : "/"} className={styles.buttonSecondary}>
              {status === 'authenticated' ? "Back to Dashboard" : "Back to Home"}
            </Link>
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
            <Link href={status === 'authenticated' ? "/dashboard" : "/"} className={styles.buttonSecondary}>
              {status === 'authenticated' ? "Back to Dashboard" : "Back to Home"}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className={styles.resultsContainer}>
        <MetaTags 
          title={`${isCreatorView ? 'Quiz Review' : 'Quiz Completed!'} | ${quiz.title}`}
          description={`${isCreatorView ? 'Review' : 'You scored'} ${score.correct}/${score.total} (${score.percentage}%) on "${quiz.title}" quiz. ${isCreatorView ? 'View detailed answers.' : 'Check out your results!'}`}
          url={typeof window !== 'undefined' ? window.location.href : `${process.env.NEXT_PUBLIC_SITE_URL || ''}/quiz/${quizId}/results`}
        />
        <Header />
        <main className={styles.resultsMain}>
          <div className={styles.resultsHeader}>
            <h1>Quiz Results</h1>
            <h2>{quiz.title}</h2>
            
            <div className={styles.scoreSection}>
              <div className={styles.scoreBox}>
                <div className={styles.scoreValue}>{score.correct}</div>
                <div className={styles.scoreLabel}>Correct</div>
              </div>
              <div className={styles.scoreDivider}></div>
              <div className={styles.scoreBox}>
                <div className={styles.scoreValue}>{score.total}</div>
                <div className={styles.scoreLabel}>Total</div>
              </div>
              <div className={styles.scoreDivider}></div>
              <div className={styles.scoreBox}>
                <div className={styles.scoreValue}>{Math.round((score.correct / score.total) * 100)}%</div>
                <div className={styles.scoreLabel}>Score</div>
              </div>
            </div>
            
            {timeTaken && (
              <div className={styles.timeTaken}>
                <span>Time Taken: {formatTime(timeTaken)}</span>
              </div>
            )}
            
            <div className={styles.actionButtons}>
              <button className={styles.reviewButton} onClick={() => setShowReview(!showReview)}>
                {showReview ? 'Hide Review' : 'Show Review'}
              </button>
              {status === 'authenticated' ? (
                <Link className={styles.dashboardButton} href="/dashboard">
                  Back to Dashboard
                </Link>
              ) : (
                <>
                  <Link className={styles.dashboardButton} href="/">
                    Back to Home
                  </Link>
                  <button 
                    className={styles.shareButton} 
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: `Quiz Results: ${quiz.title}`,
                          text: `I scored ${score.correct}/${score.total} (${score.percentage}%) on "${quiz.title}" quiz!`,
                          url: window.location.href,
                        }).catch(err => console.log('Error sharing:', err));
                      } else {
                        // Fallback - copy to clipboard
                        const url = window.location.href;
                        navigator.clipboard.writeText(
                          `I scored ${score.correct}/${score.total} (${score.percentage}%) on "${quiz.title}" quiz! Try it yourself at ${url}`
                        );
                        alert('Quiz results link copied to clipboard!');
                      }
                    }}
                  >
                    Share Results
                  </button>
                </>
              )}
            </div>
          </div>
          
          {showReview && (
            <div className={styles.reviewSection}>
              <h2>Review Your Answers</h2>
              
              <div className={styles.questionsContainer}>
                {quiz.questions.map((q, index) => {
                  const userAnswerIndex = userAnswers[index];
                  return renderQuestionResult(q, index, userAnswerIndex);
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </MathJaxContext>
  );
} 