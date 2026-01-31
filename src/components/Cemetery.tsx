
import { AnalysisResult } from '../lib/types';
import { formatDistanceToNow } from 'date-fns';

interface CemeteryProps {
  history: AnalysisResult[];
  onSelect: (result: AnalysisResult) => void;
}

export function Cemetery({ history, onSelect }: CemeteryProps) {
  return (
    <div className="w-full">
        <h3 className="text-xl font-bold text-center mb-6 text-muted-foreground uppercase tracking-widest">The Cemetery</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {history.map((item) => (
                <div 
                    key={item.id} 
                    onClick={() => onSelect(item)}
                    className="cursor-pointer group relative bg-card border border-border hover:border-red-500/50 rounded-t-full p-6 pt-12 text-center transition-all hover:-translate-y-1 tombstone-bg"
                >
                    <div className="text-2xl font-bold text-muted-foreground group-hover:text-foreground transition-colors">{item.asset}</div>
                    <div className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(item.date))} ago</div>
                    <div className="mt-4 text-red-500 font-bold text-sm uppercase">{item.causeOfDeath}</div>
                    <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-muted to-transparent opacity-50" />
                </div>
            ))}
        </div>
    </div>
  );
}
