"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/auth";
import { AlertTriangle, CheckCircle } from "lucide-react"; 
import { cn } from "@/lib/utils";

type GridStatus = {
  status: "Green" | "Yellow" | "Red";
  rate: number;
  provider: string;
  timestamp: string;
};

export default function GridHUD() { 
  const [data, setData] = useState<GridStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      // Removed manual provider selection - the backend now automatically 
      // returns status based on the authenticated user's profile settings.
      const response = await fetchWithAuth(`http://localhost:8000/api/status`);
      if (!response.ok) throw new Error("Failed to fetch grid status");
      
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError("Unable to connect to grid API.");
      console.error("Failed to fetch grid status:", err); // Keep console error for debugging
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []); // Removed provider from dependency array

  if (!data) { // Changed gridData to data
    return (
      <div className="animate-pulse bg-neutral-900 rounded-2xl p-6 h-40 border border-neutral-800">
        <div className="h-6 bg-neutral-800 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-neutral-800 rounded w-1/2"></div>
      </div>
    );
  }

  const isGreen = data?.status === "Green";
  const isYellow = data?.status === "Yellow";
  const isRed = data?.status === "Red";

  return (
    <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/5 shadow-2xl rounded-3xl p-6 relative overflow-hidden group">
      {/* Dynamic background glow based on status */}
      <div className={cn(
        "absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 transition-colors duration-1000",
        isGreen && "bg-emerald-500",
        isYellow && "bg-amber-500",
        isRed && "bg-rose-500"
      )} />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80 mb-1">Current Rate</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl lg:text-5xl font-bold tracking-tight">${data.rate.toFixed(2)}</span>
            <span className="text-sm opacity-80">/ kWh</span>
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm font-medium opacity-80 mb-1">Provider</p>
          <div className="text-xl font-medium tracking-tight">
            {data.provider}
          </div>
        </div>
      </div>
        
      <div className="mt-6 flex items-center justify-between">
        <div className={cn(
          "px-4 py-2 rounded-full font-bold text-sm tracking-widest uppercase flex items-center gap-2 shadow-lg",
          isGreen && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
          isYellow && "bg-amber-500/20 text-amber-400 border border-amber-500/30",
          isRed && "bg-rose-500/20 text-rose-400 border border-rose-500/30"
        )}>
          {isGreen && <CheckCircle className="w-4 h-4" />}
          {isRed && <AlertTriangle className="w-4 h-4" />}
          {data?.status}
        </div>
      </div>
      
      <p className="text-sm text-neutral-500 mt-4 leading-relaxed max-w-sm">
        {isGreen ? "Optimal time to run high-energy appliances." : 
         isRed ? "Peak pricing in effect. Delay high-energy usage if possible to avoid demand charges." :
         "Shoulder pricing. Moderate usage recommended."}
      </p>
    </div>
  );
}
