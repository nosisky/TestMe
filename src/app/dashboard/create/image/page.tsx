"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./image.module.scss";
import Header from "@/app/components/Header";
import { toast } from "react-hot-toast";
import Image from "next/image";
import { useSession } from "next-auth/react";
import LoadingOverlay from '@/app/components/LoadingOverlay';
import QuizGeneratedSuccess from '@/app/components/quiz/QuizGeneratedSuccess';

export default function CreateQuizFromImage() {
  const { status } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const router = useRouter();
  const [generatedQuizId, setGeneratedQuizId] = useState<string | null>(null);
  const [showPostGenerationPrompt, setShowPostGenerationPrompt] = useState(false);
  const [shareableLink, setShareableLink] = useState("");

  // File size limit in bytes (20MB)
  const MAX_FILE_SIZE = 20 * 1024 * 1024;

  // Check if device is mobile
  const checkIfMobile = () => {
    return window.innerWidth <= 768;
  };

  // Update mobile status on window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(checkIfMobile());
    };

    // Set initial value
    setIsMobile(checkIfMobile());
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Check camera availability on component mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      setCameraAvailable(true);
    }
    
    // Cleanup function to stop camera stream when component unmounts
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);
  
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      handleFileSelected(droppedFile);
    } else {
      setError("Please upload an image file.");
    }
  };
  
  const handleFileSelected = (selectedFile: File) => {
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File is too large. Maximum size is 20MB.`);
      return;
    }
    
    setFile(selectedFile);
    setFileUrl(URL.createObjectURL(selectedFile));
    setError(null);
  };
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported in this browser");
      }

      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" } // Use back camera if available
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError(`Camera error: ${err instanceof Error ? err.message : "Unknown error"}`);
      setShowCamera(false);
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
          setFile(file);
          setFileUrl(URL.createObjectURL(file));
          setShowCamera(false);
          
          // Stop camera stream
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };
  
  const handleCreateQuiz = async () => {
    if (!file) {
      setError("Please upload or capture an image first.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      // Create URL with query parameters for question types
      const url = new URL('/api/image/generate-quiz', window.location.origin);
      url.searchParams.append('includeMultipleChoice', 'true');
      url.searchParams.append('includeTrueFalse', 'true');
      
      const response = await fetch(url.toString(), {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate quiz");
      }
      
      const data = await response.json();
      
      setGeneratedQuizId(data.quiz.id);
      setShareableLink(`${window.location.origin}/quiz/${data.quiz.id}/instructions`);
      setShowPostGenerationPrompt(true);
      setIsLoading(false);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create quiz");
      toast.error("Failed to create quiz");
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
        sourceType="image"
      />
      </>
    );
  }
  
  return (
    <div className={styles.quizPageContainer}>
      <Header />
      <div className={styles.contentContainer}>
        <div className={styles.breadcrumbs}>
          <button onClick={() => router.back()} className={styles.backButton}>
            ← Back
          </button>
          <span className={styles.breadcrumbSeparator}>Dashboard / Create Quiz / Image</span>
        </div>
        
        <h1 className={styles.pageTitle}>Create a Quiz from Image</h1>
        <p className={styles.pageDescription}>
          Upload an image with text, and we&apos;ll extract the content to generate questions.
        </p>
        
        <div className={styles.contentArea}>
          {showCamera ? (
            <div className={styles.cameraContainer}>
              <video 
                ref={videoRef}
                autoPlay
                playsInline
                className={styles.cameraVideo}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              
              <div className={styles.cameraButtons}>
                <button 
                  className={styles.captureButton}
                  onClick={captureImage}
                >
                  Capture
                </button>
                <button 
                  className={styles.cancelButton}
                  onClick={stopCamera}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {isMobile ? (
                <div className={styles.imageSourceOptions}>
                  {cameraAvailable && (
                    <button 
                      className={styles.sourceButton}
                      onClick={startCamera}
                    >
                      <div className={styles.buttonIcon}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 17C14.2091 17 16 15.2091 16 13C16 10.7909 14.2091 9 12 9C9.79086 9 8 10.7909 8 13C8 15.2091 9.79086 17 12 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      Take a Photo
                    </button>
                  )}
                  
                  <button 
                    className={styles.sourceButton}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className={styles.buttonIcon}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M17 8L12 3L7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    Upload Image
                  </button>
                </div>
              ) : null}
              
              {fileUrl ? (
                <div className={styles.previewSection}>
                  <h3 className={styles.previewTitle}>Image Preview</h3>
                  <div className={styles.previewContainer}>
                    <Image 
                      src={fileUrl} 
                      alt="Selected image" 
                      className={styles.imagePreview}
                      fill
                      style={{ objectFit: 'contain' }}
                    />
                    <button 
                      className={styles.removeButton}
                      onClick={() => {
                        setFile(null);
                        setFileUrl(null);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {isMobile ? null : (
                    <div 
                      className={styles.uploadArea}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleFileDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className={styles.uploadIcon}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M4 16L8.586 11.414C8.96106 11.0391 9.46967 10.8284 10 10.8284C10.5303 10.8284 11.0389 11.0391 11.414 11.414L16 16M14 14L15.586 12.414C15.9611 12.0391 16.4697 11.8284 17 11.8284C17.5303 11.8284 18.0389 12.0391 18.414 12.414L20 14M14 8H14.01M6 20H18C18.5304 20 19.0391 19.7893 19.4142 19.4142C19.7893 19.0391 20 18.5304 20 18V6C20 5.46957 19.7893 4.96086 19.4142 4.58579C19.0391 4.21071 18.5304 4 18 4H6C5.46957 4 4.96086 4.21071 4.58579 4.58579C4.21071 4.96086 4 5.46957 4 6V18C4 18.5304 4.21071 19.0391 4.58579 19.4142C4.96086 19.7893 5.46957 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <p className={styles.uploadText}>
                        <span className={styles.desktop}>Drag & drop an image here, or click to browse</span>
                        <span className={styles.mobile}>Tap to upload an image</span>
                      </p>
                      <p className={styles.uploadHint}>Supports JPG, PNG, WEBP (max 20MB)</p>
                    </div>
                  )}
                </>
              )}
              
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileInputChange}
                accept="image/*"
                className={styles.fileInput}
              />
            </>
          )}
          
          {error && <div className={styles.errorMessage}>{error}</div>}
          
          <div className={styles.actionButtons}>
            <button 
              className={styles.cancelButton}
              onClick={() => router.back()}
            >
              Cancel
            </button>
            <button 
              className={styles.createButton}
              onClick={handleCreateQuiz}
              disabled={!file || isLoading}
            >
              {isLoading ? (
                <>
                  <div className={styles.spinner}></div>
                  Generating Quiz...
                </>
              ) : (
                "Create Quiz"
              )}
            </button>
          </div>
        </div>
      </div>
      
      {isLoading && <LoadingOverlay contentType="image" />}
    </div>
  );
} 