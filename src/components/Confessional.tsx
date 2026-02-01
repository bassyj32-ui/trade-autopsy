import { useState, useEffect } from 'react';
import { supabase, Confession } from '../lib/supabase';
import { MessageSquare, Send } from 'lucide-react';

export function Confessional() {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [message, setMessage] = useState('');
  const [lossAmount, setLossAmount] = useState('');
  const [asset, setAsset] = useState('');
  const [loading, setLoading] = useState(true);

  // Initial load (mock data if no supabase connection yet)
  useEffect(() => {
    fetchConfessions();
  }, []);

  const fetchConfessions = async () => {
    setLoading(true);
    // Try to fetch from Supabase
    const { data, error } = await supabase
      .from('confessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data) {
        // Fallback to local mock data for MVP demo if Supabase fails (e.g. no keys)
        console.warn("Supabase fetch failed (expected if no keys), using mock data");
        setConfessions([
            { id: '1', created_at: new Date().toISOString(), message: "Blew my funded account on NFP news. Slippage killed me.", loss_amount: 5000, asset: "XAUUSD" },
            { id: '2', created_at: new Date(Date.now() - 86400000).toISOString(), message: "Thought Bitcoin was going to 100k yesterday.", loss_amount: 1200, asset: "BTCUSD" },
            { id: '3', created_at: new Date(Date.now() - 172800000).toISOString(), message: "Revenge traded until I hit max daily loss.", loss_amount: 2500, asset: "US30" },
        ]);
    } else {
        setConfessions(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message || !lossAmount) return;

    const newConfession = {
        message,
        loss_amount: parseFloat(lossAmount),
        asset: asset || 'Unknown',
    };

    // Optimistic update
    const tempId = Math.random().toString(36).substring(7);
    const optimisticConfession = { 
        id: tempId, 
        created_at: new Date().toISOString(), 
        ...newConfession 
    };
    
    setConfessions([optimisticConfession, ...confessions]);
    setMessage('');
    setLossAmount('');
    setAsset('');

    // Send to Supabase
    const { error } = await supabase.from('confessions').insert([newConfession]);
    
    if (error) {
        console.error("Failed to post confession:", error);
        // Ideally show error toast, but keeping it simple for MVP
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg text-slate-300">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4">
            <MessageSquare className="w-6 h-6 text-yellow-500" />
            <h2 className="text-xl font-bold text-white uppercase tracking-wider">Trader's Confessional</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form */}
            <div>
                <p className="text-sm text-slate-500 mb-4">
                    Forgive yourself by admitting your sins. Anonymous. Permanent.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Asset Traded</label>
                        <input 
                            type="text" 
                            placeholder="e.g. XAUUSD"
                            value={asset}
                            onChange={(e) => setAsset(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 p-2 text-white text-sm focus:outline-none focus:border-yellow-600"
                        />
                    </div>
                    <div>
                        <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Amount Lost ($)</label>
                        <input 
                            type="number" 
                            placeholder="e.g. 1000"
                            value={lossAmount}
                            onChange={(e) => setLossAmount(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 p-2 text-white text-sm focus:outline-none focus:border-yellow-600"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Confession</label>
                        <textarea 
                            placeholder="I moved my stop loss..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 p-2 text-white text-sm focus:outline-none focus:border-yellow-600 h-24"
                            required
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-2 px-4 uppercase text-sm transition-colors flex items-center justify-center gap-2"
                    >
                        <Send className="w-4 h-4" />
                        Confess Sin
                    </button>
                </form>
            </div>

            {/* Feed */}
            <div className="h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 sticky top-0 bg-slate-900 py-2">Recent Sins</h3>
                <div className="space-y-4">
                    {confessions.map((c) => (
                        <div key={c.id} className="bg-slate-950 p-4 border-l-2 border-slate-700 hover:border-yellow-600 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-mono text-slate-500">{new Date(c.created_at).toLocaleDateString()}</span>
                                <span className="text-xs font-mono text-red-500">-${c.loss_amount}</span>
                            </div>
                            <p className="text-sm text-slate-300 italic">"{c.message}"</p>
                            {c.asset && <span className="inline-block mt-2 text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-500">{c.asset}</span>}
                        </div>
                    ))}
                    {loading && <div className="text-center text-xs text-slate-500">Loading sins...</div>}
                </div>
            </div>
        </div>
    </div>
  );
}
