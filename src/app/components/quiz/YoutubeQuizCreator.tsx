import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from './YoutubeQuizCreator.module.scss';

export default function YoutubeQuizCreator() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const router = useRouter();
  const { data: session } = useSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/quiz/youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create quiz');
      }

      setQuizId(data.quizId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    router.push('/login');
  };

  const handleContinueWithoutLogin = () => {
    if (quizId) {
      router.push(`/quiz/${quizId}`);
    }
  };

  if (quizId) {
    return (
      <div className={styles.successPrompt}>
        <div className={styles.successIcon}>✓</div>
        <h2>Quiz Created Successfully!</h2>
        <p className={styles.promptSubtitle}>
          Your quiz is ready to be attempted.
        </p>
        
        {!session && (
          <div className={styles.loginPrompt}>
            <p>
              Create an account to save your progress and access more features!
            </p>
            <button onClick={handleLogin} className={styles.loginButton}>
              Log in to Save Progress
            </button>
          </div>
        )}
        
        <div className={styles.promptActions}>
          <button
            onClick={() => router.push(`/quiz/${quizId}`)}
            className={styles.primaryButton}
          >
            Start Quiz
          </button>
          {!session && (
            <button
              onClick={handleContinueWithoutLogin}
              className={styles.secondaryButton}
            >
              Continue Without Login
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="youtube-url">YouTube Video URL</label>
          <input
            id="youtube-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            required
            className={styles.input}
          />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.buttonContainer}>
          <button
            type="submit"
            disabled={loading}
            className={styles.button}
          >
            {loading ? 'Creating Quiz...' : 'Create Quiz'}
          </button>
        </div>
      </form>
    </div>
  );
} 