
import { TradeInput, InferenceResult, AccountSummary } from './types';

// Regex Patterns for various platforms (MT4, MT5, cTrader)
const PATTERNS = {
  // Common Assets
  asset: /\b([A-Z]{3}\/?[A-Z]{3}|XAU[A-Z]{3}|XAG[A-Z]{3}|BTC\w+|ETH\w+|US30|NAS100|SPX500|GER30)\b/i,
  
  // Directions
  buy: /\b(buy|long)\b/i,
  sell: /\b(sell|short)\b/i,

  // Numbers (Volume, Price, PnL)
  // Careful to avoid dates or IDs.
  // We look for patterns like "0.10", "1.00", "100.50", "-50.00"
  decimalNumber: /-?\d+[\.,]\d{2,}/g, 
  
  // Specific Lot Size detection (usually small numbers 0.01 - 100.00)
  lotSize: /\b(0\.\d{2}|[1-9]\d{0,2}\.\d{2})\b/,
  
  // Time pattern (HH:MM or YYYY.MM.DD)
  time: /\b(\d{2}:\d{2})\b/
};

export function inferTradesFromText(inputs: string | string[]): InferenceResult {
  const texts = Array.isArray(inputs) ? inputs : [inputs];
  let allTrades: Partial<TradeInput>[] = [];

  // 1. Parse each text block
  for (const text of texts) {
    const trades = parseSingleText(text);
    allTrades = [...allTrades, ...trades];
  }

  // 2. Remove exact duplicates (same asset, same entry, same PnL)
  // Simple de-dupe logic
  const uniqueTrades = allTrades.filter((trade, index, self) => 
    index === self.findIndex((t) => (
      t.asset === trade.asset &&
      t.entryPrice === trade.entryPrice &&
      t.lossAmount === trade.lossAmount
    ))
  );

  // 3. Calculate Account Summary & Heuristics
  const summary = calculateSummary(uniqueTrades);

  return {
    trades: uniqueTrades,
    accountSummary: summary,
    confidence: uniqueTrades.length > 0 ? 'high' : 'low'
  };
}

function parseSingleText(text: string): Partial<TradeInput>[] {
  const lines = text.split('\n');
  const trades: Partial<TradeInput>[] = [];

  for (const line of lines) {
    const cleanLine = line.trim();
    if (cleanLine.length < 10) continue; // Skip short noise

    const assetMatch = cleanLine.match(PATTERNS.asset);
    if (!assetMatch) continue;

    // Potential Trade Found
    const trade: Partial<TradeInput> = {
      asset: assetMatch[0].toUpperCase().replace('/', ''),
      entryPrice: 0,
      stopLoss: 0,
      takeProfit: 0,
      lossAmount: 0,
      positionSize: 0,
      direction: 'buy' // default
    };

    // Determine Direction
    if (PATTERNS.sell.test(cleanLine)) trade.direction = 'sell';

    // Extract all numbers
    const numberMatches = cleanLine.match(PATTERNS.decimalNumber);
    const numbers = numberMatches ? numberMatches.map(n => parseFloat(n.replace(',', ''))) : [];

    if (numbers.length === 0) continue;

    // Heuristic Field Assignment
    
    // 1. PnL: Usually the last number in the row (especially in history views)
    // Or the largest negative number if it's a loss
    const lastNum = numbers[numbers.length - 1];
    trade.lossAmount = lastNum; // Provisional

    // 2. Volume: Usually small positive number (0.01 - 50.0)
    // Exclude the PnL value from search
    const potentialVolumes = numbers.filter(n => 
        n !== lastNum && 
        n > 0 && 
        n < 1000 && // Cap for lots (indices might be higher but usually integers)
        (n % 1 === 0 || n.toString().includes('.')) // Must look like a number
    );

    if (potentialVolumes.length > 0) {
        // First valid small number is likely lots
        trade.positionSize = potentialVolumes[0];
    } else {
        // Fallback default
        trade.positionSize = 0.1; 
    }

    // 3. Prices: Remaining numbers that are not Volume or PnL
    const prices = numbers.filter(n => n !== trade.lossAmount && n !== trade.positionSize);
    if (prices.length > 0) trade.entryPrice = Math.abs(prices[0]);
    if (prices.length > 1) trade.stopLoss = Math.abs(prices[1]); // Guess

    // Timestamp inference (basic)
    if (PATTERNS.time.test(cleanLine)) {
        trade.timestamp = Date.now(); // Placeholder, hard to parse relative dates reliably without OCR date context
    }

    trades.push(trade);
  }
  
  return trades;
}

function calculateSummary(trades: Partial<TradeInput>[]): AccountSummary {
  if (trades.length === 0) {
      return {
          netPnl: 0,
          tradeCount: 0,
          winRate: 0,
          largestLoss: 0,
          avgLot: 0,
          overtradingScore: 0,
          riskStacking: false
      };
  }

  let netPnl = 0;
  let wins = 0;
  let largestLoss = 0;
  let totalLots = 0;
  let increasingLotsCount = 0;
  
  // Sort by assumed order (if we had timestamps, we'd sort. array order is proxy)
  // Check for "Revenge Trading" pattern: Loss -> Next Trade Larger Lot
  
  for (let i = 0; i < trades.length; i++) {
      const t = trades[i];
      const pnl = t.lossAmount || 0;
      const lots = t.positionSize || 0;
      
      netPnl += pnl;
      if (pnl > 0) wins++;
      if (pnl < largestLoss) largestLoss = pnl; // largest negative number
      totalLots += lots;

      // Revenge Trading Check
      if (i > 0) {
          const prevTrade = trades[i-1];
          const prevPnl = prevTrade.lossAmount || 0;
          const prevLots = prevTrade.positionSize || 0;
          
          if (prevPnl < 0 && lots > prevLots) {
              increasingLotsCount++;
          }
      }
  }

  const winRate = (wins / trades.length) * 100;
  const avgLot = totalLots / trades.length;

  // Overtrading Score (0-100)
  // Heuristic: > 10 trades in this batch = high
  // Or high density (not easily measured without exact times, but count is a proxy)
  let overtradingScore = Math.min((trades.length / 20) * 100, 100); 
  
  // Risk Stacking
  // If we have multiple open trades on same asset? (Hard to know if open/closed from simple text)
  // We'll use the Revenge Trading count as a proxy for "Risk Discipline"
  if (increasingLotsCount > 1) {
      overtradingScore += 20; // Penalty for martingale/revenge
  }

  return {
      netPnl,
      tradeCount: trades.length,
      winRate,
      largestLoss,
      avgLot,
      overtradingScore: Math.min(overtradingScore, 100),
      riskStacking: increasingLotsCount > 0
  };
}
