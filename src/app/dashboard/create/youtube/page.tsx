"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import Header from "../../../components/Header";
import SocialShareButtons from "@/app/components/SocialShareButtons";
import RangeSlider from "@/app/components/RangeSlider";
import styles from "./youtubeQuiz.module.scss";
import { handleApiResponse } from "@/lib/api-utils";

export default function YoutubeQuizCreator() {
  const { status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoInfo, setVideoInfo] = useState<{title?: string, thumbnail?: string}>({});
  const [quizParams, setQuizParams] = useState({
    numQuestions: 5,
    difficulty: "medium",
    allowSkipping: true
  });
  const [generatedQuizId, setGeneratedQuizId] = useState<string | null>(null);
  const [showPostGenerationPrompt, setShowPostGenerationPrompt] = useState(false);
  const [shareableLink, setShareableLink] = useState("");
  const [copyStatusMessage, setCopyStatusMessage] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Function to check if URL is a valid YouTube URL
  const isValidYoutubeUrl = (url: string) => {
    const regex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+/;
    return regex.test(url);
  };

  // Function to extract video ID from YouTube URL
  const getVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Function to handle URL input change and fetch video metadata
  const handleUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setVideoUrl(url);
    setError("");
    setVideoInfo({});
    
    if (isValidYoutubeUrl(url)) {
      const videoId = getVideoId(url);
      if (videoId) {
        try {
          const response = await fetch(`/api/youtube/video?videoId=${videoId}`);
          const data = await handleApiResponse<{title: string, thumbnail: string}>(response);
          
          setVideoInfo({
            title: data.title, 
            thumbnail: data.thumbnail
          });
        } catch (error) {
          setError(error instanceof Error ? error.message : "Failed to fetch video information");
        }
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidYoutubeUrl(videoUrl)) {
      setError("Please enter a valid YouTube URL");
      return;
    }
    
    const videoId = getVideoId(videoUrl);
    if (!videoId) {
      setError("Could not extract video ID from URL");
      return;
    }
    
    setIsLoading(true);
    setError("");
    setGeneratedQuizId(null);
    setShowPostGenerationPrompt(false);
    setShareableLink("");
    
    try {
      // Call the API to generate a quiz
      const response = await fetch('/api/youtube/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId,
          numQuestions: quizParams.numQuestions,
          difficulty: quizParams.difficulty,
        }),
      });
      
      const data = await handleApiResponse<{quiz: {id: string}}>(
        response, 
        "Quiz generated successfully!"
      );
      
      setGeneratedQuizId(data.quiz.id);
      setShareableLink(`${window.location.origin}/quiz/${data.quiz.id}/instructions`);
      setShowPostGenerationPrompt(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to generate quiz");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakeQuizNow = () => {
    if (generatedQuizId) {
      router.push(`/quiz/${generatedQuizId}`);
    }
  };

  const handleCopyShareableLink = () => {
    if (!shareableLink) return;
    navigator.clipboard.writeText(shareableLink).then(() => {
      setCopyStatusMessage('Link copied to clipboard!');
      setTimeout(() => setCopyStatusMessage(''), 3000); // Clear message after 3 seconds
    }).catch(err => {
      console.error('Failed to copy link: ', err);
      setCopyStatusMessage('Failed to copy link. Please try again.');
      setTimeout(() => setCopyStatusMessage(''), 3000);
    });
  };

  if (status === "loading") {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (showPostGenerationPrompt && generatedQuizId) {
    return (
      <div className={styles.youtubeQuizContainer}>
        <Header />
        <main className={`${styles.createQuizMain} ${styles.promptPageMain}`}>
          <div className={styles.promptContainer}>
            <svg className={styles.successIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="64px" height="64px"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 16.17l7.59-7.59L19 10l-9 9z"/></svg>
            <h2>Quiz Generated Successfully!</h2>
            <p className={styles.promptSubtitle}>Your new quiz is ready. What would you like to do next?</p>
            
            <div className={styles.promptActions}>
              <button onClick={handleTakeQuizNow} className={`${styles.button} ${styles.primaryButtonLarge}`}>
                Take Quiz Now
              </button>
              <button onClick={handleCopyShareableLink} className={`${styles.button} ${styles.secondaryButtonLarge}`}>
                Copy Shareable Link
              </button>
            </div>

            {copyStatusMessage && (
              <p className={`${styles.copyStatus} ${copyStatusMessage.includes('Failed') ? styles.errorText : styles.successText}`}>
                {copyStatusMessage}
              </p>
            )}

            {shareableLink && (
              <div className={styles.shareLinkContainer}>
                <p>Or share this link directly:</p>
                <div className={styles.shareLinkBox}>
                  <a href={shareableLink} target="_blank" rel="noopener noreferrer" className={styles.shareableLinkAnchor}>
                    {shareableLink}
                  </a>
                </div>
              </div>
            )}

            <SocialShareButtons 
              url={shareableLink}
              title={`Check out this quiz: ${videoInfo.title || 'YouTube Quiz'}`}
              description="I've just created a new quiz! Take it now and test your knowledge."
              hashtags={['quiz', 'testme', 'learning']}
            />

            <button 
              onClick={() => {
                router.push('/dashboard');
              }} 
              className={`${styles.button} ${styles.tertiaryButtonLarge} ${styles.createAnotherButton}`}>
              ← Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.youtubeQuizContainer}>
      <Header />
      
      <main className={styles.createQuizMain}>
        <div className={styles.breadcrumbs}>
          <button onClick={() => router.back()} className={styles.backButton}>
            ← Back
          </button>
          <span>Dashboard / Create Quiz / YouTube Video</span>
        </div>
        
        <h1>Create YouTube Video Quiz</h1>
        <p className={styles.pageDescription}>
          Enter a YouTube video URL, and we&apos;ll generate questions based on its content.
        </p>
        
        <form onSubmit={handleSubmit} className={styles.quizForm}>
          <div className={styles.formGroup}>
            <label htmlFor="videoUrl">YouTube Video URL</label>
            <input
              id="videoUrl"
              type="text"
              value={videoUrl}
              onChange={handleUrlChange}
              placeholder="https://www.youtube.com/watch?v=..."
              className={styles.urlInput}
              required
            />
            {error && <p className={styles.errorText}>{error}</p>}
          </div>
          
          {videoInfo.title && (
            <div className={styles.videoPreview}>
              <div className={styles.thumbnailContainer}>
                {videoInfo.thumbnail && (
                  <Image 
                    src={videoInfo.thumbnail} 
                    alt={videoInfo.title || 'Video thumbnail'} 
                    className={styles.thumbnail}
                    width={160}
                    height={90}
                  />
                )}
              </div>
              <div className={styles.videoDetails}>
                <h3>{videoInfo.title}</h3>
                <p>We&apos;ll analyze this video&apos;s content to create your quiz.</p>
              </div>
            </div>
          )}
          
          <div className={styles.quizOptions}>
            <h2>Quiz Options</h2>
            
            <div className={styles.formGroup}>
              <label htmlFor="numQuestions">Number of Questions</label>
              <div className={styles.rangeContainer}>
                <RangeSlider
                  min={3}
                  max={15}
                  value={quizParams.numQuestions}
                  onChange={value => setQuizParams({...quizParams, numQuestions: value as number})}
                  showLabels
                />
                <span className={styles.rangeValue}>{quizParams.numQuestions}</span>
              </div>
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="difficulty">Difficulty Level</label>
              <select
                id="difficulty"
                value={quizParams.difficulty}
                onChange={e => setQuizParams({...quizParams, difficulty: e.target.value})}
                className={styles.selectInput}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={quizParams.allowSkipping}
                  onChange={e => setQuizParams({...quizParams, allowSkipping: e.target.checked})}
                  className={styles.checkboxInput}
                />
                Allow skipping questions
              </label>
            </div>
          </div>
          
          <div className={styles.formActions}>
            <button 
              type="submit" 
              className={styles.generateButton}
              disabled={isLoading || !videoUrl}
            >
              {isLoading ? (
                <>
                  <div className={styles.buttonSpinner}></div>
                  Generating Quiz...
                </>
              ) : (
                'Generate Quiz'
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
} 