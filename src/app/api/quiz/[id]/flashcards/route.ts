import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Quiz, { IQuizQuestion } from '@/models/Quiz';
import Flashcard from '@/models/Flashcard';
import { authOptions } from '@/lib/auth';

// GET: Fetch flashcards for a quiz
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    
    const quizId = params.id;
    
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 });
    }
    
    // Find flashcards for this quiz
    const flashcards = await Flashcard.find({ 
      quizId,
      createdBy: session.user.email 
    }).sort({ createdAt: -1 });
    
    return NextResponse.json({ flashcards });
  } catch (error) {
    console.error('Error fetching flashcards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flashcards' },
      { status: 500 }
    );
  }
}

// POST: Create flashcards from quiz questions
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await dbConnect();
    
    const quizId = params.id;
    
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 });
    }
    
    // Find the quiz
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }
    
    // Check if flashcards already exist for this quiz
    const existingFlashcards = await Flashcard.find({ 
      quizId,
      createdBy: session.user.email 
    });
    
    if (existingFlashcards.length > 0) {
      return NextResponse.json({ 
        flashcards: existingFlashcards,
        message: 'Flashcards already exist for this quiz' 
      });
    }
    
    // Create flashcards from quiz questions
    const flashcardPromises = quiz.questions.map((question: IQuizQuestion) => {
      const optionsText = question.options.map((opt: string, index: number) => 
        `${String.fromCharCode(65 + index)}. ${opt}`
      ).join('\n');
      
      // Get correct answer text (using correctAnswer as index)
      const correctAnswerText = question.options[question.correctAnswer];
      
      // Create flashcard
      const flashcard = new Flashcard({
        quizId: quiz._id,
        createdBy: session.user.email,
        front: `${question.question}\n\n${optionsText}`,
        back: `${correctAnswerText}\n\n${question.explanation || ''}`,
        hints: [question.options[question.correctAnswer]],
        tags: quiz.tags
      });
      
      return flashcard.save();
    });
    
    const savedFlashcards = await Promise.all(flashcardPromises);
    
    return NextResponse.json({ 
      flashcards: savedFlashcards,
      message: 'Flashcards created successfully' 
    });
  } catch (error) {
    console.error('Error creating flashcards:', error);
    return NextResponse.json(
      { error: 'Failed to create flashcards' },
      { status: 500 }
    );
  }
} 