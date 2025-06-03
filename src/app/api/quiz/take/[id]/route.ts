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

    if (!id) {
      return NextResponse.json({ error: 'Quiz ID or slug is required' }, { status: 400 });
    }

    await dbConnect();

    let quiz: IQuiz | null = null;

    // First try to find by slug, then by ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      // If it's a valid ObjectId, try both slug and ObjectId
      quiz = await Quiz.findOne({
        $or: [
          { slug: id },
          { _id: id }
        ]
      })
      .select('title description sourceType difficulty questions tags isPublic source.youtube.thumbnail slug')
      .lean() as IQuiz | null;
    } else {
      // If it's not a valid ObjectId, only search by slug
      quiz = await Quiz.findOne({ slug: id })
        .select('title description sourceType difficulty questions tags isPublic source.youtube.thumbnail slug')
        .lean() as IQuiz | null;
    }

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
        slug: quiz.slug,
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