import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getAllAIProviders, getProviderStatus } from '@/lib/ai-config';

// GET - fetch all AI configurations
export async function GET() {
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
    
    // Get all AI provider configurations
    const configs = getAllAIProviders();
    const status = getProviderStatus();
    
    return NextResponse.json({ 
      success: true, 
      configs,
      status,
      note: 'AI provider configuration is now controlled via the DEFAULT_AI_PROVIDER environment variable. To change the active provider, update the environment variable and restart the application.'
    });
  } catch (error) {
    console.error('Error fetching AI configurations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI configurations' },
      { status: 500 }
    );
  }
}

// POST - update AI configuration (now just returns info about environment variables)
export async function POST(request: Request) {
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
    
    // Get update data
    const data = await request.json();
    const { provider } = data;
    
    if (!provider) {
      return NextResponse.json(
        { error: 'Provider is required' },
        { status: 400 }
      );
    }
    
    // Return information about how to change the provider
    return NextResponse.json({
      success: false,
      message: `AI provider configuration is now controlled via environment variables. To activate ${provider}, set DEFAULT_AI_PROVIDER=${provider} in your environment variables and restart the application.`,
      currentProvider: getProviderStatus().activeProvider,
      requestedProvider: provider,
      instructions: {
        step1: `Set DEFAULT_AI_PROVIDER=${provider} in your .env.local file`,
        step2: 'Restart the application',
        step3: 'Ensure the appropriate API keys are configured for the provider'
      }
    });
  } catch (error) {
    console.error('Error updating AI configuration:', error);
    return NextResponse.json(
      { error: 'Failed to update AI configuration' },
      { status: 500 }
    );
  }
} 