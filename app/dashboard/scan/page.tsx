'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, X, Stethoscope, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ScanPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null) => {
    setFile(f);
    setResult("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFile(dropped);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result?.toString().split(",")[1];
      try {
        const res = await fetch("/api/analyze-prescription", {
          method: "POST",
          body: JSON.stringify({ base64, mimeType: file.type }),
        });
        const data = await res.json();
        setResult(data.success ? data.text : "Failed to analyze. Please try again.");
      } catch {
        setResult("An error occurred. Please try again.");
      }
      setLoading(false);
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Top Nav */}
      

      {/* Main */}
      <main className="flex-1 flex flex-col px-6 py-10 gap-5">

        {/* Hero Text */}
        <div className="space-y-1 mb-1">
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-teal-600">
            Prescription Scanner
          </p>
          <h1 className="text-3xl font-bold text-slate-900  leading-tight">
            Upload & Understand Your Prescription
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Get instant AI-powered insights from your prescriptions and medical reports.
          </p>
        </div>

        {/* Card */}
        <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-7 flex flex-col gap-5">

          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl px-6 py-12 cursor-pointer transition-all duration-200
              ${dragOver
                ? 'border-teal-400 bg-teal-50'
                : 'border-slate-200 bg-slate-50 hover:border-teal-400 hover:bg-teal-50'
              }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />

            <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-sm transition-colors duration-200
              ${dragOver ? 'bg-teal-100 border-teal-200' : 'bg-white border-slate-200'}`}>
              <Upload className={`w-6 h-6 transition-colors duration-200 ${dragOver ? 'text-teal-500' : 'text-slate-400'}`} />
            </div>

            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">
                Drop your file here, or{' '}
                <span className="text-teal-600 underline underline-offset-2">browse</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">Supports JPG, PNG, PDF · Max 10MB</p>
            </div>
          </div>

          {/* File Preview */}
          {file && (
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleFile(null); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-slate-100" />

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={!file || loading}
            className="w-full bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing your prescription...
              </>
            ) : (
              <>
                <Stethoscope className="w-4 h-4" />
                Analyze Prescription
              </>
            )}
          </button>

          {/* Result */}
          {result && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-900">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-bold tracking-widest uppercase text-white">
                  AI Analysis
                </span>
              </div>
              <div className="px-5 py-4 bg-slate-50 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                {result}
              </div>
            </div>
          )}

        </div>

        {/* Disclaimer */}
        <div className="w-full flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <span className="font-semibold">Medical Disclaimer:</span> This tool provides general AI insights only and is not a substitute for professional medical advice. Always consult a qualified doctor.
          </p>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} MediScan · For informational use only
      </footer>

    </div>
  );
}