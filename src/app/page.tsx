"use client";
import styles from "./page.module.scss";
import Header from "./components/Header";
import ConversationalQuizCreator from "./components/ConversationalQuizCreator";

export default function Home() {
  return (
    <div className={styles.landing}>
      <Header currentPage="home" />

      <div className={styles.hero}>
        <h1>
          Speed Up <span className={styles.emoji}>🚀</span> Your
          <br />
          Learning with TestMe!
        </h1>
        <p className={styles.subtitle}>
          Generate quizzes from YouTube videos, PDFs, or your own text.
          <br />{' '}Test yourself smarter with AI-powered questions.
        </p>
        
        {/* Show quiz creator interface immediately without requiring login */}
        <div className={styles.quizCreatorWrapper}>
          <ConversationalQuizCreator />
        </div>
      </div>
      
    </div>
  );
}
