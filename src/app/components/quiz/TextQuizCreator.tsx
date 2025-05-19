import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from './TextQuizCreator.module.scss';

export default function TextQuizCreator() {
  const [text, setText] = useState('');
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
      const response = await fetch('/api/quiz/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
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
          <label htmlFor="quiz-text">Enter your text</label>
          <textarea
            id="quiz-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your text here..."
            required
            minLength={100}
            className={styles.textarea}
          />
          <div className={styles.charCount}>
            {text.length} characters (minimum 100 required)
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.buttonContainer}>
          <button
            type="submit"
            disabled={loading || text.length < 100}
            className={styles.button}
          >
            {loading ? 'Creating Quiz...' : 'Create Quiz'}
          </button>
        </div>
      </form>
    </div>
  );
} 