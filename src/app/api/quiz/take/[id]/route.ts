import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Quiz, { IQuiz } from '@/models/Quiz'; // Import IQuiz
import mongoose from 'mongoose';

export async function GET(
  request: Request, 
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 });
    }

    await dbConnect();

    // Fetch the full quiz document
    const quiz = await Quiz.findById(id).lean<IQuiz | null>();

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }
    
    // Here, we could also increment a 'timesAttempted' or similar counter if needed for stats
    // For example:
    // await Quiz.updateOne({ _id: id }, { $inc: { 'stats.timesAttempted': 1 } });

    // We send the full quiz object, including questions and answers, 
    // as the client will need this for scoring on the results page.
    return NextResponse.json({ quiz });

  } catch (error) {
    console.error('Error fetching quiz for taking:', error);
    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json({ error: 'Invalid quiz ID format' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to fetch quiz' }, { status: 500 });
  }
} 