import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import QuizResult from '@/models/QuizResult';
import Quiz from '@/models/Quiz';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id } = params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 });
    }
    
    await dbConnect();
    
    // Verify that the quiz exists and was created by the current user
    const quiz = await Quiz.findById(id);
    
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }
    
    // Only allow the quiz creator to view analytics
    if (quiz.createdBy !== session.user.email) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Fetch all results for this quiz
    const results = await QuizResult.find({ quizId: id })
      .sort({ completedAt: -1 })
      .lean();
    
    // Get unique user emails to fetch user data
    const userEmails = [...new Set(results.map(result => result.userId))];
    const users = await User.find({ email: { $in: userEmails } }).lean();
    
    // Create a map of email to user name
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user.email, user.name);
    });
    
    // Calculate some aggregate statistics
    const totalAttempts = results.length;
    const averageScore = totalAttempts > 0 
      ? results.reduce((sum, result) => sum + (result.score / result.totalQuestions) * 100, 0) / totalAttempts 
      : 0;
    
    // Group results by date for time-series data
    const resultsByDate: Record<string, { count: number, avgScore: number }> = {};
    results.forEach(result => {
      const dateKey = new Date(result.completedAt).toISOString().split('T')[0];
      if (!resultsByDate[dateKey]) {
        resultsByDate[dateKey] = { count: 0, avgScore: 0 };
      }
      resultsByDate[dateKey].count += 1;
      resultsByDate[dateKey].avgScore += (result.score / result.totalQuestions) * 100;
    });
    
    // Calculate average scores by date
    Object.keys(resultsByDate).forEach(date => {
      resultsByDate[date].avgScore = resultsByDate[date].avgScore / resultsByDate[date].count;
    });
    
    return NextResponse.json({
      success: true,
      quiz: {
        id: quiz._id.toString(),
        title: quiz.title,
        createdAt: quiz.createdAt,
        totalQuestions: quiz.questions.length,
      },
      stats: {
        totalAttempts,
        averageScore: parseFloat(averageScore.toFixed(1)),
        resultsByDate
      },
      results: results.map(result => ({
        id: result._id ? result._id.toString() : '',
        userId: result.userId,
        userName: userMap.get(result.userId) || 'Unknown User',
        userEmail: result.userId, // Keep email to use as a fallback
        score: result.score,
        totalQuestions: result.totalQuestions,
        percentage: (result.score / result.totalQuestions) * 100,
        completedAt: result.completedAt,
        timeTaken: result.timeTaken,
        answers: result.answers || [] // Include answers for detailed view
      }))
    });
  } catch (error) {
    console.error('Error fetching quiz analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz analytics' },
      { status: 500 }
    );
  }
} 