"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import Link from "next/link";

import GridHUD from "@/components/GridHUD";
import Planner from "@/components/Planner";
import WeeklyForecast from "@/components/WeeklyForecast";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Basic Client Route Protection
    if (!getToken()) {
      router.push("/login");
    }
  }, [router]);

  return (
    <main className="min-h-screen bg-black text-white selection:bg-emerald-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/20 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* Header & Navigation */}
        <header className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
             </div>
             <div>
               <h1 className="text-xl font-medium tracking-tight">Volt-Wise</h1>
               <p className="text-xs text-neutral-500 font-mono hidden md:block">Advisory-First Grid Optimization</p>
             </div>
          </div>
          
          <Link href="/account" className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 border border-white/10 rounded-full hover:bg-neutral-800 transition-colors text-sm text-neutral-300 no-underline cursor-pointer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Account
          </Link>
        </header>

        {/* Main Dashboard Layout */}
        <div className="space-y-6">
          <section>
            <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-3 px-1">Live Grid Status</h2>
            <GridHUD />
          </section>

          <section>
            <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-3 px-1">Smart Planner</h2>
            <Planner />
          </section>

          <section className="pt-4">
             <WeeklyForecast />
          </section>
        </div>

      </div>
    </main>
  );
}
