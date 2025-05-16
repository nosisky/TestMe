import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import AIConfig, { initializeAIConfigs } from '@/models/AIConfig';
import User from '@/models/User';

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
    
    // Initialize default configs if needed
    await initializeAIConfigs();
    
    // Get all AI provider configurations
    const configs = await AIConfig.find({}).sort({ provider: 1 });
    
    return NextResponse.json({ success: true, configs });
  } catch (error) {
    console.error('Error fetching AI configurations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI configurations' },
      { status: 500 }
    );
  }
}

// POST - update AI configuration
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
    const { provider, isActive, defaultModel, temperature, maxTokens } = data;
    
    if (!provider) {
      return NextResponse.json(
        { error: 'Provider is required' },
        { status: 400 }
      );
    }
    
    // Initialize default configs if needed
    await initializeAIConfigs();
    
    // If setting this provider as active, deactivate all other providers
    if (isActive) {
      await AIConfig.updateMany({}, { isActive: false });
    }
    
    // Update the provider config
    const config = await AIConfig.findOneAndUpdate(
      { provider },
      {
        defaultModel: defaultModel || undefined,
        temperature: temperature !== undefined ? temperature : undefined,
        maxTokens: maxTokens !== undefined ? maxTokens : undefined,
        isActive: isActive !== undefined ? isActive : undefined
      },
      { new: true }
    );
    
    if (!config) {
      return NextResponse.json(
        { error: 'AI provider not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Error updating AI configuration:', error);
    return NextResponse.json(
      { error: 'Failed to update AI configuration' },
      { status: 500 }
    );
  }
} 