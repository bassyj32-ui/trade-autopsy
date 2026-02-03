
import React, { useState } from 'react';
import { TradeInput, PropFirm, InferenceResult } from '../lib/types';
import { PROP_FIRM_RULES, ASSETS, LOT_SUGGESTIONS } from '../lib/constants';
import { ScreenshotUpload } from './ScreenshotUpload';
import { AlertTriangle, DollarSign, Activity, Skull, Calculator } from 'lucide-react';

interface TradeFormProps {
  onAnalyze: (input: TradeInput | InferenceResult, propFirm: PropFirm) => void;
}

export function TradeForm({ onAnalyze }: TradeFormProps) {
  const [formData, setFormData] = useState<TradeInput>({
    accountSize: 10000,
    asset: ASSETS[0].symbol,
    entryPrice: 0,
    stopLoss: 0,
    takeProfit: 0,
    positionSize: 0.1,
    leverage: 1,
    timeframe: '15m',
  });
  const [propFirm, setPropFirm] = useState<PropFirm>('None');
  const [detectedTrades, setDetectedTrades] = useState<Partial<TradeInput>[]>([]);
  const [batchData, setBatchData] = useState<InferenceResult | null>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);

  const selectedAssetType = ASSETS.find(a => a.symbol === formData.asset)?.type || 'forex';
  // Use keyof typeof LOT_SUGGESTIONS to ensure type safety
  const suggestionKey = (selectedAssetType === 'index' ? 'index' : selectedAssetType) as keyof typeof LOT_SUGGESTIONS;
  const suggestions = LOT_SUGGESTIONS[suggestionKey] || LOT_SUGGESTIONS['forex'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBatchMode && batchData) {
        // Pass the account size user entered into the batch data
        const enrichedBatchData = {
            ...batchData,
            accountSummary: {
                ...batchData.accountSummary,
                // We might want to pass accountSize explicitly if needed by analysis
            },
            // Hack: pass accountSize as a property on the object for the analyzer to pick up
            userAccountSize: formData.accountSize
        };
        onAnalyze(enrichedBatchData as unknown as InferenceResult & { userAccountSize: number }, propFirm);
    } else {
        onAnalyze(formData, propFirm);
    }
  };

  const handleOcrResult = (result: InferenceResult) => {
    console.log("[TradeForm] OCR Result received:", result);
    
    if (result.trades.length >= 5) {
        console.log("[TradeForm] Switching to Batch Mode (Account Level Autopsy)");
        setIsBatchMode(true);
        setBatchData(result);
        setDetectedTrades(result.trades);
        
        // AUTO-ANALYZE for Batch Mode as requested
        // We use default form data (10000 account size, None prop firm) if user hasn't touched them
        // But to be safe, we'll wait for user to confirm Account Size? 
        // User said: "Skip TradeForm entirely. Run account-level autopsy automatically"
        // So we should probably just GO.
        
        const enrichedBatchData = {
            ...result,
            userAccountSize: formData.accountSize // use current state (default 10000 or whatever user set)
        };
        
        // We need to call onAnalyze. But this is inside an async callback from upload.
        // Let's defer it slightly to allow state to settle or just call it directly.
        // Calling directly.
        onAnalyze(enrichedBatchData as unknown as InferenceResult & { userAccountSize: number }, propFirm);
        
    } else {
        setIsBatchMode(false);
        setBatchData(null);
        setDetectedTrades(result.trades);
        
        // Auto-fill first trade if available
        if (result.trades.length > 0) {
            console.log("[TradeForm] Single trade detected, auto-filling form");
            setFormData(prev => ({ ...prev, ...result.trades[0] }));
        }
    }
  };

  const loadTrade = (trade: Partial<TradeInput>) => {
      setFormData(prev => ({ ...prev, ...trade }));
      // Remove from list or keep? Keep for now so they can click another.
      // Maybe scroll to form?
      // window.scrollTo({ top: 500, behavior: 'smooth' });
  };

  return (
    <div className="w-full bg-card border border-border rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in duration-500">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Activity className="text-red-500" />
            Input Trade Details
          </h2>
          
          <ScreenshotUpload onResult={handleOcrResult} />

          {detectedTrades.length > 0 && (
              <div className="bg-muted/30 p-4 rounded-lg border border-muted animate-in fade-in slide-in-from-top-4 mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold uppercase text-muted-foreground">
                        {isBatchMode ? `Account Activity (${detectedTrades.length} Trades)` : `Detected Trades (${detectedTrades.length})`}
                    </h3>
                    <button onClick={() => {
                        setDetectedTrades([]);
                        setBatchData(null);
                        setIsBatchMode(false);
                    }} className="text-xs text-red-500 hover:underline">Clear</button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                      {detectedTrades.map((trade, i) => (
                          <div 
                            key={i} 
                            onClick={() => !isBatchMode && loadTrade(trade)}
                            className={`flex items-center justify-between p-3 bg-card border border-border rounded-md transition-all group ${!isBatchMode ? 'hover:border-red-500 cursor-pointer hover:shadow-md' : ''}`}
                          >
                              <div className="flex flex-col">
                                  <span className="font-bold text-sm">{trade.asset || 'Unknown'}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {trade.positionSize ? `${trade.positionSize} lots` : 'Size?'} • {trade.entryPrice ? `@ ${trade.entryPrice}` : 'Price?'}
                                  </span>
                              </div>
                              <div className="text-right">
                                  {trade.lossAmount && (
                                      <span className={`block font-mono font-bold text-sm ${trade.lossAmount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                          {trade.lossAmount < 0 ? '-' : '+'}${Math.abs(trade.lossAmount)}
                                      </span>
                                  )}
                                  {!isBatchMode && (
                                    <span className="text-[10px] text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        Click to Load
                                    </span>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                {isBatchMode ? 'Account Settings' : (detectedTrades.length > 0 ? 'Or enter manually' : 'Enter Trade Details')}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isBatchMode && batchData?.accountSummary && (
                <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="text-center">
                        <span className="text-xs text-muted-foreground uppercase">Net PnL</span>
                        <p className={`text-xl font-bold ${batchData.accountSummary.netPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ${batchData.accountSummary.netPnl.toFixed(2)}
                        </p>
                    </div>
                    <div className="text-center">
                        <span className="text-xs text-muted-foreground uppercase">Win Rate</span>
                        <p className="text-xl font-bold text-foreground">
                            {batchData.accountSummary.winRate.toFixed(1)}%
                        </p>
                    </div>
                    <div className="col-span-2 text-center">
                         <button 
                            type="submit"
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all animate-pulse"
                         >
                            RUN AUTOPSY NOW
                         </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account Size</label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="number"
                    value={formData.accountSize}
                    onChange={e => setFormData({ ...formData, accountSize: Number(e.target.value) })}
                    className="w-full bg-muted border-none rounded-lg py-2 pl-9 pr-4 text-foreground focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Prop Firm</label>
                <select
                  value={propFirm}
                  onChange={e => setPropFirm(e.target.value as PropFirm)}
                  className="w-full mt-1 bg-muted border-none rounded-lg py-2 px-4 text-foreground focus:ring-2 focus:ring-red-500"
                >
                  {Object.keys(PROP_FIRM_RULES).map(firm => (
                    <option key={firm} value={firm}>{firm}</option>
                  ))}
                </select>
              </div>
            </div>

            {!isBatchMode && (
                <>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Asset</label>
                      <select
                        value={formData.asset}
                        onChange={e => setFormData({ ...formData, asset: e.target.value })}
                        className="w-full mt-1 bg-muted border-none rounded-lg py-2 px-4 text-foreground focus:ring-2 focus:ring-red-500"
                        required
                      >
                        <optgroup label="Forex">
                            {ASSETS.filter(a => a.type === 'forex').map(a => <option key={a.symbol} value={a.symbol}>{a.symbol}</option>)}
                        </optgroup>
                        <optgroup label="Crypto">
                            {ASSETS.filter(a => a.type === 'crypto').map(a => <option key={a.symbol} value={a.symbol}>{a.symbol}</option>)}
                        </optgroup>
                        <optgroup label="Indices">
                            {ASSETS.filter(a => a.type === 'index').map(a => <option key={a.symbol} value={a.symbol}>{a.symbol}</option>)}
                        </optgroup>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Entry Price</label>
                        <input
                          type="number"
                          step="0.00001"
                          value={formData.entryPrice}
                          onChange={e => setFormData({ ...formData, entryPrice: Number(e.target.value) })}
                          className="w-full mt-1 bg-muted border-none rounded-lg py-2 px-4 text-foreground focus:ring-2 focus:ring-red-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Position Size (Lots)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.positionSize}
                          onChange={e => setFormData({ ...formData, positionSize: Number(e.target.value) })}
                          className="w-full mt-1 bg-muted border-none rounded-lg py-2 px-4 text-foreground focus:ring-2 focus:ring-red-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Stop Loss</label>
                        <input
                          type="number"
                          step="0.00001"
                          value={formData.stopLoss}
                          onChange={e => setFormData({ ...formData, stopLoss: Number(e.target.value) })}
                          className="w-full mt-1 bg-muted border-none rounded-lg py-2 px-4 text-foreground focus:ring-2 focus:ring-red-500"
                          // Not required if we have lossAmount (heuristic)
                          required={!formData.lossAmount}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Take Profit</label>
                        <input
                          type="number"
                          step="0.00001"
                          value={formData.takeProfit}
                          onChange={e => setFormData({ ...formData, takeProfit: Number(e.target.value) })}
                          className="w-full mt-1 bg-muted border-none rounded-lg py-2 px-4 text-foreground focus:ring-2 focus:ring-red-500"
                          // Not required if we have lossAmount
                          required={!formData.lossAmount}
                        />
                      </div>
                    </div>
                </>
            )}

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <Skull className="w-5 h-5" />
              {isBatchMode ? 'CONFIRM BATCH AUTOPSY' : 'PERFORM AUTOPSY'}
            </button>
          </form>
        </div>

        <div className="hidden md:block w-80 space-y-6">
            {/* Sidebar content... maybe tips or lot size calc? */}
             <div className="bg-muted/30 p-4 rounded-lg border border-muted">
                <h3 className="text-sm font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Standard Lots
                </h3>
                <div className="space-y-2">
                    {Object.entries(suggestions).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                            <span className="text-muted-foreground capitalize">{key}</span>
                            <span className="font-mono">{value}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20">
                <h3 className="text-sm font-bold uppercase text-yellow-500 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Warning
                </h3>
                <p className="text-xs text-muted-foreground">
                    Trading involves substantial risk of loss. 
                    {isBatchMode ? ' analyzing multiple trades allows us to detect behavioral patterns like overtrading and revenge trading.' : ' Most traders lose money because they do not understand leverage.'}
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
