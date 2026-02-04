import { Target, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import { AnalysisResult } from '../lib/types';

interface TraderProfileProps {
  history: AnalysisResult[];
}

export function TraderProfile({ history }: TraderProfileProps) {
  if (history.length === 0) return null;

  // 1. Basic Stats
  const wins = history.filter(h => (h.lossAmount || 0) > 0);
  const losses = history.filter(h => (h.lossAmount || 0) <= 0);
  const winRate = Math.round((wins.length / history.length) * 100);
  
  const avgRisk = history.reduce((acc, curr) => acc + curr.riskPercentage, 0) / history.length;
  
  // 2. Profit Factor (Gross Win / Gross Loss)
  const grossWin = wins.reduce((acc, curr) => acc + (curr.lossAmount || 0), 0);
  const grossLoss = Math.abs(losses.reduce((acc, curr) => acc + (curr.lossAmount || 0), 0));
  const profitFactor = grossLoss === 0 ? grossWin : (grossWin / grossLoss).toFixed(2);

  // 3. Tilt Detection (Consecutive Losses)
  let currentStreak = 0;
  let maxLossStreak = 0;
  history.forEach(h => {
    if ((h.lossAmount || 0) < 0) {
      currentStreak++;
      maxLossStreak = Math.max(maxLossStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });

  // Simple "Tilt Score" (0-100)
  const tiltScore = Math.min(100, (maxLossStreak > 2 ? (maxLossStreak - 2) * 20 : 0) + (avgRisk > 2 ? 30 : 0));

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Trader DNA
          </h2>
          <p className="text-zinc-400 text-sm">Based on last {history.length} trades</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          avgRisk > 2 ? 'bg-red-500/10 text-red-400' : 
          avgRisk < 1 ? 'bg-green-500/10 text-green-400' : 
          'bg-yellow-500/10 text-yellow-400'
        }`}>
          {avgRisk > 2 ? 'High Risk' : avgRisk < 1 ? 'Conservative' : 'Balanced'}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-500 mb-2">
            <Target className="w-4 h-4" />
            <span className="text-xs font-medium">Win Rate</span>
          </div>
          <div className="text-2xl font-bold text-white">{winRate}%</div>
        </div>

        <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-500 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Profit Factor</span>
          </div>
          <div className={`text-2xl font-bold ${Number(profitFactor) > 1.5 ? 'text-green-400' : 'text-zinc-200'}`}>
            {profitFactor}
          </div>
        </div>

        <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-500 mb-2">
            <TrendingDown className="w-4 h-4" />
            <span className="text-xs font-medium">Tilt Risk</span>
          </div>
          <div className={`text-2xl font-bold ${tiltScore > 50 ? 'text-red-400' : 'text-green-400'}`}>
            {tiltScore}%
          </div>
        </div>

        <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-500 mb-2">
            <Zap className="w-4 h-4" />
            <span className="text-xs font-medium">Avg Risk</span>
          </div>
          <div className="text-2xl font-bold text-white">{avgRisk.toFixed(1)}%</div>
        </div>
      </div>

      {tiltScore > 30 && (
        <div className="mt-6 p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
          <h3 className="text-red-400 font-medium mb-2 flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />
            Psychological Analysis
          </h3>
          <ul className="space-y-1 text-sm text-zinc-400">
            {maxLossStreak > 2 && (
              <li>• High consecutive loss streak detected ({maxLossStreak}). Take a break.</li>
            )}
            {avgRisk > 2 && (
              <li>• Risk per trade is dangerously high ({avgRisk.toFixed(1)}%). Lower position sizing.</li>
            )}
            {tiltScore > 70 && (
              <li className="text-red-300 font-bold">• CRITICAL: You are likely revenge trading. Stop now.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
