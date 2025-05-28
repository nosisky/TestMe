/**
 * @author: Nas Abdulrasaq(nosisky@gmail.com)
 * Email: nosisky@gmail.com
 * Github: https://github.com/nosisky
 */
"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import styles from "./login.module.scss";
import Link from "next/link";
import LoginButton from "../components/LoginButton";
import Header from "../components/Header";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.loginPage}>
      <Header currentPage="login" />

      <main className={styles.main}>
        <div className={styles.content}>
          <h1>Join TestMe Today</h1>
          <p className={styles.subtitle}>
            Create engaging quizzes from any content and test yourself smarter.
          </p>

          <div className={styles.benefits}>
            <div className={styles.benefit}>
              <span className={styles.icon}>🎯</span>
              <div>
                <h3>Learn More Effectively</h3>
                <p>AI-generated quiz questions help reinforce key concepts and boost retention.</p>
              </div>
            </div>
            
            <div className={styles.benefit}>
              <span className={styles.icon}>⚡</span>
              <div>
                <h3>Quick and Easy</h3>
                <p>Generate quizzes in seconds from videos, PDFs, images, or text.</p>
              </div>
            </div>
            
            <div className={styles.benefit}>
              <span className={styles.icon}>🔄</span>
              <div>
                <h3>Track Your Progress</h3>
                <p>Review your quiz history, answers, and explanations to see improvement.</p>
              </div>
            </div>
          </div>

          
        </div>

        <div className={styles.loginSection}>
            <h2>Sign In to Get Started</h2>
            <p>Use your Google account for quick, secure access.</p>
            <div className={styles.loginButtonWrapper}>
              <LoginButton />
            </div>
            <p className={styles.terms}>
              By signing in, you agree to our <Link href="#">Terms of Service</Link> and <Link href="#">Privacy Policy</Link>
            </p>
          </div>
      </main>
    </div>
  );
} 