'use client';

import { useState } from 'react';
import styles from './Flashcard.module.scss';

export interface FlashcardProps {
  front: string;
  back: string;
  hints?: string[];
  onFlip?: (isFlipped: boolean) => void;
}

export default function Flashcard({ front, back, hints, onFlip }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  
  const handleFlip = () => {
    const newFlippedState = !isFlipped;
    setIsFlipped(newFlippedState);
    
    if (onFlip) {
      onFlip(newFlippedState);
    }
    
    if (newFlippedState === false) {
      // Reset hint state when flipping back to front
      setShowHint(false);
    }
  };
  
  const toggleHint = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering card flip
    setShowHint(!showHint);
  };
  
  return (
    <div className={styles.flashcardContainer}>
      <div 
        className={`${styles.flashcard} ${isFlipped ? styles.flipped : ''}`} 
        onClick={handleFlip}
      >
        <div className={styles.flashcardInner}>
          <div className={styles.front}>
            <div className={styles.content}>
              {front.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
            
            {!isFlipped && hints && hints.length > 0 && (
              <button 
                className={styles.hintButton} 
                onClick={toggleHint}
                aria-expanded={showHint}
              >
                {showHint ? 'Hide Hint' : 'Show Hint'}
              </button>
            )}
            
            {!isFlipped && showHint && hints && hints.length > 0 && (
              <div className={styles.hint}>
                <p>Hint: {hints[0]}</p>
              </div>
            )}
            
            <div className={styles.flipPrompt}>
              <span>Click to flip</span>
            </div>
          </div>
          
          <div className={styles.back}>
            <div className={styles.content}>
              {back.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
            
            <div className={styles.flipPrompt}>
              <span>Click to flip back</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 