"use client";
import { useState, FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import Header from "../../../components/Header";
import RangeSlider from "@/app/components/RangeSlider";
import styles from "./youtubeQuiz.module.scss";
import { handleApiResponse } from "@/lib/api-utils";
import QuizGeneratedSuccess from '@/app/components/quiz/QuizGeneratedSuccess';
import LoadingOverlay from "@/app/components/LoadingOverlay";

export default function YoutubeQuizCreator() {
  const { status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoInfo, setVideoInfo] = useState<{title?: string, thumbnail?: string}>({});
  const [quizParams, setQuizParams] = useState({
    numQuestions: 5,
    difficulty: "medium"
  });
  const [generatedQuizId, setGeneratedQuizId] = useState<string | null>(null);
  const [showPostGenerationPrompt, setShowPostGenerationPrompt] = useState(false);
  const [shareableLink, setShareableLink] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Function to check if URL is a valid YouTube URL
  const isValidYoutubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    return youtubeRegex.test(url);
  };

  // Extract video ID from URL
  const getVideoId = (url: string) => {
    // Format: youtube.com/watch?v=VIDEO_ID
    const watchUrlMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/embed\/)([^&\?\/]+)/);
    return watchUrlMatch ? watchUrlMatch[1] : null;
  };

  // Handle form input changes
  const handleParamChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setQuizParams(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) : value
    }));
  };

  // Function to handle URL change and fetch video metadata
  const fetchVideoInfo = async (url: string) => {
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
  const handleSubmit = async (e: FormEvent) => {
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
      
      const data = await handleApiResponse<{_id: string}>(
        response, 
        "Quiz generated successfully!"
      );
      
      setGeneratedQuizId(data._id);
      setShareableLink(`${window.location.origin}/quiz/${data._id}/instructions`);
      setShowPostGenerationPrompt(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to generate quiz");
    } finally {
      setIsLoading(false);
    }
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
    <>
     <Header />
      <QuizGeneratedSuccess 
        generatedQuizId={generatedQuizId}
        shareableLink={shareableLink}
        sourceType="youtube"
      />
    </>
    );
  }

  return (
    <div className={styles.youtubeQuizContainer}>
      <Header />
      
      <main className={styles.createQuizMain}>
        <div className={styles.breadcrumbs}>
          <button onClick={() => router.back()} className={styles.backButton}>
            ← Back to Create Options
          </button>
          <span>Dashboard / Create Quiz / YouTube Video</span>
        </div>
        
        <h1>Create a Quiz from YouTube Video</h1>
        <p className={styles.pageDescription}>
          Enter a YouTube video URL and we&apos;ll analyze the transcript to generate quiz questions.
        </p>
        
        {error && <div className={styles.errorMessage}>{error}</div>}
        
        <form onSubmit={handleSubmit} className={styles.quizForm}>
          <div className={styles.formGroup}>
            <label htmlFor="videoUrl">YouTube Video URL</label>
            <input
              type="text"
              id="videoUrl"
              name="videoUrl"
              value={videoUrl}
              onChange={(e) => {
                setVideoUrl(e.target.value);
                setError("");
                if (e.target.value.trim()) {
                  fetchVideoInfo(e.target.value);
                } else {
                  setVideoInfo({});
                }
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              className={styles.urlInput}
              required
            />
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
                  max={20}
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
                name="difficulty"
                value={quizParams.difficulty}
                onChange={handleParamChange}
                className={styles.selectInput}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
          
          <div className={styles.buttonContainer}>
            <button 
              type="submit" 
              className={styles.generateButton}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className={styles.buttonSpinner}></div>
                  Generating...
                </>
              ) : (
                'Generate Quiz'
              )}
            </button>
          </div>
        </form>
      </main>

      {isLoading && <LoadingOverlay contentType="youtube" />}

    </div>
  );
} 