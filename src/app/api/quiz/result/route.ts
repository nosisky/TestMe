import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import QuizResult from '@/models/QuizResult';
import Quiz from '@/models/Quiz';
import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

// Generate a simple anonymous user ID
function generateAnonymousUserId(): string {
  return `anonymous-${randomUUID()}`;
}

// This is the API endpoint to save quiz results
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    
    let userId: string;
    let isAnonymous = false;
    
    if (session && session.user && session.user.email) {
      // Authenticated user
      userId = session.user.email;
    } else {
      // Anonymous user - generate a simple unique ID
      isAnonymous = true;
      userId = generateAnonymousUserId();
    }
    
    const body = await request.json();
    const { quizId, score, totalQuestions, timeTaken, answers, userName: providedUserName } = body;
    
    if (!quizId || score === undefined || !totalQuestions) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    if (!mongoose.isValidObjectId(quizId)) {
      return NextResponse.json(
        { error: 'Invalid quiz ID' },
        { status: 400 }
      );
    }
    
    await dbConnect();
    
    // Create a new result document
    const result = new QuizResult({
      quizId,
      userId,
      userName: isAnonymous ? providedUserName : undefined, // Store provided name for anonymous users
      score,
      totalQuestions,
      completedAt: new Date(),
      timeTaken,
      answers: answers || [] // Store detailed answers if provided
    });
    
    await result.save();
    
    // Update quiz statistics
    const quiz = await Quiz.findById(quizId);
    if (quiz) {
      quiz.stats = quiz.stats || { timesPlayed: 0, avgScore: 0 };
      
      // Calculate new average score
      const currentTotal = quiz.stats.avgScore * quiz.stats.timesPlayed;
      const newTotal = currentTotal + score;
      const newAverage = newTotal / (quiz.stats.timesPlayed + 1);
      
      // Update stats
      quiz.stats.avgScore = parseFloat(newAverage.toFixed(1)); // Round to 1 decimal
      quiz.stats.lastPlayed = new Date();
      quiz.stats.timesPlayed = (quiz.stats.timesPlayed || 0) + 1;
      
      await quiz.save();
    }
    
    return NextResponse.json({
      success: true,
      result: {
        id: result._id.toString(),
        score,
        totalQuestions,
        percentage: Math.round((score / totalQuestions) * 100),
        isAnonymous
      }
    });
  } catch (error) {
    console.error('Error saving quiz result:', error);
    return NextResponse.json(
      { error: 'Failed to save quiz result' },
      { status: 500 }
    );
  }
}

// Endpoint to get user's quiz history (requires authentication)
export async function GET(request: Request) {
  const session = await getServerSession();
  
  if (!session || !session.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  const userId = session.user.email || 'unknown';
  
  try {
    // Connect to the database
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Find all results for this user, sorted by completion date (newest first)
    const results = await QuizResult.find({ userId })
      .sort({ completedAt: -1 })
      .limit(limit)
      .populate({
        path: 'quizId',
        select: 'title sourceType source difficulty'
      });
    
    return NextResponse.json({
      success: true,
      results: results.map(result => ({
        id: result._id,
        quiz: {
          id: result.quizId._id,
          title: result.quizId.title,
          sourceType: result.quizId.sourceType,
          source: result.quizId.source,
          difficulty: result.quizId.difficulty
        },
        score: result.score,
        totalQuestions: result.totalQuestions,
        percentage: result.get('percentage'), // Get the virtual field
        completedAt: result.completedAt,
        timeTaken: result.timeTaken
      }))
    });
  } catch (error) {
    console.error('Error fetching quiz results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz results' },
      { status: 500 }
    );
  }
} 