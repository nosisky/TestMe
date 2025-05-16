import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import Quiz, { IQuizQuestion } from '@/models/Quiz';
import { generateQuizQuestions } from '@/lib/ai-service';
import { validatePdfContent } from '@/lib/pdf-service';
import mongoose from 'mongoose';

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { pdfText, title, numQuestions, difficulty, isPublic, tags } = await request.json();

    if (!pdfText || !title) {
      return NextResponse.json(
        { error: 'PDF text and title are required' },
        { status: 400 }
      );
    }
    
    // Validate PDF content
    try {
      validatePdfContent(pdfText);
    } catch (validationError) {
      return NextResponse.json(
        { error: validationError instanceof Error ? validationError.message : 'Invalid PDF content' },
        { status: 400 }
      );
    }

    // Generate quiz questions using our AI service
    try {
      const questionsData = await generateQuizQuestions({
        content: pdfText,
        numQuestions: numQuestions || 5,
        difficulty: difficulty || 'medium'
      });

      if (!questionsData.questions || !questionsData.questions.length) {
        return NextResponse.json(
          { error: 'Failed to generate quiz questions - no questions returned' },
          { status: 500 }
        );
      }

      const questions: IQuizQuestion[] = questionsData.questions;

      // Connect to MongoDB with enhanced error handling
      try {
        // Attempt to connect to MongoDB
        await dbConnect();
        
        // Create and save the quiz
        const quiz = new Quiz({
          title,
          description: pdfText.substring(0, 200) + '...',
          sourceType: 'pdf',
          source: {
            type: 'pdf',
            pdf: {
              contentPreview: pdfText.substring(0, 500) + '...'
            }
          },
          difficulty: difficulty || 'medium',
          createdBy: session.user.email || 'unknown',
          isPublic: isPublic !== false, // Default to true if not specified
          tags: tags || [],
          questions
        });
        
        await quiz.save();

        // Return the quiz data
        return NextResponse.json({
          quiz: {
            id: quiz._id,
            title: quiz.title,
            sourceType: quiz.sourceType,
            difficulty: quiz.difficulty,
            questions,
            createdAt: quiz.createdAt,
          }
        });
      } catch (dbError) {
        // Handle specific MongoDB errors
        if (dbError instanceof mongoose.Error) {
          console.error('MongoDB error saving PDF quiz:', dbError);
          return NextResponse.json(
            { 
              error: 'Database error saving quiz', 
              details: `Please check your MongoDB connection: ${dbError.message}` 
            },
            { status: 503 }
          );
        }
        
        // Generic error
        console.error('Error saving PDF quiz to database:', dbError);
        return NextResponse.json(
          { error: 'Failed to save quiz to database' },
          { status: 500 }
        );
      }
    } catch (aiError) {
      console.error('Error generating quiz questions:', aiError);
      return NextResponse.json(
        { error: `Failed to generate quiz questions: ${aiError instanceof Error ? aiError.message : 'Unknown AI error'}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error generating quiz:', error);
    return NextResponse.json(
      { error: 'Failed to generate quiz: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
} 