/**
 * AI Service using Vercel's AI SDK
 * This module provides quiz question generation capabilities using multiple AI providers:
 * - OpenAI
 * - Anthropic Claude
 * - DeepSeek
 * 
 * The AI SDK provides a unified interface for all providers, making it easy to switch
 * between them or add new ones in the future.
 */
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { deepseek } from '@ai-sdk/deepseek';
import dbConnect from './mongodb';
import AIConfig, { AIProvider, initializeAIConfigs, IAIConfig } from '@/models/AIConfig';
import { generateMockQuizQuestions } from './mock-ai-service';

// Flag to use mock service during development/testing
const USE_MOCK_SERVICE = !process.env.OPENAI_API_KEY || process.env.USE_MOCK_AI === 'true';

// Get active AI provider from database
export async function getActiveAIProvider(): Promise<IAIConfig> {
  await dbConnect();
  
  // Initialize default configs if needed
  await initializeAIConfigs();
  
  // Get the active provider configuration
  const activeConfig = await AIConfig.findOne({ isActive: true });
  
  console.log('ENV DEFAULT_AI_PROVIDER:', process.env.DEFAULT_AI_PROVIDER);
  console.log('Active AI provider from database:', activeConfig?.provider || 'none found');
  
  // Fallback to environment variable or OpenAI if no active provider
  if (!activeConfig) {
    const defaultProvider = (process.env.DEFAULT_AI_PROVIDER as AIProvider) || 'openai';
    console.log('Using fallback provider:', defaultProvider);
    
    const fallbackConfig = await AIConfig.findOne({ provider: defaultProvider });
    console.log('Fallback config found:', fallbackConfig?.provider || 'none found');
    
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
  includeTypes?: {
    multipleChoice?: boolean;
    trueFalse?: boolean;
    math?: boolean;
  };
}

// Generate quiz questions using selected AI provider
export async function generateQuizQuestions(params: GenerateQuestionsParams) {
  // Ensure numQuestions is a number
  const numQuestions = typeof params.numQuestions === 'string' 
    ? parseInt(params.numQuestions) 
    : params.numQuestions;
  
  console.log(`AI Service - Generating ${numQuestions} questions at ${params.difficulty} difficulty`);
  
  // Use mock service when in development or missing API keys
  if (USE_MOCK_SERVICE) {
    console.log('Using mock AI service for quiz generation');
    return await generateMockQuizQuestions({
      ...params,
      numQuestions
    });
  }
  
  const activeProvider = await getActiveAIProvider();
  
  // Determine which question types to include
  const includeTypes = params.includeTypes || {
    multipleChoice: true,
    trueFalse: true,
    math: true
  };

  // Count how many types are selected
  const enabledTypesCount = (includeTypes.multipleChoice ? 1 : 0) + 
                           (includeTypes.trueFalse ? 1 : 0) + 
                           (includeTypes.math ? 1 : 0);
  
  // Log selected question types
  console.log(`Question types selected: ${enabledTypesCount} types (MC: ${includeTypes.multipleChoice}, TF: ${includeTypes.trueFalse}, Math: ${includeTypes.math})`);
  
  // Distribute questions more intelligently based on content and selected types
  let multipleChoiceCount = 0;
  let trueFalseCount = 0;
  let mathCount = 0;
  
  if (enabledTypesCount === 0) {
    // Fallback to multiple choice if nothing is selected
    multipleChoiceCount = numQuestions;
  } else if (enabledTypesCount === 1) {
    // If only one type is selected, use all questions for that type
    if (includeTypes.multipleChoice) multipleChoiceCount = numQuestions;
    else if (includeTypes.trueFalse) trueFalseCount = numQuestions;
    else if (includeTypes.math) mathCount = numQuestions;
  } else if (enabledTypesCount === 2) {
    // If two types are selected, distribute evenly with a bias toward multiple choice
    if (includeTypes.multipleChoice && includeTypes.trueFalse) {
      multipleChoiceCount = Math.ceil(numQuestions * 0.6);
      trueFalseCount = numQuestions - multipleChoiceCount;
    } else if (includeTypes.multipleChoice && includeTypes.math) {
      multipleChoiceCount = Math.ceil(numQuestions * 0.7);
      mathCount = numQuestions - multipleChoiceCount;
    } else if (includeTypes.trueFalse && includeTypes.math) {
      trueFalseCount = Math.ceil(numQuestions * 0.6);
      mathCount = numQuestions - trueFalseCount;
    }
  } else {
    // If all three types are selected, distribute with priority to multiple choice, then true/false, then math
    multipleChoiceCount = Math.ceil(numQuestions * 0.5);
    trueFalseCount = Math.ceil(numQuestions * 0.3);
    mathCount = numQuestions - multipleChoiceCount - trueFalseCount;
  }
  
  // Ensure we're asking for the right number of questions
  console.log(`Question distribution: MC=${multipleChoiceCount}, TF=${trueFalseCount}, Math=${mathCount}, Total=${multipleChoiceCount + trueFalseCount + mathCount}`);
  
  // Detect if content is likely mathematical/technical
  const isContentLikelyMathematical = 
    params.content.match(/\d+\s*[+\-*/^=<>≤≥]\s*\d+/) !== null || // Contains math operations
    params.content.toLowerCase().includes("equation") ||
    params.content.toLowerCase().includes("formula") ||
    params.content.toLowerCase().includes("math") ||
    params.content.toLowerCase().includes("physics") ||
    params.content.toLowerCase().includes("chemistry");

  const prompt = `
    You are an expert quiz creator. Based on the following content,
    create a quiz with ${numQuestions} questions at ${params.difficulty} difficulty level.

    Content:
    ${params.content.substring(0, 4000)} // Limit content to first 4000 chars to fit in context window
    
    Create a total of ${numQuestions} questions distributed as follows:
    - ${multipleChoiceCount} multiple choice questions
    - ${trueFalseCount} true/false questions
    - ${mathCount} mathematical questions
    
    Content analysis: This appears to be ${isContentLikelyMathematical ? 'technical/mathematical content' : 'non-technical content'}.
    ${!isContentLikelyMathematical && mathCount > 0 ? 'Although this seems like non-technical content, please try to create mathematical questions if possible by forming questions about numerical aspects of the content.' : ''}
    ${isContentLikelyMathematical && mathCount === 0 ? 'Although this seems like technical content, please focus only on the requested question types and avoid creating math-heavy questions.' : ''}
    
    For multiple choice questions:
    1. Create a clear, concise question
    2. Provide 4 possible answers with only 1 correct option
    3. Mark which answer is correct (0-3 index)
    4. Include a brief explanation for why the answer is correct
    
    For true/false questions:
    1. Create a clear statement that is either true or false
    2. Indicate whether the statement is true or false
    3. Provide a brief explanation for the correct answer
    
    For mathematical questions:
    1. Create a math problem relevant to the content
    2. Include a LaTeX formula using MathJax syntax (e.g., \\frac{1}{2} for fractions)
    3. Provide 4 possible answers with only 1 correct option
    4. Mark which answer is correct (0-3 index)
    5. Include a brief explanation for the correct answer
    
    Format your response as a JSON object with this structure:
    {
      "questions": [
        {
          "type": "multiple_choice",
          "question": "Question text",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": 0,
          "explanation": "Explanation of the correct answer"
        },
        {
          "type": "true_false",
          "question": "Statement that is true or false",
          "options": ["True", "False"],
          "correctAnswer": 0,
          "isTrue": true,
          "explanation": "Explanation of why the statement is true or false"
        },
        {
          "type": "math",
          "question": "Math problem question",
          "formula": "\\frac{x^2}{2} + 5x",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": 2,
          "explanation": "Explanation of the correct mathematical solution"
        }
      ]
    }
  `;
  
  try {
    // Create model configuration based on active provider
    let model;
    
    switch (activeProvider.provider) {
      case 'openai':
        model = openai(activeProvider.defaultModel);
        break;
      case 'claude':
        model = anthropic(activeProvider.defaultModel);
        break;
      case 'deepseek':
        model = deepseek(activeProvider.defaultModel);
        break;
      default:
        // Fallback to OpenAI
        model = openai('gpt-3.5-turbo');
    }
    
    // Use the AI SDK to generate text
    const { text } = await generateText({
      model,
      system: 'You are a helpful assistant that creates quiz questions.',
      prompt,
      temperature: activeProvider.temperature,
      maxTokens: activeProvider.maxTokens
    });
    
    // Parse the response text as JSON
    try {
      return JSON.parse(text);
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      // Try to extract JSON from the text if it's not valid JSON directly
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (innerError) {
          console.error('Failed to extract valid JSON:', innerError);
        }
      }
      // Fallback to mock service if JSON parsing fails
      console.log('Falling back to mock AI service after JSON parsing error');
      return await generateMockQuizQuestions(params);
    }
  } catch (error) {
    console.error(`Error generating questions with ${activeProvider.provider}:`, error);
    
    // Fallback to mock service if AI generation fails
    console.log('Falling back to mock AI service after API error');
    return await generateMockQuizQuestions(params);
  }
} 