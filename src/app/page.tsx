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
          Master Any Subject,
          <br />
          in Half the Time
        </h1>
        <p className={styles.subtitle}>
          Our AI turns your learning materials into targeted quizzes
          <br />that identify and strengthen your weak spots.
        </p>
        
        {/* Show quiz creator interface immediately without requiring login */}
        <div className={styles.quizCreatorWrapper}>
          <ConversationalQuizCreator />
        </div>
      </div>
      
    </div>
  );
}
