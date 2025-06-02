import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import Quiz from '@/models/Quiz';
import { generateQuizQuestions } from '@/lib/ai-service';
import mongoose from 'mongoose';
import TranscriptAPI from 'youtube-transcript-api';

// YouTube API setup with API key for basic operations (video details only)
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

// Function to fetch transcript using youtube-transcript-api library
async function getTranscript(videoId: string): Promise<string | null> {
  try {
    console.debug(`[Transcript] Fetching transcript for video ID: ${videoId}`);
    const transcriptItems = await TranscriptAPI.getTranscript(videoId);
    
    if (!transcriptItems || transcriptItems.length === 0) {
      console.debug(`[Transcript] No transcript found for video: ${videoId}`);
      return null;
    }
    
    // Join all transcript segments into one text string
    const fullTranscript = transcriptItems.map((item) => item.text).join(' ').trim();

    if (fullTranscript.length === 0) {
      console.debug(`[Transcript] Empty transcript for video: ${videoId}`);
      return null;
    }
    
    console.debug(`[Transcript] Successfully fetched transcript (${fullTranscript.length} chars)`);
    return fullTranscript;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Transcript API] Error fetching transcript for videoId ${videoId}:`, errorMessage);
    // Log more details about the error if available
    if (error instanceof Error && error.stack) {
      console.error(`[Transcript API] Error stack:`, error.stack);
    }
    return null;
  }
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

    // 6. Generate quiz questions using AI
    const quizTitle = videoDetails.title || `Quiz on YouTube video ${videoId}`;
    const quizDescription = `Quiz generated from YouTube video: ${videoDetails.title}`;
    
    console.debug(`[YouTube Quiz] Generating questions: count=${questionCount}, difficulty=${difficulty}`);
    
    try {
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

      // 7. Save the quiz to the database
      try {
        const quiz = new Quiz({
          title: quizTitle,
          description: quizDescription,
          sourceType: 'youtube',
          source: {
            type: 'youtube',
            youtube: {
              videoId,
              title: videoDetails.title,
              thumbnail: videoDetails.thumbnails?.high?.url || videoDetails.thumbnails?.default?.url,
            }
          },
          questions,
          createdBy: userId,
          difficulty,
          isPublic: true,
        });

        await quiz.save();
        console.debug(`[YouTube Quiz] Quiz saved to database with ID: ${quiz._id}`);

        // 8. Return the quiz data
        return NextResponse.json({
          _id: quiz._id,
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