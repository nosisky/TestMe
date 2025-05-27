"use client";
import { useState, useEffect } from 'react';
import styles from "./page.module.scss";
import Header from "./components/Header";
import ConversationalQuizCreator from "./components/ConversationalQuizCreator";

export default function Home() {
  const [studentsHelped, setStudentsHelped] = useState(1345);



  // Animate student counter
  useEffect(() => {
    const interval = setInterval(() => {
      setStudentsHelped(prev => prev + Math.floor(Math.random() * 3) + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.landing}>
      <Header currentPage="home" />

      {/* Hero Section */}
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <span className={styles.badgeIcon}>🔥</span>
            <span>Join {studentsHelped.toLocaleString()}+ students already studying smarter</span>
          </div>
          
          <h1>
            Stop Wasting Time on
            <span className={styles.highlight}> Ineffective Study Methods</span>
          </h1>
          
          <p className={styles.subtitle}>
            Our AI identifies your knowledge gaps in seconds and creates personalized quizzes 
            that <strong>actually help you learn faster</strong>. No more guessing what to study.
          </p>

          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <span className={styles.statNumber}>2.3x</span>
              <span className={styles.statLabel}>Faster Learning</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>94%</span>
              <span className={styles.statLabel}>Grade Improvement</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>30sec</span>
              <span className={styles.statLabel}>Quiz Creation</span>
            </div>
          </div>

       
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.demoCard}>
            <div className={styles.demoHeader}>
              <span className={styles.demoTitle}>📚 Your Study Session</span>
              <span className={styles.demoStatus}>🟢 Active</span>
            </div>
            <div className={styles.demoContent}>
              <div className={styles.demoProgress}>
                <span>Knowledge Gaps Found: <strong>7</strong></span>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill}></div>
                </div>
                <span>Improvement: <strong>+23%</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

   

      {/* Quiz Creator Section */}
      <section className={styles.quizCreatorSection} id="quiz-creator">
        <div className={styles.sectionHeader}>
          <h2>Try It Right Now - Upload Any Study Material</h2>
          <p>See how TestMe transforms your content into targeted learning in under 30 seconds</p>
        </div>
        <div className={styles.quizCreatorWrapper}>
          <ConversationalQuizCreator />
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className={styles.problemSolution}>
        <div className={styles.problemSection}>
          <h2>😤 Tired of Studying Hard But Not Smart?</h2>
          <div className={styles.problemList}>
            <div className={styles.problemItem}>
              <span className={styles.problemIcon}>❌</span>
              <span>Spending hours making flashcards that don&apos;t help</span>
            </div>
            <div className={styles.problemItem}>
              <span className={styles.problemIcon}>❌</span>
              <span>Re-reading the same material over and over</span>
            </div>
            <div className={styles.problemItem}>
              <span className={styles.problemIcon}>❌</span>
              <span>Not knowing what you actually need to focus on</span>
            </div>
            <div className={styles.problemItem}>
              <span className={styles.problemIcon}>❌</span>
              <span>Feeling overwhelmed by too much content</span>
            </div>
          </div>
        </div>

        <div className={styles.solutionSection}>
          <h2>✨ TestMe Solves This in 3 Simple Steps</h2>
          <div className={styles.solutionSteps}>
            <div className={styles.solutionStep}>
              <span className={styles.stepNumber}>1</span>
              <div className={styles.stepContent}>
                <h3>Upload Your Material</h3>
                <p>YouTube video, PDF, image, or text - we handle it all</p>
              </div>
            </div>
            <div className={styles.solutionStep}>
              <span className={styles.stepNumber}>2</span>
              <div className={styles.stepContent}>
                <h3>AI Finds Your Gaps</h3>
                <p>Our AI analyzes and identifies exactly what you need to work on</p>
              </div>
            </div>
            <div className={styles.solutionStep}>
              <span className={styles.stepNumber}>3</span>
              <div className={styles.stepContent}>
                <h3>Practice & Improve</h3>
                <p>Take targeted quizzes that actually help you learn faster</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <h2>🎯 Everything You Need to Study Smarter</h2>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🧠</div>
            <h3>AI Gap Analysis</h3>
            <p>Instantly identifies what you don&apos;t know so you can focus your time on what matters most.</p>
            <div className={styles.featureBenefit}>Save 60% of your study time</div>
          </div>
          
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>⚡</div>
            <h3>Instant Quiz Generation</h3>
            <p>Turn any content into practice questions in seconds. No more manual flashcard creation.</p>
            <div className={styles.featureBenefit}>30-second setup</div>
          </div>
          
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📊</div>
            <h3>Smart Progress Tracking</h3>
            <p>See exactly how you&apos;re improving and get personalized recommendations for what to study next.</p>
            <div className={styles.featureBenefit}>Data-driven learning</div>
          </div>
          
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🎯</div>
            <h3>Adaptive Difficulty</h3>
            <p>Questions get harder as you improve, ensuring you&apos;re always challenged at the right level.</p>
            <div className={styles.featureBenefit}>Optimal challenge zone</div>
          </div>
          
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🧮</div>
            <h3>STEM-Optimized</h3>
            <p>Perfect for math, science, and technical subjects with automatic formula recognition.</p>
            <div className={styles.featureBenefit}>Built for complex subjects</div>
          </div>
          
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🌐</div>
            <h3>Study Groups</h3>
            <p>Share quizzes with classmates and compete on leaderboards to stay motivated.</p>
            <div className={styles.featureBenefit}>Social learning</div>
          </div>
        </div>
      </section>

      {/* Urgency/CTA Section */}
      <section className={styles.urgencySection}>
        <div className={styles.urgencyContent}>
          <h2>🔥 Don&apos;t Let Another Study Session Go to Waste</h2>
          <p>
            While you&apos;re reading this, <strong>{Math.floor(studentsHelped / 100)} students</strong> just improved their grades with TestMe. 
            Your next exam is coming whether you&apos;re ready or not.
          </p>
          <div className={styles.urgencyStats}>
            <div className={styles.urgencyStat}>
              <span className={styles.urgencyNumber}>2.3x</span>
              <span>faster learning</span>
            </div>
            <div className={styles.urgencyStat}>
              <span className={styles.urgencyNumber}>94%</span>
              <span>see grade improvement</span>
            </div>
            <div className={styles.urgencyStat}>
              <span className={styles.urgencyNumber}>Free</span>
              <span>to get started</span>
            </div>
          </div>
          <button 
            className={styles.urgencyCta}
            onClick={() => document.getElementById('quiz-creator')?.scrollIntoView({ behavior: 'smooth' })}
          >
            🚀 Start Your First Quiz Now - It&apos;s Free
          </button>
          <p className={styles.urgencySubtext}>
            Join thousands of students who are already studying smarter, not harder.
          </p>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>© 2025 TestMe. Helping students learn smarter, not harder.</p>
      </footer>
    </div>
  );
}
