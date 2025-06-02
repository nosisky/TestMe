import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { deepseek } from '@ai-sdk/deepseek';
import { bedrock } from '@ai-sdk/amazon-bedrock';
import { Innertube } from 'youtubei.js/web';
import { google } from 'googleapis';
import pdf from 'pdf-parse';
import { getActiveAIProvider } from '@/lib/ai-config';

// Flag to use mock service during development/testing
const USE_MOCK_SERVICE = process.env.USE_MOCK_AI === 'true';

// YouTube API setup
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

// Define interface for transcript segments
interface TranscriptSegment {
  snippet?: {
    text?: string;
  };
}

// Get active AI provider from configuration
function getActiveAIProviderConfig() {
  return getActiveAIProvider();
}

export async function POST(request: NextRequest) {
  try {
    console.log('Content analysis request received');
    const contentType = request.headers.get('content-type');
    let analysisData;
    let extractedContent = '';

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
        extractedContent = videoContent;
        analysisData = await analyzeContentWithAI(videoContent, type);
      } else if (type === 'text') {
        if (!content) {
          return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
        }
        console.log(`Text content length: ${content.length}`);
        console.log(`Text content preview: ${content.substring(0, 200)}...`);
        extractedContent = content;
        analysisData = await analyzeContentWithAI(content, type);
      } else {
        return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
      }
    }

    console.log('Analysis completed:', analysisData);
    // Return both analysis data and extracted content for reuse in quiz generation
    return NextResponse.json({
      ...analysisData,
      extractedContent
    });
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
    
    const activeProvider = getActiveAIProviderConfig();
    
    // Special handling for Bedrock Claude models to ensure JSON output
    const isBedrockClaude = activeProvider.provider === 'bedrock' && 
                           activeProvider.defaultModel.includes('claude');
    
    let prompt: string;
    let system: string;
    
    if (isBedrockClaude) {
      // For Bedrock Claude, use clear delimiters for easy JSON extraction
      system = 'You are an expert educational analyst. You must follow the exact format specified, including all delimiters.';
      
      prompt = `Analyze the following ${sourceType} content and identify:
1. Key Topics: 4-6 main learning concepts or themes
2. Knowledge Gaps: 4-6 areas where students typically struggle

Content: "${content.substring(0, 3000)}"

You must respond with the exact format below, including the delimiters:

<JSON_START>
{
  "keyTopics": ["topic 1", "topic 2", "topic 3", "topic 4"],
  "knowledgeGaps": ["gap 1", "gap 2", "gap 3", "gap 4"]
}
<JSON_END>

Be specific and actionable in your topics and gaps.`;
      
    } else {
      // For other providers, use standard prompting
      system = 'You are a helpful educational analyst that creates content analysis.';
      
      prompt = `You are an expert educational analyst. Analyze the following ${sourceType} content and provide:

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
    }

    
    // Create model configuration based on active provider
    let model;
    
    console.log('Active provider:', activeProvider);
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
    const result = await generateText({
      model,
      system,
      prompt,
      temperature: activeProvider.temperature,
      maxTokens: activeProvider.maxTokens
    });

    const text = result.text;
    
    if (!text) {
      throw new Error('No analysis generated by AI');
    }

    // Extract JSON using delimiters or fallback methods
    let analysis;
    try {
      if (isBedrockClaude) {
        analysis = extractJSONWithDelimiters(text);
      } else {
        analysis = extractJSONFromResponse(text);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', text, parseError);
      throw new Error('AI returned invalid JSON response');
    }
    
    const resultData = {
      keyTopics: analysis.keyTopics || [],
      knowledgeGaps: analysis.knowledgeGaps || []
    };
    
    console.log('Analysis result:', resultData);
    return resultData;
  } catch (error) {
    console.error('AI analysis error:', error);
    // Only use fallback as last resort and log it clearly
    console.log('Using fallback analysis due to AI failure');
    return generateFallbackAnalysis(sourceType);
  }
}

/**
 * Extract JSON from response using clear delimiters (for Bedrock Claude)
 */
function extractJSONWithDelimiters(text: string): { keyTopics: string[]; knowledgeGaps: string[] } {
  console.log('Extracting JSON using delimiters...');
  
  // Look for content between <JSON_START> and <JSON_END> delimiters
  const delimiterMatch = text.match(/<JSON_START>\s*([\s\S]*?)\s*<JSON_END>/);
  
  if (delimiterMatch) {
    try {
      const jsonText = delimiterMatch[1].trim();
      console.log('Found JSON between delimiters:', jsonText);
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
function extractJSONFromResponse(text: string): { keyTopics: string[]; knowledgeGaps: string[] } {
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
  // Use non-dotall regex for better compatibility
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

async function getYouTubeTranscript(videoId: string): Promise<string> {
  try {
    console.log(`Attempting to fetch transcript for video: ${videoId}`);
    
    // Method 1: Try YouTube API captions (for videos you have access to)
    try {
      const apiTranscript = await getTranscriptFromAPI(videoId);
      if (apiTranscript) {
        console.log(`Successfully fetched via YouTube API (${apiTranscript.length} chars)`);
        if (apiTranscript.length >= 50) {
          return apiTranscript;
        }
      }
    } catch (error) {
      console.log(`YouTube API method failed:`, error instanceof Error ? error.message : 'Unknown error');
    }
    
    // Method 2: Try youtubei.js (for public videos)
    try {
      const scrapedTranscript = await getTranscriptFromScraping(videoId);
      if (scrapedTranscript && scrapedTranscript.length >= 50) {
        console.log(`Successfully fetched via scraping (${scrapedTranscript.length} chars)`);
        return scrapedTranscript;
      }
    } catch (error) {
      console.log(`Scraping method failed:`, error instanceof Error ? error.message : 'Unknown error');
    }
    
    throw new Error('No transcript available for this video');
  } catch (error) {
    console.error('YouTube transcript error:', error);
    throw new Error(`Could not fetch YouTube transcript: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Method 1: Use official YouTube API for captions (requires permission)
async function getTranscriptFromAPI(videoId: string): Promise<string | null> {
  try {
    // First, list available captions
    const captionResponse = await youtube.captions.list({
      part: ['snippet'],
      videoId: videoId,
    });

    if (!captionResponse.data.items || captionResponse.data.items.length === 0) {
      return null; // No captions available via API
    }

    // Find the best caption track (prefer English, then any language)
    const captions = captionResponse.data.items;
    const bestCaption = captions.find(caption => 
      caption.snippet?.language === 'en' || caption.snippet?.language === 'en-US'
    ) || captions[0];

    if (!bestCaption?.id) {
      return null;
    }

    // Download the caption content
    const captionContent = await youtube.captions.download({
      id: bestCaption.id,
      tfmt: 'srt', // Get in SRT format
    });

    if (captionContent.data && typeof captionContent.data === 'string') {
      // Parse SRT format to extract just the text
      const transcript = parseSRTToText(captionContent.data);
      return transcript;
    }

    return null;
  } catch (error) {
    // This will typically fail for videos you don't own
    console.log(`YouTube API caption access denied or unavailable:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

// Method 2: Use youtubei.js for scraping
async function getTranscriptFromScraping(videoId: string): Promise<string | null> {
  try {
    // Create Innertube instance
    const youtube = await Innertube.create({
      lang: 'en',
      location: 'US',
      retrieve_player: false,
    });
    
    // Get video info and transcript
    const info = await youtube.getInfo(videoId);
    const transcriptData = await info.getTranscript();
    
    if (!transcriptData || !transcriptData.transcript?.content?.body?.initial_segments) {
      return null;
    }
    
    // Extract transcript text from segments
    const fullText = transcriptData.transcript.content.body.initial_segments
      .map((segment: TranscriptSegment) => segment.snippet?.text || '')
      .filter((text: string) => text.length > 0)
      .join(' ');
    
    return fullText.length > 0 ? fullText : null;
  } catch (error) {
    console.log(`Scraping error:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

// Helper function to parse SRT format and extract text
function parseSRTToText(srtContent: string): string {
  const lines = srtContent.split('\n');
  const textLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines, sequence numbers, and timestamp lines
    if (line === '' || /^\d+$/.test(line) || /^\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}$/.test(line)) {
      continue;
    }
    
    // This should be subtitle text
    if (line.length > 0) {
      textLines.push(line);
    }
  }
  
  return textLines.join(' ').trim();
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
    
    const activeProvider = getActiveAIProviderConfig();
    
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