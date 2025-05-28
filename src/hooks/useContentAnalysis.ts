/**
 * @fileoverview Custom hook for content analysis
 * Centralizes knowledge gap analysis logic
 */

import { useState, useCallback } from 'react';
import { QuizType, QuizSize } from '@/constants/quiz';

interface ContentAnalysisState {
  isAnalyzing: boolean;
  keyTopics: string[];
  knowledgeGaps: string[];
  error: string;
}

interface AnalyzeContentParams {
  content: string;
  quizType: QuizType;
  quizSize: QuizSize;
}

export const useContentAnalysis = () => {
  const [state, setState] = useState<ContentAnalysisState>({
    isAnalyzing: false,
    keyTopics: [],
    knowledgeGaps: [],
    error: ''
  });

  const updateState = useCallback((updates: Partial<ContentAnalysisState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const analyzeContent = useCallback(async (params: AnalyzeContentParams) => {
    updateState({ isAnalyzing: true, error: '', keyTopics: [], knowledgeGaps: [] });

    try {
      const response = await fetch('/api/content/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error('Failed to analyze content');
      }

      const data = await response.json();
      
      updateState({
        isAnalyzing: false,
        keyTopics: data.keyTopics || [],
        knowledgeGaps: data.knowledgeGaps || []
      });

      return { success: true, data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze content';
      
      // Fallback to basic analysis
      const fallbackAnalysis = generateFallbackAnalysis(params);
      
      updateState({
        isAnalyzing: false,
        error: errorMessage,
        keyTopics: fallbackAnalysis.keyTopics,
        knowledgeGaps: fallbackAnalysis.knowledgeGaps
      });

      return { success: false, error: errorMessage, data: fallbackAnalysis };
    }
  }, [updateState]);

  const generateFallbackAnalysis = useCallback((params: AnalyzeContentParams) => {
    const { quizType } = params;
    
    const fallbackTopics = {
      youtube: ["Video content analysis", "Key concepts from video", "Main discussion points"],
      pdf: ["Document structure", "Main concepts", "Important definitions"],
      text: ["Text analysis", "Key themes", "Important concepts"],
      image: ["Visual content", "Text elements", "Key information"]
    };

    const fallbackGaps = {
      youtube: ["Video comprehension", "Detailed understanding", "Application of concepts"],
      pdf: ["Document interpretation", "Complex concepts", "Practical application"],
      text: ["Reading comprehension", "Critical analysis", "Concept application"],
      image: ["Visual interpretation", "Text recognition", "Content analysis"]
    };

    return {
      keyTopics: fallbackTopics[quizType] || ["General content analysis"],
      knowledgeGaps: fallbackGaps[quizType] || ["Content understanding", "Concept application"]
    };
  }, []);

  const resetAnalysis = useCallback(() => {
    setState({
      isAnalyzing: false,
      keyTopics: [],
      knowledgeGaps: [],
      error: ''
    });
  }, []);

  return {
    ...state,
    analyzeContent,
    resetAnalysis,
    generateFallbackAnalysis
  };
}; 