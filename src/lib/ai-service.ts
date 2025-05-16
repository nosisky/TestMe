import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import dbConnect from './mongodb';
import AIConfig, { AIProvider, initializeAIConfigs, IAIConfig } from '@/models/AIConfig';
import { generateMockQuizQuestions } from './mock-ai-service';

// Flag to use mock service during development/testing
const USE_MOCK_SERVICE = !process.env.OPENAI_API_KEY || process.env.USE_MOCK_AI === 'true';

// Initialize the AI providers
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || '',
});

// Placeholder for DeepSeek API (replace with actual SDK when available)
class DeepSeekAPI {
  apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  // This is just a placeholder method that will be implemented later
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateContent(params: Record<string, unknown>): Promise<unknown> {
    // Implement DeepSeek API calls when SDK is available
    throw new Error('DeepSeek API not yet implemented');
  }
}

// Initialize DeepSeek API client (unused until implemented)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const deepseek = new DeepSeekAPI(process.env.DEEPSEEK_API_KEY || '');

// Get active AI provider from database
export async function getActiveAIProvider(): Promise<IAIConfig> {
  await dbConnect();
  
  // Initialize default configs if needed
  await initializeAIConfigs();
  
  // Get the active provider configuration
  const activeConfig = await AIConfig.findOne({ isActive: true });
  
  // Fallback to environment variable or OpenAI if no active provider
  if (!activeConfig) {
    const defaultProvider = (process.env.DEFAULT_AI_PROVIDER as AIProvider) || 'openai';
    const fallbackConfig = await AIConfig.findOne({ provider: defaultProvider });
    if (!fallbackConfig) {
      throw new Error('No AI provider configuration found');
    }
    return fallbackConfig;
  }
  
  return activeConfig;
}

interface GenerateQuestionsParams {
  content: string;
  numQuestions: number;
  difficulty: string;
}

// Generate quiz questions using selected AI provider
export async function generateQuizQuestions(params: GenerateQuestionsParams) {
  // Use mock service when in development or missing API keys
  if (USE_MOCK_SERVICE) {
    console.log('Using mock AI service for quiz generation');
    return await generateMockQuizQuestions(params);
  }
  
  const activeProvider = await getActiveAIProvider();
  
  const prompt = `
    You are an expert quiz creator. Based on the following content,
    create ${params.numQuestions} multiple-choice questions at ${params.difficulty} difficulty level.
    
    Content:
    ${params.content.substring(0, 4000)} // Limit content to first 4000 chars to fit in context window
    
    For each question:
    1. Create a clear, concise question
    2. Provide 4 possible answers with only 1 correct option
    3. Mark which answer is correct (0-3 index)
    4. Include a brief explanation for why the answer is correct
    
    Format your response as a JSON array of objects with this structure:
    {
      "questions": [
        {
          "question": "Question text",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": 0,
          "explanation": "Explanation of the correct answer"
        }
      ]
    }
  `;
  
  try {
    switch (activeProvider.provider) {
      case 'openai':
        return await generateWithOpenAI(prompt, activeProvider);
      case 'claude':
        return await generateWithClaude(prompt, activeProvider);
      case 'deepseek':
        return await generateWithDeepSeek(prompt, activeProvider);
      default:
        // Fallback to OpenAI
        return await generateWithOpenAI(prompt, activeProvider);
    }
  } catch (error) {
    console.error(`Error generating questions with ${activeProvider.provider}:`, error);
    
    // Fallback to mock service if AI generation fails
    console.log('Falling back to mock AI service after API error');
    return await generateMockQuizQuestions(params);
  }
}

async function generateWithOpenAI(prompt: string, config: IAIConfig) {
  const response = await openai.chat.completions.create({
    model: config.defaultModel,
    messages: [
      { role: "system", content: "You are a helpful assistant that creates quiz questions." },
      { role: "user", content: prompt }
    ],
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    response_format: { type: "json_object" },
  });
  
  const content = response.choices[0].message.content;
  if (!content) throw new Error("Empty response from OpenAI");
  
  return JSON.parse(content);
}

async function generateWithClaude(prompt: string, config: IAIConfig) {
  const response = await anthropic.messages.create({
    model: config.defaultModel,
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    system: "You are a helpful assistant that creates quiz questions.",
    messages: [
      { role: "user", content: prompt }
    ],
  });
  
  // Extract text content from the response
  let content = '';
  for (const block of response.content) {
    if (block.type === 'text') {
      content = block.text;
      break;
    }
  }
  
  if (!content) throw new Error("Empty response from Claude");
  
  return JSON.parse(content);
}

async function generateWithDeepSeek(prompt: string, config: IAIConfig) {
  try {
    // Placeholder for DeepSeek implementation
    // Replace with actual API call when SDK is available
    throw new Error("DeepSeek API not yet implemented");
  } catch (error) {
    console.error("Error with DeepSeek API:", error);
    // Fallback to OpenAI if DeepSeek fails
    return await generateWithOpenAI(prompt, config);
  }
} 