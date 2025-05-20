/**
 * AI Service using Vercel's AI SDK
 * This module provides quiz question generation capabilities using multiple AI providers:
 * - OpenAI
 * - Anthropic Claude
 * - DeepSeek
 * - AWS Bedrock
 * 
 * The AI SDK provides a unified interface for all providers, making it easy to switch
 * between them or add new ones in the future.
 */
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { deepseek } from '@ai-sdk/deepseek';
import { bedrock } from '@ai-sdk/amazon-bedrock';
import dbConnect from './mongodb';
import AIConfig, { AIProvider, initializeAIConfigs, IAIConfig } from '@/models/AIConfig';
import { generateMockQuizQuestions } from './mock-ai-service';

// Flag to use mock service during development/testing
// Only use mock service if explicitly set to 'true' in environment variables
const USE_MOCK_SERVICE = process.env.USE_MOCK_AI === 'true';

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
  
  
  // Use mock service when explicitly set to true in environment variables
  if (USE_MOCK_SERVICE) {
    console.debug("Using mock AI service for quiz generation");
    return await generateMockQuizQuestions({
      ...params,
      numQuestions
    });
  }
  
  const activeProvider = await getActiveAIProvider();
  
  // Detect if content is likely mathematical/technical
  const isContentLikelyMathematical = 
    params.content.match(/\d+\s*[+\-*/^=<>≤≥]\s*\d+/) !== null || // Contains math operations
    params.content.toLowerCase().includes("equation") ||
    params.content.toLowerCase().includes("formula") ||
    params.content.toLowerCase().includes("math") ||
    params.content.toLowerCase().includes("physics") ||
    params.content.toLowerCase().includes("chemistry") ||
    params.content.toLowerCase().includes("calculus") ||
    params.content.toLowerCase().includes("algebra") ||
    params.content.toLowerCase().includes("geometry");
  
  
  // Base includeTypes on user selection but override math based on content analysis
  const includeTypes = {
    multipleChoice: params.includeTypes?.multipleChoice ?? true,
    trueFalse: params.includeTypes?.trueFalse ?? true,
    math: isContentLikelyMathematical // Override math type based on content analysis
  };

  // Count how many types are selected
  const enabledTypesCount = (includeTypes.multipleChoice ? 1 : 0) + 
                           (includeTypes.trueFalse ? 1 : 0) + 
                           (includeTypes.math ? 1 : 0);
  
  // Log selected question types
  
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
    // For mathematical content, allocate more questions to math type
    if (isContentLikelyMathematical) {
      multipleChoiceCount = Math.ceil(numQuestions * 0.4);
      trueFalseCount = Math.ceil(numQuestions * 0.2);
      mathCount = numQuestions - multipleChoiceCount - trueFalseCount;
    } else {
      multipleChoiceCount = Math.ceil(numQuestions * 0.6);
      trueFalseCount = Math.ceil(numQuestions * 0.4);
      mathCount = 0;
    }
  }
  
  // Ensure we're asking for the right number of questions
  
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
    2. Include a LaTeX formula using proper syntax
    3. IMPORTANT: Wrap ALL mathematical expressions in the appropriate LaTeX delimiters:
       - For inline math, use $...$ (e.g., $x^2 + 5x + 6$)
       - For display math (equations on their own line), use $$...$$ (e.g., $$\\frac{x^2}{2} + 5x$$)
    4. Use proper LaTeX commands for mathematical notation:
       - Fractions: \\frac{numerator}{denominator}
       - Square roots: \\sqrt{expression}
       - Powers: x^{exponent}
       - Greek letters: \\alpha, \\beta, \\gamma, etc.
       - Special symbols: \\rightarrow, \\Rightarrow, \\infty, etc.
    5. CRITICAL: Format EVERY single mathematical term in the explanation with LaTeX, even simple variables:
       - Use $x$ instead of x
       - Use $5$ instead of 5
       - Use $x = 5$ instead of x = 5
       - Every step should be properly formatted with $$...$$ when on separate lines
    6. Provide 4 possible answers with only 1 correct option
    7. Mark which answer is correct (0-3 index)
    8. Include a detailed breakdown of explanation where EVERY step uses proper LaTeX formatting
    
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
          "formula": "$$\\frac{x^2}{2} + 5x$$",
          "options": ["$Option A$", "$Option B$", "$Option C$", "$Option D$"],
          "correctAnswer": 2,
          "explanation": "Explanation with math: $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$"
        }
      ]
    }

    Example of a good math question with proper LaTeX:
    {
      "type": "math",
      "question": "Solve the quadratic equation $x^2 + 12x + 35 = 0$",
      "formula": "$$x^2 + 12x + 35 = 0$$",
      "options": ["$x = -5, -7$", "$x = 5, 7$", "$x = -3, -12$", "$x = 3, 12$"],
      "correctAnswer": 0,
      "explanation": "Using the quadratic formula: $$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$ With $a=1$, $b=12$, and $c=35$: $$x = \\frac{-12 \\pm \\sqrt{12^2-4 \\cdot 1 \\cdot 35}}{2 \\cdot 1} = \\frac{-12 \\pm \\sqrt{144-140}}{2} = \\frac{-12 \\pm \\sqrt{4}}{2} = \\frac{-12 \\pm 2}{2}$$ This gives us $x = \\frac{-12+2}{2} = -5$ or $x = \\frac{-12-2}{2} = -7$"
    }
    
    Another example with completing the square method:
    {
      "type": "math",
      "question": "Solve the equation $x^2 + 12x + 35 = 0$ using the completing the square method.",
      "formula": "$$x^2 + 12x + 35 = 0$$",
      "options": ["$x = -5, -7$", "$x = 5, 7$", "$x = -3, -12$", "$x = 3, 12$"],
      "correctAnswer": 0,
      "explanation": "Following the completing the square method: $$x^2 + 12x + 35 = 0$$ $$x^2 + 12x = -35$$ Adding $(\\frac{b}{2})^2 = (\\frac{12}{2})^2 = 6^2 = 36$ to both sides: $$x^2 + 12x + 36 = -35 + 36$$ $$x^2 + 12x + 36 = 1$$ $$(x + 6)^2 = 1$$ $$x + 6 = \\pm 1$$ $$x = -6 \\pm 1$$ $$x = -5 \\text{ or } x = -7$$"
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
      case 'bedrock':
        model = bedrock(activeProvider.defaultModel);
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
      // Throw error instead of fallback to mock service when JSON parsing fails
      throw new Error('Failed to parse AI response as valid JSON. Please try again.');
    }
  } catch (error) {
    console.error(`Error generating questions with ${activeProvider.provider}:`, error);
    
    // Only use mock service if explicitly enabled, otherwise throw error
    if (USE_MOCK_SERVICE) {
      console.debug("Using mock AI service as fallback due to error");
      return await generateMockQuizQuestions(params);
    } else {
      throw new Error('AI service failed to generate questions: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }
} 