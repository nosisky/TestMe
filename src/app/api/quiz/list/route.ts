import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import Quiz, { QuizSourceType } from '@/models/Quiz';
import { FilterQuery } from 'mongoose';

interface QuizQueryFilters {
  createdBy?: string;
  sourceType?: QuizSourceType;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string;
  isPublic?: boolean;
}

export async function GET(request: Request) {
  const session = await getServerSession();
  
  if (!session || !session.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');
    const userOnly = searchParams.get('userOnly') === 'true';
    const sourceType = searchParams.get('sourceType');
    const difficulty = searchParams.get('difficulty');
    const tag = searchParams.get('tag');
    
    // Connect to the database
    await dbConnect();
    
    // Build query
    const query: FilterQuery<QuizQueryFilters> = {};
    
    // Filter by creator
    if (userOnly) {
      query.createdBy = session.user.email;
    }
    
    // Filter by quiz source type
    if (sourceType && ['youtube', 'pdf', 'image', 'text'].includes(sourceType)) {
      query.sourceType = sourceType as QuizSourceType;
    }
    
    // Filter by difficulty
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
      query.difficulty = difficulty as 'easy' | 'medium' | 'hard';
    }
    
    // Filter by tag
    if (tag) {
      query.tags = tag;
    }
    
    // Find quizzes
    const quizzes = await Quiz.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('_id title description sourceType source difficulty createdAt createdBy stats isPublic tags');
    
    // Get total count for pagination
    const total = await Quiz.countDocuments(query);
    
    return NextResponse.json({
      success: true,
      total,
      quizzes: quizzes.map(quiz => ({
        id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        sourceType: quiz.sourceType,
        source: quiz.source,
        difficulty: quiz.difficulty,
        createdAt: quiz.createdAt,
        createdBy: quiz.createdBy === session.user.email ? 'You' : quiz.createdBy,
        isPublic: quiz.isPublic,
        tags: quiz.tags,
        stats: quiz.stats || { timesPlayed: 0, avgScore: 0 },
        questionCount: quiz.questions ? quiz.questions.length : 0
      }))
    });
  } catch (error) {
    console.error('Error listing quizzes:', error);
    return NextResponse.json(
      { error: 'Failed to list quizzes' },
      { status: 500 }
    );
  }
} 