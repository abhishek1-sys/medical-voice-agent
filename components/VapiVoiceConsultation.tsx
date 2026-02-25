'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, Square, Loader2, PhoneOff, Volume2, VolumeX, AlertCircle } from 'lucide-react';

interface ConversationMessage {
    role: string;
    content: string;
    timestamp: string;
}

interface VapiVoiceConsultationProps {
    assistantId: string;
    patientName: string;
    symptoms: string;
    onCallEnd: (callId: string, transcript: ConversationMessage[]) => void;
    onError?: (error: string) => void;
}

export function VapiVoiceConsultation({
    assistantId,
    patientName,
    symptoms,
    onCallEnd,
    onError,
}: VapiVoiceConsultationProps) {
    const vapiRef = useRef<Vapi | null>(null);
    const [initError, setInitError] = useState<string>('');
    const [isInitialized, setIsInitialized] = useState(false);
    const [isCallActive, setIsCallActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([]);
    const [volumeLevel, setVolumeLevel] = useState(0);
    const [connectionStatus, setConnectionStatus] = useState<string>('');

    const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    // FIX: callId ref — updated immediately when call starts, always current in closures
    const currentCallIdRef = useRef<string>('');
    const conversationMessagesRef = useRef<ConversationMessage[]>([]);
    // FIX: track whether onCallEnd was already fired to prevent double-fire
    const callEndFiredRef = useRef<boolean>(false);

    useEffect(() => {
        const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
        if (!publicKey || publicKey.trim() === '') {
            const msg = 'NEXT_PUBLIC_VAPI_PUBLIC_KEY is missing in .env.local';
            setInitError(msg);
            onError?.(msg);
            return;
        }

        try {
            const vapiClient = new Vapi(publicKey);
            vapiRef.current = vapiClient;
            setIsInitialized(true);

            vapiClient.on('call-start', () => {
                console.log('📞 Call started');
                setIsCallActive(true);
                setIsConnecting(false);
                setConnectionStatus('Connected');
                callEndFiredRef.current = false;
                durationIntervalRef.current = setInterval(() => {
                    setCallDuration(prev => prev + 1);
                }, 1000);
            });

            vapiClient.on('call-end', () => {
                console.log('📴 Call ended. callId:', currentCallIdRef.current, 'messages:', conversationMessagesRef.current.length);
                setIsCallActive(false);
                setConnectionStatus('');

                if (durationIntervalRef.current) {
                    clearInterval(durationIntervalRef.current);
                    durationIntervalRef.current = null;
                }

                // FIX: Always fire onCallEnd — even if callId is empty string
                // The parent (new-session page) will handle the empty callId case
                // by using the local transcript directly
                if (!callEndFiredRef.current) {
                    callEndFiredRef.current = true;
                    onCallEnd(currentCallIdRef.current, conversationMessagesRef.current);
                }
            });

            vapiClient.on('speech-start', () => setConnectionStatus('Listening...'));
            vapiClient.on('speech-end', () => setConnectionStatus('Processing...'));

            vapiClient.on('message', (message: any) => {
                // FIX: Capture BOTH 'transcript' type AND 'conversation-update' type
                // Vapi sometimes sends conversation-update instead of transcript
                if (message.type === 'transcript' && message.transcriptType === 'final' && message.transcript) {
                    const newMsg: ConversationMessage = {
                        role: message.role,
                        content: message.transcript,
                        timestamp: new Date().toISOString(),
                    };
                    setConversationMessages(prev => {
                        const updated = [...prev, newMsg];
                        conversationMessagesRef.current = updated;
                        return updated;
                    });
                }

                // FIX: Also handle conversation-update which has full message history
                if (message.type === 'conversation-update' && message.conversation) {
                    const msgs: ConversationMessage[] = message.conversation
                        .filter((m: any) => m.role !== 'system' && m.content)
                        .map((m: any) => ({
                            role: m.role,
                            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
                            timestamp: new Date().toISOString(),
                        }));
                    conversationMessagesRef.current = msgs;
                    setConversationMessages(msgs);
                }
            });

            vapiClient.on('volume-level', (level: number) => setVolumeLevel(level));

            vapiClient.on('error', (error: any) => {
                console.error('❌ Vapi error:', JSON.stringify(error, null, 2));
                const msg =
                    error?.error?.message ||
                    error?.message ||
                    error?.error ||
                    (typeof error === 'string' ? error : JSON.stringify(error)) ||
                    'Voice call error occurred';
                onError?.(msg);
                setIsCallActive(false);
                setIsConnecting(false);
                setConnectionStatus('Error: ' + msg);
            });
        } catch (err: any) {
            const msg = `Failed to initialize Vapi: ${err?.message || 'Unknown error'}`;
            setInitError(msg);
            onError?.(msg);
        }

        return () => {
            vapiRef.current?.stop();
            vapiRef.current = null;
            if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const startCall = useCallback(async () => {
        if (!vapiRef.current) {
            onError?.('Vapi not initialized');
            return;
        }
        try {
            setIsConnecting(true);
            setConnectionStatus('Connecting...');
            setCallDuration(0);
            setConversationMessages([]);
            conversationMessagesRef.current = [];
            currentCallIdRef.current = '';
            callEndFiredRef.current = false;

            const response = await vapiRef.current.start(assistantId);
            console.log('📋 Call start response:', response);

            // FIX: Set callId from response immediately
            if (response?.id) {
                currentCallIdRef.current = response.id;
                console.log('✅ Call ID set:', response.id);
            }
        } catch (error: any) {
            console.error('Failed to start call:', error);
            setIsConnecting(false);
            setConnectionStatus('');
            onError?.(error?.message || 'Failed to start voice call');
        }
    }, [assistantId, onError]);

    const endCall = useCallback(() => {
        if (vapiRef.current && isCallActive) {
            vapiRef.current.stop();
        }
    }, [isCallActive]);

    const toggleMute = useCallback(() => {
        if (vapiRef.current && isCallActive) {
            vapiRef.current.setMuted(!isMuted);
            setIsMuted(prev => !prev);
        }
    }, [isCallActive, isMuted]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (initError) {
        return (
            <Card className="border-2 border-red-200 bg-red-50">
                <CardContent className="p-8">
                    <div className="flex flex-col items-center space-y-4 text-center">
                        <AlertCircle className="h-12 w-12 text-red-500" />
                        <p className="font-semibold text-red-700">Voice Setup Failed</p>
                        <p className="text-sm text-red-600 max-w-sm">{initError}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-8">
                <div className="flex flex-col items-center space-y-6">
                    <div className="relative">
                        <button
                            onClick={isCallActive ? endCall : startCall}
                            disabled={isConnecting || !isInitialized}
                            className={`h-32 w-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                                !isInitialized ? 'bg-gray-300 cursor-not-allowed' :
                                isConnecting ? 'bg-gray-400 cursor-not-allowed' :
                                isCallActive ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-red-500/50' :
                                'bg-gradient-to-br from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600'
                            }`}
                        >
                            {isConnecting ? <Loader2 className="h-14 w-14 text-white animate-spin" /> :
                             isCallActive ? <PhoneOff className="h-14 w-14 text-white" /> :
                             <Mic className="h-14 w-14 text-white" />}
                        </button>

                        {isCallActive && volumeLevel > 0 && (
                            <div
                                className="absolute -inset-3 rounded-full border-4 border-blue-400 opacity-50 pointer-events-none"
                                style={{ transform: `scale(${1 + volumeLevel * 0.3})`, transition: 'transform 0.1s ease-out' }}
                            />
                        )}
                    </div>

                    <div className="text-center space-y-2">
                        {isCallActive && (
                            <p className="text-3xl font-bold text-primary tabular-nums">{formatDuration(callDuration)}</p>
                        )}
                        <p className="text-sm font-medium text-gray-600">
                            {connectionStatus || (isCallActive ? '🎙️ Active Call' : isConnecting ? 'Connecting...' : isInitialized ? '🎤 Click to start voice consultation' : 'Initializing...')}
                        </p>
                    </div>

                    {isCallActive && (
                        <div className="flex gap-4">
                            <Button onClick={toggleMute} variant="outline" size="lg" className="rounded-full">
                                {isMuted ? <><VolumeX className="h-5 w-5 mr-2" /> Unmute</> : <><Volume2 className="h-5 w-5 mr-2" /> Mute</>}
                            </Button>
                            <Button onClick={endCall} variant="destructive" size="lg" className="rounded-full">
                                <Square className="h-5 w-5 mr-2" /> End Call
                            </Button>
                        </div>
                    )}

                    {conversationMessages.length > 0 && (
                        <div className="w-full max-w-2xl">
                            <p className="text-sm font-semibold text-gray-700 mb-2">Live Transcript ({conversationMessages.length} messages):</p>
                            <div className="space-y-2 max-h-64 overflow-y-auto bg-gray-50 rounded-lg p-4">
                                {conversationMessages.slice(-6).map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-xs rounded-lg px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-emerald-100 text-emerald-900' : 'bg-blue-100 text-blue-900'}`}>
                                            <span className="font-semibold text-xs">{msg.role === 'user' ? 'You' : 'Doctor'}:</span>{' '}{msg.content}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {isCallActive && (
                        <div className="flex justify-center space-x-1">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="w-1.5 bg-blue-500 rounded-full animate-pulse"
                                    style={{ height: `${10 + volumeLevel * 50 + Math.random() * 20}px`, animationDelay: `${i * 0.1}s`, animationDuration: '0.8s' }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
