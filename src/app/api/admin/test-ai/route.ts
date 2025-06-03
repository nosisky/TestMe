import { NextResponse } from 'next/server';
import { generateQuizQuestions } from '@/lib/ai-service';

export async function POST() {
  try {
    console.log('🧪 Testing AI response with small request...');
    
    const testParams = {
      content: "Digital marketing is the use of digital channels to reach and engage customers. Key metrics include click-through rates, conversion rates, and return on investment.",
      numQuestions: 3,
      difficulty: "medium",
      includeTypes: {
        multipleChoice: true,
        trueFalse: true,
        math: false
      }
    };
    
    console.log('Test parameters:', testParams);
    
    const result = await generateQuizQuestions(testParams);
    
    console.log('✅ AI test successful. Generated questions:', result.questions.length);
    
    return NextResponse.json({
      success: true,
      message: `Successfully generated ${result.questions.length} questions`,
      questions: result.questions
    });
    
  } catch (error) {
    console.error('❌ AI test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : 'No stack trace'
    }, { status: 500 });
  }
} 