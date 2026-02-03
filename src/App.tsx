import { useState, useEffect } from 'react'
import { TradeForm } from './components/TradeForm'
import { AutopsyReport } from './components/AutopsyReport'
import { Cemetery } from './components/Cemetery'
import { Confessional } from './components/Confessional'
// import { RecommendedFirms } from './components/RecommendedFirms'
import { TradeInput, AnalysisResult, PropFirm, InferenceResult } from './lib/types'
import { analyzeTrade } from './lib/analysis'
import { Skull, Youtube, PlayCircle } from 'lucide-react'
import { YOUTUBE_CHANNEL_URL, YOUTUBE_FEATURED_VIDEO_URL } from './lib/constants'

function App() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('trade-autopsy-history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  const handleAnalyze = (input: TradeInput | InferenceResult, propFirm: PropFirm) => {
    // Cast to any to satisfy the complex union type requirement of analyzeTrade
    // which expects TradeInput | (InferenceResult & { userAccountSize: number })
    // The TradeForm guarantees the structure is correct before calling this.
    const res = analyzeTrade(input as any, propFirm);
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
        
        {/* New Confessional Section */}
        <Confessional />

        {/* Affiliate / Prop Firm Section - Hidden until user has links */}
        {/* <RecommendedFirms /> */}

        {/* Education Section */}
        <div className="w-full bg-zinc-900/50 border border-zinc-800 p-8 rounded-lg text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-red-600/10 p-4 rounded-full">
              <Youtube className="w-12 h-12 text-red-600" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white uppercase tracking-wider">Educate Yourself</h2>
            <p className="text-zinc-400 max-w-lg mx-auto">
              Stop guessing and start learning. Watch this breakdown to stop blowing accounts, and check out the channel for more.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href={YOUTUBE_FEATURED_VIDEO_URL} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-105"
            >
              <PlayCircle className="w-5 h-5" />
              Watch Featured Video
            </a>
            
            <a 
              href={YOUTUBE_CHANNEL_URL} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-3 px-6 rounded-lg transition-all"
            >
              <Youtube className="w-5 h-5" />
              Visit Channel
            </a>
          </div>
        </div>
      </main>

      <footer className="mt-16 text-center text-muted-foreground text-sm">
        <p>Built for traders who hate money. 💀</p>
      </footer>
    </div>
  )
}

export default App
