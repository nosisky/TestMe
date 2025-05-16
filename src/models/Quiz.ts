import mongoose, { Schema, Document } from 'mongoose';

// Interface representing a quiz question
export interface IQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

// Quiz source type declaration
export type QuizSourceType = 'youtube' | 'pdf' | 'image' | 'text';

// Interface for source-specific data
export interface IQuizSource {
  type: QuizSourceType;
  youtube?: {
    videoId: string;
    title: string;
    thumbnail: string;
    duration?: string;
  };
  pdf?: {
    fileName: string;
    fileSize: number;
    pageCount: number;
    fileUrl: string;
  };
  image?: {
    fileName: string;
    fileSize: number;
    fileUrl: string;
  };
  text?: {
    content: string;
    title: string;
  };
}

// Interface representing a quiz document
export interface IQuiz extends Document {
  title: string;
  description?: string;
  sourceType: QuizSourceType;
  source: IQuizSource;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: Date;
  createdBy: string; // User ID or email
  isPublic: boolean;
  tags?: string[];
  questions: IQuizQuestion[];
  stats?: {
    timesPlayed: number;
    avgScore: number;
    lastPlayed?: Date;
  };
}

const QuizQuestionSchema = new Schema<IQuizQuestion>({
  question: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: Number, required: true },
  explanation: { type: String, required: true }
}, { _id: false }); // Subdocuments don't need their own IDs

const QuizSchema = new Schema<IQuiz>({
  title: { type: String, required: true },
  description: { type: String },
  sourceType: { 
    type: String, 
    enum: ['youtube', 'pdf', 'image', 'text'], 
    required: true 
  },
  source: {
    type: { type: String, required: true },
    // YouTube source data
    youtube: {
      videoId: String,
      title: String,
      thumbnail: String,
      duration: String
    },
    // PDF source data
    pdf: {
      fileName: String,
      fileSize: Number,
      pageCount: Number,
      fileUrl: String
    },
    // Image source data
    image: {
      fileName: String,
      fileSize: Number,
      fileUrl: String
    },
    // Text source data
    text: {
      content: String,
      title: String
    }
  },
  difficulty: { 
    type: String, 
    enum: ['easy', 'medium', 'hard'], 
    default: 'medium' 
  },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, required: true },
  isPublic: { type: Boolean, default: true },
  tags: [String],
  questions: { type: [QuizQuestionSchema], required: true },
  stats: {
    timesPlayed: { type: Number, default: 0 },
    avgScore: { type: Number, default: 0 },
    lastPlayed: Date
  }
});

// Create indexes for faster queries
QuizSchema.index({ createdBy: 1, createdAt: -1 });
QuizSchema.index({ sourceType: 1 });
QuizSchema.index({ 'source.youtube.videoId': 1 });
QuizSchema.index({ isPublic: 1 });
QuizSchema.index({ tags: 1 });

// Create or retrieve the model
const Quiz = mongoose.models.Quiz || mongoose.model<IQuiz>('Quiz', QuizSchema);

export default Quiz; 