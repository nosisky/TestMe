'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';
import MetaTags from '@/app/components/MetaTags';
import styles from './results.module.scss'; // To be created
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
  id: string; // Changed from _id to id to match API response
  title: string;
  questions: QuizQuestion[];
  createdBy?: string; // Add createdBy field
}

interface UserResult {
  userId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeTaken?: number;
  answers?: Array<{
    questionIndex: number;
    selectedOption: number;
    isCorrect: boolean;
  }>;
}

type UserAnswers = Record<number, number | null>;

interface Score {
  correct: number;
  total: number;
  percentage: number;
}

export default function QuizResultsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const quizId = params.id as string;
  const userId = searchParams.get('userId');
  const view = searchParams.get('view');
  const isCreatorView = view === 'creator' && userId;
  const { status, data: session } = useSession();
  const router = useRouter();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswers | null>(null);
  const [score, setScore] = useState<Score | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [timeTaken, setTimeTaken] = useState<number | undefined>(undefined);
  const [hasSaved, setHasSaved] = useState(false);
  
  // Utility function to format time in minutes and seconds
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };
  
  const saveQuizResultToDb = useCallback(async (quizIdToSave: string, currentScore: Score, totalQuestions: number, quizQuestions: QuizQuestion[]) => {
    // Prevent duplicate saves
    if (hasSaved) {
      return;
    }
    
    try {
      // Set the flag immediately to prevent race conditions
      setHasSaved(true);
      
      // Get the start time from localStorage - USE THE ORIGINAL QUIZ ID FROM URL PARAMS
      const startTime = localStorage.getItem(`quizStartTime_${quizId}`);
      
      // Check if we already have a stored end time for this quiz
      let quizTimeTaken;
      const storedEndTime = localStorage.getItem(`quizEndTime_${quizId}`);
      
      if (storedEndTime) {
        // If we have an end time, use the pre-calculated time
        quizTimeTaken = parseInt(localStorage.getItem(`quizTimeTaken_${quizId}`) || '0');
      } else if (startTime) {
        // If no end time but we have start time, this is the first load of results
        // Calculate and store the time taken and end time
        const endTime = Date.now();
        quizTimeTaken = Math.floor((endTime - parseInt(startTime)) / 1000);
        
        // Store the end time and time taken to prevent recalculation on page refresh
        localStorage.setItem(`quizEndTime_${quizId}`, endTime.toString());
        localStorage.setItem(`quizTimeTaken_${quizId}`, quizTimeTaken.toString());
      } else {
        quizTimeTaken = undefined;
      }
      
      // Set the timeTaken state for display
      setTimeTaken(quizTimeTaken);
      
      // Prepare detailed answers data from localStorage - USE THE ORIGINAL QUIZ ID FROM URL PARAMS
      const storedAnswers = localStorage.getItem(`quizAnswers_${quizId}`);
      const userAnswers = storedAnswers ? JSON.parse(storedAnswers) : {};
      
      // Create an array of answer details
      const detailedAnswers = quizQuestions.map((question, index) => {
        const selectedOption = userAnswers[index];
        const isCorrect = selectedOption === question.correctAnswer;
        return {
          questionIndex: index,
          selectedOption: selectedOption !== undefined ? selectedOption : -1,
          isCorrect: isCorrect
        };
      }).filter(answer => answer.selectedOption >= 0);
      
      // Get the user's provided name for anonymous users - USE THE ORIGINAL QUIZ ID FROM URL PARAMS
      const providedUserName = localStorage.getItem(`quizUserName_${quizId}`);
      
      const response = await fetch('/api/quiz/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: quizIdToSave,
          score: currentScore.correct,
          totalQuestions: totalQuestions,
          timeTaken: quizTimeTaken,
          answers: detailedAnswers,
          userName: providedUserName // Include the provided name
        }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to save quiz result');
      }
      
      // Clean up localStorage after successful save (keep the name for potential retakes)
      // Note: We don't remove the user name in case they want to retake the quiz
      // localStorage.removeItem(`quizUserName_${quizIdToSave}`);
      
      // console.debug('Quiz result saved');
    } catch (err) {
      console.error('Failed to save quiz result:', err);
      // Reset the flag on error so they can try again
      setHasSaved(false);
      // Non-critical error, so don't necessarily show to user
    }
  }, [hasSaved, setHasSaved, quizId]);
  
  const calculateAndSaveScore = useCallback((currentQuiz: Quiz, currentAnswers: UserAnswers) => {
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
    saveQuizResultToDb(currentQuiz.id, calculatedScore, totalQuestions, currentQuiz.questions);
  }, [saveQuizResultToDb]);
  
  const loadQuizData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // First get quiz details to check if user is creator
      const detailsResponse = await fetch(`/api/quiz/${quizId}`);
      if (!detailsResponse.ok) {
        const errorData = await detailsResponse.json();
        throw new Error(errorData.error || 'Failed to load quiz details');
      }
      const detailsData = await detailsResponse.json();
      const quizDetails = detailsData.quiz;

      // Handle creator view - show specific user's results from database
      if (isCreatorView) {
        // Verify the current user is the quiz creator
        if (status !== 'authenticated' || session?.user?.email !== quizDetails.createdBy) {
          throw new Error('Access denied. Only the quiz creator can view user results.');
        }

        // Fetch analytics data to get the specific user's result
        const analyticsResponse = await fetch(`/api/quiz/analytics/${quizId}`);
        if (!analyticsResponse.ok) {
          throw new Error('Failed to load user results');
        }
        const analyticsData = await analyticsResponse.json();
        const userResult = analyticsData.results.find((result: UserResult) => result.userId === userId);
        
        if (!userResult) {
          throw new Error('User result not found');
        }

        // Get full quiz data for display
        const quizResponse = await fetch(`/api/quiz/take/${quizId}`);
        if (!quizResponse.ok) {
          throw new Error('Failed to load quiz data');
        }
        const quizData = await quizResponse.json();
        const fetchedQuiz = quizData.quiz as Quiz;
        fetchedQuiz.createdBy = quizDetails.createdBy;
        setQuiz(fetchedQuiz);

        // Convert user result to UserAnswers format for display
        const userAnswers: UserAnswers = {};
        if (userResult.answers && userResult.answers.length > 0) {
          userResult.answers.forEach((answer: { questionIndex: number; selectedOption: number; isCorrect: boolean }) => {
            userAnswers[answer.questionIndex] = answer.selectedOption;
          });
        }
        setUserAnswers(userAnswers);

        // Set score from the database result
        const calculatedScore: Score = {
          correct: userResult.score,
          total: userResult.totalQuestions,
          percentage: Math.round(userResult.percentage)
        };
        setScore(calculatedScore);

        // Set time taken if available
        if (userResult.timeTaken) {
          setTimeTaken(userResult.timeTaken);
        }

        return; // Exit early for creator view
      }

      // Original logic for quiz takers
      const storedAnswers = localStorage.getItem(`quizAnswers_${quizId}`);
      if (!storedAnswers) {
        // No localStorage data - check if user is the quiz creator
        if (status === 'authenticated' && session?.user?.email === quizDetails.createdBy) {
          // Quiz creator trying to view results - redirect to analytics page
          router.push(`/dashboard/analytics/${quizId}`);
          return;
        } else {
          // Regular user without quiz data - show error
          throw new Error('Quiz results not found. Please take the quiz first.');
        }
      }

      // If we have localStorage data, fetch full quiz data for results display
      const quizResponse = await fetch(`/api/quiz/take/${quizId}`);
      if (!quizResponse.ok) {
        const errorData = await quizResponse.json();
        throw new Error(errorData.error || 'Failed to load quiz data for results');
      }
      const quizData = await quizResponse.json();
      const fetchedQuiz = quizData.quiz as Quiz;
      
      // Add the createdBy field from details
      fetchedQuiz.createdBy = quizDetails.createdBy;
      setQuiz(fetchedQuiz);

      // Parse and set the stored answers
      const parsedAnswers = JSON.parse(storedAnswers) as UserAnswers;
      setUserAnswers(parsedAnswers);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while loading results.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [quizId, status, session, router, isCreatorView, userId]);

  // Effect to load quiz data
  useEffect(() => {
    if (quizId) {
      loadQuizData();
    }
  }, [quizId, loadQuizData]);

  // Effect to calculate score when both quiz and userAnswers are available
  useEffect(() => {
    // Only calculate and save score for actual quiz takers, not for creators viewing results
    if (quiz && userAnswers && !hasSaved && !isCreatorView) {
      // Always calculate score with actual user answers - no fake perfect scores
      calculateAndSaveScore(quiz, userAnswers);
    }
  }, [quiz, userAnswers, quizId, hasSaved, calculateAndSaveScore, isCreatorView]);

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
              {0 === userAnswerIndex && !isCorrect && <span className={styles.badgeUserChoice}> Your Answer</span>}
              {0 === userAnswerIndex && isCorrect && <span className={styles.badgeUserChoiceCorrect}> Your Answer (Correct)</span>}
            </div>
            <div className={
              `${styles.tfOption} 
               ${1 === q.correctAnswer ? styles.correctAnswerOption : ''} 
               ${1 === userAnswerIndex && !isCorrect ? styles.incorrectUserOption : ''}
               ${1 === userAnswerIndex && isCorrect ? styles.correctUserOption : ''}`
            }>
              <span className={styles.tfValue}>False</span>
              {1 === q.correctAnswer && <span className={styles.badgeCorrect}> Correct Answer</span>}
              {1 === userAnswerIndex && !isCorrect && <span className={styles.badgeUserChoice}> Your Answer</span>}
              {1 === userAnswerIndex && isCorrect && <span className={styles.badgeUserChoiceCorrect}> Your Answer (Correct)</span>}
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
                {optIndex === userAnswerIndex && !isCorrect && <span className={styles.badgeUserChoice}> Your Answer</span>}
                {optIndex === userAnswerIndex && isCorrect && <span className={styles.badgeUserChoiceCorrect}> Your Answer (Correct)</span>}
              </li>
            ))}
          </ul>
        )}
        
        {q.explanation && (
          <div className={styles.explanation}>
            <strong>Explanation:</strong> <MathJax>{q.explanation}</MathJax>
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
    <div className={styles.resultsContainer}>
      <MetaTags 
        title={`${isCreatorView ? 'User Results Review' : 'Quiz Completed!'} | ${quiz.title}`}
        description={`${isCreatorView ? 'Reviewing user performance' : 'You scored'} ${score.correct}/${score.total} (${score.percentage}%) on "${quiz.title}" quiz.`}
        url={typeof window !== 'undefined' ? window.location.href : `${process.env.NEXT_PUBLIC_SITE_URL || ''}/quiz/${quizId}/results`}
      />
      <Header />
      <main className={styles.resultsMain}>
        <div className={styles.resultsHeader}>
          <h1>{isCreatorView ? 'User Quiz Results' : 'Quiz Results'}</h1>
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
            {isCreatorView ? (
              <Link className={styles.dashboardButton} href={`/dashboard/analytics/${quizId}`}>
                Back to Analytics
              </Link>
            ) : status === 'authenticated' ? (
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
                      }).catch(err => console.debug('Error sharing:', err));
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
  );
} 