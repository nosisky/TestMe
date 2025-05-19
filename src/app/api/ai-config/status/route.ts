import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import AIConfig, { initializeAIConfigs } from '@/models/AIConfig';

// GET - fetch current active AI provider
export async function GET() {
  try {
    // Initialize database connection
    await dbConnect();
    
    // Initialize default configs if needed
    await initializeAIConfigs();
    
    // Get the active provider configuration
    const activeConfig = await AIConfig.findOne({ isActive: true });
    
    // Check what the environment variable says
    const envDefaultProvider = process.env.DEFAULT_AI_PROVIDER || 'openai';
    
    return NextResponse.json({
      success: true,
      activeProvider: activeConfig?.provider || 'none',
      envDefaultProvider: envDefaultProvider,
      defaultFallback: 'openai'
    });
  } catch (error) {
    console.error('Error fetching AI provider status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI provider status' },
      { status: 500 }
    );
  }
} 