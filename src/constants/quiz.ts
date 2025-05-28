/**
 * @fileoverview Quiz configuration constants
 * Centralized configuration to eliminate magic numbers and improve maintainability
 */

export type QuizType = "youtube" | "pdf" | "text" | "image";
export type QuizSize = "quick" | "standard" | "deep" | "expert";
export type QuizDifficulty = "easy" | "medium" | "hard" | "expert";

export interface QuestionTypesConfig {
  multipleChoice: boolean;
  trueFalse: boolean;
}

export const QUIZ_SIZES: Record<QuizSize, { 
  questions: number; 
  difficulty: QuizDifficulty; 
  timeEstimate: string;
  description: string;
}> = {
  quick: {
    questions: 5,
    difficulty: "medium",
    timeEstimate: "~5 minutes",
    description: "5 questions, quick overview"
  },
  standard: {
    questions: 10,
    difficulty: "medium", 
    timeEstimate: "~10 minutes",
    description: "10 questions, balanced depth"
  },
  deep: {
    questions: 15,
    difficulty: "hard",
    timeEstimate: "~15 minutes", 
    description: "15 questions, comprehensive coverage"
  },
  expert: {
    questions: 20,
    difficulty: "expert",
    timeEstimate: "~25 minutes",
    description: "20 questions, advanced concepts"
  }
};

export const QUIZ_TYPE_CONFIG: Record<QuizType, {
  icon: string;
  title: string;
  description: string;
  placeholder: string;
  allowedFileTypes?: string[];
  maxFileSize?: number;
}> = {
  youtube: {
    icon: "🎥",
    title: "YouTube Video",
    description: "Generate questions from a YouTube video",
    placeholder: "Enter YouTube video URL...",
  },
  pdf: {
    icon: "📄", 
    title: "PDF Document",
    description: "Upload a PDF and generate questions",
    placeholder: "Upload your PDF document",
    allowedFileTypes: ["application/pdf"],
    maxFileSize: 20
  },
  text: {
    icon: "✍️",
    title: "Text Content", 
    description: "Paste or type your text content",
    placeholder: "Paste your text content here...",
  },
  image: {
    icon: "🖼️",
    title: "Image Content",
    description: "Upload an image with text content", 
    placeholder: "Upload your image",
    allowedFileTypes: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"],
    maxFileSize: 20
  }
};

export const ANONYMOUS_QUIZ_LIMIT = 3;

export const DEFAULT_QUESTION_TYPES: QuestionTypesConfig = {
  multipleChoice: true,
  trueFalse: true
};

export const CONTENT_ANALYSIS_STAGES = [
  { progress: 10, message: "Analyzing content...", timing: 500 },
  { progress: 25, message: "Processing content...", timing: 1500 },
  { progress: 40, message: "Identifying key concepts...", timing: 3000 },
  { progress: 65, message: "Generating questions...", timing: 5000 },
  { progress: 85, message: "Finalizing your quiz...", timing: 8000 },
  { progress: 90, message: "Almost there...", timing: 10000 },
]; 