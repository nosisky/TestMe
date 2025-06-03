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
import { getActiveAIProvider, AIProviderConfig } from './ai-config';
import { generateMockQuizQuestions } from './mock-ai-service';
import dbConnect from './mongodb';

// Flag to use mock service during development/testing
const USE_MOCK_SERVICE = process.env.USE_MOCK_AI === 'true';

// Get active AI provider from configuration
export function getActiveAIProviderConfig(): AIProviderConfig {
  return getActiveAIProvider();
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

interface QuizQuestion {
  type: 'multiple_choice' | 'true_false' | 'math';
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  formula?: string;
  isTrue?: boolean;
}

// Helper function to ensure LaTeX formatting in question content
function ensureLaTeXFormatting(question: QuizQuestion): QuizQuestion {
  const fixLaTeXInText = (text: string): string => {
    if (!text) return text;
    
    // Don't process if already heavily LaTeX formatted
    if (text.includes('$$') || text.match(/\$[^$]+\$/)) {
      return text;
    }
    
    // Fix standalone numbers (but be careful not to break existing formatting)
    text = text.replace(/\b(\d+(?:\.\d+)?)\b(?!\$)/g, '$$$1$$');
    
    // Fix simple variables in mathematical contexts
    text = text.replace(/\b([a-zA-Z])\s*([=+\-*/^<>≤≥])\s*(\d+)/g, '$$1$ $2 $$3$');
    
    // Fix percentages
    text = text.replace(/(\d+(?:\.\d+)?)%/g, '$$$1\\%$$');
    
    return text;
  };
  
  return {
    ...question,
    question: fixLaTeXInText(question.question || ''),
    options: Array.isArray(question.options) 
      ? question.options.map(option => fixLaTeXInText(option || ''))
      : [],
    explanation: fixLaTeXInText(question.explanation || ''),
  };
}

/**
 * Extract JSON from response using clear delimiters (for Bedrock Claude)
 */
function extractJSONWithDelimiters(text: string): { questions: QuizQuestion[] } {
  console.log('Extracting JSON using delimiters...');
  console.log('Response length:', text.length);
  console.log('First 200 chars:', text.substring(0, 200));
  
  // Look for content between <JSON_START> and <JSON_END> delimiters
  const delimiterMatch = text.match(/<JSON_START>\s*([\s\S]*?)\s*<JSON_END>/);
  
  if (delimiterMatch) {
    try {
      const jsonText = delimiterMatch[1].trim();
      console.log('Found JSON between delimiters. Length:', jsonText.length);
      console.log('JSON text preview:', jsonText.substring(0, 300));
      
      const parsed = JSON.parse(jsonText);
      console.log('Successfully parsed JSON with delimiters');
      return parsed;
    } catch (error) {
      console.warn('Failed to parse delimited JSON:', error);
      console.log('Raw delimited content:', delimiterMatch[1]);
    }
  } else {
    console.log('No delimiters found in response. Looking for alternative patterns...');
    
    // Try to find JSON-like content even without proper delimiters
    const jsonStartIndex = text.indexOf('{');
    const jsonEndIndex = text.lastIndexOf('}');
    
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
      const potentialJson = text.substring(jsonStartIndex, jsonEndIndex + 1);
      console.log('Found potential JSON structure:', potentialJson.substring(0, 200));
      
      try {
        const parsed = JSON.parse(potentialJson);
        console.log('Successfully parsed JSON without delimiters');
        return parsed;
      } catch (error) {
        console.warn('Failed to parse potential JSON:', error);
      }
    }
  }
  
  // Fallback to robust extraction if delimiters weren't used properly
  console.log('Falling back to robust extraction method');
  return extractJSONFromResponse(text);
}

/**
 * Robust JSON extraction that handles various formats including markdown code blocks
 */
function extractJSONFromResponse(text: string): { questions: QuizQuestion[] } {
  console.log('Attempting robust JSON extraction...');
  
  // First, try to parse as-is
  try {
    const result = JSON.parse(text);
    console.log('Successfully parsed as direct JSON');
    return result;
  } catch (error) {
    console.log('Direct JSON parse failed:', error);
  }
  
  // Try to extract JSON from markdown code blocks
  const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    try {
      const result = JSON.parse(jsonBlockMatch[1]);
      console.log('Successfully parsed from markdown code block');
      return result;
    } catch (error) {
      console.log('Markdown code block JSON parse failed:', error);
    }
  }
  
  // Try to find JSON-like content between curly braces
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const result = JSON.parse(jsonMatch[0]);
      console.log('Successfully parsed from curly brace extraction');
      return result;
    } catch (error) {
      console.log('Curly brace JSON parse failed:', error);
      console.log('Extracted JSON text:', jsonMatch[0].substring(0, 300));
    }
  }
  
  // Try to extract content after "format:" or similar patterns
  const formatMatch = text.match(/(?:format:|output:|result:)\s*(\{[\s\S]*\})/i);
  if (formatMatch) {
    try {
      const result = JSON.parse(formatMatch[1]);
      console.log('Successfully parsed from format pattern');
      return result;
    } catch (error) {
      console.log('Format pattern JSON parse failed:', error);
    }
  }
  
  // If all else fails, try to clean up the text and parse
  const cleanedText = text
    .replace(/^[^{]*(\{.*\})[^}]*$/, '$1') // Extract JSON object
    .replace(/```json\s*|\s*```/g, '') // Remove markdown
    .replace(/^\s*["']|["']\s*$/g, '') // Remove quotes around the whole thing
    .trim();
  
  try {
    const result = JSON.parse(cleanedText);
    console.log('Successfully parsed after cleanup');
    return result;
  } catch (error) {
    console.error('All JSON parsing methods failed');
    console.error('Final cleaned text:', cleanedText.substring(0, 500));
    console.error('Parse error:', error);
    throw new Error(`Could not extract valid JSON from response. First 500 chars of response: ${text.substring(0, 500)}`);
  }
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

  console.log(`Generating ${numQuestions} questions...`);

  const activeProvider = getActiveAIProvider();
  console.log('Using AI provider:', activeProvider.provider, 'Model:', activeProvider.defaultModel, 'MaxTokens:', activeProvider.maxTokens);
  
  // Special handling for Bedrock Claude models to ensure JSON output
  const isBedrockClaude = activeProvider.provider === 'bedrock' && 
                         activeProvider.defaultModel.includes('claude');
  
  console.log('Is Bedrock Claude:', isBedrockClaude);
  
  // Detect if content is likely mathematical/technical
  const isContentLikelyMathematical = 
    params.content.match(/\d+\s*[+\-*/^=<>≤≥]\s*\d+/) !== null ||
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
    math: isContentLikelyMathematical
  };

  // Count how many types are selected
  const enabledTypesCount = (includeTypes.multipleChoice ? 1 : 0) + 
                           (includeTypes.trueFalse ? 1 : 0) + 
                           (includeTypes.math ? 1 : 0);
  
  // Distribute questions more intelligently based on content and selected types
  let multipleChoiceCount = 0;
  let trueFalseCount = 0;
  let mathCount = 0;
  
  if (enabledTypesCount === 0) {
    multipleChoiceCount = numQuestions;
  } else if (enabledTypesCount === 1) {
    if (includeTypes.multipleChoice) multipleChoiceCount = numQuestions;
    else if (includeTypes.trueFalse) trueFalseCount = numQuestions;
    else if (includeTypes.math) mathCount = numQuestions;
  } else if (enabledTypesCount === 2) {
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
  
  console.log('Question distribution:', { multipleChoiceCount, trueFalseCount, mathCount });
  
  let prompt: string;
  let system: string;
  
  if (isBedrockClaude) {
    // For Bedrock Claude, use simplified prompt with clear delimiters
    system = 'You are a quiz creator. You MUST respond ONLY in JSON format using the specified delimiters. NO conversational text allowed.';
    
    prompt = `🚨 CRITICAL: YOU MUST RESPOND ONLY IN THE EXACT JSON FORMAT BELOW. NO OTHER TEXT. 🚨

You must create exactly ${numQuestions} quiz questions from this content:

${params.content.substring(0, 4000)}

Question distribution:
- ${multipleChoiceCount} multiple choice questions  
- ${trueFalseCount} true/false questions
- ${mathCount} mathematical questions

🚨 MANDATORY RESPONSE FORMAT - NO EXCEPTIONS 🚨

You MUST respond with EXACTLY this structure:

<JSON_START>
{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Your question here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Detailed explanation here"
    }
  ]
}
<JSON_END>

🚨 RULES:
1. START with <JSON_START>
2. END with <JSON_END>
3. NO text before or after the delimiters
4. Valid JSON only between delimiters
5. Use LaTeX for math: $x^2$, $5$, $$\\frac{1}{2}$$

DO NOT write "I'll create" or any conversational text. 
RESPOND ONLY WITH THE JSON FORMAT ABOVE.`;
    
  } else {
    // For other providers, use standard prompting
    system = 'You are a helpful assistant that creates quiz questions in JSON format.';
    
    prompt = `Create ${numQuestions} quiz questions at ${params.difficulty} difficulty level from this content:

${params.content.substring(0, 4000)}

Question distribution:
- ${multipleChoiceCount} multiple choice questions
- ${trueFalseCount} true/false questions  
- ${mathCount} mathematical questions

Use LaTeX formatting for all mathematical content: $x^2$, $5$, $$\\frac{1}{2}$$

Respond in JSON format:
{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Detailed explanation"
    }
  ]
}`;
  }
  
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
        // Use Bedrock Claude 3.7 Sonnet with 128K output tokens
        console.log(`Using Bedrock Claude 3.7 Sonnet with ${activeProvider.maxTokens} max tokens`);
        model = bedrock(activeProvider.defaultModel);
        break;
      default:
        model = openai('gpt-3.5-turbo');
    }
    
    // Use the AI SDK to generate text
    const { text } = await generateText({
      model,
      system,
      prompt,
      temperature: activeProvider.temperature,
      maxTokens: activeProvider.maxTokens
    });

    console.log('AI response received:', text.substring(0, 200) + '...');
    
    if (!text) {
      throw new Error('No response generated by AI');
    }
    
    // Check if the response contains an error message
    if (text.toLowerCase().includes('error') && text.toLowerCase().includes('sorry')) {
      console.error('AI returned an error response:', text);
      throw new Error('AI service returned an error: ' + text.substring(0, 200));
    }

    // Extract JSON using delimiters or fallback methods
    let parsedResponse;
    try {
      if (isBedrockClaude) {
        parsedResponse = extractJSONWithDelimiters(text);
      } else {
        parsedResponse = extractJSONFromResponse(text);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Full AI response text:', text);
      console.error('Response length:', text.length);
      console.error('First 1000 chars:', text.substring(0, 1000));
      console.error('Last 500 chars:', text.substring(Math.max(0, text.length - 500)));
      throw new Error(`AI returned invalid JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}. First 500 chars of response: ${text.substring(0, 500)}`);
    }
    
    // Validate the parsed response structure
    if (!parsedResponse || typeof parsedResponse !== 'object') {
      throw new Error('AI response is not a valid object');
    }
    
    if (!Array.isArray(parsedResponse.questions)) {
      console.error('Invalid response structure:', parsedResponse);
      throw new Error('AI response does not contain a valid questions array');
    }
    
    // Validate each question has required properties
    const validatedQuestions = parsedResponse.questions.filter((question: unknown) => {
      if (!question || typeof question !== 'object') {
        console.warn('Skipping invalid question object:', question);
        return false;
      }
      
      const q = question as Record<string, unknown>;
      
      if (!q.type || !q.question) {
        console.warn('Skipping question with missing required properties:', question);
        return false;
      }
      
      if (!Array.isArray(q.options) || q.options.length === 0) {
        console.warn('Skipping question with invalid options:', question);
        return false;
      }
      
      if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
        console.warn('Skipping question with invalid correctAnswer:', question);
        return false;
      }
      
      if (!q.explanation || typeof q.explanation !== 'string' || q.explanation.trim().length < 10) {
        console.warn('Skipping question with missing or inadequate explanation:', question);
        return false;
      }
      
      return true;
    }) as QuizQuestion[];
    
    if (validatedQuestions.length === 0) {
      throw new Error('No valid questions found in AI response');
    }
    
    // Post-process to ensure LaTeX formatting
    const processedQuestions = validatedQuestions.map((question: QuizQuestion) => {
      return ensureLaTeXFormatting(question);
    });
    
    // Map any 'mathematical' type to 'math'
    const questionsData = {
      questions: processedQuestions.map(q => ({
        ...q,
        type: (typeof q.type === 'string' && q.type.toLowerCase() === 'mathematical') ? 'math' : q.type
      }))
    };
    
    return questionsData;
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

// Generate a smart quiz title using AI
export async function generateQuizTitle(content: string, sourceType: 'youtube' | 'pdf' | 'text' | 'image', existingTitle?: string): Promise<string> {
  try {
    const activeProvider = getActiveAIProviderConfig();
    
    let prompt = '';
    if (sourceType === 'youtube' && existingTitle) {
      prompt = `Create a compelling quiz title for a quiz based on the YouTube video "${existingTitle}". Make it engaging and specific to the video content. Keep it under 60 characters. 

Video content preview:
${content.substring(0, 500)}...

Requirements:
- Engaging and specific
- Under 60 characters  
- Include "Quiz" in the title
- Make it clear what the quiz is about

Respond with ONLY the title, no quotes or extra text.`;
    } else {
      prompt = `Create a compelling quiz title based on this content. Make it engaging and specific to the subject matter. Keep it under 60 characters.

Content preview:
${content.substring(0, 500)}...

Requirements:
- Engaging and specific
- Under 60 characters
- Include "Quiz" in the title  
- Make it clear what the quiz is about

Respond with ONLY the title, no quotes or extra text.`;
    }

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
        model = openai('gpt-3.5-turbo');
    }

    const { text } = await generateText({
      model,
      prompt,
      temperature: 0.7,
      maxTokens: 100
    });

    const generatedTitle = text.trim().replace(/['"]/g, '');
    
    // Validate and clean up the title
    if (generatedTitle && generatedTitle.length > 0 && generatedTitle.length <= 100) {
      return generatedTitle;
    } else {
      throw new Error('Generated title is invalid');
    }
  } catch (error) {
    console.error('Error generating quiz title:', error);
    
    // Fallback title generation
    if (sourceType === 'youtube' && existingTitle) {
      return `${existingTitle} - Quiz`;
    } else {
      return generateFallbackTitle(content, sourceType);
    }
  }
}

// Generate fallback title when AI fails
function generateFallbackTitle(content: string, sourceType: string): string {
  const words = content.trim().split(/\s+/).slice(0, 8).join(' ');
  const cleanWords = words.replace(/[^\w\s]/g, '').substring(0, 40);
  return `${cleanWords} - Quiz` || `${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)} Quiz`;
}

// Generate URL-friendly slug from title
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')  // Remove special chars except spaces and hyphens
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with single
    .replace(/^-|-$/g, '');   // Remove leading/trailing hyphens
}

// Generate unique slug by checking database
export async function generateUniqueSlug(baseTitle: string, quizId?: string): Promise<string> {
  await dbConnect();
  const Quiz = (await import('@/models/Quiz')).default;
  
  let baseSlug = generateSlug(baseTitle);
  if (!baseSlug) {
    baseSlug = 'quiz';
  }
  
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const existingQuiz = await Quiz.findOne({ 
      slug: slug,
      ...(quizId && { _id: { $ne: quizId } }) // Exclude current quiz if updating
    });
    
    if (!existingQuiz) {
      return slug;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
    
    // Prevent infinite loops
    if (counter > 1000) {
      return `${baseSlug}-${Date.now()}`;
    }
  }
} 