import { useState, useEffect } from 'react'
import { TradeForm } from './components/TradeForm'
import { AutopsyReport } from './components/AutopsyReport'
import { Cemetery } from './components/Cemetery'
import { TradeInput, AnalysisResult, PropFirm } from './lib/types'
import { analyzeTrade } from './lib/analysis'
import { Skull } from 'lucide-react'

function App() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('trade-autopsy-history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  const handleAnalyze = (input: TradeInput, propFirm: PropFirm) => {
    const res = analyzeTrade(input, propFirm);
    setResult(res);
    const newHistory = [res, ...history].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem('trade-autopsy-history', JSON.stringify(newHistory));
  };

  const handleClear = () => {
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 flex flex-col items-center">
      <header className="mb-8 text-center">
        <h1 className="text-4xl md:text-6xl font-black text-red-600 tracking-tighter flex items-center justify-center gap-4">
          <Skull className="w-12 h-12 md:w-16 md:h-16" />
          TRADE AUTOPSY
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">Find out what really killed your trade.</p>
      </header>

      <main className="w-full max-w-4xl space-y-12">
        {!result ? (
          <TradeForm onAnalyze={handleAnalyze} />
        ) : (
          <AutopsyReport result={result} onReset={handleClear} />
        )}

        {history.length > 0 && <Cemetery history={history} onSelect={setResult} />}
      </main>

      <footer className="mt-16 text-center text-muted-foreground text-sm">
        <p>Built for traders who hate money. 💀</p>
      </footer>
    </div>
  )
}

export default App
