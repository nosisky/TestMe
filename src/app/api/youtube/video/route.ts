import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// YouTube API setup
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  try {
    const response = await youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: [videoId],
    });

    if (!response.data.items || response.data.items.length === 0) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const video = response.data.items[0];
    const { title, description, thumbnails } = video.snippet || {};
    const { duration } = video.contentDetails || {};

    return NextResponse.json({
      title,
      description,
      thumbnail: thumbnails?.high?.url || thumbnails?.default?.url,
      duration,
    });
  } catch (error) {
    console.error('Error fetching YouTube video data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video data' },
      { status: 500 }
    );
  }
} 