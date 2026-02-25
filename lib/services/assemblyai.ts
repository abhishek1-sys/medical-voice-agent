import { AssemblyAI } from 'assemblyai';

if (!process.env.ASSEMBLYAI_API_KEY) {
  throw new Error('ASSEMBLYAI_API_KEY environment variable is not set');
}

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY,
});

export async function transcribeAudio(audioData: Buffer | string): Promise<{
  text: string;
  duration: number;
  confidence: number;
}> {
  try {
    let audioUrl: string;

    if (Buffer.isBuffer(audioData)) {
      // upload() returns a string URL directly
      const uploadedUrl = await client.files.upload(audioData);
      audioUrl = uploadedUrl;
    } else {
      audioUrl = audioData;
    }

    // language_detection: true — auto-detect Hindi vs English
    const transcript = await client.transcripts.transcribe({
      audio: audioUrl,
      language_detection: true,
      punctuate: true,
      format_text: true,
    });

    if (transcript.status === 'error') {
      throw new Error(`Transcription failed: ${transcript.error}`);
    }

    return {
      text: transcript.text || '',
      duration: transcript.audio_duration || 0,
      confidence: transcript.confidence || 0,
    };
  } catch (error) {
    console.error('AssemblyAI transcription error:', error);
    throw new Error('Failed to transcribe audio');
  }
}

// FIX: createTemporaryToken returns a string directly, NOT an object with .token
export async function getRealtimeToken(): Promise<string> {
  try {
    const token = await client.realtime.createTemporaryToken({ expires_in: 3600 });
    return token as unknown as string;
  } catch (error) {
    console.error('AssemblyAI realtime token error:', error);
    throw new Error('Failed to create realtime token');
  }
}

export { client as assemblyAIClient };
