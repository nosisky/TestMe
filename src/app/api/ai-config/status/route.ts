import { NextResponse } from 'next/server';
import { getProviderStatus } from '@/lib/ai-config';

// GET - fetch current active AI provider
export async function GET() {
  try {
    const status = getProviderStatus();
    
    return NextResponse.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('Error fetching AI provider status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI provider status' },
      { status: 500 }
    );
  }
} 