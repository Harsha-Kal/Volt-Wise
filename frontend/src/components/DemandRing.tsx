"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth";

type DemandStats = {
  peak_kw_this_month: number;
  demand_budget_kw: number;
  demand_budget_pct: number;
  estimated_demand_charge: number;
  logs_count: number;
  provider: string;
};

export default function DemandRing() {
  const [stats, setStats] = useState<DemandStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithAuth("http://localhost:8000/api/demand-stats")
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const pct = stats?.demand_budget_pct ?? 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  const color = pct >= 80 ? "#f43f5e" : pct >= 50 ? "#f59e0b" : "#10b981";
  const label = pct >= 80 ? "Critical" : pct >= 50 ? "Moderate" : "Healthy";

  if (loading) {
    return (
      <div className="bg-neutral-900/50 border border-white/10 rounded-3xl p-6 animate-pulse h-40" />
    );
  }

  return (
    <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center gap-6">
      {/* SVG Ring */}
      <div className="relative flex-shrink-0">
        <svg width="128" height="128" viewBox="0 0 128 128">
          {/* Background track */}
          <circle
            cx="64" cy="64" r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="10"
          />
          {/* Progress arc */}
          <circle
            cx="64" cy="64" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 64 64)"
            style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.5s ease" }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>{pct.toFixed(0)}%</span>
          <span className="text-[10px] text-neutral-500 uppercase tracking-wider">{label}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-neutral-400 mb-3 uppercase tracking-wider">Monthly Demand Budget</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Peak This Month</span>
            <span className="font-mono font-medium text-white">{stats?.peak_kw_this_month ?? 0} kW</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Budget ({stats?.provider})</span>
            <span className="font-mono font-medium text-white">{stats?.demand_budget_kw ?? 6} kW</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Est. Demand Charge</span>
            <span className="font-mono font-medium" style={{ color }}>
              ${(stats?.estimated_demand_charge ?? 0).toFixed(2)}
            </span>
          </div>
        </div>
        {pct >= 80 && (
          <p className="mt-3 text-xs text-rose-400/80 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
            ⚠️ You're near your demand limit. Avoid running multiple high-power appliances at once.
          </p>
        )}
      </div>
    </div>
  );
}
