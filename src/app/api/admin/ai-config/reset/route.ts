import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import AIConfig from '@/models/AIConfig';
import User from '@/models/User';

// POST - reset the AI configuration to use DeepSeek
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
    
    // Reset all providers to inactive
    await AIConfig.updateMany({}, { isActive: false });
    
    // Set DeepSeek as the active provider
    const deepseekConfig = await AIConfig.findOneAndUpdate(
      { provider: 'deepseek' },
      { isActive: true },
      { new: true }
    );
    
    if (!deepseekConfig) {
      return NextResponse.json(
        { error: 'DeepSeek provider not found' },
        { status: 404 }
      );
    }
    
    // Get all updated configs
    const configs = await AIConfig.find({}).sort({ provider: 1 });
    
    return NextResponse.json({
      success: true,
      message: 'Successfully reset AI configuration to use DeepSeek',
      activeProvider: deepseekConfig,
      allConfigs: configs
    });
  } catch (error) {
    console.error('Error resetting AI configuration:', error);
    return NextResponse.json(
      { error: 'Failed to reset AI configuration' },
      { status: 500 }
    );
  }
} 