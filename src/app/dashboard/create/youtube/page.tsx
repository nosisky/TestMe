"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Header from "../../../components/Header";
import DashboardQuizCreator from "../../../components/DashboardQuizCreator";
import styles from "./youtubeQuiz.module.scss";

export default function YoutubeQuizCreator() {
  const { status } = useSession();
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.youtubeQuizContainer}>
      <Header />
      
      <main className={styles.createQuizMain}>
        <div className={styles.breadcrumbs}>
          <button onClick={() => router.back()} className={styles.backButton}>
            ← Back to Dashboard
          </button>
          <span>Dashboard / Create Quiz / YouTube Video</span>
        </div>
        
        <DashboardQuizCreator initialType="youtube" />
      </main>
    </div>
  );
} 