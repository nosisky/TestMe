/**
 * AI Configuration
 * This module provides AI provider configurations without database dependency.
 * Configuration is based on environment variables.
 */

export type AIProvider = 'openai' | 'claude' | 'deepseek' | 'bedrock';

export interface AIProviderConfig {
  provider: AIProvider;
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
}

// Default provider configurations
const AI_CONFIGS: Record<AIProvider, Omit<AIProviderConfig, 'isActive'>> = {
  openai: {
    provider: 'openai',
    defaultModel: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2048,
  },
  claude: {
    provider: 'claude',
    defaultModel: 'claude-3-haiku-20240307',
    temperature: 0.7,
    maxTokens: 2048,
  },
  deepseek: {
    provider: 'deepseek',
    defaultModel: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 2048,
  },
  bedrock: {
    provider: 'bedrock',
    defaultModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
    temperature: 0.7,
    maxTokens: 2048,
  }
};

/**
 * Get the active AI provider based on environment variable
 */
export function getActiveAIProvider(): AIProviderConfig {
  const defaultProvider = (process.env.DEFAULT_AI_PROVIDER as AIProvider) || 'openai';
  
  // Validate the provider exists in our configurations
  if (!AI_CONFIGS[defaultProvider]) {
    console.warn(`Invalid DEFAULT_AI_PROVIDER: ${defaultProvider}. Falling back to openai.`);
    return {
      ...AI_CONFIGS.openai,
      isActive: true
    };
  }
  
  return {
    ...AI_CONFIGS[defaultProvider],
    isActive: true
  };
}

/**
 * Get all AI provider configurations with active status based on environment
 */
export function getAllAIProviders(): AIProviderConfig[] {
  const activeProvider = (process.env.DEFAULT_AI_PROVIDER as AIProvider) || 'openai';
  
  return Object.values(AI_CONFIGS).map(config => ({
    ...config,
    isActive: config.provider === activeProvider
  }));
}

/**
 * Check if a specific provider is available (has API key)
 */
export function isProviderAvailable(provider: AIProvider): boolean {
  switch (provider) {
    case 'openai':
      return Boolean(process.env.OPENAI_API_KEY);
    case 'claude':
      return Boolean(process.env.CLAUDE_API_KEY);
    case 'deepseek':
      return Boolean(process.env.DEEPSEEK_API_KEY);
    case 'bedrock':
      return Boolean(
        process.env.AWS_ACCESS_KEY_ID && 
        process.env.AWS_SECRET_ACCESS_KEY && 
        process.env.AWS_REGION
      );
    default:
      return false;
  }
}

/**
 * Get the provider status for admin/debugging purposes
 */
export function getProviderStatus() {
  const activeProvider = getActiveAIProvider();
  
  return {
    activeProvider: activeProvider.provider,
    envDefaultProvider: process.env.DEFAULT_AI_PROVIDER || 'openai',
    defaultFallback: 'openai',
    availableProviders: Object.keys(AI_CONFIGS).filter(provider => 
      isProviderAvailable(provider as AIProvider)
    ),
    allProviders: getAllAIProviders()
  };
} 