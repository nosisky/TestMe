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
      
      {/* Features section */}
      <section className={styles.features} id="features">
        <h2>Why Students Love TestMe</h2>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <div className={styles.icon}>🔍</div>
            <h3 className={styles.title}>Gap Analysis</h3>
            <p className={styles.desc}>
              Instantly identify knowledge gaps in your study materials and focus your efforts where they matter most.
            </p>
          </div>
          
          <div className={styles.featureCard}>
            <div className={styles.icon}>🧠</div>
            <h3 className={styles.title}>AI-Powered Questions</h3>
            <p className={styles.desc}>
              Our advanced AI generates challenging questions that adapt to your specific learning materials and knowledge level.
            </p>
          </div>
          
          <div className={styles.featureCard}>
            <div className={styles.icon}>📊</div>
            <h3 className={styles.title}>Progress Tracking</h3>
            <p className={styles.desc}>
              Track your improvement over time with detailed analytics and personalized recommendations.
            </p>
          </div>
          
          <div className={styles.featureCard}>
            <div className={styles.icon}>⚡️</div>
            <h3 className={styles.title}>Instant Quizzes</h3>
            <p className={styles.desc}>
              Create quizzes from YouTube videos, PDFs, images, or text in seconds, not hours. No more manual flashcards.
            </p>
          </div>
          
          <div className={styles.featureCard}>
            <div className={styles.icon}>🧮</div>
            <h3 className={styles.title}>Math Support</h3>
            <p className={styles.desc}>
              Automatically detects and formats mathematical content, perfect for STEM subjects and technical courses.
            </p>
          </div>
          
          <div className={styles.featureCard}>
            <div className={styles.icon}>🌐</div>
            <h3 className={styles.title}>Share & Collaborate</h3>
            <p className={styles.desc}>
              Easily share quizzes with classmates or students to enhance group study sessions and classroom learning.
            </p>
          </div>
        </div>
      </section>
      
      {/* How it works section */}
      <section className={styles.how} id="how-it-works">
        <h2>How TestMe Works</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <span className={styles.icon}>📚</span>
            <span className={styles.title}>1. Select Content</span>
            <p className={styles.desc}>
              Choose a YouTube video, upload a PDF or image, or paste text from your study materials.
            </p>
          </div>
          
          <div className={styles.step}>
            <span className={styles.icon}>🤖</span>
            <span className={styles.title}>2. AI Analysis</span>
            <p className={styles.desc}>
              Our advanced AI analyzes your content to identify key concepts and knowledge areas.
            </p>
          </div>
          
          <div className={styles.step}>
            <span className={styles.icon}>❓</span>
            <span className={styles.title}>3. Quiz Generation</span>
            <p className={styles.desc}>
              Intelligent questions are crafted to test comprehension, recall, and application of concepts.
            </p>
          </div>
          
          <div className={styles.step}>
            <span className={styles.icon}>🎯</span>
            <span className={styles.title}>4. Practice & Learn</span>
            <p className={styles.desc}>
              Take the quiz, review your results, and focus on areas that need more attention.
            </p>
          </div>
        </div>
      </section>
      
      <footer className={styles.footer}>
        <p>© 2025 TestMe. All rights reserved.</p>
      </footer>
    </div>
  );
}
