'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './QuizGeneratedSuccess.module.scss';

interface QuizGeneratedSuccessProps {
  generatedQuizId: string;
  shareableLink: string;
  sourceType?: 'youtube' | 'pdf' | 'text' | 'image';
}

export default function QuizGeneratedSuccess({
  generatedQuizId,
  shareableLink,
  sourceType = 'text'
}: QuizGeneratedSuccessProps) {
  const router = useRouter();
  const [copyStatusMessage, setCopyStatusMessage] = useState('');

  const handleTakeQuizNow = () => {
    if (generatedQuizId) {
      router.push(`/quiz/${generatedQuizId}`);
    }
  };

  const handleCopyShareableLink = () => {
    if (!shareableLink) return;
    navigator.clipboard.writeText(shareableLink).then(() => {
      setCopyStatusMessage('Link copied to clipboard!');
      setTimeout(() => setCopyStatusMessage(''), 3000);
    }).catch(err => {
      console.error('Failed to copy link: ', err);
      setCopyStatusMessage('Failed to copy link. Please try again.');
      setTimeout(() => setCopyStatusMessage(''), 3000);
    });
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.promptContainer}>
          <div className={styles.successIconCircle} aria-hidden="true">
            <svg className={styles.successIcon} viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 16.17l7.59-7.59L19 10l-9 9z" />
            </svg>
          </div>
          <h2 className={styles.promptHeading}>Quiz Generated Successfully!</h2>
          <p className={styles.promptSubtitle}>
            Your new quiz {sourceType ? `from ${sourceType}` : ''} is ready. What would you like to do next?
          </p>
          
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
        </div>
      </main>
    </div>
  );
} 