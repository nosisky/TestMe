import { IQuizQuestion } from '@/models/Quiz';

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

interface QuizQuestionsResponse {
  questions: IQuizQuestion[];
}

// Extract key topics from content to make more relevant questions
function extractTopics(content: string): string[] {
  const words = content.split(/\s+/).filter(word => word.length > 4);
  const wordFrequency: Record<string, number> = {};
  
  words.forEach(word => {
    const normalizedWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalizedWord && normalizedWord.length > 4) {
      wordFrequency[normalizedWord] = (wordFrequency[normalizedWord] || 0) + 1;
    }
  });
  
  // Get top 5 most frequent words as topics
  return Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(entry => entry[0]);
}

// Template questions by content type and question type
const youtubeQuestionTemplates = [
  "What is the main topic discussed in this video?",
  "According to the video, what is the primary reason for {topic}?",
  "Which of the following best describes the concept of {topic}?",
  "What did the presenter identify as the most important aspect of {topic}?",
  "Which technique was recommended for improving {topic}?",
  "What was mentioned as a common misconception about {topic}?",
  "When did the presenter suggest implementing {topic}?",
  "Who was credited with pioneering the concept of {topic}?",
  "What example was used to illustrate {topic}?",
  "What was the conclusion regarding {topic}?"
];

const pdfQuestionTemplates = [
  "What does the document state about {topic}?",
  "According to the text, what is the definition of {topic}?",
  "Which of the following is described as a key component of {topic}?",
  "What relationship exists between {topic} and {topic2}?",
  "Which methodology is recommended for {topic}?",
  "What is identified as a limitation of {topic}?",
  "In what context is {topic} most effective according to the document?",
  "What evidence supports the effectiveness of {topic}?",
  "Which statement about {topic} is supported by the text?",
  "What future development is predicted for {topic}?"
];

const trueFalseTemplates = [
  "{topic} is the primary focus of this content.",
  "The content suggests that {topic} is more effective than {topic2}.",
  "According to the content, {topic} was developed before {topic2}.",
  "The content identifies {topic} as a critical component of {topic2}.",
  "The author recommends using {topic} in all situations.",
  "The content states that {topic} is universally accepted in the field.",
  "Research supports the effectiveness of {topic} according to this content.",
  "The content mentions that {topic} has significant limitations.",
  "The content suggests that {topic} will become more important in the future.",
  "The author has directly worked with {topic} based on the content."
];

const mathQuestionTemplates = [
  "If {topic} increases by x%, what happens to {topic2}?",
  "What is the probability of {topic} occurring in a system with n components?",
  "If there are x instances of {topic} and y instances of {topic2}, what is their ratio?",
  "How many {topic} elements would be needed to achieve optimal {topic2}?",
  "If {topic} grows exponentially at rate r, when will it double?",
  "What is the average number of {topic} instances in a typical {topic2} scenario?",
  "If {topic} has a success rate of p, what is the expected number of attempts needed?",
  "What is the standard deviation of {topic} measurements in the given context?",
  "If {topic} follows a normal distribution, what is the probability it exceeds value k?",
  "What is the optimal balance between {topic} and {topic2} according to the formula?"
];

// Generate mock quiz questions based on content
export async function generateMockQuizQuestions(params: GenerateQuestionsParams): Promise<QuizQuestionsResponse> {
  // Ensure numQuestions is a number
  const numQuestions = typeof params.numQuestions === 'string' 
    ? parseInt(params.numQuestions) 
    : params.numQuestions;
    
  console.log(`Mock AI Service - Generating ${numQuestions} questions at ${params.difficulty} difficulty`);
  
  // Extract topics to make questions more relevant to the content
  const topics = extractTopics(params.content);
  
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
  
  console.log(`Mock AI Service - Content analysis: Is mathematical - ${isContentLikelyMathematical}`);
  
  // Base includeTypes on user selection but override math based on content analysis
  const includeTypes = {
    multipleChoice: params.includeTypes?.multipleChoice ?? true,
    trueFalse: params.includeTypes?.trueFalse ?? true,
    math: isContentLikelyMathematical // Override math type based on content analysis
  };
  
  // If no question types are selected, default to multiple choice
  if (!includeTypes.multipleChoice && !includeTypes.trueFalse && !includeTypes.math) {
    includeTypes.multipleChoice = true;
  }
  
  // Calculate question distribution
  let multipleChoiceCount = 0;
  let trueFalseCount = 0;
  let mathCount = 0;
  
  // Count enabled types
  const enabledTypesCount = (includeTypes.multipleChoice ? 1 : 0) + 
                           (includeTypes.trueFalse ? 1 : 0) + 
                           (includeTypes.math ? 1 : 0);
  
  // Distribute questions based on enabled types
  if (enabledTypesCount === 1) {
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
    // If all three types are selected, distribute with priority to multiple choice
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
  
  console.log(`Mock AI Service - Question distribution: MC=${multipleChoiceCount}, TF=${trueFalseCount}, Math=${mathCount}`);
  
  // Determine if it's likely YouTube or PDF content for multiple choice questions
  const isYouTubeContent = params.content.includes('video') || 
                         params.content.includes('watch') || 
                         params.content.includes('YouTube');
  
  const multipleChoiceTemplates = isYouTubeContent ? youtubeQuestionTemplates : pdfQuestionTemplates;
  
  // Generate the questions
  const questions: IQuizQuestion[] = [];
  
  // Generate Multiple Choice questions
  for (let i = 0; i < multipleChoiceCount; i++) {
    const template = multipleChoiceTemplates[Math.floor(Math.random() * multipleChoiceTemplates.length)];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const topic2 = topics[Math.floor(Math.random() * topics.length)];
    
    const question = template
      .replace('{topic}', topic)
      .replace('{topic2}', topic2);
    
    const options = generateOptions(topic, params.difficulty);
    const correctAnswer = Math.floor(Math.random() * 4);
    const explanation = `This is the correct answer because it accurately describes ${topic} as presented in the ${isYouTubeContent ? 'video' : 'document'}.`;
    
    questions.push({
      type: 'multiple_choice',
      question,
      options,
      correctAnswer,
      explanation
    });
  }
  
  // Generate True/False questions
  for (let i = 0; i < trueFalseCount; i++) {
    const template = trueFalseTemplates[Math.floor(Math.random() * trueFalseTemplates.length)];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const topic2 = topics[Math.floor(Math.random() * topics.length)];
    
    const question = template
      .replace('{topic}', topic)
      .replace('{topic2}', topic2);
    
    const isTrue = Math.random() > 0.5;
    const correctAnswer = isTrue ? 0 : 1; // 0 for True, 1 for False
    const options = ["True", "False"];
    const explanation = `This statement is ${isTrue ? 'true' : 'false'} because ${isTrue ? 'it accurately reflects' : 'it contradicts'} the information about ${topic} in the content.`;
    
    questions.push({
      type: 'true_false',
      question,
      options,
      correctAnswer,
      explanation,
      isTrue
    });
  }
  
  // Generate Math questions
  for (let i = 0; i < mathCount; i++) {
    const template = mathQuestionTemplates[Math.floor(Math.random() * mathQuestionTemplates.length)];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const topic2 = topics[Math.floor(Math.random() * topics.length)];
    
    const question = template
      .replace('{topic}', topic)
      .replace('{topic2}', topic2);
    
    // Generate a simple formula for demonstration
    const formulas = [
      "$$\\frac{x}{y} = z$$",
      "$$\\sqrt{x^2 + y^2} = z$$",
      "$$\\sum_{i=1}^{n} x_i = y$$",
      "$$P(x) = \\frac{1}{\\sqrt{2\\pi\\sigma^2}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}$$",
      "$$\\int_{a}^{b} f(x) dx = F(b) - F(a)$$",
      "$$E = mc^2$$",
      "$$F = G\\frac{m_1 m_2}{r^2}$$",
      "$$PV = nRT$$"
    ];
    
    const formula = formulas[Math.floor(Math.random() * formulas.length)];
    const options = generateMathOptions(topic, params.difficulty);
    const correctAnswer = Math.floor(Math.random() * 4);
    
    // Generate a more mathematical explanation with LaTeX
    const explanations = [
      `This is the correct solution because when we apply the formula $$${topic}$$, we get $${options[correctAnswer].replace(/^\$|\$$/g, '')}$.`,
      `By using the property of $${topic}$ with respect to $${topic2}$, we find that $${options[correctAnswer].replace(/^\$|\$$/g, '')}$ is the only valid answer.`,
      `The solution comes from applying the formula $$${formula.replace(/^\$\$|\$\$$/g, '')}$$ to the problem, which yields $${options[correctAnswer].replace(/^\$|\$$/g, '')}$.`,
      `When we solve for the unknown variable in $$${formula.replace(/^\$\$|\$\$$/g, '')}$$, we get $${options[correctAnswer].replace(/^\$|\$$/g, '')}$ through algebraic manipulation.`
    ];
    
    const explanation = explanations[Math.floor(Math.random() * explanations.length)];
    
    questions.push({
      type: 'math',
      question,
      options,
      correctAnswer,
      explanation,
      formula
    });
  }
  
  // Shuffle the questions for variety
  return { questions: shuffleArray(questions) };
}

// Shuffle an array (Fisher-Yates algorithm)
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Generate plausible options based on topic and difficulty for multiple choice
function generateOptions(topic: string, difficulty: string): string[] {
  // Create base options
  const baseOptions = [
    `The primary aspect of ${topic}`,
    `A secondary feature of ${topic}`,
    `An alternative approach to ${topic}`,
    `A misconception about ${topic}`
  ];
  
  // Adjust difficulty by making options more similar/different
  if (difficulty === 'easy') {
    return [
      `The clear and definitive explanation of ${topic}`,
      `Something completely unrelated to ${topic}`,
      `An obviously incorrect statement about ${topic}`,
      `A tangentially related concept to ${topic}`
    ];
  } else if (difficulty === 'hard') {
    return [
      `The nuanced interpretation of ${topic} in specific contexts`,
      `The application of ${topic} in complex scenarios`,
      `The theoretical framework underlying ${topic}`,
      `The multifaceted implementation of ${topic}`
    ];
  }
  
  // Medium difficulty (default)
  return baseOptions;
}

// Generate math-specific options
function generateMathOptions(topic: string, difficulty: string): string[] {
  const variables = ['x', 'y', 'z', 'n', 'p', 'r'];
  const variable = variables[Math.floor(Math.random() * variables.length)];
  
  // Functions to generate random values
  const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const randomFloat = (min: number, max: number) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
  
  if (difficulty === 'easy') {
    return [
      `$${randomInt(1, 10)}$`,
      `$${randomInt(11, 20)}$`,
      `$${randomInt(21, 30)}$`,
      `$${randomInt(31, 40)}$`
    ];
  } else if (difficulty === 'hard') {
    return [
      `$${variable} = ${randomFloat(0.01, 0.99)}$`,
      `$${variable} = ${randomFloat(1, 9.99)}$`,
      `$${variable} = \\sqrt{${randomInt(2, 10)}}$`,
      `$${variable} = \\frac{${randomInt(1, 10)}}{${randomInt(2, 10)}}$`
    ];
  }
  
  // Medium difficulty (default)
  return [
    `$${randomInt(1, 100)}\\%$`,
    `$${randomFloat(0.1, 9.9)}$`,
    `$\\frac{1}{${randomInt(2, 10)}}$`,
    `$${randomInt(1, 20)} \\times ${randomInt(1, 10)}$`
  ];
} 