import { useRef } from 'react';
import { AnalysisResult } from '../lib/types';
import html2canvas from 'html2canvas';
import { Download, RotateCcw, Skull } from 'lucide-react';

interface AutopsyReportProps {
  result: AnalysisResult;
  onReset: () => void;
}

export function AutopsyReport({ result, onReset }: AutopsyReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#f3f4f6', // Paper color for the download
        scale: 2, // High res
        useCORS: true,
    });
    const link = document.createElement('a');
    link.download = `coroner-report-${result.id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Determine Stamp Text based on cause
  const getStamp = (cause: string) => {
      const c = cause.toLowerCase();
      if (c.includes('leverage')) return 'MARGIN CALLED';
      if (c.includes('stop')) return 'HUNTED';
      if (c.includes('size')) return 'FAT FINGER';
      if (c.includes('emotional')) return 'WEAK HANDS';
      return 'LIQUIDATED';
  };

  const stampText = getStamp(result.causeOfDeath);

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
        {/* The Certificate Container */}
        <div 
            ref={reportRef} 
            className="bg-[#f3f4f6] text-slate-900 p-8 md:p-12 relative overflow-hidden shadow-2xl font-serif min-h-[800px] flex flex-col"
            style={{
                backgroundImage: 'url("https://www.transparenttextures.com/patterns/aged-paper.png")',
                backgroundBlendMode: 'multiply'
            }}
        >
            {/* Watermark/Background texture simulation */}
            <div className="absolute inset-0 border-[12px] border-double border-slate-800 pointer-events-none z-20"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-contain bg-no-repeat bg-center opacity-5 pointer-events-none z-0" style={{ backgroundImage: 'url("/skull-icon.png")' }}></div>

            {/* Header */}
            <div className="text-center border-b-4 border-slate-900 pb-6 mb-8 relative z-10">
                <div className="flex justify-between items-end mb-4 text-xs font-mono text-slate-600 uppercase">
                    <span>Case #: {result.id.slice(0, 8)}</span>
                    <span>Date: {new Date().toLocaleDateString()}</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-slate-900 mb-2 flex items-center justify-center gap-4">
                    <Skull className="w-10 h-10" />
                    Coroner's Report
                    <Skull className="w-10 h-10" />
                </h1>
                <p className="text-sm font-bold tracking-[0.2em] text-slate-600 uppercase">Department of Trading Failures • Morgue Unit 007</p>
            </div>

            {/* Subject Details */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8 border-b-2 border-slate-300 pb-8 relative z-10">
                <div className="col-span-2 md:col-span-1">
                    <span className="block text-xs font-bold uppercase text-slate-500 mb-1">Deceased Asset</span>
                    <div className="text-2xl font-bold font-mono border-b border-slate-400 pb-1">{result.asset}</div>
                </div>
                <div className="col-span-2 md:col-span-1">
                    <span className="block text-xs font-bold uppercase text-slate-500 mb-1">Account Size</span>
                    <div className="text-2xl font-bold font-mono border-b border-slate-400 pb-1">${result.accountSize.toLocaleString()}</div>
                </div>
                <div className="col-span-2 md:col-span-1">
                    <span className="block text-xs font-bold uppercase text-slate-500 mb-1">Est. Financial Trauma</span>
                    <div className="text-2xl font-bold font-mono text-red-700 border-b border-slate-400 pb-1">-${Math.abs(result.lossAmount).toLocaleString()}</div>
                </div>
                <div className="col-span-2 md:col-span-1">
                    <span className="block text-xs font-bold uppercase text-slate-500 mb-1">Risk Exposure</span>
                    <div className="text-2xl font-bold font-mono border-b border-slate-400 pb-1">{result.riskPercentage.toFixed(2)}%</div>
                </div>
            </div>

            {/* Cause of Death Section */}
            <div className="mb-8 relative z-10">
                <h3 className="text-lg font-black uppercase bg-slate-900 text-white px-2 py-1 inline-block mb-4">Official Cause of Death</h3>
                <div className="border-l-4 border-red-700 pl-6 py-2">
                    <div className="text-4xl font-black text-red-800 uppercase leading-none mb-2">{result.causeOfDeath}</div>
                    <div className="text-sm font-mono text-slate-600">
                        Primary Factor: <span className="font-bold">{result.propFirmViolation ? 'PROP FIRM VIOLATION' : 'TRADER INCOMPETENCE'}</span>
                    </div>
                </div>
            </div>

            {/* Verdict/Notes */}
            <div className="mb-8 relative z-10 flex-grow">
                <h3 className="text-lg font-black uppercase bg-slate-900 text-white px-2 py-1 inline-block mb-4">Coroner's Verdict</h3>
                <div className="font-mono text-sm md:text-base leading-relaxed p-6 bg-slate-200/50 border border-slate-300 rounded-sm relative">
                    <p className="mb-4">"{result.verdict}"</p>
                    <div className="space-y-2 mt-6">
                        <p className="font-bold underline text-xs uppercase text-slate-500">Corrective Measures (If Resuscitated):</p>
                        <ul className="list-disc list-inside text-xs md:text-sm">
                            {result.fix.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                    </div>
                    
                    {/* The Stamp */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform -rotate-12 border-[6px] border-red-700 text-red-700 font-black text-6xl md:text-8xl p-4 opacity-30 select-none whitespace-nowrap pointer-events-none z-50">
                        {stampText}
                    </div>
                </div>
            </div>

            {/* Footer Signatures */}
            <div className="mt-auto pt-8 flex justify-between items-end relative z-10">
                <div className="text-center">
                    <div className="font-script text-2xl text-slate-800 mb-1 -rotate-2" style={{ fontFamily: 'cursive' }}>Market Maker</div>
                    <div className="border-t border-slate-900 w-40 mx-auto"></div>
                    <div className="text-[10px] uppercase font-bold mt-1">Chief Coroner</div>
                </div>
                
                <div className="text-center opacity-50">
                    <div className="font-script text-xl text-slate-800 mb-1 rotate-1" style={{ fontFamily: 'cursive' }}>R.I.P.</div>
                    <div className="border-t border-slate-900 w-40 mx-auto"></div>
                    <div className="text-[10px] uppercase font-bold mt-1">Witness</div>
                </div>
            </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center print:hidden">
            <button onClick={onReset} className="flex items-center justify-center gap-2 px-6 py-3 bg-muted hover:bg-muted/80 rounded-lg font-bold transition-colors text-foreground">
                <RotateCcw className="w-5 h-5" /> Analyze Another
            </button>
            <button onClick={handleDownload} className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg shadow-red-900/20 transition-all hover:scale-105">
                <Download className="w-5 h-5" /> Download Certificate
            </button>
        </div>
    </div>
  );
}

