import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import Quiz from '@/models/Quiz';
import { generateQuizQuestions, generateQuizTitle, generateUniqueSlug } from '@/lib/ai-service';
import mongoose from 'mongoose';
import { Innertube } from 'youtubei.js/web';

// Define interface for transcript segments
interface TranscriptSegment {
  snippet?: {
    text?: string;
  };
}

// YouTube API setup with API key for basic operations (video details only)
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

// Function to fetch transcript using multiple methods
async function getTranscript(videoId: string): Promise<string | null> {
  console.debug(`[Transcript] Fetching transcript for video ID: ${videoId}`);
  
  // Method 1: Try YouTube API captions (for videos you have access to)
  try {
    const apiTranscript = await getTranscriptFromAPI(videoId);
    if (apiTranscript) {
      console.debug(`[Transcript] Successfully fetched via YouTube API (${apiTranscript.length} chars)`);
      return apiTranscript;
    }
  } catch (error) {
    console.debug(`[Transcript] YouTube API method failed:`, error instanceof Error ? error.message : 'Unknown error');
  }
  
  // Method 2: Try youtubei.js (for public videos)
  try {
    const scrapedTranscript = await getTranscriptFromScraping(videoId);
    if (scrapedTranscript) {
      console.debug(`[Transcript] Successfully fetched via scraping (${scrapedTranscript.length} chars)`);
      return scrapedTranscript;
    }
  } catch (error) {
    console.debug(`[Transcript] Scraping method failed:`, error instanceof Error ? error.message : 'Unknown error');
  }
  
  console.debug(`[Transcript] All transcript methods failed for video: ${videoId}`);
  return null;
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
    console.debug(`[YouTube API] Caption access denied or unavailable:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

// Method 2: Use youtubei.js for scraping (existing method)
async function getTranscriptFromScraping(videoId: string): Promise<string | null> {
  try {
    // Create Innertube instance
    const innertube = await Innertube.create({
      lang: 'en',
      location: 'US',
      retrieve_player: false,
    });
    
    // Get video info and transcript
    const info = await innertube.getInfo(videoId);
    const transcriptData = await info.getTranscript();
    
    if (!transcriptData || !transcriptData.transcript?.content?.body?.initial_segments) {
      return null;
    }
    
    // Extract transcript text from segments
    const fullTranscript = transcriptData.transcript.content.body.initial_segments
      .map((segment: TranscriptSegment) => segment.snippet?.text || '')
      .filter((text: string) => text.length > 0)
      .join(' ')
      .trim();

    return fullTranscript.length > 0 ? fullTranscript : null;
  } catch (error) {
    console.debug(`[Scraping] Error:`, error instanceof Error ? error.message : 'Unknown error');
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

// Function to fetch video details (title, description, etc.)
async function getVideoDetails(videoId: string) {
  try {
    console.debug(`[YouTube API] Fetching video details for: ${videoId}`);
    const response = await youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: [videoId],
    });

    if (!response.data.items || response.data.items.length === 0) {
      console.error(`[YouTube API] Video not found: ${videoId}`);
      return null;
    }

    console.debug(`[YouTube API] Successfully fetched details for video: ${videoId}`);
    return response.data.items[0].snippet;
  } catch (error) {
    console.error('[YouTube API] Error fetching video details:', error);
    return null;
  }
}

export async function POST(request: Request) {
  console.debug('[YouTube Quiz] Starting quiz generation process');
  try {
    // 1. Parse the request body to get the videoId
    const body = await request.json();
    const { 
      videoId, 
      extractedContent, // Pre-extracted content from analysis phase
      questionCount = 5, 
      difficulty = 'medium',
      includeTypes = { multipleChoice: true, trueFalse: true, math: true },
      createdBy: createdByParam
    } = body;


    // Ensure at least one question type is selected
    if (!includeTypes.multipleChoice && !includeTypes.trueFalse && !includeTypes.math) {
      return NextResponse.json(
        { error: 'At least one question type must be selected' },
        { status: 400 }
      );
    }

    if (!videoId) {
      console.debug('[YouTube Quiz] Error: No video ID provided');
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // 2. Connect to MongoDB
    try {
      await dbConnect();
      console.debug('[YouTube Quiz] Connected to MongoDB');
    } catch (dbError) {
      console.error('[YouTube Quiz] MongoDB connection error:', dbError);
      return NextResponse.json(
        { error: 'Database connection failed', details: String(dbError) },
        { status: 500 }
      );
    }

    // 3. Get the user session (if authenticated)
    let userId;
    try {
      const session = await getServerSession();
      userId = createdByParam || session?.user?.email || 'anonymous';
      console.debug(`[YouTube Quiz] User identified as: ${userId}`);
    } catch (sessionError) {
      console.error('[YouTube Quiz] Session error:', sessionError);
      // Default to anonymous if session fails
      userId = 'anonymous';
    }

    // 4. Get video details and transcript
    const videoDetails = await getVideoDetails(videoId);

    if (!videoDetails) {
      console.error('[YouTube Quiz] Failed to fetch video details');
      return NextResponse.json(
        { error: 'Failed to fetch video details. The video may be private, age-restricted, or no longer available.' },
        { status: 404 }
      );
    }

    // 5. Use pre-extracted content if available, otherwise extract transcript
    let content = extractedContent;
    
    if (!content) {
      console.debug('[YouTube Quiz] No pre-extracted content, fetching transcript...');
      const transcript = await getTranscript(videoId);
      // Fallback to video description if transcript is not available
      content = transcript || videoDetails.description || '';
    } else {
      console.debug('[YouTube Quiz] Using pre-extracted content');
    }

    if (!content.trim()) {
      console.error('[YouTube Quiz] No content available for quiz generation');
      return NextResponse.json(
        { error: 'No content available to generate quiz from. Video may not have captions or description.' },
        { status: 404 }
      );
    }

    console.debug(`[YouTube Quiz] Content acquired (${content.length} chars), proceeding to question generation`);

    // 6. Generate AI-powered quiz title and questions
    const originalTitle = videoDetails.title || `Quiz on YouTube video ${videoId}`;
    
    console.debug(`[YouTube Quiz] Generating AI title and questions: count=${questionCount}, difficulty=${difficulty}`);
    
    try {
      // Generate AI-powered title first 
      const aiQuizTitle = await generateQuizTitle(content, 'youtube', originalTitle);
      console.debug(`[YouTube Quiz] AI generated title: ${aiQuizTitle}`);
      
      const questionsResponse = await generateQuizQuestions({
        content,
        numQuestions: questionCount,
        difficulty,
        includeTypes: includeTypes
      });
      
      // Extract questions array from the response
      const questions = questionsResponse.questions || [];

      if (!questions || questions.length === 0) {
        console.error('[YouTube Quiz] Failed to generate questions');
        return NextResponse.json(
          { error: 'Failed to generate quiz questions' },
          { status: 500 }
        );
      }

      console.debug(`[YouTube Quiz] Successfully generated ${questions.length} questions`);

      // 7. Generate unique slug and save the quiz to the database
      try {
        const quizSlug = await generateUniqueSlug(aiQuizTitle);
        console.debug(`[YouTube Quiz] Generated unique slug: ${quizSlug}`);
        
        const quiz = new Quiz({
          title: aiQuizTitle,
          slug: quizSlug,
          description: `Quiz generated from YouTube video: ${originalTitle}`,
          sourceType: 'youtube',
          source: {
            type: 'youtube',
            youtube: {
              videoId,
              title: originalTitle,
              thumbnail: videoDetails.thumbnails?.high?.url || videoDetails.thumbnails?.default?.url,
            }
          },
          questions,
          createdBy: userId,
          difficulty,
          isPublic: true,
        });

        await quiz.save();
        console.debug(`[YouTube Quiz] Quiz saved to database with ID: ${quiz._id} and slug: ${quizSlug}`);

        // 8. Return the quiz data with slug for clean URLs
        return NextResponse.json({
          _id: quiz._id,
          slug: quizSlug,
          title: quiz.title,
          description: quiz.description,
          questionCount: questions.length,
          difficulty,
          thumbnail: videoDetails.thumbnails?.high?.url || videoDetails.thumbnails?.default?.url,
        });
      } catch (dbSaveError) {
        console.error('[YouTube Quiz] Error saving quiz to database:', dbSaveError);
        throw dbSaveError;
      }
    } catch (aiError) {
      console.error('[YouTube Quiz] AI question generation error:', aiError);
      throw aiError;
    }
  } catch (error) {
    console.error('[YouTube Quiz] General error in quiz generation:', error);
    
    if (error instanceof mongoose.Error) {
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate quiz', details: (error as Error).message },
      { status: 500 }
    );
  }
} 