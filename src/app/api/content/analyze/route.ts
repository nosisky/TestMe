import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { deepseek } from '@ai-sdk/deepseek';
import { bedrock } from '@ai-sdk/amazon-bedrock';
import pdf from 'pdf-parse';
import { YoutubeTranscript } from 'youtube-transcript';
import dbConnect from '@/lib/mongodb';
import AIConfig, { initializeAIConfigs } from '@/models/AIConfig';

// Flag to use mock service during development/testing
const USE_MOCK_SERVICE = process.env.USE_MOCK_AI === 'true';

// Get active AI provider from database
async function getActiveAIProvider() {
  await dbConnect();
  
  // Initialize default configs if needed
  await initializeAIConfigs();
  
  // Get the active provider configuration
  const activeConfig = await AIConfig.findOne({ isActive: true });

  // Fallback to environment variable or OpenAI if no active provider
  if (!activeConfig) {
    const defaultProvider = process.env.DEFAULT_AI_PROVIDER || 'openai';
    
    const fallbackConfig = await AIConfig.findOne({ provider: defaultProvider });
    
    if (!fallbackConfig) {
      throw new Error('No AI provider configuration found');
    }
    return fallbackConfig;
  }
  
  return activeConfig;
}

export async function POST(request: NextRequest) {
  try {
    console.log('Content analysis request received');
    const contentType = request.headers.get('content-type');
    let analysisData;

    if (contentType?.includes('multipart/form-data')) {
      // Handle file uploads (PDF, Image)
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const type = formData.get('type') as string;

      console.log(`Processing ${type} file: ${file?.name}, size: ${file?.size}`);

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      // Extract content from file
      let extractedContent = '';
      try {
        if (type === 'pdf') {
          extractedContent = await extractTextFromPDF(file);
        } else if (type === 'image') {
          extractedContent = await extractTextFromImage(file);
        }
      } catch (extractionError) {
        console.error('Content extraction failed:', extractionError);
        return NextResponse.json({ 
          error: `Content extraction failed: ${extractionError instanceof Error ? extractionError.message : 'Unknown error'}` 
        }, { status: 400 });
      }

      console.log(`Extracted content length: ${extractedContent.length}`);
      console.log(`Content preview: ${extractedContent.substring(0, 200)}...`);

      if (!extractedContent || extractedContent.length < 20) {
        return NextResponse.json({ error: 'Could not extract meaningful content from file' }, { status: 400 });
      }

      analysisData = await analyzeContentWithAI(extractedContent, type);
    } else {
      // Handle JSON requests (YouTube, Text)
      const body = await request.json();
      const { type, videoId, content } = body;

      console.log(`Processing ${type} content`);

      if (type === 'youtube') {
        if (!videoId) {
          return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
        }
        console.log(`Fetching transcript for video: ${videoId}`);
        
        let videoContent;
        try {
          videoContent = await getYouTubeTranscript(videoId);
        } catch (transcriptError) {
          console.error('YouTube transcript failed:', transcriptError);
          return NextResponse.json({ 
            error: `YouTube transcript extraction failed: ${transcriptError instanceof Error ? transcriptError.message : 'Unknown error'}. The video may not have captions available.` 
          }, { status: 400 });
        }
        
        console.log(`YouTube content length: ${videoContent.length}`);
        console.log(`YouTube content preview: ${videoContent.substring(0, 200)}...`);
        analysisData = await analyzeContentWithAI(videoContent, type);
      } else if (type === 'text') {
        if (!content) {
          return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
        }
        console.log(`Text content length: ${content.length}`);
        console.log(`Text content preview: ${content.substring(0, 200)}...`);
        analysisData = await analyzeContentWithAI(content, type);
      } else {
        return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
      }
    }

    console.log('Analysis completed:', analysisData);
    return NextResponse.json(analysisData);
  } catch (error) {
    console.error('Content analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze content' },
      { status: 500 }
    );
  }
}

async function analyzeContentWithAI(content: string, sourceType: string) {
  try {
    console.log(`Starting AI analysis for ${sourceType} content (${content.length} characters)`);
    
    // Use mock service when explicitly set to true in environment variables
    if (USE_MOCK_SERVICE) {
      console.debug("Using mock analysis for content analysis");
      return generateFallbackAnalysis(sourceType);
    }
    
    const activeProvider = await getActiveAIProvider();
    
    const prompt = `You are an expert educational analyst. Analyze the following ${sourceType} content and provide:

1. **Key Topics**: Identify 4-6 main learning concepts, topics, or themes that are covered
2. **Knowledge Gaps**: Identify 4-6 specific areas where students typically struggle or need deeper understanding

Be specific and actionable. Focus on concepts that would benefit from targeted practice questions.

Content to analyze:
"${content.substring(0, 3000)}"

Respond in JSON format:
{
  "keyTopics": ["specific topic 1", "specific topic 2", "specific topic 3", "specific topic 4"],
  "knowledgeGaps": ["specific gap 1", "specific gap 2", "specific gap 3", "specific gap 4"]
}`;

    console.log('Sending request to AI service...');
    
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
      system: 'You are a helpful educational analyst that creates content analysis.',
      prompt,
      temperature: activeProvider.temperature,
      maxTokens: activeProvider.maxTokens
    });

    console.log('AI response received:', text);
    
    if (!text) {
      throw new Error('No analysis generated by AI');
    }

    // Parse JSON response
    let analysis;
    try {
      analysis = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', text, parseError);
      throw new Error('AI returned invalid JSON response');
    }
    
    const result = {
      keyTopics: analysis.keyTopics || [],
      knowledgeGaps: analysis.knowledgeGaps || []
    };
    
    console.log('Analysis result:', result);
    return result;
  } catch (error) {
    console.error('AI analysis error:', error);
    // Only use fallback as last resort and log it clearly
    console.log('Using fallback analysis due to AI failure');
    return generateFallbackAnalysis(sourceType);
  }
}

async function getYouTubeTranscript(videoId: string): Promise<string> {
  try {
    console.log(`Attempting to fetch transcript for video: ${videoId}`);
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const fullText = transcript.map(item => item.text).join(' ');
    
    console.log(`Raw transcript length: ${fullText.length}`);
    
    if (!fullText || fullText.length < 50) {
      throw new Error('Transcript too short or empty');
    }
    
    return fullText;
  } catch (error) {
    console.error('YouTube transcript error:', error);
    // Instead of fallback, throw the error so we can handle it properly
    throw new Error(`Could not fetch YouTube transcript: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractTextFromPDF(file: File): Promise<string> {
  try {
    console.log(`Extracting text from PDF: ${file.name}`);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = await pdf(buffer);
    
    console.log(`PDF text length: ${data.text?.length || 0}`);
    
    if (!data.text || data.text.length < 50) {
      throw new Error('PDF text too short or empty');
    }
    
    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    // Instead of fallback, throw the error so we can handle it properly
    throw new Error(`Could not extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractTextFromImage(file: File): Promise<string> {
  try {
    console.log(`Extracting text from image: ${file.name}`);
    
    // Use mock service when explicitly set to true in environment variables
    if (USE_MOCK_SERVICE) {
      console.debug("Using mock service for image text extraction");
      return `Mock extracted text from image: ${file.name}. This image contains educational content with key concepts and information that students need to understand.`;
    }
    
    const activeProvider = await getActiveAIProvider();
    
    // Convert image to base64 for AI vision processing
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type;

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
        model = openai('gpt-4o-mini'); // Use a vision-capable model
    }

    // Use the AI SDK to extract text from image
    const { text } = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all text content from this image. If it contains educational material, diagrams, or study content, describe the key concepts and information presented. Be detailed and comprehensive.'
            },
            {
              type: 'image',
              image: `data:${mimeType};base64,${base64}`
            }
          ]
        }
      ],
      maxTokens: activeProvider.maxTokens
    });

    console.log(`Image text extraction length: ${text.length}`);
    
    if (!text || text.length < 20) {
      throw new Error('Could not extract meaningful text from image');
    }
    
    return text;
  } catch (error) {
    console.error('Image text extraction error:', error);
    throw new Error(`Could not extract text from image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function generateFallbackAnalysis(sourceType: string) {
  // Fallback data if AI analysis fails
  const fallbackData = {
    youtube: {
      keyTopics: [
        "Video content main concepts",
        "Key learning objectives", 
        "Practical applications",
        "Important terminology"
      ],
      knowledgeGaps: [
        "Understanding complex explanations",
        "Connecting theory to practice",
        "Remembering key details"
      ]
    },
    text: {
      keyTopics: [
        "Core concepts and definitions",
        "Key principles and theories",
        "Practical applications",
        "Critical analysis points"
      ],
      knowledgeGaps: [
        "Deeper conceptual understanding",
        "Application to new scenarios",
        "Synthesis of information"
      ]
    },
    pdf: {
      keyTopics: [
        "Document main themes",
        "Key arguments and evidence",
        "Supporting examples",
        "Conclusions and implications"
      ],
      knowledgeGaps: [
        "Understanding complex sections",
        "Connecting ideas across chapters",
        "Critical evaluation skills"
      ]
    },
    image: {
      keyTopics: [
        "Visual information elements",
        "Key relationships shown",
        "Context and background",
        "Analytical observations"
      ],
      knowledgeGaps: [
        "Interpreting visual data",
        "Understanding symbols/diagrams",
        "Connecting visuals to concepts"
      ]
    }
  };

  return fallbackData[sourceType as keyof typeof fallbackData] || fallbackData.text;
} 