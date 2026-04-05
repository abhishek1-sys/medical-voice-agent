import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { Stethoscope, LayoutDashboard, Activity, FileText, Plus } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f8fc] flex" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#1a2d5a] flex-col fixed top-0 left-0 h-full z-40">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[#1a8fa0] flex items-center justify-center flex-shrink-0">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-base leading-tight">MediVoice AI</div>
              <div className="text-slate-400 text-xs">Clinical Platform</div>
            </div>
          </Link>
          
        </div>

        {/* New Session CTA */}


        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
  {/* Section Title */}
  <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2 px-2">
    Navigation
  </div>

  {[
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      href: '/dashboard/sessions',
      label: 'Sessions',
      icon: <Activity className="h-4 w-4" />,
    },
    {
      href: '/dashboard/reports',
      label: 'Reports',
      icon: <FileText className="h-4 w-4" />,
    },
    {
      href: '/dashboard/scan',
      label: 'Scan Prescription',
      icon: <FileText className="h-4 w-4" />,
    },
  ].map((link) => (
    <Link
      key={link.href}
      href={link.href}
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white text-[13px] font-medium transition-all group"
    >
      <span className="text-slate-400 group-hover:text-[#1a8fa0] transition-colors">
        {link.icon}
      </span>
      {link.label}
    </Link>
  ))}
</nav>

        {/* User section */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2">
            <UserButton afterSignOutUrl="/" />
            <div className="text-slate-300 text-sm font-medium">My Account</div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#1a2d5a] px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-[#1a8fa0] flex items-center justify-center">
            <Stethoscope className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-white font-bold text-base">MediVoice AI</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/new-session">
            <button className="bg-[#1a8fa0] text-white text-xs font-semibold px-3 py-1.5 rounded-lg">+ New</button>
          </Link>
          <Link href="/dashboard" className="text-slate-300 hover:text-white p-1">
            <LayoutDashboard className="h-5 w-5" />
          </Link>
          <Link href="/dashboard/sessions" className="text-slate-300 hover:text-white p-1">
            <Activity className="h-5 w-5" />
          </Link>
          <Link href="/dashboard/reports" className="text-slate-300 hover:text-white p-1">
            <FileText className="h-5 w-5" />
          </Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pt-0 lg:pt-0 mt-14 lg:mt-0">
        {children}
      </main>
    </div>
  );
}
