import mongoose, { Schema, Document } from 'mongoose';

// Interface representing a quiz result document
export interface IQuizResult extends Document {
  quizId: mongoose.Types.ObjectId;
  userId: string; // User email or ID
  score: number;
  totalQuestions: number;
  completedAt: Date;
  timeTaken?: number; // Optional time taken in seconds
  answers?: {
    questionIndex: number;
    selectedOption: number;
    isCorrect: boolean;
  }[]; // Optional detailed answers
}

const QuizResultSchema = new Schema<IQuizResult>({
  quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
  userId: { type: String, required: true },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  completedAt: { type: Date, default: Date.now },
  timeTaken: { type: Number },
  answers: [{
    questionIndex: { type: Number },
    selectedOption: { type: Number },
    isCorrect: { type: Boolean }
  }]
});

// Index for faster lookups
QuizResultSchema.index({ userId: 1, completedAt: -1 });
QuizResultSchema.index({ quizId: 1 });

// Add a virtual field for percentage score
QuizResultSchema.virtual('percentage').get(function() {
  return Math.round((this.score / this.totalQuestions) * 100);
});

// Create or retrieve the model
const QuizResult = mongoose.models.QuizResult || mongoose.model<IQuizResult>('QuizResult', QuizResultSchema);

export default QuizResult; 