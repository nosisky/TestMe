'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from '@/app/components/Header';
import SocialShareButtons from '@/app/components/SocialShareButtons';
import styles from './textQuiz.module.scss';

export default function TextQuizCreatorPage() {
  const router = useRouter();
  const { status } = useSession();

  const [textContent, setTextContent] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [generatedQuizId, setGeneratedQuizId] = useState<string | null>(null);
  const [showPostGenerationPrompt, setShowPostGenerationPrompt] = useState(false);
  const [shareableLink, setShareableLink] = useState('');
  const [copyStatusMessage, setCopyStatusMessage] = useState('');

  if (status === 'loading') {
    return <div className={styles.loadingContainer}><div className={styles.spinner}></div><p>Loading...</p></div>;
  }
  if (status === 'unauthenticated') {
    router.push('/login');
    return null; // Avoid rendering anything further
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (textContent.trim().length < 50) { // Basic validation for text length
      setError('Please provide at least 50 characters of text for the quiz.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedQuizId(null);
    setShowPostGenerationPrompt(false);
    setShareableLink('');
    setCopyStatusMessage('');

    try {
      const response = await fetch('/api/text/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textContent,
          title: quizTitle.trim() || undefined, // Send undefined if empty, API can handle default
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate quiz from text');
      }

      setGeneratedQuizId(data.quiz.id);
      setShareableLink(`${window.location.origin}/quiz/${data.quiz.id}/instructions`);
      setShowPostGenerationPrompt(true);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakeQuizNow = () => {
    if (generatedQuizId) router.push(`/quiz/${generatedQuizId}`);
  };

  const handleCopyShareableLink = () => {
    if (!shareableLink) return;
    navigator.clipboard.writeText(shareableLink).then(() => {
      setCopyStatusMessage('Link copied!');
      setTimeout(() => setCopyStatusMessage(''), 3000);
    }).catch(() => {
      setCopyStatusMessage('Failed to copy.');
      setTimeout(() => setCopyStatusMessage(''), 3000);
    });
  };

  if (showPostGenerationPrompt && generatedQuizId) {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <main className={`${styles.mainContent} ${styles.promptPageMain}`}> 
          <div className={styles.promptContainer}>
            <div className={styles.successIconCircle} aria-hidden="true">
              <svg className={styles.successIcon} viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 16.17l7.59-7.59L19 10l-9 9z"/></svg>
            </div>
            <h2 className={styles.promptHeading}>Quiz Generated Successfully!</h2>
            <p className={styles.promptSubtitle}>Your new quiz from text is ready.</p>
            <div className={styles.promptActions}>
              <button onClick={handleTakeQuizNow} className={`${styles.button} ${styles.primaryButtonLarge}`}>
                Take Quiz Now
              </button>
              <button onClick={handleCopyShareableLink} className={`${styles.button} ${styles.secondaryButtonLarge}`}>
                Copy Shareable Link
              </button>
            </div>
            {copyStatusMessage && <p className={`${styles.copyStatus} ${copyStatusMessage.includes('Failed') ? styles.errorText : styles.successText}`}>{copyStatusMessage}</p>}
            {shareableLink && (
              <div className={styles.shareLinkContainer}>
                <hr className={styles.divider} />
                <p className={styles.shareLabel}>Or share this link:</p>
                <div className={styles.shareLinkBox}><a href={shareableLink} target="_blank" rel="noopener noreferrer">{shareableLink}</a></div>
              </div>
            )}
            
            <SocialShareButtons 
              url={shareableLink}
              title={`Check out this quiz: ${quizTitle || 'Text Quiz'}`}
              description="I've just created a new quiz! Take it now and test your knowledge."
              hashtags={['quiz', 'testme', 'learning']}
            />
            
            <button onClick={() => router.push('/dashboard')} className={`${styles.button} ${styles.tertiaryButtonLarge} ${styles.createAnotherButton}`}>
              ← Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <Header />
      <main className={styles.mainContent}>
        <div className={styles.formContainer}>
          <div className={styles.breadcrumbs}>
            <button onClick={() => router.back()} className={styles.backButton}>
              ← Back to Create Options
            </button>
            <span>Dashboard / Create Quiz / Custom Text</span>
          </div>
          <h1>Create Quiz from Custom Text</h1>
          <p className={styles.pageDescription}>
            Paste or type your text below and our AI will automatically generate appropriate quiz questions.
          </p>

          <form onSubmit={handleSubmit} className={styles.quizForm}>
            <div className={styles.formGroup}>
              <label htmlFor="quizTitle">Quiz Title (Optional)</label>
              <input
                type="text"
                id="quizTitle"
                name="quizTitle"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="E.g., Summary of Chapter 1"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="textContent">Your Text Content</label>
              <textarea
                id="textContent"
                name="textContent"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste your text here (minimum 50 characters)..."
                className={styles.textarea}
                rows={10}
                required
              />
            </div>
            
            {error && <p className={styles.errorTextBig}>{error}</p>}

            <button type="submit" disabled={isLoading || textContent.trim().length < 50} className={`${styles.button} ${styles.primaryButtonLarge} ${styles.generateButtonFullWidth}`}>
              {isLoading ? <><div className={styles.buttonSpinner}></div> Generating...</> : 'Generate Quiz from Text'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
} 