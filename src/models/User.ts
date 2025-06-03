import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  image?: string;
  role: 'user' | 'admin';
  emailVerified?: Date;
  createdAt: Date;
  preferences: {
    theme?: 'light' | 'dark' | 'system';
    quizDefaults?: {
      questionsCount: number;
      difficulty: 'easy' | 'medium' | 'hard' | 'expert';
      allowSkipping: boolean;
    };
  };
}

export interface IUserPreferences {
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  preferredQuestionTypes: string[];
  emailNotifications: boolean;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  image: { type: String },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  emailVerified: { type: Date },
  createdAt: { type: Date, default: Date.now },
  preferences: {
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    quizDefaults: {
      questionsCount: { type: Number, default: 5 },
      difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'expert'], default: 'medium' },
      allowSkipping: { type: Boolean, default: true }
    }
  }
});

// Note: email index is automatically created by the unique: true constraint above
// Additional indexes for faster queries can be added here if needed

// Create or retrieve the model
const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User; 