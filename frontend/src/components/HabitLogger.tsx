"use client";

import { useState, useEffect } from "react";
import { Zap, Loader2, AlertTriangle } from "lucide-react";
import { fetchWithAuth } from "@/lib/auth";

type Appliance = {
  id: number;
  name: string;
  kw_rating: number;
};

// Conflict detector threshold (kW) — warns when concurrent demand exceeds this
const DEMAND_SPIKE_THRESHOLD_KW = 6.0;
const DEMAND_CHARGE_PER_KW = 5.47; // Xcel default

export function HabitLogger({ onLogAdded }: { onLogAdded: () => void }) {
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  // Conflict detector: tracks appliances running "right now" (clears after 1 hour)
  const [activeKw, setActiveKw] = useState<number>(0);
  const [activeNames, setActiveNames] = useState<string[]>([]);

  useEffect(() => {
    fetchWithAuth("http://localhost:8000/api/devices/")
      .then(r => r.json())
      .then(data => Array.isArray(data) ? setAppliances(data) : [])
      .catch(console.error);
  }, []);

  const handleLog = async (appliance: Appliance) => {
    setLoading(true);
    setWarning(null);
    setSuccessMsg(null);

    // Conflict detector: check if adding this appliance would spike demand
    const projectedKw = activeKw + appliance.kw_rating;
    if (projectedKw > DEMAND_SPIKE_THRESHOLD_KW) {
      const extraCost = (projectedKw - DEMAND_SPIKE_THRESHOLD_KW) * DEMAND_CHARGE_PER_KW;
      setWarning(
        `⚠️ Demand Spike Alert! Running ${appliance.name} with ${activeNames.join(" & ")} will push you to ${projectedKw.toFixed(1)} kW — costing an extra $${extraCost.toFixed(2)}/month in demand fees. Wait until one finishes?`
      );
      setLoading(false);
      return; // Don't log — let user decide
    }

    try {
      const res = await fetchWithAuth("http://localhost:8000/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appliance_id: appliance.id }),
      });

      if (!res.ok) throw new Error("Failed to log appliance");

      // Update active kW tracking (simulates device as "running now")
      setActiveKw(prev => prev + appliance.kw_rating);
      setActiveNames(prev => [...prev, appliance.name]);
      // Auto-clear after 1 hour (simulated as 60s for demo)
      setTimeout(() => {
        setActiveKw(prev => Math.max(0, prev - appliance.kw_rating));
        setActiveNames(prev => prev.filter(n => n !== appliance.name));
      }, 60000);

      setSuccessMsg(`✓ Logged ${appliance.name}. Active load: ${(activeKw + appliance.kw_rating).toFixed(1)} kW`);
      onLogAdded();

      setTimeout(() => { setSuccessMsg(null); }, 5000);
    } catch (err) {
      console.error(err);
      setWarning("Failed to log. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const dismissWarning = () => setWarning(null);

  if (appliances.length === 0) return null;

  return (
    <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 relative">
      <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
        <Zap className="text-yellow-400 w-5 h-5" /> Log Appliance Now
      </h3>
      <p className="text-sm text-neutral-400 mb-4">
        Tap to log a device running now. Active load: <span className="font-mono text-white">{activeKw.toFixed(1)} kW</span>
        {activeKw > 0 && <span className="text-xs text-neutral-500"> ({activeNames.join(", ")})</span>}
      </p>

      {warning && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl mb-4 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p>{warning}</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={dismissWarning}
                className="px-3 py-1 bg-rose-500/20 border border-rose-500/30 rounded-lg text-xs hover:bg-rose-500/30 transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={async () => {
                  setWarning(null);
                  // Force-log anyway
                  const app = appliances.find(a => warning.includes(a.name));
                  // Just dismiss — user chose to not run it
                }}
                className="px-3 py-1 bg-neutral-800 border border-white/10 rounded-lg text-xs hover:bg-neutral-700 transition-colors text-neutral-300"
              >
                Cancel Run
              </button>
            </div>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl mb-4 text-sm">
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {appliances.map((app) => (
          <button
            key={app.id}
            onClick={() => handleLog(app)}
            disabled={loading}
            className="flex flex-col items-start justify-center p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all text-left group disabled:opacity-50"
          >
            <span className="font-medium text-white group-hover:text-emerald-400 transition-colors text-sm">{app.name}</span>
            <span className="text-xs text-neutral-500 font-mono mt-1">{app.kw_rating.toFixed(1)} kW</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm rounded-3xl flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      )}
    </div>
  );
}
