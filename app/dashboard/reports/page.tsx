'use client';

import { useEffect, useState, useRef } from 'react';
import {
  FileText, Download, TrendingUp, TrendingDown, AlertTriangle,
  Activity, Heart, Clock, CheckCircle, ChevronDown, ChevronUp,
  Search, Shield, Zap, ArrowRight, Loader2, Sparkles
} from 'lucide-react';

// ──────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────
interface SymptomSeverity { name: string; severity: number; trend: string; }
interface RiskFactor { name: string; level: number; category: string; }
interface Milestone { day: number; description: string; }
interface RecoveryTimeline { minDays: number; maxDays: number; label: string; milestones: Milestone[]; }
interface ProgressionPoint { week: number; withTreatment: number; withoutTreatment: number; }
interface VitalIndicator { name: string; value: string; status: 'normal' | 'warning' | 'critical'; }

interface MedicalData {
  diseaseLevel: number;
  painLevel: number;
  overallRisk: number;
  symptomSeverities: SymptomSeverity[];
  riskFactors: RiskFactor[];
  recoveryTimeline: RecoveryTimeline;
  diseaseProgression: ProgressionPoint[];
  vitalIndicators: VitalIndicator[];
  treatmentPriority: string;
  followUpRecommendation: string;
  lifestyleChanges: string[];
  medicationHints: string[];
}

interface Report {
  id: string;
  title: string;
  summary: string | null;
  symptoms: string[] | null;
  recommendations: string[] | null;
  diagnosis: string | null;
  specialist: string | null;
  confidence: number | null;
  createdAt: string;
  medicalData: MedicalData | null;
}

// ──────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────
function urgencyColor(level: number): string {
  if (level >= 70) return '#ef4444';
  if (level >= 40) return '#f59e0b';
  return '#22c55e';
}

function urgencyLabel(level: number): string {
  if (level >= 70) return 'High';
  if (level >= 40) return 'Moderate';
  return 'Low';
}

function priorityConfig(priority: string) {
  switch (priority) {
    case 'immediate': return { label: 'Immediate Care', color: '#ef4444', bg: '#fef2f2', icon: '🚨' };
    case 'within_week': return { label: 'See Doctor This Week', color: '#f59e0b', bg: '#fffbeb', icon: '⚡' };
    case 'within_month': return { label: 'Within a Month', color: '#3b82f6', bg: '#eff6ff', icon: '📅' };
    default: return { label: 'Routine Checkup', color: '#22c55e', bg: '#f0fdf4', icon: '✅' };
  }
}

// ──────────────────────────────────────────────────────
// MINI CHART COMPONENTS (SVG-based, no extra libs)
// ──────────────────────────────────────────────────────

function CircleGauge({ value, color, size = 120, label }: { value: number; color: string; size?: number; label: string }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={10} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x={size/2} y={size/2 + 2} textAnchor="middle" dominantBaseline="middle" fontSize="20" fontWeight="700" fill={color}>{value}</text>
        <text x={size/2} y={size/2 + 18} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#94a3b8">/ 100</text>
      </svg>
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function HorizontalBar({ value, color, label, trend }: { value: number; color: string; label: string; trend?: string }) {
  const trendIcon = trend === 'improving' ? '↓' : trend === 'worsening' ? '↑' : '→';
  const trendColor = trend === 'improving' ? '#22c55e' : trend === 'worsening' ? '#ef4444' : '#94a3b8';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <div className="flex items-center gap-2">
          {trend && <span style={{ color: trendColor }} className="text-xs font-bold">{trendIcon} {trend}</span>}
          <span className="text-sm font-bold" style={{ color }}>{value}%</span>
        </div>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }}
        />
      </div>
    </div>
  );
}

function LineChart({ data, w = 340, h = 140 }: { data: ProgressionPoint[]; w?: number; h?: number }) {
  if (!data || data.length === 0) return null;
  const pad = { t: 16, r: 16, b: 28, l: 32 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;
  const maxWeek = Math.max(...data.map(d => d.week));

  const xScale = (week: number) => pad.l + (week / maxWeek) * cw;
  const yScale = (val: number) => pad.t + ch - (val / 100) * ch;

  const pathWith = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(d.week)},${yScale(d.withTreatment)}`).join(' ');
  const pathWithout = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(d.week)},${yScale(d.withoutTreatment)}`).join(' ');

  // Area fill for "with treatment"
  const areaWith = `${pathWith} L${xScale(data[data.length-1].week)},${yScale(0)} L${xScale(0)},${yScale(0)} Z`;

  return (
    <svg width={w} height={h} className="overflow-visible">
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map(v => (
        <g key={v}>
          <line x1={pad.l} y1={yScale(v)} x2={w - pad.r} y2={yScale(v)} stroke="#f1f5f9" strokeWidth={1} />
          <text x={pad.l - 6} y={yScale(v) + 4} textAnchor="end" fontSize="9" fill="#cbd5e1">{v}</text>
        </g>
      ))}
      {/* X labels */}
      {data.map(d => (
        <text key={d.week} x={xScale(d.week)} y={h - 8} textAnchor="middle" fontSize="9" fill="#94a3b8">W{d.week}</text>
      ))}
      {/* Area */}
      <path d={areaWith} fill="#22c55e" opacity="0.08" />
      {/* Lines */}
      <path d={pathWithout} fill="none" stroke="#ef4444" strokeWidth={2} strokeDasharray="5,3" opacity="0.6" />
      <path d={pathWith} fill="none" stroke="#22c55e" strokeWidth={2.5} />
      {/* Dots */}
      {data.map(d => (
        <g key={d.week}>
          <circle cx={xScale(d.week)} cy={yScale(d.withTreatment)} r={3.5} fill="#22c55e" />
          <circle cx={xScale(d.week)} cy={yScale(d.withoutTreatment)} r={3} fill="#ef4444" opacity="0.6" />
        </g>
      ))}
    </svg>
  );
}

function PainMeter({ value }: { value: number }) {
  const colors = ['#22c55e','#22c55e','#22c55e','#84cc16','#84cc16','#f59e0b','#f59e0b','#ef4444','#ef4444','#dc2626'];
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className="rounded-sm transition-all"
          style={{
            width: 18, height: i < value ? 28 + i * 2 : 14,
            background: i < value ? colors[i] : '#e2e8f0',
            opacity: i < value ? 1 : 0.4,
          }}
        />
      ))}
      <span className="ml-2 text-lg font-bold text-slate-700">{value}<span className="text-sm text-slate-400">/10</span></span>
    </div>
  );
}

function RecoveryBar({ timeline }: { timeline: RecoveryTimeline }) {
  if (!timeline) return null;
  const total = timeline.maxDays;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Day 0</span>
        <span className="font-bold text-emerald-600">{timeline.label}</span>
        <span>Day {timeline.maxDays}</span>
      </div>
      <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${(timeline.minDays / total) * 100}%`, background: 'linear-gradient(90deg, #22c55e, #86efac)' }}
        />
        {/* Milestones */}
        {timeline.milestones.map((m, i) => (
          <div
            key={i}
            className="absolute top-0 h-full w-0.5 bg-emerald-700 opacity-40"
            style={{ left: `${(m.day / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {timeline.milestones.slice(0, 4).map((m, i) => (
          <div key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
            <span className="mt-0.5 h-4 w-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
            <span><strong>Day {m.day}:</strong> {m.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// DOWNLOAD HELPER
// ──────────────────────────────────────────────────────
function downloadReport(report: Report) {
  const md = report.medicalData;
  const symptoms = Array.isArray(report.symptoms) ? report.symptoms : [];
  const recommendations = Array.isArray(report.recommendations) ? report.recommendations : [];

  const text = `
╔══════════════════════════════════════════════════════════════╗
║                    MEDICAL CONSULTATION REPORT                ║
╚══════════════════════════════════════════════════════════════╝

Report Title  : ${report.title}
Generated On  : ${new Date(report.createdAt).toLocaleString()}
Specialist    : ${report.specialist || 'General Physician'}
AI Confidence : ${report.confidence || 0}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXECUTIVE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${report.summary || 'N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HEALTH METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Disease Severity Level : ${md?.diseaseLevel ?? 'N/A'}/100
Pain Score             : ${md?.painLevel ?? 'N/A'}/10
Overall Health Risk    : ${md?.overallRisk ?? 'N/A'}/100
Treatment Priority     : ${md?.treatmentPriority?.replace('_', ' ') ?? 'N/A'}
Expected Recovery      : ${md?.recoveryTimeline?.label ?? 'N/A'} (${md?.recoveryTimeline?.minDays}-${md?.recoveryTimeline?.maxDays} days)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDENTIFIED SYMPTOMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${symptoms.map((s, i) => `  ${i + 1}. ${s}`).join('\n') || '  None identified'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SYMPTOM SEVERITY ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${md?.symptomSeverities?.map(s => `  • ${s.name}: ${s.severity}% severity — ${s.trend}`).join('\n') || '  N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DIFFERENTIAL ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${report.diagnosis || 'N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RISK FACTORS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${md?.riskFactors?.map(r => `  • ${r.name} [${r.category}]: ${r.level}%`).join('\n') || '  N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VITAL INDICATORS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${md?.vitalIndicators?.map(v => `  • ${v.name}: ${v.value} [${v.status.toUpperCase()}]`).join('\n') || '  N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECOVERY MILESTONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${md?.recoveryTimeline?.milestones?.map(m => `  Day ${m.day}: ${m.description}`).join('\n') || '  N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${recommendations.map((r, i) => `  ${i + 1}. ${r}`).join('\n') || '  None'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LIFESTYLE CHANGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${md?.lifestyleChanges?.map(l => `  • ${l}`).join('\n') || '  N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FOLLOW-UP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${md?.followUpRecommendation || 'Schedule a follow-up with your doctor'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPORTANT DISCLAIMER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This report is generated by an AI system and is NOT a substitute for professional
medical diagnosis or treatment. Always consult a qualified healthcare professional
for medical decisions. In emergencies, call your local emergency services.

Generated by MedAI Voice Consultation System
`.trim();

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `medical-report-${report.id.slice(0, 8)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ──────────────────────────────────────────────────────
// REPORT CARD COMPONENT
// ──────────────────────────────────────────────────────
function ReportCard({ report }: { report: Report }) {
  const [expanded, setExpanded] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const symptoms = Array.isArray(report.symptoms) ? report.symptoms : [];
  const recommendations = Array.isArray(report.recommendations) ? report.recommendations : [];
  const md = report.medicalData;
  const priority = md?.treatmentPriority ? priorityConfig(md.treatmentPriority) : null;

  const handleSummarize = async () => {
    setSummarizing(true);
    // Simulate AI summary (in production: call Gemini API here)
    await new Promise(r => setTimeout(r, 1200));
    const parts = [
      report.summary,
      md?.diseaseLevel ? `Disease severity is ${urgencyLabel(md.diseaseLevel)} (${md.diseaseLevel}/100).` : '',
      md?.recoveryTimeline ? `Expected recovery: ${md.recoveryTimeline.label}.` : '',
      md?.followUpRecommendation || '',
    ].filter(Boolean);
    setAiSummary(parts.join(' '));
    setSummarizing(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300">
      {/* Header */}
      <div className="px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-sm">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-800 text-base leading-snug">{report.title}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-slate-400 text-xs">{new Date(report.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                {report.specialist && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium border border-blue-100">{report.specialist}</span>}
              </div>
              {report.summary && <p className="text-slate-500 text-sm mt-2 leading-relaxed line-clamp-2">{report.summary}</p>}
            </div>
          </div>

          {/* Confidence badge */}
          {report.confidence && (
            <div className="flex-shrink-0 text-center">
              <div className="text-2xl font-black" style={{ color: urgencyColor(report.confidence) }}>{report.confidence}%</div>
              <div className="text-xs text-slate-400">AI Confidence</div>
            </div>
          )}
        </div>

        {/* Priority banner */}
        {priority && (
          <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold" style={{ background: priority.bg, color: priority.color }}>
            <span>{priority.icon}</span>
            <span>{priority.label}</span>
          </div>
        )}

        {/* Metric pills */}
        {md && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs px-3 py-1.5 rounded-full font-semibold border" style={{ color: urgencyColor(md.diseaseLevel), borderColor: urgencyColor(md.diseaseLevel) + '40', background: urgencyColor(md.diseaseLevel) + '10' }}>
              Disease: {md.diseaseLevel}/100
            </span>
            <span className="text-xs px-3 py-1.5 rounded-full font-semibold border" style={{ color: urgencyColor(md.overallRisk), borderColor: urgencyColor(md.overallRisk) + '40', background: urgencyColor(md.overallRisk) + '10' }}>
              Risk: {md.overallRisk}/100
            </span>
            <span className="text-xs px-3 py-1.5 rounded-full font-semibold border border-purple-200 text-purple-700 bg-purple-50">
              🕐 {md.recoveryTimeline?.label || 'N/A'}
            </span>
            <span className="text-xs px-3 py-1.5 rounded-full font-semibold border border-orange-200 text-orange-700 bg-orange-50">
              Pain: {md.painLevel}/10
            </span>
          </div>
        )}

        {/* Symptoms */}
        {symptoms.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {symptoms.slice(0, 5).map((s, i) => (
              <span key={i} className="text-xs bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full">{s}</span>
            ))}
            {symptoms.length > 5 && <span className="text-xs text-slate-400 px-2 py-1">+{symptoms.length - 5} more</span>}
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-sm font-semibold text-blue-900 hover:text-blue-700 transition-colors"
          >
            {expanded ? <><ChevronUp className="h-4 w-4" /> Hide Charts</> : <><ChevronDown className="h-4 w-4" /> View Full Report & Charts</>}
          </button>
          <div className="flex-1" />
          <button
            onClick={handleSummarize}
            disabled={summarizing}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors disabled:opacity-50"
          >
            {summarizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            AI Summary
          </button>
          <button
            onClick={() => downloadReport(report)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </button>
        </div>

        {/* AI Summary box */}
        {aiSummary && (
          <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-xl text-sm text-purple-800 leading-relaxed">
            <div className="flex items-center gap-1.5 mb-1 font-bold text-purple-700"><Sparkles className="h-3.5 w-3.5" /> AI Summary</div>
            {aiSummary}
          </div>
        )}
      </div>

      {/* EXPANDED: Full Charts Section */}
      {expanded && md && (
        <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50 to-white px-6 py-6 space-y-8">

          {/* ── Row 1: 3 Gauge Charts ── */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5">Health Metrics Overview</h4>
            <div className="flex flex-wrap justify-around gap-6">
              <CircleGauge value={md.diseaseLevel} color={urgencyColor(md.diseaseLevel)} label="Disease Level" />
              <CircleGauge value={md.overallRisk} color={urgencyColor(md.overallRisk)} label="Overall Risk" />
              <CircleGauge value={report.confidence || 0} color="#3b82f6" label="AI Confidence" />
            </div>
          </div>

          {/* ── Row 2: Pain Meter ── */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Pain Score</h4>
            <PainMeter value={md.painLevel || 0} />
          </div>

          {/* ── Row 3: Symptom Severity Bars ── */}
          {md.symptomSeverities && md.symptomSeverities.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Symptom Severity Breakdown</h4>
              <div className="space-y-3">
                {md.symptomSeverities.map((s, i) => (
                  <HorizontalBar key={i} value={s.severity} color={urgencyColor(s.severity)} label={s.name} trend={s.trend} />
                ))}
              </div>
            </div>
          )}

          {/* ── Row 4: Risk Factors ── */}
          {md.riskFactors && md.riskFactors.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Risk Factor Analysis</h4>
              <div className="space-y-3">
                {md.riskFactors.map((r, i) => {
                  const catColors: Record<string, string> = { lifestyle: '#f59e0b', medical: '#ef4444', environmental: '#3b82f6', genetic: '#a855f7' };
                  return (
                    <div key={i} className="space-y-1">
                      <HorizontalBar value={r.level} color={catColors[r.category] || '#64748b'} label={r.name} />
                      <span className="text-xs text-slate-400 capitalize ml-1">Category: {r.category}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Row 5: Disease Progression Line Chart ── */}
          {md.diseaseProgression && md.diseaseProgression.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Health Recovery Projection (Week-by-Week)</h4>
              <div className="overflow-x-auto">
                <LineChart data={md.diseaseProgression} />
              </div>
              <div className="flex items-center gap-6 mt-3">
                <div className="flex items-center gap-2"><div className="h-0.5 w-6 bg-emerald-500 rounded" /><span className="text-xs text-slate-500">With Treatment</span></div>
                <div className="flex items-center gap-2"><div className="h-0.5 w-6 bg-red-400 rounded" style={{ borderTop: '2px dashed #ef4444' }} /><span className="text-xs text-slate-500">Without Treatment</span></div>
              </div>
            </div>
          )}

          {/* ── Row 6: Recovery Timeline ── */}
          {md.recoveryTimeline && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Recovery Timeline</h4>
              <RecoveryBar timeline={md.recoveryTimeline} />
            </div>
          )}

          {/* ── Row 7: Vital Indicators ── */}
          {md.vitalIndicators && md.vitalIndicators.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Vital Indicators</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {md.vitalIndicators.map((v, i) => {
                  const statusConf = {
                    normal: { color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', icon: '✅' },
                    warning: { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: '⚠️' },
                    critical: { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', icon: '🚨' },
                  }[v.status];
                  return (
                    <div key={i} className="p-3 rounded-xl border text-center" style={{ background: statusConf.bg, borderColor: statusConf.border }}>
                      <div className="text-base mb-1">{statusConf.icon}</div>
                      <div className="text-xs font-bold" style={{ color: statusConf.color }}>{v.name}</div>
                      <div className="text-xs text-slate-600 mt-0.5">{v.value}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Row 8: Recommendations & Lifestyle ── */}
          <div className="grid sm:grid-cols-2 gap-6">
            {recommendations.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Recommendations</h4>
                <ul className="space-y-2">
                  {recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {md.lifestyleChanges && md.lifestyleChanges.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Lifestyle Changes</h4>
                <ul className="space-y-2">
                  {md.lifestyleChanges.map((l, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <ArrowRight className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      {l}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ── Follow-up ── */}
          {md.followUpRecommendation && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
              <div className="flex items-center gap-2 font-bold mb-1"><Clock className="h-4 w-4" /> Follow-up Recommendation</div>
              {md.followUpRecommendation}
            </div>
          )}

          {/* ── Differential Diagnosis ── */}
          {report.diagnosis && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
              <div className="flex items-center gap-2 font-bold mb-1"><AlertTriangle className="h-4 w-4" /> Differential Assessment</div>
              {report.diagnosis}
              <p className="text-xs text-amber-700 mt-2 italic">⚠️ This is an AI-generated analysis, not a confirmed medical diagnosis.</p>
            </div>
          )}

          {/* ── Medication Hints ── */}
          {md.medicationHints && md.medicationHints.length > 0 && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Medication Categories to Discuss with Doctor</h4>
              <ul className="space-y-1">
                {md.medicationHints.map((hint, i) => (
                  <li key={i} className="text-sm text-slate-600 flex items-center gap-2">
                    <span className="text-slate-400">•</span> {hint}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-400 mt-2 italic">Not a prescription. Consult your doctor before taking any medication.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────
// MAIN PAGE
// ──────────────────────────────────────────────────────
export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.json())
      .then(d => { setReports(d.reports || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = reports.filter(r =>
    r.title?.toLowerCase().includes(search.toLowerCase()) ||
    r.summary?.toLowerCase().includes(search.toLowerCase()) ||
    r.diagnosis?.toLowerCase().includes(search.toLowerCase())
  );

  const avgConfidence = reports.filter(r => r.confidence).length
    ? Math.round(reports.filter(r => r.confidence).reduce((a, r) => a + (r.confidence || 0), 0) / reports.filter(r => r.confidence).length)
    : 0;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #faf9fc 50%, #f0fdf4 100%)' }}>
      {/* Header */}
      <div className="bg-white/80 backdrop-blur border-b border-slate-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800" style={{ letterSpacing: '-0.5px' }}>
              Medical Reports
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">AI-powered consultation analysis with charts & insights</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Activity className="h-4 w-4" />
            <span className="font-bold text-slate-700">{reports.length}</span> reports
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Stats */}
        {reports.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-7">
            {[
              { label: 'Total Reports', value: reports.length, icon: '📋', color: '#3b82f6' },
              { label: 'Avg Confidence', value: avgConfidence + '%', icon: '🎯', color: '#8b5cf6' },
              { label: 'This Month', value: reports.filter(r => new Date(r.createdAt).getMonth() === new Date().getMonth()).length, icon: '📅', color: '#22c55e' },
              { label: 'High Risk', value: reports.filter(r => (r.medicalData?.overallRisk ?? 0) >= 70).length, icon: '⚠️', color: '#ef4444' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 text-center hover:shadow-md transition-shadow">
                <div className="text-xl mb-0.5">{stat.icon}</div>
                <div className="text-xl font-black" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        {reports.length > 0 && (
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900/40 transition-all shadow-sm"
              placeholder="Search by title, diagnosis, or summary..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}

        {/* States */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="relative h-14 w-14 mb-5">
              <div className="absolute inset-0 rounded-full border-4 border-blue-900/10" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-900 animate-spin" />
            </div>
            <p className="text-slate-500 font-medium">Loading your reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-24">
            <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <FileText className="h-12 w-12 text-white" />
            </div>
            <h3 className="text-slate-700 font-black text-xl mb-2">No reports yet</h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">Complete a voice consultation with the AI agent to generate your first detailed medical report with charts.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500">No reports match "<strong>{search}</strong>"</p>
            <button onClick={() => setSearch('')} className="text-blue-900 text-sm mt-2 hover:underline">Clear search</button>
          </div>
        ) : (
          <div className="space-y-5">
            {filtered.map(report => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
