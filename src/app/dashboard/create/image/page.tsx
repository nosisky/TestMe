"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Header from "../../../components/Header";
import DashboardQuizCreator from "../../../components/DashboardQuizCreator";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import styles from "./image.module.scss";

export default function ImageQuizCreator() {
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
    { label: "Image Content", icon: "🖼️" }
  ];

  return (
    <div className={styles.imageQuizContainer}>
      <Header />
      
      <main className={styles.createQuizMain}>
        <Breadcrumb 
          items={breadcrumbItems}
          backButtonText="Back to Dashboard"
        />
        
        <DashboardQuizCreator initialType="image" />
      </main>
    </div>
  );
} 