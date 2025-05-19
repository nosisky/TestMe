"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import styles from "./ConversationalQuizCreator.module.scss";

type QuizType = "youtube" | "pdf" | "text" | "image";
type QuizSize = "quick" | "standard" | "deep" | "expert";

// Add a type interface for question types
interface QuestionTypesConfig {
  multipleChoice: boolean;
  trueFalse: boolean;
}

// YouTube URL validation function
function validateYoutubeUrl(url: string): boolean {
  if (url) {
    const regExp = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
    if (url.match(regExp)) {
      return true;
    }
  }
  return false;
}

const ConversationalQuizCreator = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState<"type" | "input" | "config" | "creating" | "success">("type");
  const [quizType, setQuizType] = useState<QuizType>("youtube");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [createdQuizId, setCreatedQuizId] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [quizShareUrl, setQuizShareUrl] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [includeTypes, setIncludeTypes] = useState<QuestionTypesConfig>({
    multipleChoice: true,
    trueFalse: true
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const shareUrlRef = useRef<HTMLInputElement>(null);

  // Set initial mobile state and update on resize
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    
    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Skip if the click is on the trigger button (it has its own handler)
      if (triggerRef.current?.contains(event.target as Node)) {
        return;
      }
      
      // Close menu if click is outside menu area
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleTypeSelect = (type: QuizType) => {
    setQuizType(type);
    setStep("input");
    setIsMenuOpen(false);
    setError("");
  };

  const handleSizeSelect = (size: QuizSize) => {
    // Validate that at least one question type is selected
    if (!includeTypes.multipleChoice && !includeTypes.trueFalse) {
      setError("Please select at least one question type.");
      return;
    }
    
    setStep("creating");
    setIsCreating(true);
    createQuiz(size);
  };

  const getQuestionCount = (size: QuizSize) => {
    switch (size) {
      case "quick": return 5;
      case "standard": return 10;
      case "deep": return 15;
      case "expert": return 20;
      default: return 5;
    }
  };

  const getDifficulty = (size: QuizSize) => {
    switch (size) {
      case "quick": return "medium";
      case "standard": return "medium";
      case "deep": return "hard";
      case "expert": return "expert";
      default: return "medium";
    }
  };

  const handleBack = () => {
    if (step === "input") {
      setStep("type");
      setQuizType("youtube");
    } else if (step === "config") {
      setStep("input");
    }
  };

  const validateInput = () => {
    if (quizType === "youtube" && !youtubeUrl) {
      setError("Please enter a YouTube video URL");
      return false;
    }
    if (quizType === "pdf" && !pdfFile) {
      setError("Please upload a PDF file");
      return false;
    }
    if (quizType === "text" && (!textContent || textContent.length < 50)) {
      setError("Please enter at least 50 characters");
      return false;
    }
    if (quizType === "image") {
      setError("Image quizzes coming soon!");
      return false;
    }
    return true;
  };

  const detectContentType = () => {
    let detectedType: QuizType | null = null;
    
    // Check if URL is provided and it's a valid YouTube URL
    if (youtubeUrl.trim()) {
      if (validateYoutubeUrl(youtubeUrl)) {
        detectedType = "youtube";
      } 
      // Check if it's a lengthy text (more than 100 chars)
      else if (youtubeUrl.length > 100) {
        detectedType = "text";
        setTextContent(youtubeUrl);
      }
    }
    
    if (detectedType) {
      setQuizType(detectedType);
      setYoutubeUrl("");
      setStep("config");
      
      // Reset any previous errors
      setError("");
    } else {
      setError("We couldn't detect what type of content that is. Please try again or select a specific option.");
    }
  };

  const handleProceed = () => {
    if (validateInput()) {
      detectContentType(); // Auto-detect and set appropriate question types
      setStep("config");
      setError("");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      if (file.size > 5 * 1024 * 1024) {
        setError("PDF must be less than 5MB");
        return;
      }
      setPdfFile(file);
      setError("");
    } else {
      setError("Please upload a valid PDF file");
    }
  };

  const handlePdfButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const getYoutubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const createQuiz = async (selectedSize: QuizSize) => {
    try {
      setIsCreating(true);
      
      // Get the current user's ID if logged in
      const userId = session?.user?.email || 'anonymous';
      
      // Get the question count and difficulty once to ensure consistency
      const questionCount = getQuestionCount(selectedSize);
      const difficulty = getDifficulty(selectedSize);
      
      
      if (quizType === "youtube") {
        const videoId = getYoutubeVideoId(youtubeUrl);
        if (!videoId) {
          setError("Invalid YouTube URL");
          setIsCreating(false);
          setStep("config");
          return;
        }
        
        const response = await fetch('/api/youtube/generate-quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId,
            questionCount,
            difficulty,
            createdBy: userId, // Associate quiz with user
            includeTypes // The backend will handle math detection
          })
        });
        
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create quiz');
        }
        
        
        // Store the quiz ID
        setCreatedQuizId(data._id);
        setQuizShareUrl(`${window.location.origin}/quiz/${data._id}`);
        
        // If quiz was created but user isn't logged in, show login prompt
        if (!session) {
          setShowLoginPrompt(true);
          setIsCreating(false);
          return;
        }
        
        // If user is logged in, show success page or redirect
        setIsCreating(false);
        setStep("success");
      } 
      else if (quizType === "pdf" && pdfFile) {
        const formData = new FormData();
        formData.append('file', pdfFile);
        
        const url = new URL('/api/pdf/generate-quiz', window.location.origin);
        url.searchParams.append('numQuestions', questionCount.toString());
        url.searchParams.append('difficulty', difficulty);
        url.searchParams.append('createdBy', userId); // Associate quiz with user
        url.searchParams.append('includeMultipleChoice', includeTypes.multipleChoice.toString());
        url.searchParams.append('includeTrueFalse', includeTypes.trueFalse.toString());
        // The backend will auto-detect math content
        
        
        const response = await fetch(url.toString(), {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create quiz');
        }
        
        // Store the quiz ID
        setCreatedQuizId(data.quiz.id);
        setQuizShareUrl(`${window.location.origin}/quiz/${data.quiz.id}`);
        
        // If quiz was created but user isn't logged in, show login prompt
        if (!session) {
          setShowLoginPrompt(true);
          setIsCreating(false);
          return;
        }
        
        // If user is logged in, show success page or redirect
        setIsCreating(false);
        setStep("success");
      }
      else if (quizType === "text") {
        const response = await fetch('/api/text/generate-quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            textContent,
            numQuestions: questionCount,
            difficulty,
            createdBy: userId, // Associate quiz with user
            includeTypes // The backend will handle math detection
          })
        });
        
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create quiz');
        }
        
        // Store the quiz ID
        setCreatedQuizId(data.quiz.id);
        setQuizShareUrl(`${window.location.origin}/quiz/${data.quiz.id}`);
        
        // If quiz was created but user isn't logged in, show login prompt
        if (!session) {
          setShowLoginPrompt(true);
          setIsCreating(false);
          return;
        }
        
        // If user is logged in, show success page or redirect
        setIsCreating(false);
        setStep("success");
      }
    } catch (err) {
      console.error('Error creating quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to create quiz');
      setStep("config");
      setIsCreating(false);
    }
  };

  const handleContinueWithoutLogin = () => {
    // Simply hide the login prompt and redirect to the quiz
    setShowLoginPrompt(false);
    
    // Show success page with share option
    setStep("success");
  };

  const handleLogin = () => {
    // Redirect to login page
    router.push(`/login?redirect=/dashboard`);
  };

  // Toggle menu state explicitly
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleCopyShareLink = () => {
    if (shareUrlRef.current) {
      shareUrlRef.current.select();
      document.execCommand('copy');
      setIsCopied(true);
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    }
  };

  const handleTakeQuiz = () => {
    if (createdQuizId) {
      window.location.href = `/quiz/${createdQuizId}`;
    }
  };

  // Welcome section for mobile when dropdown is closed and step is "type"
  const MobileWelcomeSection = () => (
    <div className={styles.mobileWelcomeSection}>
      <div className={styles.welcomeIcon}>🧠</div>
      <h2>Ace Your Exams with Custom Quizzes</h2>
      <p>Transform any learning material into engaging quizzes in seconds. Proven to boost retention by 75% compared to passive reading.</p>
      
      <div className={styles.featuresList}>
        <div className={styles.featureItem}>
          <span className={styles.featureIcon}>⚡️</span>
          <span className={styles.featureText}>AI-powered questions from your exact content</span>
        </div>
        <div className={styles.featureItem}>
          <span className={styles.featureIcon}>📚</span>
          <span className={styles.featureText}>Perfect for students, teachers, and professionals</span>
        </div>
        <div className={styles.featureItem}>
          <span className={styles.featureIcon}>📈</span>
          <span className={styles.featureText}>Identify knowledge gaps in minutes, not hours</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      {/* Mobile dropdown and content area */}
      <div className={styles.mobileContainer}>
        <div className={styles.mobileDropdown}>
          <button 
            className={styles.dropdownTrigger} 
            onClick={toggleMenu}
            aria-expanded={isMenuOpen}
            ref={triggerRef}
          >
            {step === "type" ? (
              <>What are you studying today?</>
            ) : quizType === "youtube" ? (
              <>YouTube Video Quiz</>
            ) : quizType === "pdf" ? (
              <>PDF Document Quiz</>
            ) : quizType === "text" ? (
              <>Text Content Quiz</>
            ) : (
              <>Create a Quiz</>
            )}
            <svg 
              className={`${styles.arrowIcon} ${isMenuOpen ? styles.open : ''}`} 
              width="20" 
              height="20" 
              viewBox="0 0 24 24"
            >
              <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {/* Mobile menu */}
          {isMenuOpen && step === "type" && (
            <div className={styles.dropdownMenu} ref={menuRef}>
              <button
                className={styles.menuItem}
                onClick={() => handleTypeSelect("youtube")}
              >
                <span className={styles.menuIcon}>🎥</span>
                <div className={styles.menuContent}>
                  <span className={styles.menuTitle}>YouTube Video</span>
                  <span className={styles.menuDescription}>
                    Got a video lecture? Let&apos;s quiz you on it.
                  </span>
                </div>
              </button>
              
              <button
                className={styles.menuItem}
                onClick={() => handleTypeSelect("pdf")}
              >
                <span className={styles.menuIcon}>📄</span>
                <div className={styles.menuContent}>
                  <span className={styles.menuTitle}>PDF Document</span>
                  <span className={styles.menuDescription}>
                    Textbook or article? Turn it into a study session.
                  </span>
                </div>
              </button>
              
              <button
                className={styles.menuItem}
                onClick={() => handleTypeSelect("text")}
              >
                <span className={styles.menuIcon}>✍️</span>
                <div className={styles.menuContent}>
                  <span className={styles.menuTitle}>Text Content</span>
                  <span className={styles.menuDescription}>
                    Have some notes? Let&apos;s test what you know.
                  </span>
                </div>
              </button>
              
              <button
                className={`${styles.menuItem} ${styles.disabled}`}
              >
                <span className={styles.menuIcon}>🖼️</span>
                <div className={styles.menuContent}>
                  <span className={styles.menuTitle}>Image</span>
                  <span className={styles.menuDescription}>
                    Got a diagram or chart? We&apos;re working on it.
                  </span>
                </div>
                <span className={styles.comingSoon}>Coming Soon</span>
              </button>
            </div>
          )}
        </div>
        
        {/* Welcome section for mobile when step is "type" - always show */}
        {step === "type" && <MobileWelcomeSection />}
        
        {/* Mobile content area - only render when step is not "type" and not creating */}
        {step !== "type" && step !== "creating" && (
          <div className={styles.mobileContentArea}>
            {/* Content input step on mobile */}
            {step === "input" && (
              <div className={styles.inputContainer}>
                <button className={styles.backButton} onClick={handleBack}>
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Back
                </button>
                
                {quizType === "youtube" && (
                  <div className={styles.inputGroup}>
                    <h2>Paste your YouTube video link</h2>
                    <p className={styles.inputDescription}>
                      We&apos;ll analyze the video&apos;s content and generate quiz questions for you.
                    </p>
                    <input
                      type="text"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      className={styles.textInput}
                    />
                  </div>
                )}
                
                {quizType === "pdf" && (
                  <div className={styles.inputGroup}>
                    <h2>Upload your PDF document</h2>
                    <p className={styles.inputDescription}>
                      We&apos;ll extract the content and turn it into an interactive quiz.
                    </p>
                    <div className={styles.fileUploadArea} onClick={handlePdfButtonClick}>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileSelect}
                        ref={fileInputRef}
                        className={styles.hiddenFileInput}
                      />
                      <div className={styles.uploadPrompt}>
                        {pdfFile ? (
                          <div className={styles.selectedFile}>
                            <span className={styles.fileIcon}>📄</span>
                            <span className={styles.fileName}>{pdfFile.name}</span>
                          </div>
                        ) : (
                          <>
                            <svg className={styles.uploadIcon} width="32" height="32" viewBox="0 0 24 24">
                              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor" strokeWidth="2"/>
                              <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            <span>
                              Tap to browse files<br />
                              <span className={styles.fileLimits}>(5MB max)</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {quizType === "text" && (
                  <div className={styles.inputGroup}>
                    <h2>Enter your text content</h2>
                    <p className={styles.inputDescription}>
                      Paste any text – notes, articles, or book excerpts – and we&apos;ll create questions from it.
                    </p>
                    <textarea
                      placeholder="Paste or type your content here (minimum 50 characters)..."
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      className={styles.textareaInput}
                      rows={8}
                    ></textarea>
                    <div className={styles.charCount}>
                      {textContent.length}/50 characters minimum
                      {textContent.length >= 50 && " ✓"}
                    </div>
                  </div>
                )}
                
                {error && <div className={styles.errorMessage}>{error}</div>}
                
                <button
                  className={styles.nextButton}
                  onClick={handleProceed}
                  disabled={isCreating}
                >
                  Continue
                </button>
              </div>
            )}
            
            {/* Quiz configuration step for mobile */}
            {step === "config" && !isCreating && isMobile && (
              <div className={styles.mobileConfigContainer}>
                <button className={styles.backButton} onClick={handleBack}>
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Back
                </button>
                
                <h2>How would you like your quiz?</h2>
                
                {/* Mobile question types section */}
                <div className={styles.questionTypesSection}>
                  <h3>Question Types</h3>
                  <p className={styles.questionTypesDescription}>
                    Select the types of questions you want:
                  </p>
                  <div className={styles.mobileCheckboxGroup}>
                    <label className={styles.checkboxLabel}>
                      <input 
                        type="checkbox" 
                        checked={includeTypes.multipleChoice} 
                        onChange={() => setIncludeTypes({...includeTypes, multipleChoice: !includeTypes.multipleChoice})}
                        className={styles.checkbox}
                      />
                      <span>Multiple Choice</span>
                    </label>
                    <label className={styles.checkboxLabel}>
                      <input 
                        type="checkbox" 
                        checked={includeTypes.trueFalse} 
                        onChange={() => setIncludeTypes({...includeTypes, trueFalse: !includeTypes.trueFalse})}
                        className={styles.checkbox}
                      />
                      <span>True/False</span>
                    </label>
                    {/* Math questions are automatically added based on content analysis */}
                    <div className={styles.infoText}>
                      <span className={styles.infoIcon}>ℹ️</span>
                      <span>Mathematical questions will be added automatically when appropriate for the content</span>
                    </div>
                  </div>
                  {!includeTypes.multipleChoice && !includeTypes.trueFalse && (
                    <div className={styles.errorMessage}>Please select at least one question type</div>
                  )}
                </div>
                
                <div className={styles.mobileSizeOptions}>
                  <button
                    className={styles.mobileButton}
                    onClick={() => handleSizeSelect("quick")}
                  >
                    <h3>Quick Quiz (5 Questions)</h3>
                  </button>
                  
                  <button
                    className={`${styles.mobileButton} ${styles.primaryButton}`}
                    onClick={() => handleSizeSelect("standard")}
                  >
                    <h3>Standard Quiz (10 Questions)</h3>
                    <div className={styles.recommendedBadge}>Recommended</div>
                  </button>
                  
                  <button
                    className={`${styles.mobileButton} ${!session ? styles.premiumButton : ""}`}
                    onClick={() => handleSizeSelect("deep")}
                    disabled={!session}
                  >
                    <h3>Deep Dive (15 Questions)</h3>
                    {!session && (
                      <div className={styles.premiumBadge}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M19 11h-1V7a6 6 0 0 0-12 0v4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V12a1 1 0 0 0-1-1zm-11-4a4 4 0 0 1 8 0v4H8V7zm5 9a1 1 0 1 1-2 0v-2a1 1 0 1 1 2 0v2z" fill="currentColor"/>
                        </svg>
                      </div>
                    )}
                  </button>
                  
                  <button
                    className={`${styles.mobileButton} ${!session ? styles.premiumButton : ""}`}
                    onClick={() => handleSizeSelect("expert")}
                    disabled={!session}
                  >
                    <h3>Expert Level (20 Questions)</h3>
                    {!session && (
                      <div className={styles.premiumBadge}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M19 11h-1V7a6 6 0 0 0-12 0v4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V12a1 1 0 0 0-1-1zm-11-4a4 4 0 0 1 8 0v4H8V7zm5 9a1 1 0 1 1-2 0v-2a1 1 0 1 1 2 0v2z" fill="currentColor"/>
                        </svg>
                      </div>
                    )}
                  </button>
                </div>
                
                {error && <div className={styles.errorMessage}>{error}</div>}
              </div>
            )}
          </div>
        )}
        
        {/* Mobile creating state */}
        {step === "creating" && isCreating && isMobile && (
          <div className={styles.creatingContainer}>
            <div className={styles.loadingSpinner}></div>
            <h2>Creating your perfect quiz...</h2>
            <p>This typically takes about 15-30 seconds</p>
          </div>
        )}
      </div>
      
      {/* Desktop view */}
      <div className={styles.desktopView}>
        {step === "type" && (
          <div className={styles.quizTypes}>
            <h2 className={styles.prompt}>Ready to supercharge your learning?</h2>
            <p className={styles.subPrompt}>Our AI turns your content into powerful quizzes in seconds, not hours</p>
            
            <div className={styles.optionsGrid}>
              <button
                className={styles.optionCard}
                onClick={() => handleTypeSelect("youtube")}
              >
                <span className={styles.optionIcon}>🎥</span>
                <h3>YouTube Video</h3>
                <p>Master lecture content with targeted questions</p>
              </button>
              
              <button
                className={styles.optionCard}
                onClick={() => handleTypeSelect("pdf")}
              >
                <span className={styles.optionIcon}>📄</span>
                <h3>PDF Document</h3>
                <p>Extract and test key concepts from any document</p>
              </button>
              
              <button
                className={styles.optionCard}
                onClick={() => handleTypeSelect("text")}
              >
                <span className={styles.optionIcon}>✍️</span>
                <h3>Text Content</h3>
                <p>Convert notes or articles into instant quizzes</p>
              </button>
              
              <button
                className={`${styles.optionCard} ${styles.disabled}`}
              >
                <span className={styles.comingSoonBadge}>Coming Soon</span>
                <span className={styles.optionIcon}>🖼️</span>
                <h3>Image</h3>
                <p>Test yourself on diagrams and visual content</p>
              </button>
            </div>
          </div>
        )}
        
        {/* Desktop input step */}
        {step === "input" && (
          <div className={styles.inputContainer}>
            <button className={styles.backButton} onClick={handleBack}>
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
            
            {quizType === "youtube" && (
              <div className={styles.inputGroup}>
                <h2>Paste your YouTube video link</h2>
                <p className={styles.inputDescription}>
                  We&apos;ll analyze the video&apos;s content and generate quiz questions for you.
                </p>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className={styles.textInput}
                />
              </div>
            )}
            
            {quizType === "pdf" && (
              <div className={styles.inputGroup}>
                <h2>Upload your PDF document</h2>
                <p className={styles.inputDescription}>
                  We&apos;ll extract the content and turn it into an interactive quiz.
                </p>
                <div className={styles.fileUploadArea} onClick={handlePdfButtonClick}>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileSelect}
                    ref={fileInputRef}
                    className={styles.hiddenFileInput}
                  />
                  <div className={styles.uploadPrompt}>
                    {pdfFile ? (
                      <div className={styles.selectedFile}>
                        <span className={styles.fileIcon}>📄</span>
                        <span className={styles.fileName}>{pdfFile.name}</span>
                      </div>
                    ) : (
                      <>
                        <svg className={styles.uploadIcon} width="32" height="32" viewBox="0 0 24 24">
                          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor" strokeWidth="2"/>
                          <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <span>
                          Drag &amp; drop your PDF here or click to browse<br />
                          <span className={styles.fileLimits}>(5MB max)</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {quizType === "text" && (
              <div className={styles.inputGroup}>
                <h2>Enter your text content</h2>
                <p className={styles.inputDescription}>
                  Paste any text – notes, articles, or book excerpts – and we&apos;ll create questions from it.
                </p>
                <textarea
                  placeholder="Paste or type your content here (minimum 50 characters)..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  className={styles.textareaInput}
                  rows={8}
                ></textarea>
                <div className={styles.charCount}>
                  {textContent.length}/50 characters minimum
                  {textContent.length >= 50 && " ✓"}
                </div>
              </div>
            )}
            
            {error && <div className={styles.errorMessage}>{error}</div>}
            
            <button
              className={styles.nextButton}
              onClick={handleProceed}
              disabled={isCreating}
            >
              Continue
            </button>
          </div>
        )}
        
        {/* Desktop config step */}
        {step === "config" && !isCreating && (
          <div className={styles.configContainer}>
            <button className={styles.backButton} onClick={handleBack}>
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
            
            <h2>How would you like your quiz?</h2>
            
            {/* Add question types section */}
            <div className={styles.questionTypesSection}>
              <h3>Question Types</h3>
              <p className={styles.questionTypesDescription}>
                Select the types of questions you want in your quiz:
              </p>
              <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={includeTypes.multipleChoice} 
                    onChange={() => setIncludeTypes({...includeTypes, multipleChoice: !includeTypes.multipleChoice})}
                    className={styles.checkbox}
                  />
                  <span>Multiple Choice</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={includeTypes.trueFalse} 
                    onChange={() => setIncludeTypes({...includeTypes, trueFalse: !includeTypes.trueFalse})}
                    className={styles.checkbox}
                  />
                  <span>True/False</span>
                </label>
                {/* Math questions are automatically added based on content analysis */}
                <div className={styles.infoText}>
                  <span className={styles.infoIcon}>ℹ️</span>
                  <span>Mathematical questions will be added automatically when appropriate for the content</span>
                </div>
              </div>
              {!includeTypes.multipleChoice && !includeTypes.trueFalse && (
                <div className={styles.errorMessage}>Please select at least one question type</div>
              )}
            </div>
            
            <div className={styles.quizSizes}>
              <button
                className={styles.sizeOption}
                onClick={() => handleSizeSelect("quick")}
              >
                <h3>Quick Quiz</h3>
                <p>5 questions, mixed difficulty</p>
                <span className={styles.timeEstimate}>~5 minutes</span>
              </button>
              
              <button
                className={styles.sizeOption}
                onClick={() => handleSizeSelect("standard")}
              >
                <h3>Standard Quiz</h3>
                <p>10 questions, balanced difficulty</p>
                <span className={styles.timeEstimate}>~10 minutes</span>
                <div className={styles.recommended}>Recommended</div>
              </button>
              
              <div
                className={`${styles.sizeOption} ${!session ? styles.premiumOption : ""} ${!session ? styles.disabledOption : ""}`}
              >
                <h3>Deep Dive</h3>
                <p>15 questions, more challenging</p>
                <span className={styles.timeEstimate}>~15 minutes</span>
                {!session && (
                  <div className={styles.premiumBadge}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 11h-1V7a6 6 0 0 0-12 0v4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V12a1 1 0 0 0-1-1zm-11-4a4 4 0 0 1 8 0v4H8V7zm5 9a1 1 0 1 1-2 0v-2a1 1 0 1 1 2 0v2z" fill="currentColor"/>
                    </svg>
                  </div>
                )}
              </div>
              
              <div
                className={`${styles.sizeOption} ${!session ? styles.premiumOption : ""} ${!session ? styles.disabledOption : ""}`}
              >
                <h3>Expert Level</h3>
                <p>20 questions, advanced concepts</p>
                <span className={styles.timeEstimate}>~25 minutes</span>
                {!session && (
                  <div className={styles.premiumBadge}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 11h-1V7a6 6 0 0 0-12 0v4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V12a1 1 0 0 0-1-1zm-11-4a4 4 0 0 1 8 0v4H8V7zm5 9a1 1 0 1 1-2 0v-2a1 1 0 1 1 2 0v2z" fill="currentColor"/>
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Creating state - only show this outside of mobile/desktop containers when NOT on mobile */}
      {step === "creating" && isCreating && !isMobile && (
        <div className={styles.creatingContainer}>
          <div className={styles.loadingSpinner}></div>
          <h2>Creating your perfect quiz...</h2>
          <p>This typically takes about 15-30 seconds</p>
        </div>
      )}
      
      {/* Success page with share link */}
      {step === "success" && (
        <div className={styles.successContainer}>
          <div className={styles.successIcon}>✅</div>
          <h2>Your quiz is ready!</h2>
          <p>Your personalized quiz has been created successfully.</p>
          
          <div className={styles.shareSection}>
            <h3>Share your quiz with others</h3>
            <div className={styles.shareLinkContainer}>
              <input 
                type="text" 
                readOnly 
                value={quizShareUrl} 
                className={styles.shareInput}
                ref={shareUrlRef}
              />
              <button 
                onClick={handleCopyShareLink} 
                className={styles.copyButton}
              >
                {isCopied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>

          <div className={styles.successActions}>
            <button 
              className={styles.primaryButton} 
              onClick={handleTakeQuiz}
            >
              Take Quiz Now
            </button>
            {session && (
              <button 
                className={styles.secondaryButton} 
                onClick={() => router.push('/dashboard')}
              >
                Go to Dashboard
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Login prompt */}
      {showLoginPrompt && (
        <div className={styles.loginPromptOverlay}>
          <div className={styles.loginPrompt}>
            <h3>Your quiz is ready! 🎉</h3>
            <p>
              Create a free account to unlock the full TestMe experience:
            </p>
            <ul className={styles.featuresList}>
              <li>
                <span className={styles.featureIcon}>📊</span>
                <span>Track your progress and see how you improve over time</span>
              </li>
              <li>
                <span className={styles.featureIcon}>🔄</span>
                <span>Create unlimited quizzes from any learning material</span>
              </li>
              <li>
                <span className={styles.featureIcon}>📱</span>
                <span>Share custom quizzes with classmates or students</span>
              </li>
              <li>
                <span className={styles.featureIcon}>📈</span>
                <span>Get detailed analytics on your strongest and weakest areas</span>
              </li>
            </ul>
            <div className={styles.loginActions}>
              <button onClick={handleLogin} className={styles.loginButton}>
                Create Free Account
              </button>
              <button onClick={handleContinueWithoutLogin} className={styles.skipButton}>
                Just Take This Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationalQuizCreator; 