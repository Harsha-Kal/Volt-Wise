"use client";

import { useEffect, useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";

export function WeeklyForecast({ refreshTrigger }: { refreshTrigger: number }) {
  const [forecast, setForecast] = useState<string>("Loading your personalized insights...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForecast = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:8000/api/forecast?user_id=demo-user-123&provider=Xcel");
        const data = await res.json();
        setForecast(data.forecast);
      } catch (err) {
        console.error(err);
        setForecast("Failed to load forecast.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchForecast();
  }, [refreshTrigger]);

  return (
    <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/20 backdrop-blur-xl border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="text-indigo-400" /> AI Advisor
        </h3>
        {loading && <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />}
      </div>
      
      <div className="relative z-10">
        <p className="text-indigo-100/80 leading-relaxed text-lg font-light">
          {forecast}
        </p>
      </div>
    </div>
  );
}
