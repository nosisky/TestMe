import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import Quiz, { IQuizQuestion } from '@/models/Quiz';
import { generateQuizQuestions, generateQuizTitle, generateUniqueSlug } from '@/lib/ai-service';
import mongoose from 'mongoose';

/**
 * Checks if text contains meaningful content and not just symbols or patterns
 */
function containsMeaningfulText(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  
  // Check if text is mostly special characters
  const alphanumericCount = (text.match(/[a-zA-Z0-9]/g) || []).length;
  const textLength = text.trim().length;
  
  // If less than 10% of characters are alphanumeric, it's likely not meaningful text
  if (alphanumericCount / textLength < 0.1) return false;
  
  // Check for repeated patterns that might indicate non-text content
  const repeatedPatterns = [
    /^(.)\1{10,}$/,          // Checks for a single repeated character many times
    /^(..+)\1{5,}$/,         // Checks for a repeated pattern many times
    /^[\d\s+\-*/=.,!?;:]+$/  // Checks for only numbers and basic punctuation
  ];
  
  for (const pattern of repeatedPatterns) {
    if (pattern.test(text.trim())) return false;
  }
  
  return true;
}

export async function POST(request: Request) {
  try {
    // Get user session if available, but don't require it
    const session = await getServerSession();

    const body = await request.json();
    const {
      textContent,
      tags,
      numQuestions = 5,
      difficulty = 'medium',
      includeTypes = { multipleChoice: true, trueFalse: true, math: true },
      createdBy: createdByParam
    } = body;

    // Ensure at least one question type is selected
    if (!includeTypes.multipleChoice && !includeTypes.trueFalse && !includeTypes.math) {
      return NextResponse.json({ error: 'At least one question type must be selected.' }, { status: 400 });
    }

    // Use createdBy from request if provided, otherwise from session
    const userId = createdByParam || session?.user?.email || 'anonymous';

    if (!textContent || typeof textContent !== 'string' || textContent.trim().length < 50) {
      return NextResponse.json({ error: 'Text content must be at least 50 characters long.' }, { status: 400 });
    }
    
    // Validate that the text content contains meaningful content, not just symbols
    if (!containsMeaningfulText(textContent)) {
      return NextResponse.json({ 
        error: 'The text provided doesn\'t appear to contain meaningful content. Please enter valid text with actual words, not just symbols or repeated characters.' 
      }, { status: 400 });
    }
    
    if (numQuestions < 3 || numQuestions > 30) {
      return NextResponse.json({ error: 'Number of questions must be between 3 and 15.' }, { status: 400 });
    }

    console.debug(`Generating quiz: ${numQuestions} questions, difficulty: ${difficulty}, types: ${JSON.stringify(includeTypes)}`);

    // 4. Generate quiz questions using AI service
    const questionsData = await generateQuizQuestions({
      content: textContent,
      numQuestions: numQuestions,
      difficulty: difficulty,
      includeTypes: includeTypes
    });

    if (!questionsData.questions || questionsData.questions.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate quiz questions - no questions returned from AI service.' },
        { status: 500 }
      );
    }
    const questions: IQuizQuestion[] = questionsData.questions;

    await dbConnect();

    // 5. Generate AI-powered title and unique slug
    const aiQuizTitle = await generateQuizTitle(textContent, 'text');
    console.debug(`AI generated title: ${aiQuizTitle}`);
    
    const quizSlug = await generateUniqueSlug(aiQuizTitle);
    console.debug(`Generated unique slug: ${quizSlug}`);

    const newQuiz = new Quiz({
      title: aiQuizTitle,
      slug: quizSlug,
      description: textContent.substring(0, 200) + (textContent.length > 200 ? '...' : ''), // Short description
      sourceType: 'text',
      source: {
        type: 'text',
        text: {
          contentPreview: textContent.substring(0, 500) + (textContent.length > 500 ? '...' : ''), // Store a preview
          title: aiQuizTitle, // Store the AI-generated title
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
        slug: quizSlug,
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