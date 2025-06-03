import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Quiz, { IQuiz, IQuizSource } from '@/models/Quiz';
import mongoose from 'mongoose';

// Define a type for the lean quiz object we expect for the instructions page
interface IQuizInstructionData extends Omit<IQuiz, 'questions' | 'source' | '_id' | 'stats'> {
  _id: mongoose.Types.ObjectId; // Keep _id as ObjectId for internal use before converting to string
  questions: { length: number }; // We only need the length of questions array
  source?: Partial<IQuizSource>; // Source is partial as we only select youtube.thumbnail
}

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

    let quiz: IQuizInstructionData | null = null;

    // First try to find by slug, then by ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      // If it's a valid ObjectId, try both slug and ObjectId
      quiz = await Quiz.findOne({
        $or: [
          { slug: id },
          { _id: id }
        ]
      })
      .select('title description sourceType difficulty questions source.youtube.thumbnail createdAt isPublic tags createdBy slug') 
      .lean<IQuizInstructionData | null>();
    } else {
      // If it's not a valid ObjectId, only search by slug
      quiz = await Quiz.findOne({ slug: id })
        .select('title description sourceType difficulty questions source.youtube.thumbnail createdAt isPublic tags createdBy slug') 
        .lean<IQuizInstructionData | null>();
    }

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    let displayDescription = quiz.description || '';
    if (quiz.sourceType === 'youtube' && quiz.title) {
      displayDescription = `This quiz is based on the YouTube video titled "${quiz.title}".`;
    } else if (quiz.sourceType === 'pdf' && quiz.title) {
      displayDescription = `This quiz is based on the PDF document titled "${quiz.title}".`;
    } else if (!displayDescription && quiz.title) {
      displayDescription = `A quiz about "${quiz.title}".`;
    }

    return NextResponse.json({
      quiz: {
        id: quiz._id.toString(),
        slug: quiz.slug,
        title: quiz.title,
        description: displayDescription,
        sourceType: quiz.sourceType,
        sourceImage: quiz.source?.youtube?.thumbnail, // Access safely
        difficulty: quiz.difficulty,
        numQuestions: quiz.questions?.length || 0, // Safely access length
        createdAt: quiz.createdAt,
        isPublic: quiz.isPublic,
        tags: quiz.tags || [],
        createdBy: quiz.createdBy,
      },
    });
  } catch (error) {
    console.error('Error fetching quiz details:', error);
    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json({ error: 'Invalid quiz ID format' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to fetch quiz details' }, { status: 500 });
  }
} 