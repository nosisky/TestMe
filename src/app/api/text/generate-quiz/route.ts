import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import Quiz, { IQuizQuestion } from '@/models/Quiz';
import { generateQuizQuestions } from '@/lib/ai-service';
import mongoose from 'mongoose';

// Helper function to generate a title from text content if not provided
function generateTitleFromText(text: string, maxLength = 50): string {
  if (!text) return 'Untitled Text Quiz';
  const firstSentence = text.split(/[.!?]/)[0];
  let title = firstSentence.length > maxLength ? firstSentence.substring(0, maxLength) + '...' : firstSentence;
  if (title.trim() === '...' || title.trim() === '') title = text.substring(0, Math.min(text.length, maxLength)) + (text.length > maxLength ? '...' : '');
  return title || 'Untitled Text Quiz';
}

export async function POST(request: Request) {
  try {
    // Get user session if available, but don't require it
    const session = await getServerSession();

    const body = await request.json();
    const {
      textContent,
      title: userProvidedTitle,
      numQuestions = 5,
      difficulty = 'medium',
      tags = [],
      createdBy: createdByParam,
    } = body;

    console.log(`Text Quiz Generation - Params: numQuestions=${numQuestions}, difficulty=${difficulty}`);

    // Use createdBy from request if provided, otherwise from session
    const userId = createdByParam || session?.user?.email || 'anonymous';

    if (!textContent || typeof textContent !== 'string' || textContent.trim().length < 50) {
      return NextResponse.json({ error: 'Text content must be at least 50 characters long.' }, { status: 400 });
    }
    if (numQuestions < 3 || numQuestions > 15) {
      return NextResponse.json({ error: 'Number of questions must be between 3 and 15.' }, { status: 400 });
    }

    const quizTitle = userProvidedTitle?.trim() || generateTitleFromText(textContent);

    // Generate quiz questions using AI service
    console.log(`Requesting ${numQuestions} questions at ${difficulty} difficulty from AI service for text`);
    
    const questionsData = await generateQuizQuestions({
      content: textContent,
      numQuestions: Number(numQuestions),
      difficulty: difficulty,
    });

    if (!questionsData.questions || questionsData.questions.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate quiz questions - no questions returned from AI service.' },
        { status: 500 }
      );
    }
    const questions: IQuizQuestion[] = questionsData.questions;

    await dbConnect();

    const newQuiz = new Quiz({
      title: quizTitle,
      description: textContent.substring(0, 200) + (textContent.length > 200 ? '...' : ''), // Short description
      sourceType: 'text',
      source: {
        type: 'text',
        text: {
          contentPreview: textContent.substring(0, 500) + (textContent.length > 500 ? '...' : ''), // Store a preview
          title: quizTitle, // Store the determined title
        },
      },
      difficulty: difficulty,
      createdBy: userId,
      isPublic: true,
      tags: Array.isArray(tags) ? tags.filter(tag => typeof tag === 'string' && tag.trim() !== '') : [],
      questions: questions,
    });

    await newQuiz.save();

    return NextResponse.json({
      message: 'Quiz generated successfully from text!',
      quiz: {
        id: newQuiz._id.toString(),
        title: newQuiz.title,
      },
    });

  } catch (error) {
    console.error('Error generating quiz from text:', error);
    if (error instanceof mongoose.Error) {
      return NextResponse.json({ error: 'Database error while creating quiz.', details: error.message }, { status: 500 });
    } else if (error instanceof Error && error.message.includes('AI service')) {
      return NextResponse.json({ error: error.message }, { status: 502 }); // Bad Gateway if AI service failed
    }
    return NextResponse.json({ error: 'Failed to generate quiz from text. ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 });
  }
} 