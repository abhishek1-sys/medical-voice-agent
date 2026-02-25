// Vapi.ai Voice Agent Service
// Real-time voice conversation with AI medical specialists

// Vapi.ai Voice Agent Service
// Real-time voice conversation with AI medical specialists

// Vapi.ai Voice Agent Service
// Real-time voice conversation with AI medical specialists

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_BASE_URL = 'https://api.vapi.ai';

export interface VapiAssistant {
    id: string;
    name: string;
    model: {
        provider: string;
        model: string;
        messages: Array<{ role: string; content: string }>;
    };
    voice: {
        provider: string;
        voiceId: string;
    };
    firstMessage: string;
}

export interface VapiCallConfig {
    assistantId?: string;
    assistant?: Partial<VapiAssistant>;
    metadata?: Record<string, any>;
}

// ── Create Medical Assistant for each Specialist ──────────────────────────────
export async function createMedicalAssistant(
    specialistId: string,
    specialistName: string,
    patientName: string,
    symptoms: string
): Promise<VapiAssistant> {
    if (!VAPI_API_KEY) throw new Error('VAPI_API_KEY not set in environment variables');

    const systemPrompt = `You are a ${specialistName} AI assistant conducting a medical voice consultation.

Patient Information:
- Name: ${patientName}
- Reported Symptoms: ${symptoms}

Your Role:
- Be empathetic, professional, and clear
- Ask relevant follow-up questions to understand the patient's condition
- Provide general health guidance (NOT definitive diagnosis)
- Keep responses concise (2-3 sentences max)
- Always recommend consulting a real doctor for serious concerns
- Speak naturally as if in a real consultation

Important:
- NEVER provide definitive medical diagnosis
- Always maintain professional boundaries
- If patient describes emergency symptoms, advise immediate medical attention
- Be supportive and reassuring while being medically responsible

Language:
- Respond in the same language the patient uses (English or Hindi)
- If patient uses Hinglish, respond naturally in the same style`;

    const firstMessage = `Hello ${patientName}! I am your AI ${specialistName}. I understand you are experiencing ${symptoms}. I am here to help discuss your symptoms. Could you tell me when these symptoms first began and how severe they are?`;

    // FIX 1: Correct Vapi API payload structure
    // - model.messages array key is correct
    // - FIX: maxTokens → maxTokens is correct but must be inside model object
    // - FIX: recordingEnabled is a top-level key, not inside model
    // - FIX: endCallPhrases → correct key is endCallPhrases (array of strings)
    // - FIX: voice.voiceId → correct, but elevenlabs needs a valid voiceId
    //   Using "EXAVITQu4vr4xnSDxMaL" (Bella) which is a free default ElevenLabs voice on Vapi
    const payload = {
        name: `${specialistName} - ${patientName}`,

        // FIX 2: model block — maxTokens must be inside model, temperature too
        model: {
            provider: 'openai',
            model: 'gpt-4o-mini',       // FIX: gpt-4 may not be available on all Vapi plans; gpt-4o-mini always works
            systemPrompt,               // FIX: systemPrompt is the correct key (not messages array for system)
            temperature: 0.7,
            maxTokens: 300,
        },

        // Using Vapi's built-in 11labs voices that don't need any external API key
        voice: {
            provider: '11labs',
            voiceId: 'bIHbv24MWmeRgasZH58o', // Will (neutral, professional) — free Vapi built-in
        },

        firstMessage,

        // FIX 4: transcriber block — correct structure
        transcriber: {
            provider: 'deepgram',
            model: 'nova-2',
            language: 'en',             // FIX: 'en-IN' may not be supported by all Vapi plans; use 'en' as safe default
        },

        // FIX 5: These are top-level keys (not inside model)
        endCallMessage: 'Thank you for the consultation. Please consult a real doctor for proper diagnosis. Take care!',
        endCallPhrases: ['goodbye', 'end call', 'end consultation', 'bye'],

        // FIX 6: recordingEnabled is valid top-level key
        recordingEnabled: true,

        // FIX 7: silenceTimeoutSeconds — end call if silent too long (prevents infinite hanging calls)
        silenceTimeoutSeconds: 30,

        // FIX 8: maxDurationSeconds — safety limit (10 min)
        maxDurationSeconds: 600,
    };

    console.log('Creating Vapi assistant with payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${VAPI_BASE_URL}/assistant`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${VAPI_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        // FIX: Log the actual Vapi error body for debugging
        const errorBody = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Vapi assistant creation failed:', response.status, JSON.stringify(errorBody));
        throw new Error(
            `Vapi API error ${response.status}: ${errorBody?.message || JSON.stringify(errorBody)}`
        );
    }

    const assistant = await response.json();
    console.log('✅ Vapi assistant created:', assistant.id);
    return assistant;
}

// ── Get Call Recording & Transcript ──────────────────────────────────────────
export async function getCallDetails(callId: string) {
    if (!VAPI_API_KEY) throw new Error('VAPI_API_KEY not set');

    const response = await fetch(`${VAPI_BASE_URL}/call/${callId}`, {
        headers: {
            'Authorization': `Bearer ${VAPI_API_KEY}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch call: ${response.status}`);
    }

    const call = await response.json();
    return {
        id: call.id,
        status: call.status,
        transcript: call.transcript,
        recordingUrl: call.recordingUrl,
        duration: call.endedAt && call.startedAt
            ? new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()
            : 0,
        messages: call.messages || [],
    };
}

// ── Extract Medical Data from Vapi Conversation ───────────────────────────────
export function extractMedicalDataFromTranscript(messages: any[]): {
    fullTranscript: string;
    patientMessages: string[];
    aiMessages: string[];
} {
    const patientMessages: string[] = [];
    const aiMessages: string[] = [];
    const fullTranscript: string[] = [];

    messages.forEach(msg => {
        if (msg.role === 'user') {
            patientMessages.push(msg.content);
            fullTranscript.push(`Patient: ${msg.content}`);
        } else if (msg.role === 'assistant') {
            aiMessages.push(msg.content);
            fullTranscript.push(`Doctor: ${msg.content}`);
        }
    });

    return {
        fullTranscript: fullTranscript.join('\n'),
        patientMessages,
        aiMessages,
    };
}

// ── Delete Assistant (Cleanup) ────────────────────────────────────────────────
export async function deleteAssistant(assistantId: string) {
    if (!VAPI_API_KEY) throw new Error('VAPI_API_KEY not set');

    try {
        await fetch(`${VAPI_BASE_URL}/assistant/${assistantId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${VAPI_API_KEY}`,
            },
        });
    } catch (error) {
        console.error('Error deleting assistant:', error);
    }
}