import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import Quiz, { IQuizQuestion } from '@/models/Quiz';
import { generateQuizQuestions, generateQuizTitle, generateUniqueSlug } from '@/lib/ai-service';
import { extractTextFromImage } from '@/lib/aws-textract';
import mongoose from 'mongoose';

// File size limit in bytes (20MB)
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Handle multipart form data for image file
async function parseFormData(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const preExtractedContent = formData.get('extractedContent') as string | null;
  const numQuestions = parseInt(formData.get('numQuestions') as string || '5', 10);
  const difficulty = formData.get('difficulty') as string || 'medium';
  const createdBy = formData.get('createdBy') as string || '';
  const includeMultipleChoice = formData.get('includeMultipleChoice') === 'true';
  const includeTrueFalse = formData.get('includeTrueFalse') === 'true';
  const includeMath = formData.get('includeMath') === 'true';

  if (!file) {
    throw new Error('No image file provided');
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Invalid file type. Please upload an image file.');
  }

  // Validate file size (20MB max)
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Image file is too large. Max size is 20MB.');
  }

  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return { 
    buffer, 
    originalName: file.name, 
    preExtractedContent,
    numQuestions,
    difficulty,
    createdBy,
    includeMultipleChoice,
    includeTrueFalse,
    includeMath
  };
}

export async function POST(request: Request) {
  try {
    // Get user session if available
    const session = await getServerSession();

    // Parse form data to get all parameters including question types
    const { 
      buffer, 
      originalName, 
      preExtractedContent, 
      numQuestions, 
      difficulty, 
      createdBy: formCreatedBy, 
      includeMultipleChoice, 
      includeTrueFalse, 
      includeMath 
    } = await parseFormData(request);

    // Use createdBy from form data if provided, otherwise from session
    const userId = formCreatedBy || session?.user?.email || 'anonymous';

    console.debug('Image Quiz - Form data received:', {
      numQuestions,
      difficulty,
      userId,
      includeMultipleChoice,
      includeTrueFalse,
      includeMath,
      hasFile: !!buffer,
      hasPreExtractedContent: !!preExtractedContent
    });

    // Validate include types
    if (!includeMultipleChoice && !includeTrueFalse) {
      console.debug('Image Quiz - Validation failed: No question types selected');
      return NextResponse.json({ error: 'At least one question type must be selected.' }, { status: 400 });
    }

    // Extract text from image - use pre-extracted content if available
    let extractedText: string;
    
    if (preExtractedContent) {
      console.debug('Using pre-extracted image content');
      extractedText = preExtractedContent;
    } else {
      console.debug('Extracting text from image using AWS Textract');
      extractedText = await extractTextFromImage(buffer);
    }

    if (!extractedText || extractedText.trim().length < 50) {
      return NextResponse.json(
        { error: 'Could not extract enough text from the image. Please upload an image with more text content.' },
        { status: 400 }
      );
    }

    // Generate AI-powered title and unique slug
    const aiQuizTitle = await generateQuizTitle(extractedText, 'image');
    console.debug(`AI generated title: ${aiQuizTitle}`);
    
    const quizSlug = await generateUniqueSlug(aiQuizTitle);
    console.debug(`Generated unique slug: ${quizSlug}`);

    // Generate quiz questions
    const questionsData = await generateQuizQuestions({
      content: extractedText,
      numQuestions: numQuestions,
      difficulty: difficulty,
      includeTypes: {
        multipleChoice: includeMultipleChoice,
        trueFalse: includeTrueFalse,
        math: includeMath
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
      title: aiQuizTitle,
      slug: quizSlug,
      description: extractedText.substring(0, 200) + (extractedText.length > 200 ? '...' : ''),
      sourceType: 'image',
      source: {
        type: 'image',
        image: {
          contentPreview: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : ''),
          title: aiQuizTitle,
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
        slug: quizSlug,
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