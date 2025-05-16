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
    console.log(`[Transcript API] Fetching transcript for videoId: ${videoId}`);
    const transcriptItems = await TranscriptAPI.getTranscript(videoId);
    
    if (!transcriptItems || transcriptItems.length === 0) {
      console.log(`[Transcript API] No transcript found for videoId: ${videoId}`);
      return null;
    }
    
    // Join all transcript segments into one text string
    const fullTranscript = transcriptItems.map((item) => item.text).join(' ').trim();

    console.log(fullTranscript, '====');
    if (fullTranscript.length === 0) {
      console.log(`[Transcript API] Empty transcript found for videoId: ${videoId}`);
      return null;
    }
    
    console.log(`[Transcript API] Successfully fetched transcript for videoId: ${videoId} (${fullTranscript.length} characters)`);
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
    const response = await youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: [videoId],
    });

    if (!response.data.items || response.data.items.length === 0) {
      return null;
    }

    return response.data.items[0].snippet;
  } catch (error) {
    console.error('Error fetching video details:', error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    // 1. Parse the request body to get the videoId
    const body = await request.json();
    const { videoId, questionCount = 5, difficulty = 'medium' } = body;

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // 2. Connect to MongoDB
    await dbConnect();

    // 3. Get the user session (if authenticated)
    const session = await getServerSession();
    const userId = session?.user?.email || 'anonymous';

    // 4. Get video details and transcript
    const videoDetails = await getVideoDetails(videoId);

    if (!videoDetails) {
      return NextResponse.json(
        { error: 'Failed to fetch video details' },
        { status: 404 }
      );
    }

    // 5. Try to get the transcript using youtube-transcript-api
    const transcript = await getTranscript(videoId);

    // Fallback to video description if transcript is not available
    const content = transcript || videoDetails.description || '';

    if (!content.trim()) {
      return NextResponse.json(
        { error: 'No content available to generate quiz from. Video may not have captions or description.' },
        { status: 404 }
      );
    }

    // 6. Generate quiz questions using AI
    const quizTitle = videoDetails.title || `Quiz on YouTube video ${videoId}`;
    const quizDescription = `Quiz generated from YouTube video: ${videoDetails.title}`;
    
    const questions = await generateQuizQuestions({
      content,
      numQuestions: questionCount,
      difficulty,
    });

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate quiz questions' },
        { status: 500 }
      );
    }

    // 7. Save the quiz to the database
    const quiz = new Quiz({
      title: quizTitle,
      description: quizDescription,
      sourceType: 'youtube',
      source: {
        type: 'youtube',
        videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
      },
      questions,
      createdBy: userId,
      difficulty,
    });

    console.log(quiz, '<=----===>');

    await quiz.save();

    // 8. Return the quiz data
    return NextResponse.json({
      _id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      questionCount: questions.length,
      difficulty,
      thumbnail: videoDetails.thumbnails?.high?.url || videoDetails.thumbnails?.default?.url,
    });

  } catch (error) {
    console.error('Error in YouTube quiz generation:', error);
    
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