import mongoose, { Schema, Document } from 'mongoose';

// Interface representing a flashcard document
export interface IFlashcard extends Document {
  quizId: mongoose.Types.ObjectId;
  createdBy: string; // User ID or email
  front: string; // Question or prompt
  back: string; // Answer or explanation
  hints?: string[]; // Optional hints
  tags?: string[];
  createdAt: Date;
  lastReviewed?: Date;
  reviewCount?: number;
  confidence?: number; // User's confidence level (1-5)
}

const FlashcardSchema = new Schema<IFlashcard>({
  quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
  createdBy: { type: String, required: true },
  front: { type: String, required: true },
  back: { type: String, required: true },
  hints: [String],
  tags: [String],
  createdAt: { type: Date, default: Date.now },
  lastReviewed: { type: Date },
  reviewCount: { type: Number, default: 0 },
  confidence: { type: Number, min: 1, max: 5 }
});

// Create indexes for faster queries
FlashcardSchema.index({ createdBy: 1, quizId: 1 });
FlashcardSchema.index({ tags: 1 });

// Create or retrieve the model
const Flashcard = mongoose.models.Flashcard || mongoose.model<IFlashcard>('Flashcard', FlashcardSchema);

export default Flashcard; 