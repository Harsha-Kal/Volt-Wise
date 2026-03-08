"use client";

import { useState } from "react";
import { GridHUD } from "@/components/GridHUD";
import { HabitLogger } from "@/components/HabitLogger";
import { WeeklyForecast } from "@/components/WeeklyForecast";
import { Activity } from "lucide-react";

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleLogAdded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[128px]"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[128px]"></div>
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 md:py-24">
        {/* Header */}
        <header className="mb-16">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-medium tracking-wide uppercase text-neutral-300">Beta Access Mode</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-white/40 mb-6">
            Volt<span className="text-blue-500">-Wise</span>
          </h1>
          <p className="text-xl md:text-2xl text-neutral-400 font-light max-w-2xl leading-relaxed">
            The fitness tracker for the grid. Optimize your energy usage to save money and reduce demand charges.
          </p>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Status Column */}
          <div className="lg:col-span-12">
            <GridHUD />
          </div>

          {/* Activity Column */}
          <div className="lg:col-span-7 space-y-6">
            <HabitLogger onLogAdded={handleLogAdded} />
            
            <div className="bg-neutral-900/30 border border-white/5 rounded-3xl p-6">
              <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Usage Graph (Coming Soon)
              </h3>
              <div className="h-48 flex items-end justify-between gap-2 opacity-50">
                {[40, 70, 45, 90, 65, 30, 85].map((h, i) => (
                  <div key={i} className="w-full bg-gradient-to-t from-blue-500/20 to-blue-500/5 rounded-t-lg transition-all duration-1000" style={{ height: `${h}%` }}></div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Advisor Column */}
          <div className="lg:col-span-5">
            <WeeklyForecast refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </main>
    </div>
  );
}
