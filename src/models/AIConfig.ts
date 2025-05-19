import mongoose, { Schema, Document } from 'mongoose';

export type AIProvider = 'openai' | 'claude' | 'deepseek' | 'bedrock';

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
      enum: ['openai', 'claude', 'deepseek', 'bedrock'],
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
    defaultModel: 'deepseek-chat-v1',
    temperature: 0.7,
    maxTokens: 2048,
    isActive: false
  },
  {
    provider: 'bedrock',
    defaultModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
    temperature: 0.7,
    maxTokens: 2048,
    isActive: false
  }
];

// Create or retrieve the model
const AIConfig = mongoose.models.AIConfig || mongoose.model<IAIConfig>('AIConfig', AIConfigSchema);

// Ensure default configurations exist
export const initializeAIConfigs = async () => {
  // First, determine which provider should be active based on env variable
  const defaultProvider = process.env.DEFAULT_AI_PROVIDER as AIProvider || 'openai';
  console.log('Initializing AI configs with default provider:', defaultProvider);
  
  // Create modified configs with the correct active status
  const configsWithCorrectActiveStatus = defaultConfigs.map(config => ({
    ...config,
    isActive: config.provider === defaultProvider
  }));
  
  // Upsert all configs
  for (const config of configsWithCorrectActiveStatus) {
    const existing = await AIConfig.findOne({ provider: config.provider });
    
    if (existing) {
      // If config exists but active status doesn't match environment variable, update it
      if (existing.isActive !== config.isActive) {
        console.log(`Updating active status for ${config.provider} to ${config.isActive}`);
        await AIConfig.findOneAndUpdate(
          { provider: config.provider },
          { isActive: config.isActive }
        );
      }
    } else {
      // Create new config
      console.log(`Creating new config for ${config.provider} with active status ${config.isActive}`);
      await AIConfig.create(config);
    }
  }
};

export default AIConfig; 