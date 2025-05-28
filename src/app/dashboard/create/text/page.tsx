"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Header from "../../../components/Header";
import DashboardQuizCreator from "../../../components/DashboardQuizCreator";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import styles from "./textQuiz.module.scss";

export default function TextQuizCreator() {
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
    { label: "Text Content", icon: "✍️" }
  ];

  return (
    <div className={styles.textQuizContainer}>
      <Header />
      
      <main className={styles.createQuizMain}>
        <Breadcrumb 
          items={breadcrumbItems}
          backButtonText="Back to Dashboard"
        />
        
        <DashboardQuizCreator initialType="text" />
      </main>
    </div>
  );
} 