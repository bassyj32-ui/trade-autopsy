import { AFFILIATE_LINKS } from '../lib/constants';
import { ExternalLink, Trophy, ShieldCheck } from 'lucide-react';

export function RecommendedFirms() {
  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white uppercase tracking-wider flex items-center justify-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          Where to Trade
        </h2>
        <p className="text-zinc-400 max-w-lg mx-auto text-sm">
          Don't lose your own money. Use theirs. Here are the firms I trust.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {AFFILIATE_LINKS.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`
              relative group flex flex-col p-6 rounded-lg border transition-all duration-300 hover:-translate-y-1
              ${link.recommended 
                ? 'bg-zinc-900/80 border-red-900/50 hover:border-red-600/50 shadow-lg shadow-red-900/10' 
                : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
              }
            `}
          >
            {link.recommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <ShieldCheck className="w-3 h-3" />
                TOP PICK
              </div>
            )}

            <div className="mb-4">
              <h3 className={`text-lg font-bold ${link.recommended ? 'text-white' : 'text-zinc-200'}`}>
                {link.name}
              </h3>
            </div>
            
            <p className="text-zinc-400 text-sm flex-grow mb-6 leading-relaxed">
              {link.description}
            </p>

            <div className={`
              mt-auto flex items-center justify-between text-sm font-semibold
              ${link.recommended ? 'text-red-400 group-hover:text-red-300' : 'text-zinc-500 group-hover:text-zinc-300'}
            `}>
              <span>Get Funded</span>
              <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
