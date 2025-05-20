/**
 * @author: Nas Abdulrasaq(nosisky@gmail.com)
 * Email: nosisky@gmail.com
 * Github: https://github.com/nosisky
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from './QuizCreatorLanding.module.scss';

type QuizSource = 'youtube' | 'pdf' | 'text' | 'image';

const QuizCreatorLanding = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<QuizSource>("youtube");
  const [isExpanded, setIsExpanded] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const handleTabChange = (tab: QuizSource) => {
    setActiveTab(tab);
    setError("");
    setIsExpanded(true);
    setShowLoginPrompt(false);
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleSubmit = async () => {
    setError("");
    
    // Common validation based on active tab
    if (activeTab === "youtube" && !youtubeUrl) {
      setError("Please enter a valid YouTube URL");
      return;
    } else if (activeTab === "pdf" && !pdfFile) {
      setError("Please upload a PDF file");
      return;
    } else if (activeTab === "text" && (!textContent || textContent.length < 100)) {
      setError("Please enter at least 100 characters");
      return;
    } else if (activeTab === "image") {
      setError("Image quizzes coming soon!");
      return;
    }
    
    // If user is not logged in, show login prompt
    if (!session) {
      setShowLoginPrompt(true);
      return;
    }
    
    // Handle navigation based on quiz type
    switch (activeTab) {
      case "youtube":
        router.push(`/dashboard/create/youtube?url=${encodeURIComponent(youtubeUrl)}`);
        break;
      case "pdf":
        router.push("/dashboard/create/pdf");
        break;
      case "text":
        router.push(`/dashboard/create/text?content=${encodeURIComponent(textContent)}`);
        break;
    }
  };

  const handleContinueWithoutLogin = () => {
    switch (activeTab) {
      case "youtube":
        router.push(`/dashboard/create/youtube?url=${encodeURIComponent(youtubeUrl)}`);
        break;
      case "pdf":
        router.push("/dashboard/create/pdf");
        break;
      case "text":
        router.push(`/dashboard/create/text?content=${encodeURIComponent(textContent)}`);
        break;
    }
  };

  const handleLogin = () => {
    router.push(`/login?redirect=/dashboard/create/${activeTab}`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      if (file.size > 20 * 1024 * 1024) {
        setError("PDF must be less than 20MB");
        return;
      }
      setPdfFile(file);
      setError("");
    } else {
      setError("Please upload a valid PDF file");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.tabsContainer}>
        <button 
          className={`${styles.tab} ${activeTab === "youtube" ? styles.active : ""}`}
          onClick={() => handleTabChange("youtube")}
        >
          <span className={styles.icon}>🎥</span>
          <span className={styles.tabLabel}>YouTube</span>
        </button>
        
        <button 
          className={`${styles.tab} ${activeTab === "pdf" ? styles.active : ""}`}
          onClick={() => handleTabChange("pdf")}
        >
          <span className={styles.icon}>📄</span>
          <span className={styles.tabLabel}>PDF</span>
        </button>
        
        <button 
          className={`${styles.tab} ${activeTab === "text" ? styles.active : ""}`}
          onClick={() => handleTabChange("text")}
        >
          <span className={styles.icon}>✍️</span>
          <span className={styles.tabLabel}>Text</span>
        </button>
        
        <button 
          className={`${styles.tab} ${activeTab === "image" ? styles.active : ""} ${styles.disabled}`}
          onClick={() => handleTabChange("image")}
        >
          <span className={styles.icon}>🖼️</span>
          <span className={styles.tabLabel}>Image</span>
          <span className={styles.comingSoonBadge}>Coming Soon</span>
        </button>
      </div>
      
      <div className={`${styles.contentContainer} ${isExpanded ? styles.expanded : ""}`}>
        <div className={styles.contentInner}>
          {activeTab === "youtube" && (
            <div className={styles.inputGroup}>
              <label htmlFor="youtube-url">YouTube Video URL</label>
              <input
                id="youtube-url"
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />
              <p className={styles.hint}>
                Paste any educational YouTube video URL and we&apos;ll generate quiz questions from its content
              </p>
            </div>
          )}
          
          {activeTab === "pdf" && (
            <div className={styles.inputGroup}>
              <label htmlFor="pdf-upload">Upload PDF (20MB max)</label>
              <div className={styles.fileUpload}>
                <input
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className={styles.fileInput}
                />
                <button className={styles.uploadButton}>
                  {pdfFile ? pdfFile.name : "Select PDF"}
                </button>
              </div>
              <p className={styles.hint}>
                Upload your study materials, articles, or research papers
              </p>
            </div>
          )}
          
          {activeTab === "text" && (
            <div className={styles.inputGroup}>
              <label htmlFor="text-content">Enter text (min 100 characters)</label>
              <textarea
                id="text-content"
                placeholder="Paste or type your content here..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={5}
              ></textarea>
              <div className={styles.characterCount}>
                {textContent.length}/100 characters
              </div>
              <p className={styles.hint}>
                Paste any text and we&apos;ll generate quiz questions to test your knowledge
              </p>
            </div>
          )}
          
          {activeTab === "image" && (
            <div className={styles.comingSoonMessage}>
              <div className={styles.comingSoonIcon}>🔜</div>
              <h3>Image Quiz Creator Coming Soon!</h3>
              <p>Upload images and generate quizzes from their content.</p>
              <p>Be the first to know when it&apos;s ready:</p>
              <input 
                type="email" 
                placeholder="Your email address"
                className={styles.emailInput}
              />
              <button className={styles.notifyButton}>Notify Me</button>
            </div>
          )}
          
          {error && <div className={styles.error}>{error}</div>}
          
          {showLoginPrompt ? (
            <div className={styles.loginPrompt}>
              <h3>Create an account to save your progress</h3>
              <p>Get personalized feedback, track your improvement, and access your quizzes anytime.</p>
              <div className={styles.loginActions}>
                <button onClick={handleLogin} className={styles.loginButton}>Sign In</button>
                <button onClick={handleContinueWithoutLogin} className={styles.continueButton}>
                  Continue Without Signing In
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.actions}>
              <button 
                className={styles.createButton}
                onClick={handleSubmit}
                disabled={activeTab === "image"}
              >
                Create Quiz
              </button>
            </div>
          )}
        </div>
      </div>
      
      <button 
        className={`${styles.expandToggle} ${isExpanded ? styles.expanded : ""}`} 
        onClick={handleToggleExpand}
        aria-label={isExpanded ? "Collapse" : "Expand"}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
};

export default QuizCreatorLanding; 