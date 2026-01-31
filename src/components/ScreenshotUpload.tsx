import React, { useState } from 'react';
import Tesseract from 'tesseract.js';
import { Upload, Loader2 } from 'lucide-react';
import { TradeInput } from '../lib/types';

interface ScreenshotUploadProps {
  onResult: (data: Partial<TradeInput>[]) => void;
}

export function ScreenshotUpload({ onResult }: ScreenshotUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const { data: { text } } = await Tesseract.recognize(
        file,
        'eng',
        { logger: m => console.log(m) }
      );
      
      console.log("OCR Text:", text);
      const extracted = parseTradeText(text);
      if (extracted.length === 0) {
        setError("No trades detected. Try a clearer screenshot.");
      } else {
        onResult(extracted);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to read screenshot. Try manual input.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {loading ? (
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-muted-foreground mb-2" />
          )}
          <p className="text-sm text-muted-foreground">
            {loading ? "Extracting trade data..." : "Upload Screenshot (MT4/MT5/Binance)"}
          </p>
        </div>
        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={loading} />
      </label>
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
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
