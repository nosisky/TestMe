/**
 * @author: Nas Abdulconsole.debug((nosisky@gmail.com)
 * Email: nosisky@gmail.com
 * Github: https://github.com/nosisky
 */
"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "../components/Header";
import styles from "./dashboard.module.scss";
import { handleApiResponse, handleFetchError } from "@/lib/api-utils";

interface Quiz {
  id: string;
  title: string;
  sourceType: string;
  createdAt: string;
  stats: {
    timesPlayed: number;
    avgScore: number;
  };
  questionCount: number;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("create");
  const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Fetch user's created quizzes
  useEffect(() => {
    if (status === "authenticated" && activeTab === "myquizzes") {
      fetchMyQuizzes();
    }
  }, [status, activeTab]);

  const fetchMyQuizzes = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/quiz/list?userOnly=true");
      const data = await handleApiResponse<{quizzes: Quiz[]}>(response);
      setMyQuizzes(data.quizzes);
    } catch (err) {
      setError("Failed to load your quizzes. Please try again.");
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
      year: "numeric"
    }).format(date);
  };

  if (status === "loading") {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      <Header />
      
      <main className={styles.dashboardMain}>
        <div className={styles.dashboardHeader}>
          <h1>Dashboard</h1>
          {session?.user?.name && (
            <p>Welcome back, {session.user.name.split(" ")[0]}!</p>
          )}
        </div>

        <div className={styles.tabsContainer}>
          <button 
            className={`${styles.tabButton} ${activeTab === "create" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("create")}
          >
            Create Quiz
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === "myquizzes" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("myquizzes")}
          >
            My Quizzes
          </button>
          {/* <Link 
            href="/dashboard/flashcards"
            className={styles.tabButton}
          >
            Flashcards
          </Link> */}
          <Link 
            href="/dashboard/history"
            className={styles.tabButton}
          >
            Quiz History
          </Link>
        </div>

        {activeTab === "create" ? (
          <div className={styles.createQuizSection}>
            <h2>Create a New Quiz</h2>
            <p>Choose a source for your quiz questions:</p>
            
            <div className={styles.quizOptionsGrid}>
              <Link href="/dashboard/create/youtube" className={styles.quizOption}>
                <div className={styles.quizOptionIcon}>🎥</div>
                <h3>YouTube Video</h3>
                <p>Generate questions from a YouTube video transcript</p>
              </Link>
              
              <Link href="/dashboard/create/pdf" className={styles.quizOption}>
                <div className={styles.quizOptionIcon}>📄</div>
                <h3>PDF Document</h3>
                <p>Upload a PDF (up to 5 pages) and create a quiz</p>
              </Link>

              <Link href="/dashboard/create/text" className={styles.quizOption}>
                <div className={styles.quizOptionIcon}>✍️</div>
                <h3>Custom Text</h3>
                <p>Enter or paste your own text for quiz generation</p>
              </Link>
              
              <Link href="/dashboard/create/image" className={styles.quizOption}>
                <div className={styles.quizOptionIcon}>🖼️</div>
                <h3>Image</h3>
                <p>Extract text from an image to generate questions</p>
              </Link>
              
             
            </div>
          </div>
        ) : (
          <div className={styles.myQuizzesSection}>
            <h2>My Quizzes</h2>
            <p>View and analyze quizzes you&apos;ve created</p>
            
            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading your quizzes...</p>
              </div>
            ) : error ? (
              <div className={styles.errorState}>
                <p>{error}</p>
                <button 
                  className={styles.retryButton}
                  onClick={fetchMyQuizzes}
                >
                  Try Again
                </button>
              </div>
            ) : myQuizzes.length === 0 ? (
              <div className={styles.emptyState}>
                <Image src="/empty-state.svg" alt="No quizzes yet" width={150} height={150} />
                <p>You haven&apos;t created any quizzes yet.</p>
                <button 
                  className={styles.primaryButton}
                  onClick={() => setActiveTab("create")}
                >
                  Create Your First Quiz
                </button>
              </div>
            ) : (
              <div className={styles.quizzesGrid}>
                {myQuizzes.map((quiz) => (
                  <div key={quiz.id} className={styles.quizCard}>
                    <div className={styles.quizCardHeader}>
                      <div className={styles.quizType}>
                        {quiz.sourceType === "youtube" ? (
                          <span className={styles.sourceIcon}>🎥</span>
                        ) : quiz.sourceType === "pdf" ? (
                          <span className={styles.sourceIcon}>📄</span>
                        ) : quiz.sourceType === "image" ? (
                          <span className={styles.sourceIcon}>🖼️</span>
                        ) : (
                          <span className={styles.sourceIcon}>✍️</span>
                        )}
                        <span className={styles.sourceType}>{quiz.sourceType}</span>
                      </div>
                      <div className={styles.quizDate}>
                        {formatDate(quiz.createdAt)}
                      </div>
                    </div>
                    
                    <h3 className={styles.quizTitle}>{quiz.title}</h3>
                    
                    <div className={styles.quizMetaData}>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Questions:</span>
                        <span className={styles.metaValue}>{quiz.questionCount}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Times Played:</span>
                        <span className={styles.metaValue}>{quiz.stats.timesPlayed}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Avg. Score:</span>
                        <span className={styles.metaValue}>
                          {quiz.stats.timesPlayed > 0 ? `${quiz.stats.avgScore}%` : "N/A"}
                        </span>
                      </div>
                    </div>
                    
                    <div className={styles.quizActions}>
                      <Link 
                        href={`/quiz/${quiz.id}/instructions`} 
                        className={styles.actionButton}
                      >
                        Take Quiz
                      </Link>
                      <Link 
                        href={`/dashboard/analytics/${quiz.id}`} 
                        className={styles.actionButton}
                      >
                        View Analytics
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
} 