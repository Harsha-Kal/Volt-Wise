"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface GridStatus {
  status: "Green" | "Yellow" | "Red";
  rate: number;
  provider: string;
  timestamp: string;
}

export function GridHUD() {
  const [gridData, setGridData] = useState<GridStatus | null>(null);
  const [provider, setProvider] = useState<string>("Xcel");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStatus = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:8000/api/status?provider=${provider}`);
        const data = await res.json();
        setGridData(data);
      } catch (error) {
        console.error("Failed to fetch grid status:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
    
    // Poll every minute
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [provider]);

  if (loading && !gridData) {
    return (
      <div className="animate-pulse bg-neutral-900 rounded-2xl p-6 h-40 border border-neutral-800">
        <div className="h-6 bg-neutral-800 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-neutral-800 rounded w-1/2"></div>
      </div>
    );
  }

  const isGreen = gridData?.status === "Green";
  const isYellow = gridData?.status === "Yellow";
  const isRed = gridData?.status === "Red";

  return (
    <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/5 shadow-2xl rounded-3xl p-6 relative overflow-hidden group">
      {/* Dynamic background glow based on status */}
      <div className={cn(
        "absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 transition-colors duration-1000",
        isGreen && "bg-emerald-500",
        isYellow && "bg-amber-500",
        isRed && "bg-rose-500"
      )} />

      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-neutral-400 font-medium tracking-wide text-sm uppercase mb-1 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Live Grid Status
          </h2>
          <div className="flex items-center gap-2">
            <select 
              value={provider} 
              onChange={(e) => setProvider(e.target.value)}
              className="bg-transparent text-xl font-bold text-white border-b border-dashed border-white/20 pb-1 focus:outline-none focus:border-white transition-colors cursor-pointer appearance-none"
            >
              <option value="Xcel">Xcel Energy (CO)</option>
              <option value="CORE">CORE Electric</option>
              <option value="United Power">United Power</option>
            </select>
          </div>
        </div>
        
        <div className={cn(
          "px-4 py-2 rounded-full font-bold text-sm tracking-widest uppercase flex items-center gap-2 shadow-lg",
          isGreen && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
          isYellow && "bg-amber-500/20 text-amber-400 border border-amber-500/30",
          isRed && "bg-rose-500/20 text-rose-400 border border-rose-500/30"
        )}>
          {isGreen && <CheckCircle className="w-4 h-4" />}
          {isRed && <AlertTriangle className="w-4 h-4" />}
          {gridData?.status}
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-5xl font-black text-white tracking-tighter">
          ${gridData?.rate.toFixed(2)}
        </span>
        <span className="text-neutral-400 font-medium">/ kWh</span>
      </div>
      
      <p className="text-sm text-neutral-500 mt-4 leading-relaxed max-w-sm">
        {isGreen ? "Optimal time to run high-energy appliances." : 
         isRed ? "Peak pricing in effect. Delay high-energy usage if possible to avoid demand charges." :
         "Shoulder pricing. Moderate usage recommended."}
      </p>
    </div>
  );
}
