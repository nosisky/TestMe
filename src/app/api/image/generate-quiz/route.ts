import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import Quiz, { IQuizQuestion } from '@/models/Quiz';
import { generateQuizQuestions } from '@/lib/ai-service';
import { extractTextFromImage } from '@/lib/aws-textract';
import mongoose from 'mongoose';

// Handle multipart form data for image file
async function parseFormData(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    throw new Error('No image file provided');
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Invalid file type. Please upload an image file.');
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image file is too large. Max size is 5MB.');
  }

  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return { buffer, originalName: file.name };
}

// Generate title from extracted text
function generateTitleFromText(text: string, maxLength = 50): string {
  if (!text) return 'Image Quiz';
  const firstSentence = text.split(/[.!?]/)[0];
  let title = firstSentence.length > maxLength ? firstSentence.substring(0, maxLength) + '...' : firstSentence;
  if (title.trim() === '...' || title.trim() === '') title = text.substring(0, Math.min(text.length, maxLength)) + (text.length > maxLength ? '...' : '');
  return title || 'Image Quiz';
}

export async function POST(request: Request) {
  try {
    // Get user session if available
    const session = await getServerSession();

    // Parse URL params
    const url = new URL(request.url);
    const numQuestions = parseInt(url.searchParams.get('numQuestions') || '5', 10);
    const difficulty = url.searchParams.get('difficulty') || 'medium';
    const createdByParam = url.searchParams.get('createdBy');
    const includeMultipleChoice = url.searchParams.get('includeMultipleChoice') === 'true';
    const includeTrueFalse = url.searchParams.get('includeTrueFalse') === 'true';

    // Use createdBy from request if provided, otherwise from session
    const userId = createdByParam || session?.user?.email || 'anonymous';

    // Validate include types
    if (!includeMultipleChoice && !includeTrueFalse) {
      return NextResponse.json({ error: 'At least one question type must be selected.' }, { status: 400 });
    }

    // Parse form data
    const { buffer, originalName } = await parseFormData(request);

    // Extract text from image using AWS Textract
    const extractedText = await extractTextFromImage(buffer);

    if (!extractedText || extractedText.trim().length < 50) {
      return NextResponse.json(
        { error: 'Could not extract enough text from the image. Please upload an image with more text content.' },
        { status: 400 }
      );
    }

    // Generate quiz title
    const quizTitle = generateTitleFromText(extractedText);

    // Generate quiz questions
    const questionsData = await generateQuizQuestions({
      content: extractedText,
      numQuestions: numQuestions,
      difficulty: difficulty,
      includeTypes: {
        multipleChoice: includeMultipleChoice,
        trueFalse: includeTrueFalse,
        math: false // Auto-detected by AI service
      }
    });

    if (!questionsData.questions || questionsData.questions.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate quiz questions - no questions returned from AI service.' },
        { status: 500 }
      );
    }

    // Get the generated questions
    const questions: IQuizQuestion[] = questionsData.questions;

    // Connect to database
    await dbConnect();

    // Create new quiz
    const newQuiz = new Quiz({
      title: quizTitle,
      description: extractedText.substring(0, 200) + (extractedText.length > 200 ? '...' : ''),
      sourceType: 'image',
      source: {
        type: 'image',
        image: {
          contentPreview: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : ''),
          title: quizTitle,
          originalName: originalName,
        },
      },
      difficulty: difficulty,
      createdBy: userId,
      isPublic: true,
      tags: ['image'], // Default tag
      questions: questions,
    });

    await newQuiz.save();

    return NextResponse.json({
      message: 'Quiz generated successfully from image!',
      quiz: {
        id: newQuiz._id.toString(),
        title: newQuiz.title,
      },
    });

  } catch (error) {
    console.error('Error generating quiz from image:', error);
    if (error instanceof mongoose.Error) {
      return NextResponse.json({ error: 'Database error while creating quiz.', details: error.message }, { status: 500 });
    } else if (error instanceof Error && error.message.includes('extract')) {
      return NextResponse.json({ error: error.message }, { status: 502 }); // Textract service error
    }
    return NextResponse.json({ error: 'Failed to generate quiz from image. ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 });
  }
} 