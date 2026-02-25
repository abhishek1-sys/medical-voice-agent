'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    CheckCircle, ArrowRight, ArrowLeft, Loader2,
    Mic, User, Stethoscope, ClipboardList, MessageCircle, AlertCircle
} from 'lucide-react';
import { SPECIALISTS } from '@/lib/services/gemini';
import { VapiVoiceConsultation } from '@/components/VapiVoiceConsultation';

const STEPS = [
    { id: 1, label: 'Patient Info', icon: User },
    { id: 2, label: 'Symptoms', icon: Stethoscope },
    { id: 3, label: 'History', icon: ClipboardList },
    { id: 4, label: 'Specialist', icon: CheckCircle },
    { id: 5, label: 'Consultation', icon: Mic },
];

interface SessionData {
    sessionId: string | null;
    patientName: string; age: string; gender: string;
    symptoms: string; symptomDuration: string;
    additionalDetails: string; medicalHistory: string;
    suggestedSpecialist: any; chosenSpecialist: string;
}

export default function NewSessionPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<SessionData>({
        sessionId: null, patientName: '', age: '', gender: '',
        symptoms: '', symptomDuration: '', additionalDetails: '',
        medicalHistory: '', suggestedSpecialist: null, chosenSpecialist: '',
    });
    const [vapiAssistantId, setVapiAssistantId] = useState('');
    const [isCreatingAssistant, setIsCreatingAssistant] = useState(false);
    const [callCompleted, setCallCompleted] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [errorMessage, setErrorMessage] = useState('');
    // FIX: Track analysis loading state separately
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisStatus, setAnalysisStatus] = useState('');

    // FIX: Keep a ref to sessionId so it's always current inside async callbacks
    const sessionIdRef = useRef<string | null>(null);
    const dataRef = useRef<SessionData>(data);
    dataRef.current = data;

    const update = (field: keyof SessionData, value: string) =>
        setData(prev => ({ ...prev, [field]: value }));

    async function saveStep(step: number): Promise<string | null> {
        try {
            if (!data.sessionId) {
                const res = await fetch('/api/sessions', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ patientName: data.patientName, age: data.age ? parseInt(data.age) : null, gender: data.gender, currentStep: step }),
                });
                const json = await res.json();
                if (!res.ok || json.error) return null;
                const newId = json.session?.id ?? null;
                if (newId) {
                    setData(prev => ({ ...prev, sessionId: newId }));
                    sessionIdRef.current = newId;
                }
                return newId;
            } else {
                await fetch('/api/sessions', {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: data.sessionId, patientName: data.patientName,
                        age: data.age ? parseInt(data.age) : null, gender: data.gender,
                        symptoms: data.symptoms, symptomDuration: data.symptomDuration,
                        additionalDetails: data.additionalDetails, medicalHistory: data.medicalHistory,
                        currentStep: step,
                    }),
                });
                return data.sessionId;
            }
        } catch { return data.sessionId; }
    }

    async function handleNext() {
        if (currentStep === 3) {
            setLoading(true);
            try {
                const savedId = await saveStep(3);
                const res = await fetch('/api/suggest-specialist', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId: savedId ?? data.sessionId, symptoms: data.symptoms, additionalDetails: data.additionalDetails }),
                });
                const json = await res.json();
                setData(prev => ({ ...prev, suggestedSpecialist: json.suggestion }));
                setCurrentStep(4);
            } catch {
                setData(prev => ({ ...prev, suggestedSpecialist: null }));
                setCurrentStep(4);
            } finally { setLoading(false); }
            return;
        }

        if (currentStep === 4) {
            if (!data.chosenSpecialist) { alert('Please choose a specialist.'); return; }
            if (!data.patientName.trim()) { alert('Patient name missing.'); return; }
            if (!data.symptoms.trim()) { alert('Symptoms missing.'); return; }
            setLoading(true); setIsCreatingAssistant(true); setErrorMessage('');
            try {
                if (data.sessionId) {
                    fetch('/api/sessions', {
                        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionId: data.sessionId, chosenSpecialist: data.chosenSpecialist, currentStep: 5 }),
                    }).catch(() => {});
                }
                const specialist = SPECIALISTS.find(s => s.id === data.chosenSpecialist);
                const assistantRes = await fetch('/api/vapi/create-assistant', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        specialistId: data.chosenSpecialist,
                        specialistName: specialist?.name || 'Medical Consultant',
                        patientName: data.patientName.trim(),
                        symptoms: data.symptoms.trim(),
                    }),
                });
                const assistantData = await assistantRes.json();
                if (!assistantRes.ok || assistantData.error) throw new Error(assistantData.error || 'API error');
                if (!assistantData.assistantId) throw new Error('No assistantId in response');
                setVapiAssistantId(assistantData.assistantId);
                setCurrentStep(5);
            } catch (error: any) {
                setErrorMessage(`Voice setup failed: ${error.message}`);
            } finally {
                setLoading(false); setIsCreatingAssistant(false);
            }
            return;
        }

        await saveStep(currentStep + 1);
        setCurrentStep(prev => prev + 1);
    }

    function handleBack() { setCurrentStep(prev => prev - 1); }

    // ─────────────────────────────────────────────────────────────────
    // FIXED handleCallEnd — handles all cases:
    // 1. callId present → fetch from Vapi, retry if transcript not ready
    // 2. callId missing → use local transcript directly
    // 3. Vapi transcript empty → use local transcript as fallback
    // ─────────────────────────────────────────────────────────────────
    async function handleCallEnd(callId: string, localMessages: any[]) {
        setCallCompleted(true);
        setIsAnalyzing(true);
        setAnalysisStatus('Call ended. Processing transcript...');

        // Use the always-current ref for sessionId and data
        const currentSessionId = sessionIdRef.current ?? dataRef.current.sessionId;
        const currentData = dataRef.current;

        console.log('handleCallEnd called:', { callId, localMessages: localMessages.length, sessionId: currentSessionId });

        try {
            let messages = localMessages;
            let transcript = '';

            // ── Step 1: Try to get transcript from Vapi API (with retries) ──
            if (callId) {
                setAnalysisStatus('Fetching call details from Vapi...');
                let vapiMessages: any[] = [];

                // FIX: Retry up to 5 times with 2s delay — Vapi needs time to finalize
                for (let attempt = 1; attempt <= 5; attempt++) {
                    try {
                        await new Promise(r => setTimeout(r, attempt * 2000)); // 2s, 4s, 6s, 8s, 10s
                        setAnalysisStatus(`Fetching transcript (attempt ${attempt}/5)...`);

                        const callDetailsRes = await fetch(`/api/vapi/call-details?callId=${callId}`);
                        const callDetails = await callDetailsRes.json();

                        console.log(`Attempt ${attempt} call details:`, callDetails);

                        if (callDetails.success && callDetails.messages && callDetails.messages.length > 0) {
                            vapiMessages = callDetails.messages;
                            transcript = callDetails.transcript || '';
                            console.log(`✅ Got ${vapiMessages.length} messages from Vapi on attempt ${attempt}`);
                            break;
                        }

                        if (callDetails.transcript && callDetails.transcript.length > 10) {
                            transcript = callDetails.transcript;
                            console.log(`✅ Got transcript string on attempt ${attempt}`);
                            break;
                        }
                    } catch (err) {
                        console.warn(`Attempt ${attempt} failed:`, err);
                    }
                }

                // Use Vapi messages if we got them, else fall back to local
                if (vapiMessages.length > 0) {
                    messages = vapiMessages;
                } else if (transcript && transcript.length > 10) {
                    // transcript string but no structured messages — convert to local format
                    console.log('Using transcript string, local messages as fallback');
                } else {
                    console.log('⚠️ Vapi transcript empty after retries — using local messages');
                }
            }

            // ── Step 2: Build transcript string from local messages if needed ──
            if (!transcript && localMessages.length > 0) {
                transcript = localMessages
                    .map(m => `${m.role === 'user' ? 'Patient' : 'Doctor'}: ${m.content}`)
                    .join('\n');
            }

            // ── Step 3: If we have absolutely nothing, create minimal transcript ──
            if (!transcript && messages.length === 0) {
                transcript = `Patient: ${currentData.patientName} came for consultation about: ${currentData.symptoms}`;
                messages = [{
                    role: 'user',
                    content: currentData.symptoms,
                    timestamp: new Date().toISOString(),
                }];
            }

            setAnalysisStatus('Analyzing conversation with Gemini AI...');

            // ── Step 4: Send to analyze API ──
            const analysisRes = await fetch('/api/vapi/analyze-conversation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    callId: callId || 'local',
                    transcript,
                    messages,
                    patientName: currentData.patientName,
                    symptoms: currentData.symptoms,
                    specialist: currentData.chosenSpecialist,
                }),
            });

            const analysis = await analysisRes.json();
            console.log('Analysis result:', analysis);

            if (analysis.success) {
                setAnalysisResult(analysis.analysis);
                const fallbackWarning = analysis.usedFallback ? ' (Fallback used — Gemini unavailable)' : '';
                setAnalysisStatus(`✅ Report ready!${fallbackWarning} Opening full report…`);
                // Auto-redirect to full report page with all charts
                setTimeout(() => {
                    const sid = sessionIdRef.current ?? dataRef.current.sessionId;
                    if (sid) router.push(`/dashboard/session/${sid}`);
                }, 2000);
            } else {
                throw new Error(analysis.error || 'Analysis failed');
            }
        } catch (err: any) {
            console.error('handleCallEnd error:', err);
            setErrorMessage(`Analysis failed: ${err.message}. You can still view partial session data.`);
            setAnalysisStatus('');
        } finally {
            setIsAnalyzing(false);
        }
    }

    function handleVapiError(error: string) {
        setErrorMessage(error);
    }

    async function finishConsultation() {
        const sid = sessionIdRef.current ?? data.sessionId;
        router.push(sid ? `/dashboard/session/${sid}` : '/dashboard');
    }

    return (
        <div className="min-h-screen bg-[#f7f8fc]">
            <div className="bg-white border-b border-slate-200 px-8 py-5">
                <h1 className="text-2xl font-bold text-[#1a2d5a]" style={{ fontFamily: "'DM Serif Display', serif" }}>New Consultation</h1>
                <p className="text-slate-500 text-sm mt-0.5">Complete each step to receive your AI medical assessment</p>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-10">
                {/* Step Progress */}
                <div className="mb-10">
                    <div className="flex items-center justify-between relative">
                        <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200 z-0" />
                        <div className="absolute top-5 left-0 h-0.5 bg-[#1a8fa0] z-0 transition-all duration-500" style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }} />
                        {STEPS.map(step => {
                            const Icon = step.icon;
                            const done = currentStep > step.id;
                            const active = currentStep === step.id;
                            return (
                                <div key={step.id} className="flex flex-col items-center z-10">
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${done ? 'bg-[#1a8fa0] border-[#1a8fa0] text-white shadow-md shadow-[#1a8fa0]/20' : active ? 'bg-white border-[#1a2d5a] text-[#1a2d5a] shadow-lg scale-110' : 'bg-white border-slate-300 text-slate-400'}`}>
                                        {done ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                                    </div>
                                    <span className={`text-xs mt-1.5 font-medium ${active ? 'text-[#1a2d5a]' : done ? 'text-[#1a8fa0]' : 'text-slate-400'}`}>{step.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {/* Step 1 */}
                    {currentStep === 1 && (
                        <div>
                            <div className="bg-[#1a2d5a] px-8 py-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center"><User className="h-5 w-5 text-white" /></div>
                                    <div>
                                        <h2 className="text-white font-bold text-xl" style={{ fontFamily: "'DM Serif Display', serif" }}>Patient Information</h2>
                                        <p className="text-slate-300 text-sm">Basic demographics for your consultation</p>
                                    </div>
                                </div>
                            </div>
                            <div className="px-8 py-7 space-y-5">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Full Name <span className="text-red-500">*</span></label>
                                    <input className="med-input" placeholder="Enter patient full name" value={data.patientName} onChange={e => update('patientName', e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Age</label>
                                        <input type="number" className="med-input" placeholder="e.g. 34" value={data.age} onChange={e => update('age', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Biological Sex</label>
                                        <select className="med-input" value={data.gender} onChange={e => update('gender', e.target.value)}>
                                            <option value="">Select</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other / Prefer not to say</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-2">
                                    <button onClick={handleNext} disabled={!data.patientName} className="flex items-center gap-2 bg-[#1a2d5a] hover:bg-[#243769] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors">
                                        Continue <ArrowRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2 */}
                    {currentStep === 2 && (
                        <div>
                            <div className="bg-[#1a2d5a] px-8 py-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center"><Stethoscope className="h-5 w-5 text-white" /></div>
                                    <div>
                                        <h2 className="text-white font-bold text-xl" style={{ fontFamily: "'DM Serif Display', serif" }}>Chief Complaint</h2>
                                        <p className="text-slate-300 text-sm">Describe symptoms in as much detail as possible</p>
                                    </div>
                                </div>
                            </div>
                            <div className="px-8 py-7 space-y-5">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Primary Symptoms <span className="text-red-500">*</span></label>
                                    <textarea className="med-input min-h-[120px] resize-none" placeholder="Describe your symptoms in detail..." value={data.symptoms} onChange={e => update('symptoms', e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Symptom Duration</label>
                                    <select className="med-input" value={data.symptomDuration} onChange={e => update('symptomDuration', e.target.value)}>
                                        <option value="">Select duration</option>
                                        <option value="less_than_day">Less than 24 hours</option>
                                        <option value="1_3_days">1–3 days</option>
                                        <option value="4_7_days">4–7 days</option>
                                        <option value="1_2_weeks">1–2 weeks</option>
                                        <option value="more_than_2_weeks">More than 2 weeks</option>
                                    </select>
                                </div>
                                <div className="flex justify-between pt-2">
                                    <button onClick={handleBack} className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"><ArrowLeft className="h-4 w-4" /> Back</button>
                                    <button onClick={handleNext} disabled={!data.symptoms} className="flex items-center gap-2 bg-[#1a2d5a] hover:bg-[#243769] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors">Continue <ArrowRight className="h-4 w-4" /></button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3 */}
                    {currentStep === 3 && (
                        <div>
                            <div className="bg-[#1a2d5a] px-8 py-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center"><ClipboardList className="h-5 w-5 text-white" /></div>
                                    <div>
                                        <h2 className="text-white font-bold text-xl" style={{ fontFamily: "'DM Serif Display', serif" }}>Medical History</h2>
                                        <p className="text-slate-300 text-sm">Helps AI provide more accurate recommendations</p>
                                    </div>
                                </div>
                            </div>
                            <div className="px-8 py-7 space-y-5">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Additional Context</label>
                                    <textarea className="med-input min-h-[90px] resize-none" placeholder="Any situational context..." value={data.additionalDetails} onChange={e => update('additionalDetails', e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Past Medical History / Medications</label>
                                    <textarea className="med-input min-h-[90px] resize-none" placeholder="Existing conditions, medications, allergies..." value={data.medicalHistory} onChange={e => update('medicalHistory', e.target.value)} />
                                </div>
                                <div className="flex justify-between pt-2">
                                    <button onClick={handleBack} className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"><ArrowLeft className="h-4 w-4" /> Back</button>
                                    <button onClick={handleNext} disabled={loading} className="flex items-center gap-2 bg-[#1a2d5a] hover:bg-[#243769] disabled:opacity-60 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors">
                                        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : <>Get AI Recommendation <ArrowRight className="h-4 w-4" /></>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4 */}
                    {currentStep === 4 && (
                        <div>
                            <div className="bg-[#1a2d5a] px-8 py-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-white" /></div>
                                    <div>
                                        <h2 className="text-white font-bold text-xl" style={{ fontFamily: "'DM Serif Display', serif" }}>Select Specialist</h2>
                                        <p className="text-slate-300 text-sm">AI-recommended based on your symptoms</p>
                                    </div>
                                </div>
                            </div>
                            <div className="px-8 py-7 space-y-5">
                                {data.suggestedSpecialist && (
                                    <div className="bg-[#e8f6f9] border border-[#1a8fa0]/30 rounded-xl p-5">
                                        <div className="flex items-start gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-[#1a8fa0]/15 flex items-center justify-center text-[#1a8fa0] flex-shrink-0 mt-0.5"><CheckCircle className="h-4.5 w-4.5" /></div>
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-wide text-[#1a8fa0] mb-1">AI Recommendation</p>
                                                <p className="font-semibold text-slate-800">{SPECIALISTS.find(s => s.id === data.suggestedSpecialist.specialistId)?.icon}{' '}{data.suggestedSpecialist.specialistName}</p>
                                                <p className="text-sm text-slate-600 mt-1">{data.suggestedSpecialist.reason}</p>
                                                <span className={`text-xs px-2.5 py-0.5 rounded-full mt-2 inline-block font-semibold ${data.suggestedSpecialist.urgency === 'high' ? 'bg-red-100 text-red-700' : data.suggestedSpecialist.urgency === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {data.suggestedSpecialist.urgency?.toUpperCase()} PRIORITY
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {errorMessage && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                                        <AlertCircle className="h-4.5 w-4.5 text-red-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm text-red-700 font-medium">{errorMessage}</p>
                                            <button onClick={() => setErrorMessage('')} className="text-xs text-red-500 underline mt-1">Dismiss</button>
                                        </div>
                                    </div>
                                )}

                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Choose a specialist to consult:</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {SPECIALISTS.map(specialist => (
                                        <button key={specialist.id} onClick={() => update('chosenSpecialist', specialist.id)}
                                            className={`text-left p-4 rounded-xl border-2 transition-all ${data.chosenSpecialist === specialist.id ? 'border-[#1a8fa0] bg-[#e8f6f9] shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'} ${data.suggestedSpecialist?.specialistId === specialist.id ? 'ring-2 ring-[#1a8fa0]/30' : ''}`}>
                                            <span className="text-2xl">{specialist.icon}</span>
                                            <p className="font-semibold text-sm text-slate-800 mt-1.5">{specialist.name}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{specialist.description}</p>
                                            {data.suggestedSpecialist?.specialistId === specialist.id && <span className="text-xs text-[#1a8fa0] font-bold mt-1 block">★ Recommended</span>}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex justify-between pt-2">
                                    <button onClick={handleBack} className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"><ArrowLeft className="h-4 w-4" /> Back</button>
                                    <button onClick={handleNext} disabled={!data.chosenSpecialist || loading} className="flex items-center gap-2 bg-[#1a2d5a] hover:bg-[#243769] disabled:opacity-40 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors">
                                        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Setting up...</> : <>Start Voice Session <Mic className="h-4 w-4" /></>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Voice Consultation */}
                    {currentStep === 5 && (
                        <div>
                            <div className="bg-[#1a2d5a] px-8 py-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-[#1a8fa0]/30 flex items-center justify-center"><MessageCircle className="h-5 w-5 text-white" /></div>
                                    <div>
                                        <h2 className="text-white font-bold text-xl" style={{ fontFamily: "'DM Serif Display', serif" }}>Voice Consultation</h2>
                                        <p className="text-slate-300 text-sm">
                                            with {SPECIALISTS.find(s => s.id === data.chosenSpecialist)?.icon}{' '}
                                            {SPECIALISTS.find(s => s.id === data.chosenSpecialist)?.name}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="px-8 py-7 space-y-5">
                                {isCreatingAssistant && (
                                    <div className="flex flex-col items-center justify-center py-14">
                                        <div className="h-16 w-16 rounded-2xl bg-[#e8f6f9] flex items-center justify-center mb-4">
                                            <Loader2 className="h-8 w-8 text-[#1a8fa0] animate-spin" />
                                        </div>
                                        <p className="font-semibold text-slate-700">Preparing your AI specialist...</p>
                                        <p className="text-slate-400 text-sm mt-1">This takes just a moment</p>
                                    </div>
                                )}

                                {!isCreatingAssistant && vapiAssistantId && (
                                    <VapiVoiceConsultation
                                        assistantId={vapiAssistantId}
                                        patientName={data.patientName}
                                        symptoms={data.symptoms}
                                        onCallEnd={handleCallEnd}
                                        onError={handleVapiError}
                                    />
                                )}

                                {errorMessage && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                                        <AlertCircle className="h-4.5 w-4.5 text-red-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm text-red-700 font-medium">{errorMessage}</p>
                                            <button onClick={() => setErrorMessage('')} className="text-xs text-red-500 underline mt-1">Dismiss</button>
                                        </div>
                                    </div>
                                )}

                                {/* FIX: Show analysis loading state clearly */}
                                {isAnalyzing && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full border-2 border-blue-300 border-t-blue-700 animate-spin flex-shrink-0" />
                                            <div>
                                                <p className="font-semibold text-blue-800 text-sm">Generating Medical Report...</p>
                                                <p className="text-blue-600 text-xs mt-0.5">{analysisStatus}</p>
                                            </div>
                                        </div>
                                        <div className="border-t border-blue-100 pt-4">
                                            <p className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3">VAPI → Gemini Pipeline</p>
                                            <div className="space-y-2.5">
                                                {[
                                                    { label: 'VAPI Call Ended', done: true },
                                                    { label: 'Transcript Extracted', done: analysisStatus.includes('Gemini') || analysisStatus.includes('ready') },
                                                    { label: 'Gemini AI Analyzing', done: analysisStatus.includes('ready'), active: analysisStatus.includes('Gemini') },
                                                    { label: 'Structured Report Generated', done: false },
                                                ].map((s, i) => (
                                                    <div key={i} className="flex items-center gap-2.5">
                                                        <div className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${s.done ? 'bg-emerald-500 text-white' : s.active ? 'bg-blue-500 text-white animate-pulse' : 'bg-blue-100 text-blue-400'}`}>
                                                            {s.done ? '✓' : i + 1}
                                                        </div>
                                                        <span className={`text-xs font-medium ${s.done ? 'text-emerald-700' : s.active ? 'text-blue-700 font-bold' : 'text-blue-400'}`}>{s.label}</span>
                                                        {s.active && <div className="ml-auto h-3 w-3 rounded-full border-2 border-blue-400 border-t-blue-700 animate-spin" />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {callCompleted && analysisResult && !isAnalyzing && (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 space-y-4">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                                            <h3 className="font-bold text-emerald-800">✅ Consultation Complete — Report Generated!</h3>
                                        </div>
                                        <p className="text-sm text-emerald-700 leading-relaxed">{analysisResult.summary}</p>

                                        {/* Mini metric preview */}
                                        {(analysisResult.diseaseLevel || analysisResult.overallRisk) && (
                                            <div className="flex gap-4">
                                                {analysisResult.diseaseLevel && (
                                                    <div className="text-center bg-white rounded-lg px-4 py-2 border border-emerald-200">
                                                        <div className="text-lg font-black text-orange-500">{analysisResult.diseaseLevel}</div>
                                                        <div className="text-xs text-slate-500">Disease Level</div>
                                                    </div>
                                                )}
                                                {analysisResult.overallRisk && (
                                                    <div className="text-center bg-white rounded-lg px-4 py-2 border border-emerald-200">
                                                        <div className="text-lg font-black text-red-500">{analysisResult.overallRisk}</div>
                                                        <div className="text-xs text-slate-500">Risk Score</div>
                                                    </div>
                                                )}
                                                {analysisResult.recoveryTimeline?.label && (
                                                    <div className="text-center bg-white rounded-lg px-4 py-2 border border-emerald-200">
                                                        <div className="text-sm font-black text-emerald-600">{analysisResult.recoveryTimeline.label}</div>
                                                        <div className="text-xs text-slate-500">Recovery Time</div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {analysisResult.symptoms?.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {analysisResult.symptoms.map((s: string, i: number) => (
                                                    <span key={i} className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full font-medium">{s}</span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => router.push(`/dashboard/session/${sessionIdRef.current ?? data.sessionId}`)}
                                                className="flex-1 flex items-center justify-center gap-2 bg-[#1a2d5a] hover:bg-[#243769] text-white text-sm font-semibold py-3 rounded-xl transition-colors"
                                            >
                                                View Full Report <ArrowRight className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => router.push('/dashboard/reports')}
                                                className="flex items-center justify-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-5 py-3 rounded-xl transition-colors"
                                            >
                                                All Reports
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Show waiting state if call done but analysis not started */}
                                {callCompleted && !isAnalyzing && !analysisResult && !errorMessage && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                        <p className="text-sm text-slate-500 text-center">Preparing to analyze conversation...</p>
                                    </div>
                                )}

                                <div className="flex justify-between pt-2">
                                    <button onClick={handleBack} className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium px-5 py-2.5 rounded-xl transition-colors">
                                        <ArrowLeft className="h-4 w-4" /> Back
                                    </button>
                                    {callCompleted && !isAnalyzing && (
                                        <button onClick={finishConsultation} className="flex items-center gap-2 bg-[#1a2d5a] hover:bg-[#243769] text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors">
                                            View Report <ArrowRight className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
