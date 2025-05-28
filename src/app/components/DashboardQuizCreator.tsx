"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import styles from "./ConversationalQuizCreator.module.scss";
import LoadingOverlay from './LoadingOverlay';

type QuizType = "youtube" | "pdf" | "text" | "image";
type QuizSize = "quick" | "standard" | "deep" | "expert";

interface QuestionTypesConfig {
  multipleChoice: boolean;
  trueFalse: boolean;
}

function containsMeaningfulText(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  
  const alphanumericCount = (text.match(/[a-zA-Z0-9]/g) || []).length;
  const textLength = text.trim().length;
  
  if (alphanumericCount / textLength < 0.1) return false;
  
  const repeatedPatterns = [
    /^(.)\1{10,}$/,
    /^(..+)\1{5,}$/,
    /^[\d\s+\-*/=.,!?;:]+$/
  ];
  
  for (const pattern of repeatedPatterns) {
    if (pattern.test(text.trim())) return false;
  }
  
  return true;
}

interface DashboardQuizCreatorProps {
  initialType?: QuizType;
}

const DashboardQuizCreator = ({ initialType }: DashboardQuizCreatorProps) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState<"type" | "input" | "config" | "analysis" | "creating" | "success">(initialType ? "input" : "type");
  const [quizType, setQuizType] = useState<QuizType>(initialType || "youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createdQuizId, setCreatedQuizId] = useState("");
  const [quizShareUrl, setQuizShareUrl] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [includeTypes, setIncludeTypes] = useState<QuestionTypesConfig>({
    multipleChoice: true,
    trueFalse: true
  });
  const [knowledgeGaps, setKnowledgeGaps] = useState<string[]>([]);
  const [keyTopics, setKeyTopics] = useState<string[]>([]);
  const [extractedContent, setExtractedContent] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedQuizSize, setSelectedQuizSize] = useState<QuizSize>("standard");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const shareUrlRef = useRef<HTMLInputElement>(null);
  const imageFileRef = useRef<File | null>(null);

  const handleTypeSelect = (type: QuizType) => {
    setQuizType(type);
    setStep("input");
    setError("");
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
      if (initialType) {
        router.back(); // Go back to dashboard if we came with a specific type
      } else {
        setStep("type");
        setQuizType("youtube");
      }
    } else if (step === "config") {
      setStep("input");
    } else if (step === "analysis") {
      setStep("config");
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
    if (quizType === "text") {
      if (!textContent || textContent.length < 50) {
        setError("Please enter at least 50 characters");
        return false;
      }
      if (!containsMeaningfulText(textContent)) {
        setError("Your text doesn't appear to contain meaningful content. Please enter valid text with actual words, not just symbols or repeated characters.");
        return false;
      }
    }
    if (quizType === "image" && !imageFile) {
      setError("Please upload an image");
      return false;
    }
    return true;
  };

  const handleProceed = () => {
    if (validateInput()) {
      setStep("config");
      setError("");
    }
  };

  const handleSizeSelect = (size: QuizSize) => {
    if (!includeTypes.multipleChoice && !includeTypes.trueFalse) {
      setError("Please select at least one question type.");
      return;
    }

    setSelectedQuizSize(size);
    setStep("analysis");
    setIsAnalyzing(true);
    
    setTimeout(() => {
      analyzeContent(size).catch(err => {
        console.error("Content analysis error:", err);
        setError(err instanceof Error ? err.message : "Failed to analyze content");
        setIsAnalyzing(false);
        setStep("config");
      });
    }, 100);
  };

  const getYoutubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const analyzeContent = async (selectedSize: QuizSize) => {
    try {
      let analysisResponse;
      
      if (quizType === "youtube") {
        const videoId = getYoutubeVideoId(youtubeUrl);
        analysisResponse = await fetch('/api/content/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'youtube',
            videoId: videoId,
            difficulty: getDifficulty(selectedSize)
          })
        });
      } else if (quizType === "text") {
        analysisResponse = await fetch('/api/content/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'text',
            content: textContent,
            difficulty: getDifficulty(selectedSize)
          })
        });
      } else if (quizType === "pdf" && pdfFile) {
        const formData = new FormData();
        formData.append('file', pdfFile);
        formData.append('type', 'pdf');
        formData.append('difficulty', getDifficulty(selectedSize));
        
        analysisResponse = await fetch('/api/content/analyze', {
          method: 'POST',
          body: formData
        });
      } else if (quizType === "image" && imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('type', 'image');
        formData.append('difficulty', getDifficulty(selectedSize));
        
        analysisResponse = await fetch('/api/content/analyze', {
          method: 'POST',
          body: formData
        });
      }

      if (!analysisResponse?.ok) {
        const errorData = await analysisResponse?.json();
        throw new Error(errorData?.error || 'Failed to analyze content');
      }

      const analysisData = await analysisResponse.json();
      setKnowledgeGaps(analysisData.knowledgeGaps || []);
      setKeyTopics(analysisData.keyTopics || []);
      setExtractedContent(analysisData.extractedContent || '');
      setIsAnalyzing(false);
    } catch (error) {
      console.error('Content analysis error:', error);
      setIsAnalyzing(false);
      throw error;
    }
  };

  const createQuiz = async (selectedSize: QuizSize) => {
    setIsCreating(true);
    setStep("creating");
    setError("");
    
    try {
      const userId = session?.user?.email || 'anonymous';
      const questionCount = getQuestionCount(selectedSize);
      const difficulty = getDifficulty(selectedSize);
      
      if (quizType === "youtube") {
        if (!youtubeUrl) {
          setError("Please enter a YouTube video URL");
          setIsCreating(false);
          setStep("input");
          return;
        }

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
            extractedContent,
            questionCount,
            difficulty,
            createdBy: userId,
            includeTypes
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create quiz');
        }
        
        const data = await response.json();
        setCreatedQuizId(data._id);
        setQuizShareUrl(`${window.location.origin}/quiz/${data._id}`);
        setIsCreating(false);
        setStep("success");
        
        setTimeout(() => {
          const successContainer = document.querySelector(`.${styles.successContainer}`);
          if (successContainer) {
            successContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 100);
      } 
      else if (quizType === "pdf" && pdfFile) {
        const formData = new FormData();
        formData.append('file', pdfFile);
        
        const url = new URL('/api/pdf/generate-quiz', window.location.origin);
        url.searchParams.append('numQuestions', questionCount.toString());
        url.searchParams.append('difficulty', difficulty);
        url.searchParams.append('createdBy', userId);
        url.searchParams.append('includeMultipleChoice', includeTypes.multipleChoice.toString());
        url.searchParams.append('includeTrueFalse', includeTypes.trueFalse.toString());
        
        const response = await fetch(url.toString(), {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create quiz');
        }
        
        setCreatedQuizId(data.quiz.id);
        setQuizShareUrl(`${window.location.origin}/quiz/${data.quiz.id}`);
        setIsCreating(false);
        setStep("success");
        
        setTimeout(() => {
          const successContainer = document.querySelector(`.${styles.successContainer}`);
          if (successContainer) {
            successContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 100);
      }
      else if (quizType === "text") {
        const response = await fetch('/api/text/generate-quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            textContent: extractedContent || textContent,
            numQuestions: questionCount,
            difficulty,
            createdBy: userId,
            includeTypes
          })
        });
        
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create quiz');
        }
        
        setCreatedQuizId(data.quiz.id);
        setQuizShareUrl(`${window.location.origin}/quiz/${data.quiz.id}`);
        setIsCreating(false);
        setStep("success");
        
        setTimeout(() => {
          const successContainer = document.querySelector(`.${styles.successContainer}`);
          if (successContainer) {
            successContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 100);
      }
      else if (quizType === "image" && (imageFileRef.current || imageFile)) {
        const fileToUse = imageFileRef.current || imageFile;
        if (!fileToUse) {
          throw new Error('No image file available for quiz creation');
        }
        const formData = new FormData();
        formData.append('file', fileToUse);
        const url = new URL('/api/image/generate-quiz', window.location.origin);
        url.searchParams.append('numQuestions', questionCount.toString());
        url.searchParams.append('difficulty', difficulty);
        url.searchParams.append('createdBy', userId);
        url.searchParams.append('includeMultipleChoice', includeTypes.multipleChoice.toString());
        url.searchParams.append('includeTrueFalse', includeTypes.trueFalse.toString());
        const response = await fetch(url.toString(), {
          method: 'POST',
          body: formData
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create quiz from image');
        }
        setCreatedQuizId(data.quiz.id);
        setQuizShareUrl(`${window.location.origin}/quiz/${data.quiz.id}`);
        setIsCreating(false);
        setStep("success");
        setTimeout(() => {
          const successContainer = document.querySelector(`.${styles.successContainer}`);
          if (successContainer) {
            successContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 100);
      }
    } catch (err) {
      console.error('Error creating quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to create quiz');
      setStep("config");
      setIsCreating(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 20 * 1024 * 1024) {
        setError("Image must be less than 20MB");
        return;
      }
      setImageFile(file);
      imageFileRef.current = file;
      setError("");
    } else {
      setError("Please upload a valid image file");
    }
  };

  const handleCopyShareLink = () => {
    if (shareUrlRef.current) {
      shareUrlRef.current.select();
      document.execCommand('copy');
      setIsCopied(true);
      
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

  return (
    <div className={styles.container}>
      {/* Type selection */}
      {step === "type" && (
        <div className={styles.quizTypes}>
          <h2 className={styles.prompt}>Create a New Quiz</h2>
          <p className={styles.subPrompt}>Choose your content source and get AI-powered knowledge gap analysis</p>
          
          <div className={styles.optionsGrid}>
            <button
              className={styles.optionCard}
              onClick={() => handleTypeSelect("youtube")}
            >
              <span className={styles.optionIcon}>🎥</span>
              <h3>YouTube Video</h3>
              <p>Generate questions from a YouTube video with AI gap analysis</p>
            </button>
            
            <button
              className={styles.optionCard}
              onClick={() => handleTypeSelect("pdf")}
            >
              <span className={styles.optionIcon}>📄</span>
              <h3>PDF Document</h3>
              <p>Upload a PDF and get personalized knowledge gap insights</p>
            </button>
            
            <button
              className={styles.optionCard}
              onClick={() => handleTypeSelect("text")}
            >
              <span className={styles.optionIcon}>✍️</span>
              <h3>Text Content</h3>
              <p>Enter text and discover your learning gaps with AI analysis</p>
            </button>
            
            <button
              className={styles.optionCard}
              onClick={() => handleTypeSelect("image")}
            >
              <span className={styles.optionIcon}>🖼️</span>
              <h3>Image</h3>
              <p>Extract text from images with smart knowledge gap detection</p>
            </button>
          </div>
        </div>
      )}

      {/* Input step */}
      {step === "input" && (
        <div className={styles.inputContainer}>
          {!initialType && (
            <button className={styles.backButton} onClick={handleBack}>
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
          )}
          
          {quizType === "youtube" && (
            <div className={styles.inputGroup}>
              <h2>Enter YouTube Video URL</h2>
              <p className={styles.inputDescription}>
                We&apos;ll analyze the video&apos;s content and identify knowledge gaps before creating your quiz.
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
              <h2>Upload PDF Document</h2>
              <p className={styles.inputDescription}>
                We&apos;ll extract the content and provide AI-powered knowledge gap analysis.
              </p>
              <div className={styles.fileUploadArea} onClick={() => fileInputRef.current?.click()}>
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
                      <span className={styles.uploadText}>
                        Drag & drop your PDF here or click to browse
                        <br />
                        <span className={styles.fileLimits}>(20MB max)</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {quizType === "text" && (
            <div className={styles.inputGroup}>
              <h2>Enter Text Content</h2>
              <p className={styles.inputDescription}>
                Paste any text and get AI-powered analysis of your knowledge gaps.
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
          
          {quizType === "image" && (
            <div className={styles.inputGroup}>
              <h2>Upload Image with Text</h2>
              <p className={styles.inputDescription}>
                Upload an image containing text and get intelligent knowledge gap analysis.
              </p>
              <input
                type="file"
                ref={imageInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <div
                className={styles.uploadContainer}
                onClick={() => imageInputRef.current?.click()}
              >
                {imageFile ? (
                  <div className={styles.selectedFile}>
                    <span className={styles.fileIcon}>📷</span>
                    <span className={styles.fileName}>{imageFile.name}</span>
                    <div style={{ width: '100%', textAlign: 'center', maxWidth: '300px' }}>
                      <Image 
                        src={URL.createObjectURL(imageFile)} 
                        alt="Preview" 
                        className={styles.imagePreview}
                        width={300}
                        height={200}
                        unoptimized
                        style={{ objectFit: 'contain' }}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <svg className={styles.uploadIcon} width="40" height="40" viewBox="0 0 24 24">
                      <path d="M7 16a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M20 16.44V6a2 2 0 00-2-2H6a2 2 0 00-2 2v10.44a2 2 0 00.89 1.66l6 4a2 2 0 002.22 0l6-4a2 2 0 00.89-1.66z" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span className={styles.uploadText}>
                      Drag & drop your image here or click to browse
                      <br />
                      <span className={styles.fileLimits}>(20MB max, JPG/PNG/GIF/WEBP supported)</span>
                    </span>
                  </>
                )}
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

      {/* Config step */}
      {step === "config" && (
        <div className={styles.configContainer}>
          <button className={styles.backButton} onClick={handleBack}>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>
          
          <h2>Quiz Configuration</h2>
          
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
                />
                <span>Multiple Choice</span>
              </label>
              <label className={styles.checkboxLabel}>
                <input 
                  type="checkbox" 
                  checked={includeTypes.trueFalse} 
                  onChange={() => setIncludeTypes({...includeTypes, trueFalse: !includeTypes.trueFalse})}
                />
                <span>True/False</span>
              </label>
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
            
            <button
              className={styles.sizeOption}
              onClick={() => handleSizeSelect("deep")}
            >
              <h3>Deep Dive</h3>
              <p>15 questions, more challenging</p>
              <span className={styles.timeEstimate}>~15 minutes</span>
            </button>
            
            <button
              className={styles.sizeOption}
              onClick={() => handleSizeSelect("expert")}
            >
              <h3>Expert Level</h3>
              <p>20 questions, advanced concepts</p>
              <span className={styles.timeEstimate}>~25 minutes</span>
            </button>
          </div>
          
          {error && <div className={styles.errorMessage}>{error}</div>}
        </div>
      )}

      {/* Analysis step */}
      {step === "analysis" && (
        <div className={styles.analysisContainer}>
          <button className={styles.backButton} onClick={handleBack}>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>
          
          {isAnalyzing ? (
            <div className={styles.analyzingContent}>
              <div className={styles.analyzingIcon}>🧠</div>
              <h2>AI is Analyzing Your Content...</h2>
              <p>
                Our AI is reading through your {quizType === "youtube" ? "video transcript" : 
                  quizType === "pdf" ? "PDF document" : 
                  quizType === "image" ? "image content" : "text"}, to identify:
              </p>
              <ul className={styles.analyzingList}>
                <li>📚 Key topics and concepts you need to learn</li>
                <li>🎯 Specific knowledge gaps where you might struggle</li>
                <li>💡 Areas that would benefit from targeted practice</li>
              </ul>
              <div className={styles.loadingDots}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          ) : (
            <div className={styles.analysisResults}>
              <div className={styles.analysisHeader}>
                <h2>🎯 AI Analysis Complete!</h2>
                <p>Based on your {quizType === "youtube" ? "video content" : 
                  quizType === "pdf" ? "PDF document" : 
                  quizType === "image" ? "image" : "text"}, here&apos;s what our AI discovered:</p>
              </div>
              
              <div className={styles.analysisSection}>
                <h3>📚 Key Topics Covered</h3>
                <p className={styles.sectionDescription}>Main concepts and learning areas identified in your content:</p>
                <div className={styles.topicsGrid}>
                  {keyTopics.map((topic, index) => (
                    <div key={index} className={styles.topicCard}>
                      <span className={styles.topicNumber}>{index + 1}</span>
                      <span className={styles.topicText}>{topic}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.analysisSection}>
                <h3>🎯 Knowledge Gaps Identified</h3>
                <p className={styles.sectionDescription}>Areas where students typically need extra practice and focus:</p>
                <div className={styles.gapsGrid}>
                  {knowledgeGaps.map((gap, index) => (
                    <div key={index} className={styles.gapCard}>
                      <span className={styles.gapIcon}>⚠️</span>
                      <span className={styles.gapText}>{gap}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.proceedSection}>
                <div className={styles.proceedInfo}>
                  <h4>🚀 Ready to Create Your Personalized Quiz?</h4>
                  <p>Your quiz will focus on these knowledge gaps to maximize your learning efficiency!</p>
                </div>
                <button 
                  className={styles.proceedButton}
                  onClick={() => createQuiz(selectedQuizSize)}
                >
                  Generate My Targeted Quiz
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Loading overlay */}
      {step === "creating" && isCreating && (
        <LoadingOverlay contentType={quizType} />
      )}
      
      {/* Success page */}
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
            <button 
              className={styles.secondaryButton} 
              onClick={() => router.push('/dashboard')}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardQuizCreator; 