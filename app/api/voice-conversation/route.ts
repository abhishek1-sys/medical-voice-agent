import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateConversationResponse } from '@/lib/services/gemini';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { userMessage, conversationHistory, context } = await request.json();

    if (!userMessage) return NextResponse.json({ error: 'Message required' }, { status: 400 });

    const response = await generateConversationResponse(
      userMessage,
      conversationHistory || [],
      context || {}
    );

    return NextResponse.json({ success: true, response });
  } catch (error) {
    console.error('Conversation error:', error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
