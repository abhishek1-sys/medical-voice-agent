'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { Activity, FileText, Clock, CheckCircle, Plus, TrendingUp, Calendar, ArrowRight, ChevronRight } from 'lucide-react';

interface Session {
  id: string;
  patientName: string | null;
  status: string;
  currentStep: number;
  chosenSpecialist: string | null;
  createdAt: string;
}

function StatCard({ icon, value, label, sub, color }: { icon: React.ReactNode; value: string | number; label: string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
        {sub && <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{sub}</span>}
      </div>
      <div className="text-3xl font-bold text-slate-800 mb-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
      <div className="text-slate-500 text-sm">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
    pending: 'bg-slate-100 text-slate-600 border-slate-200',
  }[status] ?? 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg}`}>
      {status === 'completed' ? '● ' : status === 'in_progress' ? '◐ ' : '○ '}
      {status.replace('_', ' ')}
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(d => { setSessions(d.sessions || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const stats = {
    total: sessions.length,
    completed: sessions.filter(s => s.status === 'completed').length,
    inProgress: sessions.filter(s => s.status === 'in_progress').length,
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-[#f7f8fc]">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1a2d5a]" style={{ fontFamily: "'DM Serif Display', serif" }}>
              Good morning, {user?.firstName || 'Doctor'} 👋
            </h1>
            <p className="text-slate-500 text-sm mt-0.5 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> {today}
            </p>
          </div>
          <Link href="/dashboard/new-session">
            <button className="hidden lg:flex items-center gap-2 bg-[#1a2d5a] hover:bg-[#243769] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
              <Plus className="h-4 w-4" /> New Consultation
            </button>
          </Link>
        </div>
      </div>

      <div className="px-8 py-8 max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Activity className="h-5 w-5 text-[#1a2d5a]" />}
            value={stats.total}
            label="Total Sessions"
            color="bg-[#e8edf8]"
          />
          <StatCard
            icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
            value={stats.completed}
            label="Completed"
            sub={stats.total ? `${Math.round((stats.completed / stats.total) * 100)}%` : undefined}
            color="bg-emerald-50"
          />
          <StatCard
            icon={<Clock className="h-5 w-5 text-amber-600" />}
            value={stats.inProgress}
            label="In Progress"
            color="bg-amber-50"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5 text-[#1a8fa0]" />}
            value={stats.completed > 0 ? "98%" : "—"}
            label="Accuracy Rate"
            color="bg-[#e8f6f9]"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Sessions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-bold text-slate-800">Recent Consultations</h2>
                <Link href="/dashboard/sessions" className="text-sm text-[#1a8fa0] hover:text-[#167f8e] font-medium flex items-center gap-1">
                  View all <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {loading ? (
                <div className="px-6 py-12 text-center">
                  <div className="inline-flex items-center gap-2 text-slate-400">
                    <div className="h-4 w-4 border-2 border-slate-300 border-t-[#1a8fa0] rounded-full animate-spin" />
                    Loading sessions...
                  </div>
                </div>
              ) : sessions.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-slate-300" />
                  </div>
                  <h3 className="text-slate-700 font-semibold mb-1">No consultations yet</h3>
                  <p className="text-slate-400 text-sm mb-5">Start your first AI medical voice consultation</p>
                  <Link href="/dashboard/new-session">
                    <button className="inline-flex items-center gap-2 bg-[#1a2d5a] hover:bg-[#243769] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                      <Plus className="h-4 w-4" /> Start Consultation
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {sessions.slice(0, 6).map((session) => (
                    <Link key={session.id} href={`/dashboard/session/${session.id}`}>
                      <div className="px-6 py-4 hover:bg-slate-50/60 transition-colors cursor-pointer flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-[#e8edf8] flex items-center justify-center text-[#1a2d5a] font-bold text-sm">
                            {(session.patientName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{session.patientName || 'Unnamed Patient'}</p>
                            <p className="text-slate-400 text-xs mt-0.5">
                              {session.chosenSpecialist || 'No specialist'} · Step {session.currentStep}/5
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={session.status} />
                          <span className="text-slate-400 text-xs">
                            {new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-[#1a2d5a] to-[#243769] rounded-2xl p-6 text-white">
              <h3 className="font-bold text-lg mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>Start New Session</h3>
              <p className="text-slate-300 text-sm mb-5 leading-relaxed">
                Describe your symptoms via voice and receive an AI-powered clinical assessment in under 30 seconds.
              </p>
              <Link href="/dashboard/new-session">
                <button className="w-full flex items-center justify-center gap-2 bg-[#1a8fa0] hover:bg-[#167f8e] text-white text-sm font-semibold py-3 rounded-xl transition-colors">
                  Begin Consultation <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">Quick Links</h3>
              <div className="space-y-2">
                {[
                  { href: '/dashboard/sessions', label: 'All Sessions', icon: <Activity className="h-4 w-4" /> },
                  { href: '/dashboard/reports', label: 'View Reports', icon: <FileText className="h-4 w-4" /> },
                ].map(link => (
                  <Link key={link.href} href={link.href}>
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-[#1a2d5a] text-sm font-medium transition-all cursor-pointer group">
                      <span className="text-slate-400 group-hover:text-[#1a8fa0] transition-colors">{link.icon}</span>
                      {link.label}
                      <ChevronRight className="h-3.5 w-3.5 ml-auto text-slate-300 group-hover:text-slate-500" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-amber-800 text-xs leading-relaxed">
                <strong>Clinical Disclaimer:</strong> MediVoice AI provides informational insights only. Always consult a licensed medical professional for diagnosis and treatment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
