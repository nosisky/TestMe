/**
 * @fileoverview Custom hook for quiz creation logic
 * Centralizes quiz creation state and API calls
 */

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { QuizSize, QuizType, ANONYMOUS_QUIZ_LIMIT } from '@/constants/quiz';

interface QuizCreationState {
  isCreating: boolean;
  error: string;
  createdQuizId: string;
  quizShareUrl: string;
}

interface CreateQuizParams {
  quizType: QuizType;
  quizSize: QuizSize;
  content: string;
  includeTypes: {
    multipleChoice: boolean;
    trueFalse: boolean;
  };
  knowledgeGaps?: string[];
  keyTopics?: string[];
}

export const useQuizCreation = () => {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [state, setState] = useState<QuizCreationState>({
    isCreating: false,
    error: '',
    createdQuizId: '',
    quizShareUrl: ''
  });

  const [anonQuizCount, setAnonQuizCount] = useState<number>(() => {
    if (typeof window !== 'undefined' && !session) {
      const count = localStorage.getItem('anonQuizCount');
      return count ? parseInt(count, 10) : 0;
    }
    return 0;
  });

  const updateState = useCallback((updates: Partial<QuizCreationState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const checkAnonymousQuizLimit = useCallback(() => {
    if (!session && anonQuizCount >= ANONYMOUS_QUIZ_LIMIT) {
      updateState({ 
        error: "You've reached the limit of 3 quizzes for anonymous users. Please create an account to continue." 
      });
      return false;
    }
    return true;
  }, [session, anonQuizCount, updateState]);

  const createQuiz = useCallback(async (params: CreateQuizParams) => {
    if (!checkAnonymousQuizLimit()) {
      return { success: false, showLoginPrompt: true };
    }

    updateState({ isCreating: true, error: '' });

    try {
      const response = await fetch('/api/quiz/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error('Failed to create quiz');
      }

      const data = await response.json();
      
      // Update anonymous quiz count
      if (!session) {
        const newCount = anonQuizCount + 1;
        setAnonQuizCount(newCount);
        localStorage.setItem('anonQuizCount', newCount.toString());
      }

      const shareUrl = `${window.location.origin}/quiz/${data.id}`;
      
      updateState({
        createdQuizId: data.id,
        quizShareUrl: shareUrl,
        isCreating: false
      });

      return { success: true, quizId: data.id, shareUrl };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create quiz';
      updateState({ error: errorMessage, isCreating: false });
      return { success: false, error: errorMessage };
    }
  }, [session, anonQuizCount, checkAnonymousQuizLimit, updateState]);

  const resetState = useCallback(() => {
    setState({
      isCreating: false,
      error: '',
      createdQuizId: '',
      quizShareUrl: ''
    });
  }, []);

  const takeQuiz = useCallback(() => {
    if (state.createdQuizId) {
      router.push(`/quiz/${state.createdQuizId}`);
    }
  }, [state.createdQuizId, router]);

  return {
    ...state,
    anonQuizCount,
    createQuiz,
    resetState,
    takeQuiz,
    updateState,
    checkAnonymousQuizLimit
  };
}; 