"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth, clearToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

type UserProfile = {
  email: string;
  provider: string;
};

type LogEntry = {
  id: number;
  appliance_id: number;
  executed_time: string;
  cost: number;
};

type ScheduleEntry = {
  id: number;
  appliance_id: number;
  scheduled_time: string;
  projected_cost: number;
  status: string;
  message?: string;
};

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileRes, logsRes, schedulesRes] = await Promise.all([
        fetchWithAuth("http://localhost:8000/api/auth/me"),
        fetchWithAuth("http://localhost:8000/api/logs"),
        fetchWithAuth("http://localhost:8000/api/schedules")
      ]);

      if (profileRes.ok) setProfile(await profileRes.json());
      if (logsRes.ok) setLogs(await logsRes.json());
      if (schedulesRes.ok) setSchedules(await schedulesRes.json());
      
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    router.push("/login");
  };

  if (loading) return <div className="min-h-screen bg-black text-white p-8 flex items-center justify-center">Loading...</div>;

  // Calculate generic simulated savings based on shifted tasks
  const shiftedTasks = schedules.filter(s => s.status === 'shifted');
  const simulatedSavings = shiftedTasks.length * 1.45; // Simulated $1.45 average save per shift

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
          <div>
            <h1 className="text-3xl font-light tracking-tight">Account Dashboard</h1>
            <p className="text-neutral-400 mt-1">{profile?.email} • {profile?.provider}</p>
          </div>
          <div className="flex gap-3">
             <Link href="/" className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-white/10 rounded-lg text-sm transition-colors text-white no-underline">
              Back Home
            </Link>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm transition-colors">
              Sign Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
             <p className="text-emerald-400/80 text-sm font-medium mb-1">Total Smart Savings</p>
             <p className="text-3xl font-bold text-emerald-400">${simulatedSavings.toFixed(2)}</p>
             <p className="text-xs text-emerald-400/60 mt-2">Saved automatically by Volt-Wise shifting your tasks.</p>
           </div>
           
           <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6">
             <p className="text-neutral-500 text-sm font-medium mb-1">Tasks Shifted</p>
             <p className="text-3xl font-bold text-white">{shiftedTasks.length}</p>
             <p className="text-xs text-neutral-600 mt-2">Smart tasks executed at off-peak hours.</p>
           </div>
           
           <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 flex items-center justify-center">
             <Link href="/devices" className="text-emerald-400 hover:text-emerald-300 font-medium no-underline flex items-center gap-2">
               Manage Devices
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
             </Link>
           </div>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-4">Historical Logs</h2>
          <div className="bg-neutral-900/50 border border-white/10 rounded-2xl overflow-hidden">
             {logs.length === 0 ? (
               <div className="p-8 text-center text-neutral-500">No history available yet.</div>
             ) : (
               <table className="w-full text-left text-sm">
                 <thead className="bg-black/50 border-b border-white/10 text-neutral-400">
                   <tr>
                     <th className="px-6 py-4 font-medium">Time</th>
                     <th className="px-6 py-4 font-medium">Device ID</th>
                     <th className="px-6 py-4 font-medium">Actual Cost</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                   {logs.map(log => (
                     <tr key={log.id} className="hover:bg-white/[0.02]">
                       <td className="px-6 py-4 text-neutral-300">{new Date(log.executed_time).toLocaleString()}</td>
                       <td className="px-6 py-4 text-neutral-400">Device #{log.appliance_id}</td>
                       <td className="px-6 py-4 font-mono text-emerald-400">${log.cost.toFixed(2)}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
