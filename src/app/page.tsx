"use client";
import styles from "./page.module.scss";
import Link from "next/link";
import Header from "./components/Header";

const features = [
  {
    icon: "🎥",
    title: "YouTube Quiz",
    desc: "Paste a YouTube link and generate questions from the transcript."
  },
  {
    icon: "📄",
    title: "PDF Quiz",
    desc: "Upload a PDF (up to 5 pages) and get instant questions."
  },
  {
    icon: "🖼️",
    title: "Image Quiz",
    desc: "Upload an image, extract text, and quiz yourself."
  },
  {
    icon: "✍️",
    title: "Custom Text Quiz",
    desc: "Type or paste any text and generate a quiz."
  },
  {
    icon: "🔗",
    title: "Shareable Quizzes",
    desc: "Share your quiz with a unique link."
  },
  {
    icon: "⚡",
    title: "Fast & Responsive",
    desc: "Beautiful, mobile-first design with smooth animations."
  }
];

const steps = [
  {
    icon: "🔑",
    title: "Sign in",
    desc: "Login securely with Google to get started."
  },
  {
    icon: "📝",
    title: "Choose Source",
    desc: "Select YouTube, PDF, image, or enter your own text."
  },
  {
    icon: "🎯",
    title: "Configure Quiz",
    desc: "Set number of questions, difficulty, and skip options."
  },
  {
    icon: "🚀",
    title: "Take Quiz",
    desc: "Answer questions one by one with smooth transitions."
  },
  {
    icon: "🏆",
    title: "See Results",
    desc: "Get your score, explanations, and share your results."
  }
];

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
          Generate quizzes from YouTube videos, PDFs, images, or your own text.
          <br />Test yourself smarter with AI-powered questions.
        </p>
        
        <Link href="/login" className={styles.ctaButton}>
          Get Started For Free
        </Link>
        
        {/* <div className={styles.featuredOn}>
          <span>Featured on</span>
          <div className={styles.logos}>
            <div className={styles.logo}>Product Hunt</div>
            <div className={styles.logo}>Hacker News</div>
            <div className={styles.logo}>GitHub</div>
          </div>
        </div> */}
      </div>

      <section id="features" className={styles.features}>
        <h2>Features</h2>
        <div className={styles.featureGrid}>
          {features.map((f, i) => (
            <div className={styles.featureCard} key={i}>
              <span className={styles.icon}>{f.icon}</span>
              <span className={styles.title}>{f.title}</span>
              <span className={styles.desc}>{f.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className={styles.how}>
        <h2>How it works</h2>
        <div className={styles.steps}>
          {steps.map((s, i) => (
            <div className={styles.step} key={i}>
              <span className={styles.icon}>{s.icon}</span>
              <span className={styles.title}>{s.title}</span>
              <span className={styles.desc}>{s.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} TestMe. All rights reserved.</span>
      </footer>
    </div>
  );
}
