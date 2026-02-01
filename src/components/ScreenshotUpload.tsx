import React, { useState } from 'react';
import Tesseract from 'tesseract.js';
import { Upload, Loader2, Bot, ScanText } from 'lucide-react';
import { TradeInput } from '../lib/types';
import { analyzeImageWithGemini } from '../lib/gemini';

interface ScreenshotUploadProps {
  onResult: (data: Partial<TradeInput>[]) => void;
}

export function ScreenshotUpload({ onResult }: ScreenshotUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'ocr' | 'ai'>('ocr');
  const [apiKey, setApiKey] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      if (mode === 'ai') {
        if (!apiKey) {
            throw new Error("Please enter a Google Gemini API Key first.");
        }
        const result = await analyzeImageWithGemini(file, apiKey);
        console.log("Gemini Result:", result);
        if (result.trades && result.trades.length > 0) {
            onResult(result.trades);
        } else {
            setError("AI couldn't find any trades. " + result.feedback);
        }
      } else {
        // OCR Mode
        const { data: { text } } = await Tesseract.recognize(
            file,
            'eng',
            { logger: m => console.log(m) }
        );
        
        console.log("OCR Text:", text);
        const extracted = parseTradeText(text);
        if (extracted.length === 0) {
            setError("No trades detected. Try a clearer screenshot or use AI mode.");
        } else {
            onResult(extracted);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze screenshot.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Mode Selection */}
      <div className="flex gap-2 justify-center">
        <button
            onClick={() => setMode('ocr')}
            className={`px-4 py-2 text-xs font-bold uppercase border rounded flex items-center gap-2 ${mode === 'ocr' ? 'bg-slate-800 text-white border-slate-600' : 'bg-transparent text-slate-500 border-slate-800 hover:border-slate-600'}`}
        >
            <ScanText className="w-4 h-4" />
            Basic OCR (Free)
        </button>
        <button
            onClick={() => setMode('ai')}
            className={`px-4 py-2 text-xs font-bold uppercase border rounded flex items-center gap-2 ${mode === 'ai' ? 'bg-purple-900 text-white border-purple-700' : 'bg-transparent text-slate-500 border-slate-800 hover:border-slate-600'}`}
        >
            <Bot className="w-4 h-4" />
            AI Analysis (Gemini)
        </button>
      </div>

      {/* API Key Input for AI Mode */}
      {mode === 'ai' && (
        <div className="bg-slate-900 p-3 rounded border border-purple-900/50">
            <input 
                type="password" 
                placeholder="Paste Google Gemini API Key" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-2 text-white text-xs focus:outline-none focus:border-purple-600 rounded"
            />
            <p className="text-[10px] text-slate-500 mt-1">
                Get a free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">Google AI Studio</a>. stored locally only.
            </p>
        </div>
      )}

      <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${loading ? 'bg-slate-900 border-slate-700' : 'border-slate-700 hover:bg-slate-800'}`}>
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {loading ? (
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          ) : (
            <Upload className={`w-8 h-8 mb-2 ${mode === 'ai' ? 'text-purple-500' : 'text-slate-500'}`} />
          )}
          <p className="text-sm text-slate-400">
            {loading ? (mode === 'ai' ? "AI is roasting your trade..." : "Extracting data...") : "Upload Screenshot"}
          </p>
        </div>
        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={loading} />
      </label>
      {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
    </div>
  );
}

function parseTradeText(text: string): Partial<TradeInput>[] {
  const lines = text.split('\n');
  const trades: Partial<TradeInput>[] = [];
  
  // Regex patterns
  const assetRegex = /\b([A-Z]{3}[\/]?[A-Z]{3}|BTCUSDT|ETHUSDT|XAUUSD|US30|NAS100)\b/i;
  const volumeRegex = /\b(0\.\d{1,2}|[1-9]\d*\.?\d*)\b/; // Matches 0.01, 1.0, 10
  
  // Iterate lines to find trade rows
  // Assumption: A single line often contains Asset + Type + Volume in history views
  // OR standard MT4/5 format
  
  for (const line of lines) {
      const assetMatch = line.match(assetRegex);
      if (!assetMatch) continue;

      const volumeMatch = line.match(volumeRegex);
      
      // Look for numbers that might be prices
      // Exclude the volume match from price search if possible, but regex reuse is tricky
      // Simple approach: Find all numbers
      const numbers = line.match(/\d+\.\d+/g)?.map(Number) || [];
      
      // Heuristic: If we have Asset, we have a potential trade
      if (assetMatch) {
          const trade: Partial<TradeInput> = {
              asset: assetMatch[0].toUpperCase(),
          };

          // If we found volume (small number usually < 100 for forex/gold, but could be large for indices)
          // Let's assume the smallest number in the line that matches volume format is volume
          if (volumeMatch) {
             trade.positionSize = parseFloat(volumeMatch[0]);
          }

          // Prices: Entry, SL, TP, Close
          // Usually Entry is near the Asset or Type
          // If we have multiple numbers, assign them heuristically
          // This is hard without column coordinates.
          // Let's just grab the first valid-looking price as entry
          const prices = numbers.filter(n => n !== trade.positionSize);
          if (prices.length > 0) trade.entryPrice = prices[0];
          if (prices.length > 1) trade.stopLoss = prices[1]; // Very risky assumption
          
          // Try to find P/L (often negative, at the end)
          const plMatch = line.match(/-?\d+\.\d{2}\b$/);
          if (plMatch) {
              trade.lossAmount = parseFloat(plMatch[0]);
          }

          trades.push(trade);
      }
  }

  // Fallback: If no structured trades found, try the old "whole text" method as a single trade
  if (trades.length === 0) {
      const singleResult: Partial<TradeInput> = {};
      const assetMatch = text.match(/\b[A-Z]{3}[\/]?[A-Z]{3}\b|\bBTCUSDT\b|\bETHUSDT\b/);
      if (assetMatch) {
          singleResult.asset = assetMatch[0];
          trades.push(singleResult);
      }
  }

  return trades;
}
