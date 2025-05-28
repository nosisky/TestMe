import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Quiz, { IQuiz, IQuizSource } from '@/models/Quiz';
import mongoose from 'mongoose';

// Define a type for the lean quiz object we expect for the instructions page
interface IQuizInstructionData extends Omit<IQuiz, 'questions' | 'source' | '_id' | 'createdBy' | 'stats'> {
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

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 });
    }

    await dbConnect();

    // Explicitly type the lean object
    const quiz = await Quiz.findById(id)
      .select('title description sourceType difficulty questions source.youtube.thumbnail createdAt isPublic tags') 
      .lean<IQuizInstructionData | null>(); // Specify the expected lean type

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
        title: quiz.title,
        description: displayDescription,
        sourceType: quiz.sourceType,
        sourceImage: quiz.source?.youtube?.thumbnail, // Access safely
        difficulty: quiz.difficulty,
        numQuestions: quiz.questions?.length || 0, // Safely access length
        createdAt: quiz.createdAt,
        isPublic: quiz.isPublic,
        tags: quiz.tags || [],
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