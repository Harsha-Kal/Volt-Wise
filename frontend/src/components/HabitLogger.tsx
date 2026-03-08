"use client";

import { useState } from "react";
import { Zap, Loader2 } from "lucide-react";

const APPLIANCES = [
  { name: "Washing Machine", kw: 0.5 },
  { name: "Electric Dryer", kw: 3.0 },
  { name: "Dishwasher", kw: 1.5 },
  { name: "Oven / Range", kw: 2.5 },
  { name: "EV Charger (L2)", kw: 7.2 },
  { name: "Air Conditioner Central", kw: 3.5 },
];

export function HabitLogger({ onLogAdded }: { onLogAdded: () => void }) {
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLog = async (appliance: { name: string; kw: number }) => {
    setLoading(true);
    setWarning(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("http://localhost:8000/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "demo-user-123", // Hardcoded for demo
          task_name: appliance.name,
          power_kw: appliance.kw,
        }),
      });
      const data = await res.json();
      
      if (data.warnings && data.warnings.length > 0) {
        setWarning(data.warnings[0]);
      } else {
        setSuccessMsg(`Logged ${appliance.name} successfully.`);
      }
      onLogAdded();
      
      setTimeout(() => {
        setSuccessMsg(null);
        setWarning(null);
      }, 5000);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6">
      <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
        <Zap className="text-yellow-400" /> Log Appliance
      </h3>
      <p className="text-sm text-neutral-400 mb-6">Track your high-energy usage to get better AI forecasts.</p>

      {warning && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl mb-6 text-sm flex items-start gap-3">
          <span className="font-bold uppercase tracking-wider text-xs bg-rose-500/20 px-2 py-1 rounded">Alert</span>
          {warning}
        </div>
      )}
      
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl mb-6 text-sm">
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {APPLIANCES.map((app) => (
          <button
            key={app.name}
            onClick={() => handleLog(app)}
            disabled={loading}
            className="flex flex-col items-start justify-center p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all text-left group"
          >
            <span className="font-medium text-white group-hover:text-blue-400 transition-colors">{app.name}</span>
            <span className="text-xs text-neutral-500 font-mono mt-1">{app.kw.toFixed(1)} kW</span>
          </button>
        ))}
      </div>
      
      {loading && (
        <div className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm rounded-3xl flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}
    </div>
  );
}
