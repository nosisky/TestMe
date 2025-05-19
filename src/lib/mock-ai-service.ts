import { IQuizQuestion } from '@/models/Quiz';

interface GenerateQuestionsParams {
  content: string;
  numQuestions: number;
  difficulty: string;
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

// Template questions by content type
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

// Generate mock quiz questions based on content
export async function generateMockQuizQuestions(params: GenerateQuestionsParams): Promise<QuizQuestionsResponse> {
  // Ensure numQuestions is a number
  const numQuestions = typeof params.numQuestions === 'string' 
    ? parseInt(params.numQuestions) 
    : params.numQuestions;
    
  console.log(`Mock AI Service - Generating ${numQuestions} questions at ${params.difficulty} difficulty`);
  
  // Extract topics to make questions more relevant to the content
  const topics = extractTopics(params.content);
  
  // Determine if it's likely YouTube or PDF content
  const templates = params.content.includes('video') || params.content.includes('watch') || params.content.includes('YouTube')
    ? youtubeQuestionTemplates
    : pdfQuestionTemplates;
  
  // Generate the requested number of questions
  const questions: IQuizQuestion[] = [];
  
  for (let i = 0; i < numQuestions; i++) {
    // Select a random template and topic
    const templateIndex = Math.floor(Math.random() * templates.length);
    const template = templates[templateIndex];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const topic2 = topics[Math.floor(Math.random() * topics.length)];
    
    // Create the question
    const question = template
      .replace('{topic}', topic)
      .replace('{topic2}', topic2);
    
    // Generate options based on difficulty
    const options = generateOptions(topic, params.difficulty);
    
    // Randomize which option is correct
    const correctAnswer = Math.floor(Math.random() * 4);
    
    // Add explanation
    const explanation = `This is the correct answer because it accurately describes ${topic} as presented in the ${params.content.includes('video') ? 'video' : 'document'}.`;
    
    questions.push({
      question,
      options,
      correctAnswer,
      explanation
    });
  }
  
  return { questions };
}

// Generate plausible options based on topic and difficulty
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