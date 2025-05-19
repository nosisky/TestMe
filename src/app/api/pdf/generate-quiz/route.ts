import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import Quiz, { IQuizQuestion } from '@/models/Quiz';
import { generateQuizQuestions } from '@/lib/ai-service';
import { validatePdfContent } from '@/lib/pdf-service';
import mongoose from 'mongoose';
import pdfParse from 'pdf-parse';

export async function POST(request: Request) {
  try {
    // Check authentication but don't require it
    const session = await getServerSession();
    
    // Get parameters from URL query string
    const url = new URL(request.url);
    const numQuestionsStr = url.searchParams.get('numQuestions') || '5';
    const numQuestions = parseInt(numQuestionsStr);
    const difficulty = url.searchParams.get('difficulty') || 'medium';
    const tagsParam = url.searchParams.get('tags');
    const tags = tagsParam ? tagsParam.split(',').map(tag => tag.trim()) : [];
    
    console.log(`PDF Quiz Generation - Raw params: numQuestions=${numQuestionsStr}, parsed=${numQuestions}, difficulty=${difficulty}`);
    
    // Use createdBy from query string if provided, otherwise from session
    const createdByParam = url.searchParams.get('createdBy');
    const userId = createdByParam || session?.user?.email || 'anonymous';
    
    // Get the uploaded PDF file
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'PDF file is required' },
        { status: 400 }
      );
    }
    
    // Get file data as arrayBuffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Parse the PDF using pdf-parse
    let pdfData;
    try {
      pdfData = await pdfParse(buffer);
    } catch (error) {
      console.error('Error parsing PDF:', error);
      return NextResponse.json(
        { error: 'Failed to parse PDF file' },
        { status: 400 }
      );
    }
    
    // Extract text from the PDF
    const pdfText = pdfData.text;
    const pageCount = pdfData.numpages;
    
    // Use file name as title or fallback
    const title = file.name.replace('.pdf', '') || 'PDF Quiz';
    
    if (!pdfText) {
      return NextResponse.json(
        { error: 'PDF content could not be extracted' },
        { status: 400 }
      );
    }
    
    // Check if PDF exceeds page limit
    if (pageCount > 50) {
      return NextResponse.json(
        { error: 'PDF exceeds maximum page limit (50 pages)' },
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
      console.log(`Requesting ${numQuestions} questions at ${difficulty} difficulty from AI service`);
      
      const questionsData = await generateQuizQuestions({
        content: pdfText,
        numQuestions,
        difficulty
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
              fileName: file.name,
              fileSize: file.size,
              pageCount: pageCount,
              contentPreview: pdfText.substring(0, 500) + '...'
            }
          },
          difficulty,
          createdBy: userId,
          isPublic: true,
          tags,
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