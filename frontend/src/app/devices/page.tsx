"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/auth";
import Link from "next/link";

type Appliance = {
  id: number;
  name: string;
  kw_rating: number;
  is_smart_device: boolean;
};

export default function DevicesPage() {
  const router = useRouter();
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form State
  const [newName, setNewName] = useState("");
  const [newKw, setNewKw] = useState("");

  useEffect(() => {
    loadDevices();
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

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetchWithAuth("http://localhost:8000/api/devices/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          kw_rating: parseFloat(newKw)
        }),
      });
      if (!res.ok) throw new Error("Failed to add appliance");
      
      setNewName("");
      setNewKw("");
      loadDevices();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleConnectSmart = async (id: number) => {
    try {
      const res = await fetchWithAuth(`http://localhost:8000/api/devices/${id}/connect`, {
        method: "POST"
      });
      if (res.ok) {
        loadDevices();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
          <div>
            <h1 className="text-3xl font-light tracking-tight">My Devices</h1>
            <p className="text-neutral-400 mt-1">Manage your appliances and smart home connections.</p>
          </div>
          <Link href="/" className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-white/10 rounded-lg text-sm transition-colors cursor-pointer text-white no-underline">
            Back to Planner
          </Link>
        </div>

        {error && <div className="mb-6 p-4 bg-red-500/10 text-red-400 rounded-xl">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Add Device Form */}
          <div className="col-span-1 bg-neutral-900/50 border border-white/5 rounded-2xl p-6 h-fit">
            <h2 className="text-xl font-medium mb-4">Add Appliance</h2>
            <form onSubmit={handleAddDevice} className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Appliance Name</label>
                <input 
                  type="text" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Basement AC"
                  required
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Power Rating (kW)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={newKw} 
                  onChange={e => setNewKw(e.target.value)}
                  placeholder="e.g. 3.5"
                  required
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <button type="submit" className="w-full bg-white text-black py-2 rounded-lg text-sm font-medium hover:bg-neutral-200 transition-colors">
                Register Device
              </button>
            </form>
          </div>

          {/* Device List */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            {loading ? (
              <p className="text-neutral-500">Loading devices...</p>
            ) : appliances.length === 0 ? (
              <div className="p-8 text-center border border-white/5 border-dashed rounded-2xl">
                <p className="text-neutral-500 mb-2">No appliances registered yet.</p>
                <p className="text-sm text-neutral-600">Add your first appliance to start planning your usage.</p>
              </div>
            ) : (
              appliances.map(app => (
                <div key={app.id} className="bg-neutral-900/40 border border-white/10 rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-lg flex items-center gap-2">
                      {app.name}
                      {app.is_smart_device && (
                         <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] uppercase tracking-wider rounded-full border border-emerald-500/30">
                           Smart Connected
                         </span>
                      )}
                    </h3>
                    <p className="text-neutral-500 text-sm mt-1">{app.kw_rating} kW Power Draw</p>
                  </div>
                  
                  {!app.is_smart_device && (
                    <button 
                      onClick={() => handleConnectSmart(app.id)}
                      className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-sm transition-colors"
                    >
                      Connect to Smart Home
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
