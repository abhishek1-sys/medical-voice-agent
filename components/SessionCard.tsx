'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Session } from '@/lib/db/schema';
import { formatDate, formatDuration } from '@/lib/utils';
import { FileText, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface SessionCardProps {
  session: Session;
}

export function SessionCard({ session }: SessionCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-1">
            Session {session.id.slice(0, 8)}
          </CardTitle>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              session.status === 'completed'
                ? 'bg-emerald-100 text-emerald-700'
                : session.status === 'processing'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-rose-100 text-rose-700'
            }`}
          >
            {session.status}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {session.transcript && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {session.transcript}
          </p>
        )}
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(session.createdAt)}
          </div>
          {session.duration && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(session.duration)}
            </div>
          )}
        </div>

        {session.status === 'completed' && (
          <Link href={`/dashboard/session/${session.id}`}>
            <Button variant="outline" size="sm" className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              View Report
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
