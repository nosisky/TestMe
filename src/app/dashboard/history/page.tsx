"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "../../components/Header";
import styles from "./history.module.scss";
import { handleApiResponse, handleFetchError } from "@/lib/api-utils";

interface QuizResult {
  id: string;
  quiz: {
    id: string;
    title: string;
    sourceType: string;
    source: {
      type: string;
      youtube?: {
        videoId: string;
        thumbnail: string;
      }
    }
  };
  score: number;
  totalQuestions: number;
  percentage: number;
  completedAt: string;
  timeTaken?: number;
}

export default function QuizHistoryPage() {
  const { status } = useSession();
  const router = useRouter();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Fetch quiz results
  useEffect(() => {
    if (status === "authenticated") {
      fetchQuizResults();
    }
  }, [status]);

  const fetchQuizResults = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/quiz/result");
      const data = await handleApiResponse<{results: QuizResult[]}>(response);
      setResults(data.results);
    } catch (err) {
      setError("Failed to load your quiz history. Please try again.");
      handleFetchError(err);
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric"
    }).format(date);
  };

  // Format time taken
  const formatTimeTaken = (seconds?: number) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (status === "loading" || loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading quiz history...</p>
      </div>
    );
  }

  return (
    <div className={styles.historyContainer}>
      <Header />
      
      <main className={styles.historyMain}>
        <div className={styles.historyHeader}>
          <h1>Quiz History</h1>
          <p className={styles.subtitle}>View and analyze your quiz performance over time.</p>
          
          <Link href="/dashboard" className={styles.backLink}>
            ← Back to Dashboard
          </Link>
        </div>
        
        {error && (
          <div className={styles.errorMessage}>
            <p>{error}</p>
            <button 
              className={styles.retryButton}
              onClick={fetchQuizResults}
            >
              Try Again
            </button>
          </div>
        )}
        
        {results.length === 0 && !error ? (
          <div className={styles.emptyState}>
            <Image src="/empty-state.svg" alt="No quiz history" width={150} height={150} />
            <h2>No Quiz History Yet</h2>
            <p>You haven&apos;t completed any quizzes yet. Take a quiz to see your results here!</p>
            <Link href="/dashboard" className={styles.primaryButton}>
              Create Your First Quiz
            </Link>
          </div>
        ) : (
          <div className={styles.resultsGrid}>
            {results.map((result) => (
              <div key={result.id} className={styles.resultCard}>
                <div className={styles.resultHeader}>
                  <div className={styles.quizType}>
                    {result.quiz.sourceType === "youtube" ? (
                      <span className={styles.sourceIcon}>🎥</span>
                    ) : result.quiz.sourceType === "pdf" ? (
                      <span className={styles.sourceIcon}>📄</span>
                    ) : (
                      <span className={styles.sourceIcon}>📝</span>
                    )}
                    <span className={styles.sourceType}>{result.quiz.sourceType}</span>
                  </div>
                  <div className={styles.quizScore}>
                    <div className={styles.scoreValue}>
                      {result.score}/{result.totalQuestions}
                    </div>
                    <div 
                      className={`${styles.percentage} ${
                        result.percentage >= 80 ? styles.excellent :
                        result.percentage >= 60 ? styles.good :
                        styles.needsImprovement
                      }`}
                    >
                      {result.percentage}%
                    </div>
                  </div>
                </div>
                
                <h3 className={styles.quizTitle}>{result.quiz.title}</h3>
                
                <div className={styles.resultMeta}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Completed:</span>
                    <span className={styles.metaValue}>{formatDate(result.completedAt)}</span>
                  </div>
                  
                  {result.timeTaken && (
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Time taken:</span>
                      <span className={styles.metaValue}>{formatTimeTaken(result.timeTaken)}</span>
                    </div>
                  )}
                </div>
                
                <div className={styles.resultActions}>
                  <Link 
                    href={`/quiz/${result.quiz.id}`} 
                    className={styles.actionButton}
                  >
                    Retry Quiz
                  </Link>
                  <Link 
                    href={`/quiz/${result.quiz.id}/review`} 
                    className={styles.actionButton}
                  >
                    Review Answers
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
} 