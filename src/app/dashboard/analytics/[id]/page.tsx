'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import styles from './analytics.module.scss';
import { handleApiResponse, handleFetchError } from "@/lib/api-utils";

interface QuizData {
  id: string;
  title: string;
  createdAt: string;
  totalQuestions: number;
}

interface QuizStats {
  totalAttempts: number;
  averageScore: number;
  resultsByDate: Record<string, { count: number, avgScore: number }>;
}

interface Answer {
  questionIndex: number;
  selectedOption: number;
  isCorrect: boolean;
}

interface QuizTakerResult {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  completedAt: string;
  timeTaken?: number;
  answers?: Answer[];
}

interface AnalyticsData {
  quiz: QuizData;
  stats: QuizStats;
  results: QuizTakerResult[];
}

export default function QuizAnalyticsPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/quiz/analytics/${quizId}`);
      const data = await handleApiResponse<AnalyticsData>(response);
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
      handleFetchError(err);
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch analytics data
  useEffect(() => {
    if (status === 'authenticated' && quizId) {
      fetchAnalyticsData();
    }
  }, [status, quizId, fetchAnalyticsData]);

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };

  // Format time taken
  const formatTimeTaken = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Get performance class based on score percentage
  const getPerformanceClass = (percentage: number) => {
    if (percentage >= 80) return styles.excellent;
    if (percentage >= 60) return styles.good;
    return styles.needsImprovement;
  };

  // Navigate to the results page for a specific result
  const viewResultDetails = () => {
    // Navigate to the quiz results page
    router.push(`/quiz/${quizId}/results`);
  };

  if (status === 'loading' || loading) {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <main className={styles.mainContent}>
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <h2>Loading Analytics...</h2>
            <p>Please wait while we fetch your quiz data.</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <main className={styles.mainContent}>
          <div className={styles.errorState}>
            <h2>Error Loading Analytics</h2>
            <p>{error}</p>
            <button onClick={() => router.push('/dashboard')} className={styles.button}>
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <main className={styles.mainContent}>
          <div className={styles.errorState}>
            <h2>No Data Available</h2>
            <p>Analytics data could not be loaded or is not available for this quiz.</p>
            <Link href="/dashboard" className={styles.button}>
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const { quiz, stats, results } = analytics;

  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard", icon: "🏠" },
    { label: "Analytics", icon: "📊" },
    { label: quiz.title || "Quiz", icon: "📝" }
  ];

  return (
    <div className={styles.pageContainer}>
      <Header />
      <main className={styles.mainContent}>
        <div className={styles.analyticsHeader}>
          <Breadcrumb 
            items={breadcrumbItems}
            backButtonText="Back to Dashboard"
          />
          <h1>Quiz Analytics</h1>
          <h2>{quiz.title}</h2>
        </div>

        <div className={styles.statsOverviewCard}>
          <div className={styles.statBox}>
            <h3>Total Attempts</h3>
            <p className={styles.statValue}>{stats.totalAttempts}</p>
          </div>
          <div className={styles.statBox}>
            <h3>Average Score</h3>
            <p className={`${styles.statValue} ${getPerformanceClass(stats.averageScore)}`}>
              {stats.averageScore}%
            </p>
          </div>
          <div className={styles.statBox}>
            <h3>Questions</h3>
            <p className={styles.statValue}>{quiz.totalQuestions}</p>
          </div>
          <div className={styles.statBox}>
            <h3>Created</h3>
            <p className={styles.statValue}>{formatDate(quiz.createdAt)}</p>
          </div>
        </div>

        <div className={styles.resultsSectionHeader}>
          <h2>Quiz Takers</h2>
          <p>See who has taken your quiz and how they performed</p>
        </div>

        {results.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No one has taken this quiz yet.</p>
            <p>Share your quiz link to get started!</p>
          </div>
        ) : (
          <div className={styles.resultsTable}>
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Time Taken</th>
                  <th>Completed</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id} className={styles.resultRow}>
                    <td>
                      <div className={styles.userName}>{result.userName}</div>
                      <div className={styles.userEmail}>{result.userEmail}</div>
                    </td>
                    <td>
                      {result.score}/{result.totalQuestions}
                    </td>
                    <td className={getPerformanceClass(result.percentage)}>
                      {Math.round(result.percentage)}%
                    </td>
                    <td>{formatTimeTaken(result.timeTaken)}</td>
                    <td>{formatDate(result.completedAt)}</td>
                    <td>
                      <button 
                        onClick={() => viewResultDetails()}
                        className={styles.viewButton}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
} 