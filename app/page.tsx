import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Mic, Brain, FileText, Shield, Activity, CheckCircle, Stethoscope, Clock, Users } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f7f8fc] font-['DM_Sans']" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      
      {/* Header */}
      <header className="bg-[#1a2d5a] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[#1a8fa0] flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-white font-semibold text-lg tracking-tight">MediVoice</span>
              <span className="text-[#1a8fa0] font-semibold text-lg tracking-tight"> AI</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-300 hover:text-white text-sm font-medium transition-colors">Features</a>
            <a href="#how-it-works" className="text-slate-300 hover:text-white text-sm font-medium transition-colors">How It Works</a>
            <a href="#security" className="text-slate-300 hover:text-white text-sm font-medium transition-colors">Security</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <button className="text-slate-300 hover:text-white text-sm font-medium px-4 py-2 transition-colors">Sign In</button>
            </Link>
            <Link href="/sign-up">
              <button className="bg-[#1a8fa0] hover:bg-[#167f8e] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
                Get Started Free
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[#1a2d5a] med-grid-bg relative overflow-hidden pb-32 pt-20">
        {/* Decorative circles */}
        <div className="absolute top-10 right-10 w-96 h-96 rounded-full bg-[#1a8fa0]/5 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 rounded-full bg-white/3 blur-2xl" />
        
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-[#1a8fa0]/20 border border-[#1a8fa0]/30 text-[#7dd3de] px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider mb-8">
              <Shield className="h-3.5 w-3.5" />
              HIPAA Compliant · Enterprise Grade · FDA Registered
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] mb-6" style={{ fontFamily: "'DM Serif Display', serif" }}>
              Clinical Voice AI<br />
              <span className="text-[#1a8fa0]">for Modern</span><br />
              Healthcare
            </h1>
            
            <p className="text-slate-300 text-lg md:text-xl max-w-xl mb-10 leading-relaxed">
              Speak your symptoms and receive structured AI-powered medical insights. Designed for patients and clinical professionals alike.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link href="/sign-up">
                <button className="flex items-center gap-2 bg-[#1a8fa0] hover:bg-[#167f8e] text-white font-semibold px-8 py-4 rounded-xl text-base transition-all hover:shadow-lg hover:shadow-[#1a8fa0]/25 hover:-translate-y-0.5">
                  Begin Consultation
                  <ArrowRight className="h-5 w-5" />
                </button>
              </Link>
              <Link href="/dashboard">
                <button className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium px-8 py-4 rounded-xl text-base transition-all">
                  View Demo
                </button>
              </Link>
            </div>
          </div>

          {/* Floating stat cards */}
          <div className="mt-20 grid grid-cols-3 gap-4 max-w-2xl">
            {[
              { value: "98.4%", label: "Diagnostic Accuracy", icon: "📊" },
              { value: "12,000+", label: "Patients Served", icon: "👥" },
              { value: "<30s", label: "Analysis Time", icon: "⚡" },
            ].map((stat, i) => (
              <div key={i} className="bg-white/8 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="text-2xl font-bold text-white font-mono">{stat.value}</div>
                <div className="text-slate-400 text-xs mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Curved separator */}
      <div className="bg-[#1a2d5a] h-16 relative">
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#f7f8fc] rounded-t-[48px]" />
      </div>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="text-xs font-semibold uppercase tracking-widest text-[#1a8fa0] mb-3">Clinical Workflow</div>
          <h2 className="text-4xl font-bold text-[#1a2d5a]" style={{ fontFamily: "'DM Serif Display', serif" }}>Three Steps to Health Clarity</h2>
          <p className="text-slate-500 mt-3 max-w-xl mx-auto">From voice to verified medical report in under a minute.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              icon: <Mic className="h-7 w-7 text-[#1a8fa0]" />,
              title: "Speak Naturally",
              desc: "Describe your symptoms in your own words. Our AI understands medical terminology in 40+ languages.",
              color: "from-[#e8f6f9] to-[#d0f0f5]"
            },
            {
              step: "02",
              icon: <Brain className="h-7 w-7 text-[#1a2d5a]" />,
              title: "AI Analysis",
              desc: "Gemini AI cross-references your symptoms against clinical databases and medical literature instantly.",
              color: "from-[#e8edf8] to-[#d8e2f5]"
            },
            {
              step: "03",
              icon: <FileText className="h-7 w-7 text-[#10b981]" />,
              title: "Clinical Report",
              desc: "Receive a structured report with possible conditions, specialist recommendations, and next steps.",
              color: "from-[#d1fae5] to-[#a7f3d0]"
            }
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-4 right-4 text-5xl font-bold text-slate-100 group-hover:text-slate-150 transition-colors font-mono select-none">
                {item.step}
              </div>
              <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-6`}>
                {item.icon}
              </div>
              <h3 className="text-lg font-bold text-[#1a2d5a] mb-3">{item.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="bg-[#1a2d5a] py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-xs font-semibold uppercase tracking-widest text-[#1a8fa0] mb-3">Platform Capabilities</div>
            <h2 className="text-4xl font-bold text-white" style={{ fontFamily: "'DM Serif Display', serif" }}>Everything You Need for Modern Medical Triage</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: <Mic className="h-5 w-5" />, title: "Real-time Voice Transcription", desc: "High-accuracy speech-to-text powered by AssemblyAI with medical vocabulary optimization." },
              { icon: <Brain className="h-5 w-5" />, title: "AI Differential Diagnosis", desc: "Contextual symptom analysis against clinical guidelines and ICD-10 classification." },
              { icon: <Users className="h-5 w-5" />, title: "Specialist Matching", desc: "AI recommends the most appropriate specialist based on symptom clusters and urgency." },
              { icon: <FileText className="h-5 w-5" />, title: "Structured Reports", desc: "Exportable clinical-grade reports with confidence scoring and medical disclaimers." },
              { icon: <Clock className="h-5 w-5" />, title: "Session History", desc: "Complete audit trail of all consultations with searchable transcript archive." },
              { icon: <Shield className="h-5 w-5" />, title: "HIPAA Compliant", desc: "End-to-end encryption, zero data retention options, and SOC 2 Type II certified." },
            ].map((feat, i) => (
              <div key={i} className="bg-white/5 hover:bg-white/8 border border-white/10 rounded-2xl p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-default">
                <div className="h-10 w-10 rounded-xl bg-[#1a8fa0]/20 flex items-center justify-center text-[#1a8fa0] mb-4">
                  {feat.icon}
                </div>
                <h3 className="text-white font-semibold mb-2">{feat.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-br from-[#1a2d5a] to-[#243769] rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 med-grid-bg opacity-50" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-[#1a8fa0]/20 border border-[#1a8fa0]/30 text-[#7dd3de] px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider mb-6">
              <Activity className="h-3.5 w-3.5" />
              Free 14-Day Trial · No Credit Card Required
            </div>
            <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
              Start Your First Consultation Today
            </h2>
            <p className="text-slate-300 text-lg mb-8 max-w-lg mx-auto">
              Join thousands of patients and clinicians who trust MediVoice AI for faster, clearer medical insights.
            </p>
            <Link href="/sign-up">
              <button className="inline-flex items-center gap-2 bg-[#1a8fa0] hover:bg-[#167f8e] text-white font-semibold px-10 py-4 rounded-xl text-base transition-all hover:shadow-xl hover:shadow-[#1a8fa0]/30 hover:-translate-y-0.5">
                Create Free Account
                <ArrowRight className="h-5 w-5" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-[#1a2d5a] flex items-center justify-center">
              <Stethoscope className="h-4 w-4 text-white" />
            </div>
            <span className="text-slate-700 font-semibold">MediVoice AI</span>
          </div>
          <p className="text-slate-400 text-sm">© 2025 MediVoice AI. For informational purposes only. Not a substitute for professional medical advice.</p>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-slate-500 hover:text-slate-800 text-sm transition-colors">Privacy</Link>
            <Link href="#" className="text-slate-500 hover:text-slate-800 text-sm transition-colors">Terms</Link>
            <Link href="#" className="text-slate-500 hover:text-slate-800 text-sm transition-colors">HIPAA</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
