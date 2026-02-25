import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getUrgencyColor(urgency: 'low' | 'medium' | 'high'): string {
  switch (urgency) {
    case 'low':
      return 'text-emerald-600 bg-emerald-50';
    case 'medium':
      return 'text-amber-600 bg-amber-50';
    case 'high':
      return 'text-rose-600 bg-rose-50';
    default:
      return 'text-slate-600 bg-slate-50';
  }
}

export function calculateConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'text-emerald-600';
  if (confidence >= 60) return 'text-amber-600';
  return 'text-rose-600';
}

export async function convertAudioToBase64(audioBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });
}
