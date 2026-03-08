"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/auth";

type Appliance = {
  id: number;
  name: string;
  kw_rating: number;
  is_smart_device: boolean;
};

export default function Planner() {
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [selectedAppliance, setSelectedAppliance] = useState<number | "">("");
  const [selectedTime, setSelectedTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  
  // Feedback States
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [smartMsg, setSmartMsg] = useState("");

  useEffect(() => {
    loadDevices();
    // Default time to next hour
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    setSelectedTime(d.toISOString().slice(0, 16));
  }, []);

  const loadDevices = async () => {
    try {
      const res = await fetchWithAuth("http://localhost:8000/api/devices/");
      if (res.ok) {
        setAppliances(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduling(true);
    setSuccessMsg("");
    setErrorMsg("");
    setSmartMsg("");
    
    if (!selectedAppliance || !selectedTime) return;

    try {
      const d = new Date(selectedTime);
      const isoTime = d.toISOString();
      
      const res = await fetchWithAuth("http://localhost:8000/api/schedules/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appliance_id: selectedAppliance,
          scheduled_time: isoTime
        }),
      });

      if (!res.ok) throw new Error("Failed to schedule appliance");
      
      const data = await res.json();
      
      const chosenAppName = appliances.find(a => a.id === selectedAppliance)?.name;
      const formattedCost = `$${data.projected_cost.toFixed(2)}`;
      
      if (data.status === "shifted") {
        setSmartMsg(data.message || `Smart Shift! ${chosenAppName} was auto-shifted to save money.`);
        setSuccessMsg(`Cost after auto-shift: ${formattedCost}`);
      } else {
        setSuccessMsg(`${chosenAppName} scheduled. Direct estimated cost: ${formattedCost}`);
        if(data.message) {
            setErrorMsg(data.message); // The API returned a cost warning nudge
        }
      }
      
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setScheduling(false);
    }
  };

  if (loading) return <div className="p-6 bg-neutral-900 border border-white/10 rounded-3xl animate-pulse h-64"></div>;

  return (
    <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden">
      <div className="mb-6 relative z-10">
        <h2 className="text-xl font-light text-white mb-1">Smart Planner</h2>
        <p className="text-sm text-neutral-400">Schedule appliances to see cost forecasts or let Volt-Wise auto-shift them.</p>
      </div>

      {appliances.length === 0 ? (
        <div className="p-4 bg-black/50 border border-white/10 rounded-xl text-center text-sm text-neutral-400">
           No devices found. Please register an appliance in your Account.
        </div>
      ) : (
        <form onSubmit={handleSchedule} className="space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Appliance</label>
              <select 
                value={selectedAppliance} 
                onChange={e => setSelectedAppliance(Number(e.target.value))}
                required
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50 text-white"
              >
                <option value="" disabled>Select an appliance</option>
                {appliances.map(app => (
                  <option key={app.id} value={app.id}>
                    {app.name} {app.is_smart_device ? "⚡ (Smart)" : ""}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Intended Time</label>
              <input 
                type="datetime-local" 
                value={selectedTime}
                onChange={e => setSelectedTime(e.target.value)}
                required
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50 text-white"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={scheduling || !selectedAppliance}
            className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium py-3 rounded-xl transition-colors disabled:opacity-50 mt-2"
          >
            {scheduling ? "Calculating..." : "Schedule & Estimate"}
          </button>
          
          {/* Feedback Widgets */}
          {smartMsg && (
            <div className="mt-4 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-start gap-3">
               <span className="text-xl">🤖</span>
               <div>
                 <p className="text-sm text-indigo-300 font-medium">Smart Execute Authorized</p>
                 <p className="text-xs text-indigo-400/80 mt-1">{smartMsg}</p>
               </div>
            </div>
          )}
          
          {errorMsg && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-sm">
              Note: {errorMsg}
            </div>
          )}
          
          {successMsg && !smartMsg && (
            <div className="mt-4 p-3 bg-neutral-800 border border-white/10 text-emerald-400 rounded-lg text-sm text-center font-mono">
              {successMsg}
            </div>
          )}
           
           {successMsg && smartMsg && (
            <div className="mt-2 p-3 bg-black border border-indigo-500/20 text-emerald-400 rounded-lg text-sm text-center font-mono">
              Final Cost Estimated at {successMsg.split(':')[1]}
            </div>
          )}

        </form>
      )}
    </div>
  );
}
