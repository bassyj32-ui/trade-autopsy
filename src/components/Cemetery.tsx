
import { AnalysisResult } from '../lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Skull } from 'lucide-react';

interface CemeteryProps {
  history: AnalysisResult[];
  onSelect: (result: AnalysisResult) => void;
}

export function Cemetery({ history, onSelect }: CemeteryProps) {
  return (
    <div className="w-full">
        <h3 className="text-xl font-bold text-center mb-6 text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-2">
            <Skull className="w-5 h-5" />
            The Cemetery
            <Skull className="w-5 h-5" />
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 px-4">
            {history.map((item) => (
                <div 
                    key={item.id} 
                    onClick={() => onSelect(item)}
                    className="cursor-pointer group relative bg-stone-800 border-4 border-stone-700 hover:border-red-600 rounded-t-[50%] p-4 pt-10 pb-6 text-center transition-all hover:-translate-y-2 shadow-xl flex flex-col items-center"
                    style={{
                        backgroundImage: 'url("https://www.transparenttextures.com/patterns/concrete-wall.png")',
                    }}
                >
                    <div className="text-stone-500 font-serif text-xs mb-2 tracking-widest uppercase">R.I.P.</div>
                    
                    <div className="text-xl font-black text-stone-300 group-hover:text-white transition-colors uppercase tracking-tight">
                        {item.asset}
                    </div>
                    
                    <div className="text-[10px] text-stone-500 mt-1 mb-4 font-mono">
                        {formatDistanceToNow(new Date(item.date))} ago
                    </div>
                    
                    <div className="mt-auto w-full border-t border-stone-700 pt-3">
                         <div className="text-red-500 font-bold text-xs uppercase leading-tight line-clamp-2">
                            {item.causeOfDeath}
                         </div>
                    </div>

                    {/* Cracks / Weathering effects */}
                    <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-stone-600 rounded-full opacity-20"></div>
                </div>
            ))}
        </div>
    </div>
  );
}
