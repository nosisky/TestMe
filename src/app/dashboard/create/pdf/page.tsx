'use client';

import PdfQuizCreator from '@/app/components/quiz/PdfQuizCreator';
import Header from '@/app/components/Header';
import styles from './pdfQuiz.module.scss';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PdfQuizPage() {
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
    <div className={styles.quizPageContainer}>
      <Header />
      <div className={styles.contentContainer}>
        <div className={styles.breadcrumbs}>
          <button onClick={() => router.back()} className={styles.backButton}>
            ← Back
          </button>
          <span className={styles.breadcrumbSeparator}>Dashboard / Create Quiz / PDF Document</span>
        </div>
        <h1 className={styles.pageTitle}>Create a Quiz from PDF</h1>
        <p className={styles.pageDescription}>
          Upload a PDF document (up to 5 pages) and we&apos;ll generate a quiz based on its content.
        </p>
        <PdfQuizCreator />
      </div>
    </div>
  );
} 