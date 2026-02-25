'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Search, ChevronRight, Clock, CheckCircle, Circle, Plus } from 'lucide-react';

interface Session {
  id: string; patientName: string | null; status: string;
  currentStep: number; chosenSpecialist: string | null; createdAt: string;
}

function StatusDot({ status }: { status: string }) {
  const cfg = {
    completed: 'bg-emerald-500',
    in_progress: 'bg-amber-500 animate-pulse',
  }[status] ?? 'bg-slate-400';
  return <div className={`h-2.5 w-2.5 rounded-full ${cfg}`} />;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
    pending: 'bg-slate-100 text-slate-600 border-slate-200',
  }[status] ?? 'bg-slate-100 text-slate-600 border-slate-200';
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg}`}>{status.replace('_', ' ')}</span>;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'completed' | 'in_progress'>('all');

  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(d => { setSessions(d.sessions || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = sessions.filter(s => {
    const matchesSearch = !search ||
      s.patientName?.toLowerCase().includes(search.toLowerCase()) ||
      s.chosenSpecialist?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || s.status === filter;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: sessions.length,
    completed: sessions.filter(s => s.status === 'completed').length,
    inProgress: sessions.filter(s => s.status === 'in_progress').length,
  };

  return (
    <div className="min-h-screen bg-[#f7f8fc]">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1a2d5a]" style={{ fontFamily: "'DM Serif Display', serif" }}>Consultation Sessions</h1>
            <p className="text-slate-500 text-sm mt-0.5">All patient consultation records</p>
          </div>
          <Link href="/dashboard/new-session">
            <button className="hidden lg:flex items-center gap-2 bg-[#1a2d5a] hover:bg-[#243769] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
              <Plus className="h-4 w-4" /> New Session
            </button>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-7">
          {[
            { label: 'Total', value: stats.total, icon: <Activity className="h-4 w-4 text-[#1a2d5a]" />, bg: 'bg-[#e8edf8]' },
            { label: 'Completed', value: stats.completed, icon: <CheckCircle className="h-4 w-4 text-emerald-600" />, bg: 'bg-emerald-50' },
            { label: 'In Progress', value: stats.inProgress, icon: <Clock className="h-4 w-4 text-amber-600" />, bg: 'bg-amber-50' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 px-5 py-4 flex items-center gap-4">
              <div className={`h-9 w-9 rounded-xl ${s.bg} flex items-center justify-center`}>{s.icon}</div>
              <div>
                <div className="text-xl font-bold text-slate-800" style={{ fontFamily: 'monospace' }}>{s.value}</div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900/40 transition-all"
              placeholder="Search by patient name or specialist..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'completed', 'in_progress'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  filter === f
                    ? 'bg-[#1a2d5a] text-white border-[#1a2d5a]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {f === 'all' ? 'All' : f === 'completed' ? 'Completed' : 'In Progress'}
              </button>
            ))}
          </div>
        </div>

        {/* Sessions list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 border-2 border-slate-200 border-t-[#1a8fa0] rounded-full animate-spin mb-3" />
            <p className="text-slate-400 text-sm">Loading sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Activity className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="font-bold text-slate-700 mb-1">No sessions yet</h3>
            <p className="text-slate-400 text-sm mb-5">Start your first medical consultation</p>
            <Link href="/dashboard/new-session">
              <button className="inline-flex items-center gap-2 bg-[#1a2d5a] hover:bg-[#243769] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                <Plus className="h-4 w-4" /> Start Session
              </button>
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
            <p className="text-slate-500">No sessions match your filters.</p>
            <button onClick={() => { setSearch(''); setFilter('all'); }} className="text-[#1a8fa0] text-sm mt-2 hover:underline">Clear filters</button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-50">
              {filtered.map((session) => (
                <Link key={session.id} href={`/dashboard/session/${session.id}`}>
                  <div className="px-6 py-4 hover:bg-slate-50/60 transition-colors cursor-pointer flex items-center gap-4 group">
                    <div className="h-11 w-11 rounded-xl bg-[#e8edf8] flex items-center justify-center text-[#1a2d5a] font-bold text-base flex-shrink-0">
                      {(session.patientName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-slate-800 text-sm">{session.patientName || 'Unnamed Patient'}</p>
                        <StatusBadge status={session.status} />
                      </div>
                      <p className="text-xs text-slate-400">
                        {session.chosenSpecialist ? session.chosenSpecialist.replace('_', ' ') : 'No specialist'} · Step {session.currentStep}/5
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-400">
                        {new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
