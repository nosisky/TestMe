import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getProviderStatus } from '@/lib/ai-config';

// POST - reset the AI configuration to use AWS Bedrock
export async function POST() {
  try {
    // Check authentication and admin role
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is admin
    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const currentStatus = getProviderStatus();
    
    return NextResponse.json({
      success: false,
      message: 'AI provider configuration is now controlled via environment variables. To reset to AWS Bedrock, set DEFAULT_AI_PROVIDER=bedrock in your environment variables and restart the application.',
      currentProvider: currentStatus.activeProvider,
      targetProvider: 'bedrock',
      instructions: {
        step1: 'Set DEFAULT_AI_PROVIDER=bedrock in your .env.local file',
        step2: 'Configure AWS credentials: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION',
        step3: 'Restart the application',
        note: 'AWS Bedrock provides enterprise-grade AI with enhanced security and compliance features'
      },
      requiredEnvVars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'],
      availableProviders: currentStatus.availableProviders
    });
  } catch (error) {
    console.error('Error resetting AI configuration:', error);
    return NextResponse.json(
      { error: 'Failed to reset AI configuration' },
      { status: 500 }
    );
  }
} 