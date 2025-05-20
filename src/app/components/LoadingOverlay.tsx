"use client";

import { useState, useEffect } from "react";
import styles from "./LoadingOverlay.module.scss";

type LoadingStage = {
  progress: number;
  message: string;
  timing: number;
};

type LoadingOverlayProps = {
  contentType: "youtube" | "pdf" | "text" | "image";
};

/**
 * A reusable loading overlay component with animated progress bar
 */
export default function LoadingOverlay({ contentType }: LoadingOverlayProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing...');
  
  // Content type specific icons and messages
  const contentIcon = {
    youtube: "🎥",
    pdf: "📄",
    text: "✍️",
    image: "🖼️"
  }[contentType];
  
  const contentTypeMessage = {
    youtube: "Processing video content",
    pdf: "Processing your PDF",
    text: "Analyzing your text",
    image: "Analyzing your image"
  }[contentType];
  
  const contentTipMessage = {
    youtube: "Extracting insights from video content...",
    pdf: "Analyzing document structure and key concepts...",
    text: "Identifying important concepts in your text...",
    image: "Interpreting visual information..."
  }[contentType];

  useEffect(() => {
    // Define all loading stages with their progress percentages, messages, and timing
    const loadingStages: LoadingStage[] = [
      { progress: 10, message: "Analyzing content...", timing: 500 },
      { progress: 25, message: `${contentTypeMessage}...`, timing: 1500 },
      { progress: 40, message: "Identifying key concepts...", timing: 3000 },
      { progress: 65, message: "Generating questions...", timing: 5000 },
      { progress: 85, message: "Finalizing your quiz...", timing: 8000 },
      { progress: 90, message: "Almost there...", timing: 10000 },
    ];
    
    // Clear timers on unmount
    const timers: NodeJS.Timeout[] = [];
    
    // Set up the progress animation
    loadingStages.forEach(stage => {
      const timer = setTimeout(() => {
        setProgress(stage.progress);
        setStatusText(stage.message);
      }, stage.timing);
      
      timers.push(timer);
    });
    
    // Clean up all timers on unmount
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [contentTypeMessage]);
  
  return (
    <div className={styles.loadingOverlay}>
      <div className={styles.loadingContent}>
        <div className={styles.loadingIcon}>
          {contentIcon}
        </div>
        <h2>{statusText}</h2>
        
        <div className={styles.progressBarContainer}>
          <div 
            className={styles.progressBar} 
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <p className={styles.progressText}>{Math.round(progress)}% complete</p>
        
        <div className={styles.loadingTips}>
          <p>Creating the perfect quiz for your content...</p>
          <p className={styles.tipText}>{contentTipMessage}</p>
        </div>
      </div>
    </div>
  );
} 