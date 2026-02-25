'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SPECIALISTS } from '@/lib/services/gemini';
import {
  ArrowLeft, AlertTriangle, CheckCircle, ChevronRight,
  Download, Loader2, Mic, Sparkles, Clock, Shield,
  FileText, AlertCircle, RefreshCcw,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────
interface SymptomSeverity { name: string; severity: number; trend: 'improving' | 'stable' | 'worsening'; }
interface RiskFactor { name: string; level: number; category: string; }
interface RecoveryTimeline { minDays: number; maxDays: number; label: string; milestones: { day: number; description: string }[]; }
interface ProgressionPt { week: number; withTreatment: number; withoutTreatment: number; }
interface VitalInd { name: string; value: string; status: 'normal' | 'warning' | 'critical'; }

interface Analysis {
  summary: string; symptoms: string[]; recommendations: string[];
  diagnosis: string; confidence: number; urgency: string; disclaimer: string;
  diseaseLevel: number; painLevel: number; overallRisk: number;
  symptomSeverities: SymptomSeverity[]; riskFactors: RiskFactor[];
  recoveryTimeline: RecoveryTimeline; diseaseProgression: ProgressionPt[];
  vitalIndicators: VitalInd[]; treatmentPriority: string;
  followUpRecommendation: string; lifestyleChanges: string[]; medicationHints: string[];
}

interface Session {
  id: string; patientName: string | null; age: number | null; gender: string | null;
  symptoms: string | null; symptomDuration: string | null; medicalHistory: string | null;
  chosenSpecialist: string | null; transcript: string | null;
  status: string; createdAt: string; medicalData: Analysis | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreColor(v: number) { return v >= 70 ? '#ef4444' : v >= 40 ? '#f59e0b' : '#22c55e'; }
function scoreLabel(v: number) { return v >= 70 ? 'High' : v >= 40 ? 'Moderate' : 'Low'; }
function priorityCfg(p: string) {
  const m: Record<string, { label: string; color: string; bg: string; border: string; emoji: string }> = {
    immediate:    { label: 'Seek Immediate Care',    color: '#991b1b', bg: '#fef2f2', border: '#fecaca', emoji: '🚨' },
    within_week:  { label: 'See Doctor This Week',   color: '#92400e', bg: '#fffbeb', border: '#fde68a', emoji: '⚡' },
    within_month: { label: 'Appointment This Month', color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe', emoji: '📅' },
    routine:      { label: 'Routine Follow-up',      color: '#166534', bg: '#f0fdf4', border: '#bbf7d0', emoji: '✅' },
  };
  return m[p] ?? m.within_week;
}

// ── SVG Circle Gauge ──────────────────────────────────────────────────────────
function CircleGauge({ value, color, size = 110, label }: { value: number; color: string; size?: number; label: string }) {
  const r = (size - 18) / 2, circ = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, value / 100)) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={11} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={11}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 6px ${color}60)` }} />
        <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize="19" fontWeight="800" fill={color}>{value}</text>
        <text x={size / 2} y={size / 2 + 17} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#94a3b8">/ 100</text>
      </svg>
      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest text-center whitespace-pre-line leading-tight">{label}</span>
    </div>
  );
}

// ── Pain Bar ──────────────────────────────────────────────────────────────────
function PainBar({ value }: { value: number }) {
  const clr = ['#22c55e', '#22c55e', '#22c55e', '#84cc16', '#84cc16', '#f59e0b', '#f59e0b', '#ef4444', '#ef4444', '#dc2626'];
  return (
    <div className="flex items-end gap-1">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="rounded-sm flex-1 transition-all duration-700"
          style={{ height: i < value ? 18 + i * 3 : 10, background: i < value ? clr[i] : '#e2e8f0' }} />
      ))}
      <span className="ml-3 text-xl font-black text-slate-700 whitespace-nowrap">{value}<span className="text-sm font-normal text-slate-400">/10</span></span>
    </div>
  );
}

// ── Recharts: Disease Progression ─────────────────────────────────────────────
function ProgressionChart({ data }: { data: ProgressionPt[] }) {
  if (!data || data.length < 2) return null;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
        <defs>
          <linearGradient id="gradWith" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradWithout" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="week" tickFormatter={(v: number) => `W${v}`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 100]} />
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }}
          formatter={(val: number, name: string) => [`${val}%`, name]}
          labelFormatter={(v: number) => `Week ${v}`}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#64748b' }} />
        <Area type="monotone" dataKey="withTreatment" name="With Treatment" stroke="#22c55e" fill="url(#gradWith)"
          strokeWidth={2.5} dot={{ fill: '#22c55e', r: 4, strokeWidth: 0 }} />
        <Area type="monotone" dataKey="withoutTreatment" name="Without Treatment" stroke="#ef4444" fill="url(#gradWithout)"
          strokeWidth={2} strokeDasharray="5 4" dot={{ fill: '#ef4444', r: 3, strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Recharts: Symptom Severity Bar Chart ─────────────────────────────────────
function SeverityBarChart({ data }: { data: SymptomSeverity[] }) {
  if (!data || data.length === 0) return null;
  const chartData = data.map(s => ({
    name: s.name.split(' ').slice(0, 2).join(' '),
    severity: s.severity,
    trend: s.trend,
  }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 100]} />
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }}
          formatter={(val: number) => [`${val}%`, 'Severity']}
        />
        <Bar dataKey="severity" radius={[6, 6, 0, 0]} maxBarSize={48}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={
              entry.trend === 'worsening' ? '#ef4444' :
              entry.trend === 'improving' ? '#22c55e' : '#f59e0b'
            } />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Recharts: Risk Radar ──────────────────────────────────────────────────────
function RiskRadarChart({ data }: { data: RiskFactor[] }) {
  if (!data || data.length === 0) return null;
  const radarData = data.map(r => ({
    subject: r.name.split(' ')[0],
    value: r.level,
    fullName: r.name,
    category: r.category,
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#f1f5f9" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
        <Radar name="Risk Level" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }}
          formatter={(val: number, _: string, props: any) => [
            `${val}% — ${props?.payload?.fullName ?? ''}`,
            props?.payload?.category ?? '',
          ]}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── HBar ─────────────────────────────────────────────────────────────────────
function HBar({ value, color, label, trend }: { value: number; color: string; label: string; trend?: string }) {
  const t = trend === 'improving' ? { icon: '↓ Improving', color: '#22c55e' }
    : trend === 'worsening' ? { icon: '↑ Worsening', color: '#ef4444' }
    : trend === 'stable' ? { icon: '→ Stable', color: '#94a3b8' } : null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700 truncate pr-2">{label}</span>
        <div className="flex items-center gap-2 shrink-0">
          {t && <span className="text-xs font-semibold" style={{ color: t.color }}>{t.icon}</span>}
          <span className="text-sm font-bold" style={{ color }}>{value}%</span>
        </div>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${value}%`, background: `linear-gradient(90deg,${color}88,${color})` }} />
      </div>
    </div>
  );
}

// ── PDF Builder ───────────────────────────────────────────────────────────────
function buildPDF(session: Session, a: Analysis): string {
  const pc = priorityCfg(a.treatmentPriority);
  const sc = scoreColor;
  const symptoms = a.symptoms || [];
  const recs = a.recommendations || [];
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Medical Report — ${session.patientName}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;font-size:13px;line-height:1.6}.page{max-width:800px;margin:0 auto;padding:40px}.hdr{background:linear-gradient(135deg,#1a2d5a,#1e3a8a);color:#fff;padding:32px;border-radius:12px;margin-bottom:24px}.hdr h1{font-size:24px;font-weight:900}.hdr .sub{opacity:.7;margin-top:4px;font-size:12px}.hdr .meta{margin-top:18px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.hdr .ml{font-size:9px;opacity:.6;text-transform:uppercase;letter-spacing:1px}.hdr .mv{font-size:14px;font-weight:800;display:block;margin-top:2px}.pb{padding:14px 18px;border-radius:10px;border:2px solid ${pc.border};background:${pc.bg};color:${pc.color};font-weight:800;font-size:14px;margin-bottom:20px}.mg{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}.mc{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;text-align:center}.mc .v{font-size:26px;font-weight:900}.mc .l{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-top:3px}.sec{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px 22px;margin-bottom:16px}.sec h2{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #f1f5f9}.chip{display:inline-block;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700;margin:2px 3px 2px 0}.br{margin-bottom:10px}.bl{display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;font-weight:600}.bt{height:7px;background:#f1f5f9;border-radius:4px;overflow:hidden}.bf{height:100%;border-radius:4px}.ri{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f8fafc;font-size:12px}.ri:last-child{border-bottom:none}.rn{background:#dbeafe;color:#1d4ed8;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0}.mi{display:flex;gap:10px;padding:7px 0;border-bottom:1px solid #f8fafc;font-size:12px}.mi:last-child{border-bottom:none}.db{background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;border-radius:5px;padding:2px 7px;font-weight:700;font-size:10px;flex-shrink:0}.vg{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.vc{padding:10px;border-radius:8px;border:1px solid;text-align:center}.vc.normal{background:#f0fdf4;border-color:#bbf7d0;color:#166534}.vc.warning{background:#fffbeb;border-color:#fde68a;color:#92400e}.vc.critical{background:#fef2f2;border-color:#fecaca;color:#991b1b}.vn{font-size:10px;font-weight:800;text-transform:uppercase}.vv{font-size:13px;font-weight:800;margin-top:2px}.disc{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;font-size:11px;color:#92400e;margin-top:18px}.tx{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;font-size:11px;color:#475569;white-space:pre-wrap;font-family:monospace;line-height:1.7}.ft{text-align:center;color:#94a3b8;font-size:10px;margin-top:24px;padding-top:16px;border-top:1px solid #f1f5f9}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="page">
<div class="hdr"><h1>🏥 Medical Consultation Report</h1><div class="sub">AI-Powered Analysis · VAPI + Gemini Pipeline · For Informational Purposes Only</div>
<div class="meta"><div><div class="ml">Patient</div><div class="mv">${session.patientName || 'Unknown'}</div></div><div><div class="ml">Specialist</div><div class="mv">${SPECIALISTS.find(s => s.id === session.chosenSpecialist)?.name || 'General'}</div></div><div><div class="ml">Date</div><div class="mv">${new Date(session.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div></div>${session.age ? `<div><div class="ml">Age</div><div class="mv">${session.age} yrs</div></div>` : ''}${session.gender ? `<div><div class="ml">Gender</div><div class="mv" style="text-transform:capitalize">${session.gender}</div></div>` : ''}<div><div class="ml">AI Confidence</div><div class="mv">${a.confidence}%</div></div></div></div>
<div class="pb">${pc.emoji} Treatment Priority: ${pc.label}</div>
<div class="mg"><div class="mc"><div class="v" style="color:${sc(a.diseaseLevel)}">${a.diseaseLevel}</div><div class="l">Disease Level /100</div></div><div class="mc"><div class="v" style="color:${sc(a.overallRisk)}">${a.overallRisk}</div><div class="l">Overall Risk /100</div></div><div class="mc"><div class="v" style="color:#7c3aed">${a.painLevel}<span style="font-size:14px;font-weight:400">/10</span></div><div class="l">Pain Score</div></div></div>
<div class="sec"><h2>Clinical Summary</h2><p style="color:#374151;line-height:1.8">${a.summary}</p></div>
${symptoms.length > 0 ? `<div class="sec"><h2>Identified Symptoms (${symptoms.length})</h2><div>${symptoms.map(s => `<span class="chip">${s}</span>`).join('')}</div></div>` : ''}
${a.symptomSeverities?.length > 0 ? `<div class="sec"><h2>Symptom Severity</h2>${a.symptomSeverities.map(s => `<div class="br"><div class="bl"><span>${s.name}</span><span style="color:${sc(s.severity)}">${s.severity}% — ${s.trend}</span></div><div class="bt"><div class="bf" style="width:${s.severity}%;background:${sc(s.severity)}"></div></div></div>`).join('')}</div>` : ''}
<div class="sec"><h2>Differential Assessment</h2><p style="color:#374151;line-height:1.8">${a.diagnosis}</p></div>
${recs.length > 0 ? `<div class="sec"><h2>Recommendations</h2>${recs.map((r, i) => `<div class="ri"><div class="rn">${i + 1}</div><div>${r}</div></div>`).join('')}</div>` : ''}
${a.riskFactors?.length > 0 ? `<div class="sec"><h2>Risk Factors</h2>${a.riskFactors.map(r => `<div class="br"><div class="bl"><span>${r.name} <span style="font-size:10px;color:#64748b">[${r.category}]</span></span><span style="color:${sc(r.level)};font-weight:700">${r.level}%</span></div><div class="bt"><div class="bf" style="width:${r.level}%;background:${sc(r.level)}"></div></div></div>`).join('')}</div>` : ''}
${a.recoveryTimeline ? `<div class="sec"><h2>Recovery Timeline — ${a.recoveryTimeline.label}</h2>${a.recoveryTimeline.milestones?.map(m => `<div class="mi"><span class="db">Day ${m.day}</span><span>${m.description}</span></div>`).join('') || ''}</div>` : ''}
${a.vitalIndicators?.length > 0 ? `<div class="sec"><h2>Vital Indicators</h2><div class="vg">${a.vitalIndicators.map(v => `<div class="vc ${v.status}"><div class="vn">${v.name}</div><div class="vv">${v.value}</div></div>`).join('')}</div></div>` : ''}
${a.lifestyleChanges?.length > 0 ? `<div class="sec"><h2>Lifestyle Changes</h2>${a.lifestyleChanges.map(l => `<div class="ri"><div class="rn">→</div><div>${l}</div></div>`).join('')}</div>` : ''}
${a.medicationHints?.length > 0 ? `<div class="sec"><h2>Medication Hints</h2>${a.medicationHints.map(m => `<div class="ri"><div class="rn">💊</div><div>${m}</div></div>`).join('')}</div>` : ''}
<div class="sec"><h2>Follow-up</h2><p style="color:#374151">${a.followUpRecommendation}</p></div>
${session.transcript ? `<div class="sec"><h2>Voice Transcript</h2><div class="tx">${session.transcript.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div></div>` : ''}
<div class="disc">⚠️ <strong>Medical Disclaimer:</strong> ${a.disclaimer} This report is generated by AI and is NOT a substitute for professional medical diagnosis or treatment.</div>
<div class="ft">MedVoice AI · VAPI + Gemini · Report ID: ${session.id} · ${new Date().toLocaleString('en-IN')}</div>
</div></body></html>`;
}

function downloadPDF(session: Session, a: Analysis) {
  const win = window.open('', '_blank');
  if (!win) { alert('Please allow popups to download PDF'); return; }
  win.document.write(buildPDF(session, a));
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 800);
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'plan' | 'transcript'>('overview');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/sessions/${id}`)
      .then(r => r.json())
      .then(d => { if (d.session) setSession(d.session); else setError('Session not found'); setLoading(false); })
      .catch(() => { setError('Failed to load report'); setLoading(false); });
  }, [id]);

  async function handleSummarize() {
    if (!session?.medicalData) return;
    setSummarizing(true); setSummary(null);
    try {
      const res = await fetch('/api/summarize-report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis: session.medicalData, patientName: session.patientName }),
      });
      const d = await res.json();
      setSummary(d.success ? d.summary : session.medicalData.summary);
    } catch { setSummary(session?.medicalData?.summary || 'Unable to generate summary.'); }
    finally { setSummarizing(false); }
  }

  async function handleReanalyze() {
    if (!session) return;
    setReanalyzing(true);
    try {
      const res = await fetch('/api/vapi/analyze-conversation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id, callId: 'reanalysis',
          transcript: session.transcript || session.symptoms || '',
          messages: [], patientName: session.patientName,
          symptoms: session.symptoms, specialist: session.chosenSpecialist,
        }),
      });
      const d = await res.json();
      if (d.success) setSession(prev => prev ? { ...prev, medicalData: d.analysis, status: 'completed' } : prev);
    } catch (e) { console.error(e); }
    finally { setReanalyzing(false); }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="relative h-16 w-16 mx-auto mb-5">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-900 border-transparent animate-spin" />
        </div>
        <p className="text-slate-500 font-medium">Loading medical report…</p>
      </div>
    </div>
  );

  if (error || !session) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="h-16 w-16 text-red-300 mx-auto mb-4" />
        <h3 className="text-slate-700 font-bold text-lg mb-2">{error || 'Session not found'}</h3>
        <Link href="/dashboard"><button className="text-blue-900 underline text-sm">Back to Dashboard</button></Link>
      </div>
    </div>
  );

  const a = session.medicalData;
  const specialist = SPECIALISTS.find(s => s.id === session.chosenSpecialist);
  const pc = a ? priorityCfg(a.treatmentPriority) : null;

  const tabs = [
    { key: 'overview' as const, label: '📋 Overview' },
    { key: 'charts' as const, label: '📊 Charts' },
    { key: 'plan' as const, label: '💊 Treatment Plan' },
    { key: 'transcript' as const, label: '🎙️ Transcript' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg,#f0f4ff 0%,#f8fafc 60%,#f0fdf4 100%)' }}>

      {/* ── Sticky Nav ── */}
      <div className="bg-white/90 backdrop-blur sticky top-0 z-20 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <span className="text-slate-200">|</span>
            <nav className="flex items-center gap-1 text-xs text-slate-400">
              <Link href="/dashboard" className="hover:text-slate-600">Dashboard</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-slate-700 font-semibold">Report</span>
            </nav>
          </div>
          {a && (
            <div className="flex items-center gap-2">
              <button onClick={handleSummarize} disabled={summarizing}
                className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-all disabled:opacity-50">
                {summarizing ? <><Loader2 className="h-4 w-4 animate-spin" />Summarising…</> : <><Sparkles className="h-4 w-4" />Summarise</>}
              </button>
              <button onClick={() => downloadPDF(session, a)}
                className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-blue-900 text-white hover:bg-blue-800 transition-all">
                <Download className="h-4 w-4" /> Download PDF
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-5">

        {/* ── Hero ── */}
        <div className="rounded-2xl overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg,#1a2d5a 0%,#1e3a8a 100%)' }}>
          <div className="px-8 py-8 text-white">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-blue-300 mb-2">
                  🏥 Medical Report · VAPI + Gemini AI Pipeline
                </div>
                <h1 className="text-3xl font-black tracking-tight mb-1">{session.patientName || 'Patient Report'}</h1>
                <p className="text-blue-200 text-sm">
                  {new Date(session.createdAt).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  {specialist && <> · {specialist.icon} {specialist.name}</>}
                </p>
              </div>
              {a && (
                <div className="flex gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-black" style={{ color: scoreColor(a.confidence) }}>{a.confidence}%</div>
                    <div className="text-blue-300 text-xs mt-1">AI Confidence</div>
                  </div>
                  {pc && <div className="text-center"><div className="text-2xl">{pc.emoji}</div><div className="text-blue-200 text-xs mt-1">{pc.label}</div></div>}
                </div>
              )}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {session.age && <span className="text-xs bg-white/10 px-3 py-1.5 rounded-full font-medium">Age: {session.age}</span>}
              {session.gender && <span className="text-xs bg-white/10 px-3 py-1.5 rounded-full font-medium capitalize">{session.gender}</span>}
              {session.symptomDuration && <span className="text-xs bg-white/10 px-3 py-1.5 rounded-full font-medium">Duration: {session.symptomDuration.replace(/_/g, ' ')}</span>}
              <span className={`text-xs px-3 py-1.5 rounded-full font-bold ${session.status === 'completed' ? 'bg-emerald-400/20 text-emerald-200' : 'bg-amber-400/20 text-amber-200'}`}>
                {session.status === 'completed' ? '✓ Completed' : '⏳ In Progress'}
              </span>
            </div>
          </div>
          {a && (
            <div className="grid grid-cols-4 border-t border-white/10">
              {[
                { label: 'Disease Level', value: `${a.diseaseLevel}/100`, color: scoreColor(a.diseaseLevel) },
                { label: 'Pain Score', value: `${a.painLevel}/10`, color: scoreColor(a.painLevel * 10) },
                { label: 'Overall Risk', value: `${a.overallRisk}/100`, color: scoreColor(a.overallRisk) },
                { label: 'Recovery', value: a.recoveryTimeline?.label || 'N/A', color: '#22c55e' },
              ].map((m, i) => (
                <div key={i} className="px-6 py-4 text-center border-r border-white/10 last:border-r-0">
                  <div className="text-lg font-black" style={{ color: m.color }}>{m.value}</div>
                  <div className="text-blue-300 text-xs mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Summary */}
        {summary && (
          <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <h3 className="font-bold text-purple-800">Gemini AI Summary</h3>
              <span className="ml-auto text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-semibold">AI Generated</span>
            </div>
            <p className="text-purple-900 leading-relaxed">{summary}</p>
          </div>
        )}

        {/* No Analysis */}
        {!a && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-3" />
            <h3 className="font-bold text-amber-800 text-lg mb-1">Analysis Not Generated Yet</h3>
            <p className="text-amber-700 text-sm mb-5">Click below to trigger Gemini analysis now.</p>
            <button onClick={handleReanalyze} disabled={reanalyzing}
              className="flex items-center gap-2 mx-auto bg-amber-600 hover:bg-amber-700 text-white font-semibold px-6 py-3 rounded-xl transition-all disabled:opacity-50">
              {reanalyzing ? <><Loader2 className="h-4 w-4 animate-spin" />Analyzing…</> : <><RefreshCcw className="h-4 w-4" />Generate Analysis</>}
            </button>
          </div>
        )}

        {a && <>
          {/* Priority Banner */}
          <div className="p-4 rounded-2xl border-2 flex items-center gap-3 font-bold shadow-sm"
            style={{ background: pc!.bg, borderColor: pc!.border, color: pc!.color }}>
            <span className="text-2xl">{pc!.emoji}</span>
            <div>
              <div className="font-black text-base">{pc!.label}</div>
              <div className="text-sm font-normal opacity-80 mt-0.5">{a.followUpRecommendation}</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  activeTab === t.key
                    ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-200 hover:text-blue-800'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ═══════════════ OVERVIEW TAB ═══════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Health Metrics</h2>
                <div className="flex flex-wrap justify-around gap-6">
                  <CircleGauge value={a.diseaseLevel} color={scoreColor(a.diseaseLevel)} label={`Disease Level\n${scoreLabel(a.diseaseLevel)} Severity`} />
                  <CircleGauge value={a.overallRisk} color={scoreColor(a.overallRisk)} label={`Overall Risk\n${scoreLabel(a.overallRisk)}`} />
                  <CircleGauge value={a.confidence} color="#6366f1" label="AI Confidence" />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Pain Score</h2>
                <PainBar value={a.painLevel} />
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Clinical Summary</h2>
                <p className="text-slate-700 leading-relaxed text-[15px]">{a.summary}</p>
              </div>

              {a.symptoms?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Identified Symptoms ({a.symptoms.length})</h2>
                  <div className="flex flex-wrap gap-2">
                    {a.symptoms.map((s, i) => <span key={i} className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-full text-sm font-semibold">{s}</span>)}
                  </div>
                </div>
              )}

              {a.vitalIndicators?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Vital Indicators</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {a.vitalIndicators.map((v, i) => {
                      const cfg = {
                        normal: { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', emoji: '✅' },
                        warning: { bg: '#fffbeb', border: '#fde68a', color: '#92400e', emoji: '⚠️' },
                        critical: { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', emoji: '🚨' },
                      }[v.status];
                      return <div key={i} className="p-4 rounded-xl border text-center" style={{ background: cfg.bg, borderColor: cfg.border }}><div className="text-xl mb-1">{cfg.emoji}</div><div className="text-xs font-bold" style={{ color: cfg.color }}>{v.name}</div><div className="text-sm font-semibold text-slate-700 mt-0.5">{v.value}</div></div>;
                    })}
                  </div>
                </div>
              )}

              {a.recoveryTimeline && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Recovery Timeline</h2>
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="h-5 w-5 text-emerald-600" />
                    <span className="text-2xl font-black text-emerald-700">{a.recoveryTimeline.label}</span>
                    <span className="text-sm text-slate-400">({a.recoveryTimeline.minDays}–{a.recoveryTimeline.maxDays} days)</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-5">
                    <div className="h-full rounded-full" style={{ width: `${(a.recoveryTimeline.minDays / a.recoveryTimeline.maxDays) * 100}%`, background: 'linear-gradient(90deg,#22c55e,#86efac)' }} />
                  </div>
                  <div className="space-y-3">
                    {a.recoveryTimeline.milestones?.map((m, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black flex-shrink-0 mt-0.5">{i + 1}</span>
                        <div><span className="text-xs font-bold text-emerald-700">Day {m.day} — </span><span className="text-sm text-slate-600">{m.description}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <h2 className="font-bold text-amber-800">Differential Assessment</h2>
                </div>
                <p className="text-amber-900 text-sm leading-relaxed">{a.diagnosis}</p>
                <p className="text-amber-700 text-xs mt-3 italic">⚠️ NOT a confirmed diagnosis. Please consult a qualified physician.</p>
              </div>
            </div>
          )}

          {/* ═══════════════ CHARTS TAB ═══════════════ */}
          {activeTab === 'charts' && (
            <div className="space-y-5">
              {a.diseaseProgression?.length > 1 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Health Recovery Projection (Recharts Area)</h2>
                  <p className="text-xs text-slate-400 mb-5">Health score 0–100. <span className="text-emerald-600 font-semibold">Green = With Treatment</span> · <span className="text-red-500 font-semibold">Red dashed = Without Treatment</span></p>
                  <ProgressionChart data={a.diseaseProgression} />
                </div>
              )}

              {a.symptomSeverities?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Symptom Severity (Recharts Bar)</h2>
                  <p className="text-xs text-slate-400 mb-4">
                    <span className="inline-flex items-center gap-1 mr-3"><span className="h-2 w-3 rounded-sm inline-block bg-red-400" /> Worsening</span>
                    <span className="inline-flex items-center gap-1 mr-3"><span className="h-2 w-3 rounded-sm inline-block bg-amber-400" /> Stable</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm inline-block bg-emerald-400" /> Improving</span>
                  </p>
                  <SeverityBarChart data={a.symptomSeverities} />
                  <div className="mt-4 space-y-3">
                    {a.symptomSeverities.map((s, i) => (
                      <HBar key={i} value={s.severity} color={scoreColor(s.severity)} label={s.name} trend={s.trend} />
                    ))}
                  </div>
                </div>
              )}

              {a.riskFactors?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5">Risk Factor Radar (Recharts Radar)</h2>
                  <RiskRadarChart data={a.riskFactors} />
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {a.riskFactors.map((r, i) => {
                      const catColors: Record<string, string> = { lifestyle: '#f59e0b', medical: '#ef4444', environmental: '#3b82f6', genetic: '#a855f7' };
                      return (
                        <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                            <div className="text-sm font-semibold text-slate-700">{r.name}</div>
                            <div className="text-xs text-slate-400 capitalize">{r.category}</div>
                          </div>
                          <div className="text-lg font-black" style={{ color: catColors[r.category] || '#64748b' }}>{r.level}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Core Health Gauges (SVG)</h2>
                <div className="flex flex-wrap justify-around gap-6">
                  <CircleGauge value={a.diseaseLevel} color={scoreColor(a.diseaseLevel)} label="Disease Level" />
                  <CircleGauge value={a.overallRisk} color={scoreColor(a.overallRisk)} label="Overall Risk" />
                  <CircleGauge value={a.confidence} color="#6366f1" label="AI Confidence" />
                </div>
                <div className="mt-6">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Pain Score (SVG)</h3>
                  <PainBar value={a.painLevel} />
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ PLAN TAB ═══════════════ */}
          {activeTab === 'plan' && (
            <div className="space-y-5">
              {a.recommendations?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Clinical Recommendations</h2>
                  <div className="space-y-3">
                    {a.recommendations.map((r, i) => (
                      <div key={i} className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                        <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">{i + 1}</div>
                        <p className="text-sm text-slate-700">{r}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-5">
                {a.lifestyleChanges?.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">🌿 Lifestyle Changes</h2>
                    <ul className="space-y-2">
                      {a.lifestyleChanges.map((l, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><span className="text-emerald-500 mt-0.5">→</span>{l}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {a.medicationHints?.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">💊 Medication Notes</h2>
                    <ul className="space-y-2">
                      {a.medicationHints.map((m, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><span className="mt-0.5">💊</span>{m}</li>
                      ))}
                    </ul>
                    <p className="text-xs text-slate-400 mt-3 italic">Not a prescription. Consult your doctor.</p>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 font-bold mb-2 text-blue-800"><Clock className="h-4 w-4" /> Follow-up Recommendation</div>
                <p className="text-blue-900 text-sm leading-relaxed">{a.followUpRecommendation}</p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
                <Shield className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-800 text-sm leading-relaxed"><strong>Medical Disclaimer:</strong> {a.disclaimer}</p>
              </div>
            </div>
          )}

          {/* ═══════════════ TRANSCRIPT TAB ═══════════════ */}
          {activeTab === 'transcript' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6">
                <Mic className="h-4 w-4 text-slate-500" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">VAPI Voice Transcript</h2>
              </div>
              {session.transcript ? (
                <div className="space-y-4">
                  {session.transcript.trim().split('\n').filter(l => l.trim()).map((line, i) => {
                    const isPatient = line.startsWith('Patient:');
                    const text = line.replace(/^(Patient:|Doctor:|AI Doctor:)\s*/, '');
                    return (
                      <div key={i} className={`flex gap-3 ${isPatient ? '' : 'flex-row-reverse'}`}>
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${isPatient ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {isPatient ? '👤' : '🤖'}
                        </div>
                        <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isPatient ? 'bg-blue-50 border border-blue-100 text-blue-900 rounded-tl-sm' : 'bg-emerald-50 border border-emerald-100 text-emerald-900 rounded-tr-sm'}`}>
                          <div className={`text-[10px] font-bold mb-1 ${isPatient ? 'text-blue-500' : 'text-emerald-600'}`}>{isPatient ? 'Patient' : 'AI Doctor (VAPI)'}</div>
                          {text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Mic className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No transcript available for this session.</p>
                </div>
              )}
            </div>
          )}

          {/* Bottom Actions */}
          <div className="flex flex-wrap gap-3 pb-10">
            <button onClick={handleSummarize} disabled={summarizing}
              className="flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-all disabled:opacity-50">
              {summarizing ? <><Loader2 className="h-4 w-4 animate-spin" />Summarising…</> : <><Sparkles className="h-4 w-4" />Summarise Report</>}
            </button>
            <button onClick={() => downloadPDF(session, a)}
              className="flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl bg-blue-900 text-white hover:bg-blue-800 transition-all">
              <Download className="h-4 w-4" /> Download PDF
            </button>
            <Link href="/dashboard/reports">
              <button className="flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all">
                <FileText className="h-4 w-4" /> All Reports
              </button>
            </Link>
          </div>
        </>}
      </div>
    </div>
  );
}
