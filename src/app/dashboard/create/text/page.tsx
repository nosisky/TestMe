'use client';

import { useState, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Header from '@/app/components/Header';
import styles from './textQuiz.module.scss';
import QuizGeneratedSuccess from '@/app/components/quiz/QuizGeneratedSuccess';

// Helper function to determine if the text has meaningful content
const containsMeaningfulText = (text: string): boolean => {
  // Check for repeated patterns or non-word characters
  const strippedText = text.replace(/\s+/g, ' ').trim();
  
  if (strippedText.length < 50) return false;
  
  // Check if the text has enough unique words (at least 15)
  const words = strippedText.split(/\s+/);
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  
  // If there's very few unique words compared to total, it might be repetitive text
  if (uniqueWords.size < 15 || uniqueWords.size < words.length * 0.3) {
    return false;
  }
  
  return true;
};

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
  
  // Calculate characters remaining to meet minimum
  const minCharacters = 50;
  const charactersRemaining = Math.max(0, minCharacters - textContent.trim().length);
  const hasMinimumText = textContent.trim().length >= minCharacters;

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <div className={styles.loadingContainer}><div className={styles.loadingSpinner}></div><p>Loading...</p></div>;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (textContent.trim().length < 50) { // Basic validation for text length
      setError('Please provide at least 50 characters of text for the quiz.');
      return;
    }

    // Validate that the text contains meaningful content
    if (!containsMeaningfulText(textContent)) {
      setError('The text provided doesn\'t appear to contain meaningful content. Please enter valid text with actual words, not just symbols or repeated characters.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedQuizId(null);
    setShowPostGenerationPrompt(false);
    setShareableLink('');

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

  if (showPostGenerationPrompt && generatedQuizId) {
    return (
      <>
      <Header />
      <QuizGeneratedSuccess 
        generatedQuizId={generatedQuizId}
        shareableLink={shareableLink}
        sourceType="text"
      />
      </>
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
              <label htmlFor="textContent">
                Text Content <span className={styles.required}>(Required)</span>
              </label>
              <textarea
                id="textContent"
                name="textContent"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste or type your content here..."
                className={styles.textarea}
                rows={12}
                required
              ></textarea>
              <div className={`${styles.characterCount} ${hasMinimumText ? styles.characterCountValid : styles.characterCountInvalid}`}>
                {hasMinimumText 
                  ? `${textContent.length} characters` 
                  : `${charactersRemaining} more character${charactersRemaining !== 1 ? 's' : ''} needed`}
              </div>
            </div>

            {error && <div className={styles.errorTextBig}>{error}</div>}

            <button
              type="submit"
              className={`${styles.button} ${styles.primaryButtonLarge} ${styles.generateButtonFullWidth}`}
              disabled={isLoading || !hasMinimumText}
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
          </form>
        </div>
      </main>
    </div>
  );
} 