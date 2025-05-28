import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Quiz, { IQuiz, IQuizQuestion } from '@/models/Quiz';
import mongoose from 'mongoose';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 });
    }

    await dbConnect();

    const quiz = await Quiz.findById(id)
      .select('title description sourceType difficulty questions tags isPublic source.youtube.thumbnail')
      .lean() as IQuiz | null;

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Check if quiz is public or not
    if (!quiz.isPublic) {
      return NextResponse.json({ error: 'This quiz is private' }, { status: 403 });
    }

    return NextResponse.json({
      quiz: {
        id: (quiz._id as mongoose.Types.ObjectId).toString(),
        title: quiz.title,
        description: quiz.description,
        sourceType: quiz.sourceType,
        sourceImage: quiz.source?.youtube?.thumbnail,
        difficulty: quiz.difficulty,
        tags: quiz.tags || [],
        questions: quiz.questions.map((question: IQuizQuestion, index: number) => ({
          id: index,
          question: question.question,
          options: question.options,
          type: question.type || 'multiple_choice',
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          formula: question.formula
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching quiz for taking:', error);
    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json({ error: 'Invalid quiz ID format' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to fetch quiz' }, { status: 500 });
  }
} 