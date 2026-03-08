"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth";

type LogEntry = {
  id: number;
  appliance_id: number;
  executed_time: string;
  cost: number;
};

type Appliance = {
  id: number;
  name: string;
  kw_rating: number;
};

export default function BillComparison() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchWithAuth("http://localhost:8000/api/logs").then(r => r.json()),
      fetchWithAuth("http://localhost:8000/api/devices/").then(r => r.json()),
    ])
      .then(([l, a]) => { setLogs(l); setAppliances(a); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="bg-neutral-900/50 border border-white/10 rounded-3xl p-6 animate-pulse h-48" />;
  if (logs.length === 0) return null;

  // "Before": actual cost of all peak-hour logs
  // Peak hours: 17-21 weekdays (Xcel standard)
  const peakLogs = logs.filter(l => {
    const d = new Date(l.executed_time);
    const hour = d.getHours();
    const isWeekday = d.getDay() >= 1 && d.getDay() <= 5;
    return isWeekday && hour >= 17 && hour < 21;
  });

  const beforeCost = peakLogs.reduce((sum, l) => sum + l.cost, 0);

  // "After": recalculate same appliances at off-peak rate ($0.08/kWh)
  const OFF_PEAK_RATE = 0.08;
  const afterCost = peakLogs.reduce((sum, l) => {
    const app = appliances.find(a => a.id === l.appliance_id);
    return sum + (app ? app.kw_rating * OFF_PEAK_RATE : l.cost * 0.29); // fallback ratio
  }, 0);

  const savings = Math.max(0, beforeCost - afterCost);
  const savingsPct = beforeCost > 0 ? (savings / beforeCost) * 100 : 0;

  if (peakLogs.length === 0) {
    return (
      <div className="bg-neutral-900/50 border border-white/10 rounded-3xl p-6">
        <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-3">Bill Comparison</h3>
        <p className="text-neutral-500 text-sm text-center py-4">No peak-hour usage logged yet. Run appliances to see your Before/After comparison.</p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Before vs. After Smart Shifting</h3>
        <span className="text-xs text-neutral-600">{peakLogs.length} peak-hour tasks</span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Before */}
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5">
          <p className="text-xs text-rose-400/70 uppercase tracking-wider mb-1">Before</p>
          <p className="text-xs text-neutral-500 mb-3">All tasks at peak rates</p>
          <p className="text-3xl font-bold text-rose-400">${beforeCost.toFixed(2)}</p>
          <div className="mt-2 space-y-1">
            {peakLogs.slice(0, 3).map(l => (
              <p key={l.id} className="text-xs text-rose-400/60 font-mono">${l.cost.toFixed(3)} — Device #{l.appliance_id}</p>
            ))}
            {peakLogs.length > 3 && <p className="text-xs text-neutral-600">+{peakLogs.length - 3} more...</p>}
          </div>
        </div>

        {/* After */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
          <p className="text-xs text-emerald-400/70 uppercase tracking-wider mb-1">After</p>
          <p className="text-xs text-neutral-500 mb-3">Same tasks at off-peak ($0.08)</p>
          <p className="text-3xl font-bold text-emerald-400">${afterCost.toFixed(2)}</p>
          <p className="text-xs text-emerald-400/60 mt-2 font-mono">Recalculated at off-peak rate</p>
        </div>
      </div>

      {/* Savings Banner */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-400">Potential Savings</p>
          <p className="text-xs text-neutral-500">By shifting peak-hour tasks to off-peak</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-emerald-400">${savings.toFixed(2)}</p>
          <p className="text-xs text-emerald-400/60">{savingsPct.toFixed(0)}% reduction</p>
        </div>
      </div>
    </div>
  );
}
