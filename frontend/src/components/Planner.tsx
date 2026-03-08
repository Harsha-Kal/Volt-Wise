"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/auth";
import Link from "next/link";

type Appliance = {
  id: number;
  name: string;
  kw_rating: number;
  is_smart_device: boolean;
};

type ScheduleResult = {
  projected_cost: number;
  energy_cost: number | null;
  demand_cost: number | null;
  duration_hours: number | null;
  status: string;
  message: string | null;
};

const DURATION_PRESETS = [
  { label: "30 min", hours: 0.5 },
  { label: "1 hr", hours: 1.0 },
  { label: "1.5 hr", hours: 1.5 },
  { label: "2 hr", hours: 2.0 },
  { label: "3 hr", hours: 3.0 },
];

// Format a number as a dollar cost — hides tiny sub-cent values
function formatCost(val: number | null | undefined): string {
  if (val == null) return "$0.00";
  return `$${val.toFixed(2)}`;
}

// Get a local datetime-local string for an offset from now
function localDatetimePlus(hours: number): string {
  const d = new Date();
  d.setTime(d.getTime() + hours * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

export default function Planner() {
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [selectedApplianceId, setSelectedApplianceId] = useState<number | "">("");
  const [selectedTime, setSelectedTime] = useState("");
  const [durationHours, setDurationHours] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadDevices();
    // Default to 1 hour from now, in LOCAL time (not UTC slice)
    setSelectedTime(localDatetimePlus(1));
  }, []);

  const loadDevices = async () => {
    try {
      const res = await fetchWithAuth("http://localhost:8000/api/devices/");
      if (res.ok) setAppliances(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplianceId || !selectedTime) return;
    setScheduling(true);
    setResult(null);
    setErrorMsg("");

    try {
      // datetime-local gives us a LOCAL time string like "2026-03-09T18:00"
      // We convert it to ISO with offset info by treating it as local
      const localDate = new Date(selectedTime);
      const isoTime = localDate.toISOString(); // UTC

      const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const res = await fetchWithAuth("http://localhost:8000/api/schedules/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appliance_id: selectedApplianceId,
          scheduled_time: isoTime,
          duration_hours: durationHours,
          timezone: deviceTz,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to schedule");
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong.");
    } finally {
      setScheduling(false);
    }
  };

  if (loading) return <div className="p-6 bg-neutral-900 border border-white/10 rounded-3xl animate-pulse h-64" />;

  const selectedApp = appliances.find(a => a.id === selectedApplianceId);
  const energyCost = result?.energy_cost ?? 0;
  const demandCost = result?.demand_cost ?? 0;
  const totalCost = result?.projected_cost ?? 0;
  const duration = result?.duration_hours ?? durationHours;

  // Safely compute rate per kWh
  const denominator = (selectedApp?.kw_rating ?? 1) * duration;
  const ratePerKwh = denominator > 0 ? energyCost / denominator : 0;

  const isPeak = result?.message?.toLowerCase().includes("peak");
  const isShifted = result?.status === "shifted";

  return (
    <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden">
      <div className="mb-5">
        <h2 className="text-xl font-light text-white mb-1">Smart Planner</h2>
        <p className="text-sm text-neutral-400">
          Get an accurate cost estimate including peak rates and demand charges.
        </p>
      </div>

      {appliances.length === 0 ? (
        <div className="p-6 bg-black/50 border border-white/10 rounded-xl text-center">
          <p className="text-neutral-400 text-sm mb-3">No devices registered yet.</p>
          <Link
            href="/devices"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium transition-colors no-underline"
          >
            Add a Device →
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSchedule} className="space-y-4">
          {/* Appliance + Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Appliance</label>
              <select
                value={selectedApplianceId}
                onChange={e => setSelectedApplianceId(Number(e.target.value))}
                required
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="" disabled>Select an appliance</option>
                {appliances.map(app => (
                  <option key={app.id} value={app.id}>
                    {app.name} — {app.kw_rating} kW{app.is_smart_device ? " ⚡" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1">
                Start Time <span className="text-neutral-600">(your local time)</span>
              </label>
              <input
                type="datetime-local"
                value={selectedTime}
                onChange={e => setSelectedTime(e.target.value)}
                required
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs text-neutral-400 mb-2">
              Run Duration —{" "}
              <span className="text-white font-mono">
                {durationHours >= 1
                  ? `${durationHours} hr${durationHours !== 1 ? "s" : ""}`
                  : `${durationHours * 60} min`}
              </span>
              {selectedApp && (
                <span className="ml-2 text-neutral-600">
                  = {(selectedApp.kw_rating * durationHours).toFixed(2)} kWh
                </span>
              )}
            </label>
            <div className="flex gap-2 flex-wrap items-center">
              {DURATION_PRESETS.map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setDurationHours(p.hours)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    durationHours === p.hours
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                      : "bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <input
                type="number"
                min="0.1"
                max="12"
                step="0.5"
                value={durationHours}
                onChange={e => setDurationHours(Math.max(0.1, parseFloat(e.target.value) || 1))}
                className="w-20 bg-black border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={scheduling || !selectedApplianceId}
            className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold py-3 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {scheduling ? "Calculating cost..." : "Schedule & Estimate Cost →"}
          </button>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
              {errorMsg}
            </div>
          )}

          {/* Result */}
          {result && (
            <div
              className={`mt-4 rounded-2xl border overflow-hidden ${
                isShifted
                  ? "border-indigo-500/30 bg-indigo-950/30"
                  : isPeak
                  ? "border-rose-500/20 bg-rose-950/20"
                  : "border-emerald-500/20 bg-emerald-950/10"
              }`}
            >
              {/* Header badge */}
              <div
                className={`px-4 py-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider ${
                  isShifted
                    ? "bg-indigo-500/20 text-indigo-300"
                    : isPeak
                    ? "bg-rose-500/10 text-rose-400"
                    : "bg-emerald-500/10 text-emerald-400"
                }`}
              >
                <span>{isShifted ? "🤖 Smart Shift Activated" : isPeak ? "🔴 Peak Pricing Detected" : "🟢 Off-Peak Rate"}</span>
              </div>

              <div className="p-4 space-y-4">
                {result.message && (
                  <p className="text-sm text-neutral-300 leading-relaxed">{result.message}</p>
                )}

                {/* Cost breakdown table */}
                <div className="rounded-xl overflow-hidden border border-white/10">
                  <div className="bg-black/60 px-4 py-2">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider">Cost Breakdown</p>
                  </div>
                  <div className="divide-y divide-white/5">
                    <div className="flex justify-between px-4 py-3 text-sm">
                      <span className="text-neutral-400">
                        Energy
                        {selectedApp && ratePerKwh > 0 && (
                          <span className="ml-1 text-neutral-600 text-xs font-mono">
                            ({selectedApp.kw_rating}kW × {duration}h × ${ratePerKwh.toFixed(3)}/kWh)
                          </span>
                        )}
                      </span>
                      <span className="font-mono font-medium text-white">{formatCost(energyCost)}</span>
                    </div>
                    {demandCost > 0 && (
                      <div className="flex justify-between px-4 py-3 text-sm">
                        <span className="text-rose-400/90">
                          Demand Charge
                          <span className="ml-1 text-neutral-600 text-xs">(kW over provider limit)</span>
                        </span>
                        <span className="font-mono font-medium text-rose-400">{formatCost(demandCost)}</span>
                      </div>
                    )}
                    <div className="flex justify-between px-4 py-3 bg-white/5">
                      <span className="font-semibold text-white">Estimated Total</span>
                      <span
                        className={`font-bold font-mono text-xl ${
                          isPeak && !isShifted ? "text-rose-400" : "text-emerald-400"
                        }`}
                      >
                        {formatCost(totalCost)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Off-peak hint */}
                {isPeak && !isShifted && (
                  <p className="text-xs text-neutral-500 text-center">
                    💡 Schedule for 10 PM–5 AM to pay off-peak rates and skip demand charges.
                  </p>
                )}
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
