/**
 * @author: Nas Abdulrasaq(nosisky@gmail.com)
 * Email: nosisky@gmail.com
 * Github: https://github.com/nosisky
 */
'use client';

import { useState } from 'react';
import Flashcard, { FlashcardProps } from './Flashcard';
import styles from './FlashcardDeck.module.scss';

interface FlashcardDeckProps {
  cards: FlashcardProps[];
  onComplete?: () => void;
}

export default function FlashcardDeck({ cards, onComplete }: FlashcardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCurrentCardFlipped, setIsCurrentCardFlipped] = useState(false);
  
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsCurrentCardFlipped(false);
    }
  };
  
  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsCurrentCardFlipped(false);
    } else if (onComplete) {
      onComplete();
    }
  };
  
  const handleFlip = (isFlipped: boolean) => {
    setIsCurrentCardFlipped(isFlipped);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      handlePrevious();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    } else if (e.key === ' ' || e.key === 'Spacebar') {
      // Spacebar to flip the card
      setIsCurrentCardFlipped(!isCurrentCardFlipped);
      e.preventDefault(); // Prevent scrolling with spacebar
    }
  };
  
  if (cards.length === 0) {
    return (
      <div className={styles.emptyDeck}>
        <p>No flashcards available.</p>
      </div>
    );
  }
  
  return (
    <div 
      className={styles.flashcardDeck} 
      tabIndex={0} 
      onKeyDown={handleKeyDown}
    >
      <div className={styles.controls}>
        <button 
          className={styles.navButton} 
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          aria-label="Previous flashcard"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        
        <div className={styles.progress}>
          {currentIndex + 1} / {cards.length}
        </div>
        
        <button 
          className={styles.navButton} 
          onClick={handleNext}
          aria-label={currentIndex === cards.length - 1 ? "Finish" : "Next flashcard"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>
      
      <div className={styles.cardContainer}>
        <Flashcard
          front={cards[currentIndex].front}
          back={cards[currentIndex].back}
          hints={cards[currentIndex].hints}
          onFlip={handleFlip}
        />
      </div>
      
      <div className={styles.keyboardHints}>
        <span>◄ Previous</span>
        <span>Space: Flip</span>
        <span>Next ►</span>
      </div>
    </div>
  );
} 