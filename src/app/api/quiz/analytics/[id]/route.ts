import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import QuizResult from '@/models/QuizResult';
import Quiz, { IQuiz } from '@/models/Quiz';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const params = await context.params;
    const { id } = params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 });
    }
    
    await dbConnect();
    
    // Verify that the quiz exists and was created by the current user
    const quiz = await Quiz.findById(id).lean() as IQuiz | null;
    
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }
    
    // Only allow the quiz creator to view analytics
    if (quiz.createdBy !== session.user.email) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Fetch all results for this quiz
    const results = await QuizResult.find({ quizId: id }).lean();
    
    // Get unique user emails to fetch user data (exclude anonymous users)
    const userEmails = [...new Set(results
      .map(result => result.userId)
      .filter(userId => !userId.startsWith('anonymous-'))
    )];
    const users = await User.find({ email: { $in: userEmails } }).lean();
    
    // Create a map of email to user name
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user.email, user.name);
    });
    
    // Handle anonymous users - use their provided names or generate labels
    const anonymousUsers = new Set();
    results.forEach(result => {
      if (result.userId.startsWith('anonymous-')) {
        anonymousUsers.add(result.userId);
      }
    });
    
    // Generate unique labels for anonymous users without provided names
    let anonymousCounter = 1;
    anonymousUsers.forEach(userId => {
      // Find the result to get the provided userName
      const userResult = results.find(r => r.userId === userId);
      
      if (userResult && userResult.userName && userResult.userName.trim()) {
        userMap.set(userId, userResult.userName.trim());
      } else {
        userMap.set(userId, `Anonymous User #${anonymousCounter++}`);
      }
    });
    
    // Calculate some aggregate statistics
    const totalAttempts = results.length;
    const averageScore = totalAttempts > 0 
      ? results.reduce((sum, result) => sum + result.score, 0) / totalAttempts 
      : 0;
    
    // Calculate score distribution
    const scoreRanges = [
      { range: '0-20%', count: 0 },
      { range: '21-40%', count: 0 },
      { range: '41-60%', count: 0 },
      { range: '61-80%', count: 0 },
      { range: '81-100%', count: 0 }
    ];

    results.forEach(result => {
      const percentage = (result.score / result.totalQuestions) * 100;
      if (percentage <= 20) scoreRanges[0].count++;
      else if (percentage <= 40) scoreRanges[1].count++;
      else if (percentage <= 60) scoreRanges[2].count++;
      else if (percentage <= 80) scoreRanges[3].count++;
      else scoreRanges[4].count++;
    });

    // Calculate completion times statistics
    const timesWithData = results.filter(r => r.timeTaken !== undefined && r.timeTaken !== null);
    const averageTime = timesWithData.length > 0 
      ? timesWithData.reduce((sum, result) => sum + (result.timeTaken || 0), 0) / timesWithData.length 
      : 0;

    // Get recent attempts (last 10)
    const recentAttempts = results
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 10)
      .map(result => ({
        userId: result.userId,
        score: result.score,
        totalQuestions: result.totalQuestions,
        percentage: Math.round((result.score / result.totalQuestions) * 100),
        completedAt: result.completedAt,
        timeTaken: result.timeTaken
      }));
    
    return NextResponse.json({
      success: true,
      quiz: {
        id: (quiz._id as mongoose.Types.ObjectId).toString(),
        title: quiz.title,
        createdAt: quiz.createdAt,
        totalQuestions: quiz.questions.length,
        difficulty: quiz.difficulty,
        sourceType: quiz.sourceType
      },
      analytics: {
        totalAttempts,
        averageScore: Math.round(averageScore * 100) / 100,
        averagePercentage: totalAttempts > 0 ? Math.round((averageScore / quiz.questions.length) * 100) : 0,
        averageTime: Math.round(averageTime),
        scoreDistribution: scoreRanges,
        recentAttempts
      },
      results: results.map(result => ({
        id: result._id ? result._id.toString() : '',
        userId: result.userId,
        userName: userMap.get(result.userId) || 'Unknown User',
        userEmail: result.userId.startsWith('anonymous-') ? 'Anonymous' : result.userId, // Don't show anonymous IDs as emails
        score: result.score,
        totalQuestions: result.totalQuestions,
        percentage: (result.score / result.totalQuestions) * 100,
        completedAt: result.completedAt,
        timeTaken: result.timeTaken,
        answers: result.answers || [], // Include answers for detailed view
        isAnonymous: result.userId.startsWith('anonymous-')
      }))
    });
  } catch (error) {
    console.error('Error fetching quiz analytics:', error);
    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json({ error: 'Invalid quiz ID format' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to fetch quiz analytics' }, { status: 500 });
  }
} 