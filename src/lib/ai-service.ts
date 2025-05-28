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

// Flag to use mock service during development/testing
// Only use mock service if explicitly set to 'true' in environment variables
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
  // Basic post-processing to catch common LaTeX formatting issues
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
  
  // Look for content between <JSON_START> and <JSON_END> delimiters
  const delimiterMatch = text.match(/<JSON_START>\s*([\s\S]*?)\s*<JSON_END>/);
  
  if (delimiterMatch) {
    try {
      const jsonText = delimiterMatch[1].trim();
      console.log('Found JSON between delimiters:', jsonText.substring(0, 200) + '...');
      return JSON.parse(jsonText);
    } catch {
      console.warn('Failed to parse delimited JSON, trying fallback methods');
    }
  }
  
  // Fallback to robust extraction if delimiters weren't used properly
  console.log('Delimiters not found, falling back to robust extraction');
  return extractJSONFromResponse(text);
}

/**
 * Robust JSON extraction that handles various formats including markdown code blocks
 */
function extractJSONFromResponse(text: string): { questions: QuizQuestion[] } {
  // First, try to parse as-is
  try {
    return JSON.parse(text);
  } catch {
    // Continue to other methods
  }
  
  // Try to extract JSON from markdown code blocks
  const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1]);
    } catch {
      // Continue to other methods
    }
  }
  
  // Try to find JSON-like content between curly braces
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Continue to other methods
    }
  }
  
  // Try to extract content after "format:" or similar patterns
  const formatMatch = text.match(/(?:format:|output:|result:)\s*(\{[\s\S]*\})/i);
  if (formatMatch) {
    try {
      return JSON.parse(formatMatch[1]);
    } catch {
      // Continue to other methods
    }
  }
  
  // If all else fails, try to clean up the text and parse
  const cleanedText = text
    .replace(/^[^{]*(\{.*\})[^}]*$/, '$1') // Extract JSON object
    .replace(/```json\s*|\s*```/g, '') // Remove markdown
    .replace(/^\s*["']|["']\s*$/g, '') // Remove quotes around the whole thing
    .trim();
  
  try {
    return JSON.parse(cleanedText);
  } catch {
    throw new Error(`Could not extract valid JSON from response: ${text.substring(0, 200)}...`);
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
  
  const activeProvider = getActiveAIProviderConfig();
  
  // Special handling for Bedrock Claude models to ensure JSON output
  const isBedrockClaude = activeProvider.provider === 'bedrock' && 
                         activeProvider.defaultModel.includes('claude');
  
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
  
  let prompt: string;
  let system: string;
  
  if (isBedrockClaude) {
    // For Bedrock Claude, use clear delimiters for easy JSON extraction
    system = 'You are an expert quiz creator. You must follow the exact format specified, including all delimiters.';
    
    prompt = `
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
    
    !!!MANDATORY LATEX FORMATTING RULE!!!
    
    EVERY SINGLE MATHEMATICAL EXPRESSION MUST BE IN LATEX FORMAT:
    - ALL numbers: Write $5$ not 5, write $3.14$ not 3.14, write $100$ not 100
    - ALL variables: Write $x$ not x, write $y$ not y, write $n$ not n
    - ALL equations: Write $x = 5$ not x = 5, write $y + 2$ not y + 2
    - ALL formulas: Use $$...$$ for display equations, $...$ for inline math
    - ALL percentages: Write $25\\%$ not 25%, write $50\\%$ not 50%
    - ALL fractions: Write $\\frac{1}{2}$ not 1/2, write $\\frac{a}{b}$ not a/b
    
    You must respond with the exact format below, including the delimiters:

    <JSON_START>
    {
      "questions": [
        {
          "type": "multiple_choice",
          "question": "Question text (use LaTeX for ANY math: $x^2$ or $5$)",
          "options": ["Option A (use LaTeX for math: $2x$)", "Option B", "Option C", "Option D"],
          "correctAnswer": 0,
          "explanation": "Explanation (use LaTeX for ANY math: $x = 5$)"
        }
      ]
    }
    <JSON_END>

    Follow this format exactly, including all delimiters.`;
    
  } else {
    // For other providers, use standard prompting
    system = 'You are a helpful assistant that creates quiz questions.';
    
    prompt = `
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
    
    !!!MANDATORY LATEX FORMATTING RULE!!!
    
    EVERY SINGLE MATHEMATICAL EXPRESSION MUST BE IN LATEX FORMAT:
    - ALL numbers: Write $5$ not 5, write $3.14$ not 3.14, write $100$ not 100
    - ALL variables: Write $x$ not x, write $y$ not y, write $n$ not n
    - ALL equations: Write $x = 5$ not x = 5, write $y + 2$ not y + 2
    - ALL formulas: Use $$...$$ for display equations, $...$ for inline math
    - ALL percentages: Write $25\\%$ not 25%, write $50\\%$ not 50%
    - ALL fractions: Write $\\frac{1}{2}$ not 1/2, write $\\frac{a}{b}$ not a/b
    
    This is ABSOLUTELY CRITICAL for MathJax rendering. Questions without proper LaTeX will display incorrectly.
    
    EXAMPLES OF CORRECT FORMAT:
    ❌ WRONG: "If x equals 5 and y equals 3..."
    ✅ CORRECT: "If $x$ equals $5$ and $y$ equals $3$..."
    
    ❌ WRONG: "The answer is 42"
    ✅ CORRECT: "The answer is $42$"
    
    ❌ WRONG: "Calculate 2 + 3"
    ✅ CORRECT: "Calculate $2 + 3$"
    
    For multiple choice questions:
    1. Create a clear, concise question
    2. If the question contains ANY mathematical content (numbers, variables, equations), wrap it in LaTeX
    3. Provide 4 possible answers with only 1 correct option
    4. If any answer option contains mathematical content, wrap it in LaTeX delimiters
    5. Mark which answer is correct (0-3 index)
    6. Include a DETAILED explanation for why the answer is correct AND why other options are wrong
    7. If the explanation contains ANY mathematical content, format it with LaTeX
    
    For true/false questions:
    1. Create a clear statement that is either true or false
    2. If the statement contains ANY mathematical content, wrap it in LaTeX
    3. Indicate whether the statement is true or false
    4. Provide a COMPREHENSIVE explanation for the correct answer, including reasoning
    5. If the explanation contains ANY mathematical content, format it with LaTeX
    
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
    8. Include a STEP-BY-STEP detailed breakdown of the solution where EVERY step uses proper LaTeX formatting
    
    ⚠️ EXPLANATION REQUIREMENTS ⚠️
    
    Every explanation must be:
    - DETAILED and EDUCATIONAL: Don't just state the answer, explain the reasoning process
    - STEP-BY-STEP: Break down complex solutions into clear steps
    - COMPREHENSIVE: Address why the correct answer is right AND why other options are wrong (for multiple choice)
    - CONTEXTUAL: Connect the answer back to the source material when possible
    - PROPERLY FORMATTED: Use LaTeX for all mathematical content
    
    Examples of GOOD explanations:
    ✅ "The correct answer is $x = 5$ because when we substitute this value into the original equation $2x + 3 = 13$, we get $2(5) + 3 = 10 + 3 = 13$, which is true. The other options would not satisfy the equation."
    
    ✅ "This statement is true. According to the fundamental theorem of calculus, the derivative of $f(x) = x^3$ is found using the power rule: $\\frac{d}{dx}[x^n] = nx^{n-1}$. Therefore, $\\frac{d}{dx}[x^3] = 3x^{3-1} = 3x^2$."
    
    Examples of BAD explanations:
    ❌ "The answer is A."
    ❌ "This is correct."
    ❌ "Use the formula."
    
    Format your response as a JSON object with this structure:
    {
      "questions": [
        {
          "type": "multiple_choice",
          "question": "Question text (use LaTeX for ANY math: $x^2$ or $5$)",
          "options": ["Option A (use LaTeX for math: $2x$)", "Option B", "Option C", "Option D"],
          "correctAnswer": 0,
          "explanation": "Explanation (use LaTeX for ANY math: $x = 5$)"
        },
        {
          "type": "true_false",
          "question": "Statement with math: The value of $x$ is $5$ (always LaTeX for numbers/variables)",
          "options": ["True", "False"],
          "correctAnswer": 0,
          "isTrue": true,
          "explanation": "Explanation with math: $x = 5$ because... (always LaTeX)"
        },
        {
          "type": "math",
          "question": "Math problem question with LaTeX: Solve $x^2 + 5x = 0$",
          "formula": "$$x^2 + 5x = 0$$",
          "options": ["$x = 0, -5$", "$x = 0, 5$", "$x = 1, -5$", "$x = -1, 5$"],
          "correctAnswer": 0,
          "explanation": "Full solution: $$x^2 + 5x = 0$$ $$x(x + 5) = 0$$ So $x = 0$ or $x = -5$"
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
      "explanation": "Using the quadratic formula: $$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$ With $a=1$, $b=12$, and $c=35$: $$x = \\frac{-12 \\pm \\sqrt{12^2-4 \\cdot 1 \\cdot 35}}{2 \\cdot 1} = \\frac{-12 \\pm \\sqrt{144-140}}{2} = \\frac{-12 \\pm \\sqrt{4}}{2}$$ This gives us $x = \\frac{-12+2}{2} = -5$ or $x = \\frac{-12-2}{2} = -7$"
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
    
    Example of a multiple choice question with math content (NON-math type but contains mathematical expressions):
    {
      "type": "multiple_choice",
      "question": "If a function has a slope of $m = 2$ and passes through point $(1, 3)$, what is its equation?",
      "options": ["$y = 2x + 1$", "$y = 2x + 3$", "$y = x + 2$", "$y = 3x + 1$"],
      "correctAnswer": 0,
      "explanation": "Using point-slope form: $y - y_1 = m(x - x_1)$. With $m = 2$ and point $(1, 3)$: $y - 3 = 2(x - 1)$, which simplifies to $y = 2x + 1$."
    }
    
    Example of a true/false question with math content:
    {
      "type": "true_false",
      "question": "The derivative of $f(x) = x^3$ is $f'(x) = 3x^2$.",
      "options": ["True", "False"],
      "correctAnswer": 0,
      "isTrue": true,
      "explanation": "This is true. Using the power rule: $\\frac{d}{dx}[x^n] = nx^{n-1}$, so $\\frac{d}{dx}[x^3] = 3x^{3-1} = 3x^2$."
    }
    
    ⚠️ FINAL CRITICAL REMINDER ⚠️
    
    Before submitting your response, VERIFY that:
    1. ALL numbers are in LaTeX: $5$, $3.14$, $100$, etc.
    2. ALL variables are in LaTeX: $x$, $y$, $n$, etc.
    3. ALL equations are in LaTeX: $x = 5$, $y + 2$, etc.
    4. ALL percentages are in LaTeX: $25\\%$, $50\\%$, etc.
    5. ALL mathematical expressions use proper LaTeX syntax
    
    Questions that fail to follow this formatting will be UNUSABLE by the application.
    Every mathematical element MUST be wrapped in $ or $$ delimiters for MathJax rendering.
  `;
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
        model = bedrock(activeProvider.defaultModel);
        break;
      default:
        // Fallback to OpenAI
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

    // Extract JSON using delimiters or fallback methods
    let parsedResponse;
    try {
      if (isBedrockClaude) {
        parsedResponse = extractJSONWithDelimiters(text);
      } else {
        parsedResponse = extractJSONFromResponse(text);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', text.substring(0, 300), parseError);
      throw new Error('AI returned invalid JSON response');
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
    
    return {
      questions: processedQuestions
    };
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