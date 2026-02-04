import React, { useState, useMemo } from 'react';
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

  // Derived data
  const selectedAssetType = useMemo(
    () => ASSETS.find(a => a.symbol === formData.asset)?.type || 'forex',
    [formData.asset]
  );
  const suggestionKey = useMemo(
    () => (selectedAssetType === 'index' ? 'index' : selectedAssetType) as keyof typeof LOT_SUGGESTIONS,
    [selectedAssetType]
  );
  const suggestions = useMemo(
    () => LOT_SUGGESTIONS[suggestionKey] || LOT_SUGGESTIONS['forex'],
    [suggestionKey]
  );

  const firmRules = PROP_FIRM_RULES[propFirm] || { maxRiskPerTrade: 0.02, maxPositionSize: 1, maxDailyLoss: 0.05, allowedAssets: ASSETS.map(a => a.symbol) };

  // Optimal lot calculation
  const optimalLot = useMemo(() => {
    if (formData.entryPrice && formData.stopLoss && formData.entryPrice !== formData.stopLoss) {
      const riskPerTradeUSD = formData.accountSize * firmRules.maxRiskPerTrade;
      return Number((riskPerTradeUSD / Math.abs(formData.entryPrice - formData.stopLoss)).toFixed(2));
    }
    return 0;
  }, [formData.accountSize, formData.entryPrice, formData.stopLoss, firmRules.maxRiskPerTrade]);

  // Warning checks
  const warnings = useMemo(() => {
    const ws: string[] = [];
    if (!firmRules.allowedAssets.includes(formData.asset)) ws.push(`${formData.asset} is not allowed by ${propFirm}`);
    if (formData.positionSize > firmRules.maxPositionSize) ws.push(`Position exceeds max lot size (${firmRules.maxPositionSize})`);
    if (optimalLot && formData.positionSize > optimalLot) ws.push(`Position exceeds calculated optimal lot (${optimalLot})`);
    return ws;
  }, [formData.asset, formData.positionSize, optimalLot, firmRules, propFirm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBatchMode && batchData) {
      const enrichedBatchData = {
        ...batchData,
        accountSummary: { ...batchData.accountSummary },
        userAccountSize: formData.accountSize,
      };
      onAnalyze(enrichedBatchData as unknown as InferenceResult & { userAccountSize: number }, propFirm);
    } else {
      onAnalyze(formData, propFirm);
    }
  };

  const handleOcrResult = (result: InferenceResult) => {
    if (result.trades.length >= 5) {
      setIsBatchMode(true);
      setBatchData(result);
      setDetectedTrades(result.trades);

      const enrichedBatchData = { ...result, userAccountSize: formData.accountSize };
      onAnalyze(enrichedBatchData as unknown as InferenceResult & { userAccountSize: number }, propFirm);
    } else {
      setIsBatchMode(false);
      setBatchData(null);
      setDetectedTrades(result.trades);
      if (result.trades.length > 0) setFormData(prev => ({ ...prev, ...result.trades[0] }));
    }
  };

  const loadTrade = (trade: Partial<TradeInput>) => {
    setFormData(prev => ({ ...prev, ...trade }));
  };

  return (
    <div className="w-full bg-card border border-border rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in duration-500">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Activity className="text-red-500" />
            Input Trade Details
          </h2>

          <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-lg border border-border">
            <div>
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Account Size</label>
              <div className="relative mt-2">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="number"
                  value={formData.accountSize}
                  onChange={e => setFormData({ ...formData, accountSize: Number(e.target.value) })}
                  className="w-full bg-background border border-input rounded-lg py-2 pl-9 pr-4 text-foreground focus:ring-2 focus:ring-red-500 font-mono font-bold"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Prop Firm</label>
              <div className="relative mt-2">
                <select
                  value={propFirm}
                  onChange={e => setPropFirm(e.target.value as PropFirm)}
                  className="w-full bg-background border border-input rounded-lg py-2 px-4 text-foreground focus:ring-2 focus:ring-red-500 font-bold appearance-none"
                >
                  {Object.keys(PROP_FIRM_RULES).map(firm => (
                    <option key={firm} value={firm}>{firm}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none">
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          </div>

          <ScreenshotUpload onResult={handleOcrResult} />

          {warnings.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-700">
              <p className="font-bold mb-1">Warning(s):</p>
              {warnings.map((w, i) => <p key={i}>• {w}</p>)}
            </div>
          )}

          {detectedTrades.length > 0 && (
            <div className="bg-muted/30 p-4 rounded-lg border border-muted animate-in fade-in slide-in-from-top-4 mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold uppercase text-muted-foreground">
                  {isBatchMode ? `Account Activity (${detectedTrades.length} Trades)` : `Detected Trades (${detectedTrades.length})`}
                </h3>
                <button onClick={() => { setDetectedTrades([]); setBatchData(null); setIsBatchMode(false); }} className="text-xs text-red-500 hover:underline">Clear</button>
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
                        <span className="text-[10px] text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">Click to Load</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                      required={!formData.lossAmount}
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Optimal lot based on {propFirm} rules: <span className="font-bold">{optimalLot}</span>
                </p>
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
              {isBatchMode ? ' Analyzing multiple trades allows detection of overtrading and revenge trading patterns.' : ' Most traders lose money if they do not understand leverage and risk.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
