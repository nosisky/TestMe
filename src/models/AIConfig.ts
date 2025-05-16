import mongoose, { Schema, Document } from 'mongoose';

export type AIProvider = 'openai' | 'claude' | 'deepseek';

export interface IAIConfig extends Document {
  provider: AIProvider;
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AIConfigSchema = new Schema<IAIConfig>(
  {
    provider: {
      type: String,
      enum: ['openai', 'claude', 'deepseek'],
      required: true,
      default: 'openai'
    },
    defaultModel: {
      type: String,
      required: true
    },
    temperature: {
      type: Number,
      required: true,
      min: 0,
      max: 2,
      default: 0.7
    },
    maxTokens: {
      type: Number,
      required: true,
      default: 2048
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Initial provider configurations
const defaultConfigs = [
  {
    provider: 'openai',
    defaultModel: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 2048,
    isActive: true
  },
  {
    provider: 'claude',
    defaultModel: 'claude-2.1',
    temperature: 0.7,
    maxTokens: 2048,
    isActive: false
  },
  {
    provider: 'deepseek',
    defaultModel: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 2048,
    isActive: false
  }
];

// Create or retrieve the model
const AIConfig = mongoose.models.AIConfig || mongoose.model<IAIConfig>('AIConfig', AIConfigSchema);

// Ensure default configurations exist
export const initializeAIConfigs = async () => {
  for (const config of defaultConfigs) {
    await AIConfig.findOneAndUpdate(
      { provider: config.provider },
      { $setOnInsert: config },
      { upsert: true, new: true }
    );
  }
};

export default AIConfig; 