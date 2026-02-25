'use client';

import { useState, useRef, useCallback } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn, formatDuration } from '@/lib/utils';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  isProcessing?: boolean;
}

export function VoiceRecorder({ onRecordingComplete, isProcessing = false }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(audioBlob, duration);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  }, [duration, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-8">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              size="lg"
              className={cn(
                'h-24 w-24 rounded-full transition-all duration-300',
                isRecording
                  ? 'bg-rose-500 hover:bg-rose-600 animate-pulse shadow-lg shadow-rose-500/50'
                  : 'bg-primary hover:bg-primary/90 shadow-xl shadow-primary/30'
              )}
            >
              {isProcessing ? (
                <Loader2 className="h-10 w-10 animate-spin" />
              ) : isRecording ? (
                <Square className="h-10 w-10" />
              ) : (
                <Mic className="h-10 w-10" />
              )}
            </Button>
            
            {isRecording && (
              <div className="absolute -inset-2 rounded-full bg-rose-500/20 animate-ping" />
            )}
          </div>

          <div className="text-center space-y-2">
            <p className="text-2xl font-bold text-primary">
              {isRecording ? formatDuration(duration) : '00:00'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isProcessing
                ? 'Processing your audio...'
                : isRecording
                ? 'Recording... Click to stop'
                : 'Click to start recording'}
            </p>
          </div>

          {isRecording && (
            <div className="w-full max-w-xs">
              <div className="flex justify-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-rose-500 rounded-full animate-pulse"
                    style={{
                      height: `${20 + Math.random() * 40}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
