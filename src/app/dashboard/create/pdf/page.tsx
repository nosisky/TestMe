"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Header from "../../../components/Header";
import DashboardQuizCreator from "../../../components/DashboardQuizCreator";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import styles from "./pdfQuiz.module.scss";

export default function PdfQuizCreator() {
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

  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard", icon: "🏠" },
    { label: "Create Quiz", href: "/dashboard" },
    { label: "PDF Document", icon: "📄" }
  ];

  return (
    <div className={styles.pdfQuizContainer}>
      <Header />
      
      <main className={styles.createQuizMain}>
        <Breadcrumb 
          items={breadcrumbItems}
          backButtonText="Back to Dashboard"
        />
        
        <DashboardQuizCreator initialType="pdf" />
      </main>
    </div>
  );
} 