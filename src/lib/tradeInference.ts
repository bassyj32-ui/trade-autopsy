
import { TradeInput, InferenceResult, AccountSummary } from './types';

// Regex Patterns for various platforms (MT4, MT5, cTrader)
const PATTERNS = {
  // Common Assets
  // Added more crypto and indices variations
  asset: /\b([A-Z]{3}\/?[A-Z]{3}|XAU[A-Z]{3}|XAG[A-Z]{3}|BTC\w*|ETH\w*|US30|NAS100|SPX500|GER30|DE30|DE40|USTEC|US500|DOW|US100|NDX)\b/i,
  
  // Directions
  buy: /\b(buy|long)\b/i,
  sell: /\b(sell|short)\b/i,

  // Numbers (Volume, Price, PnL)
  // We look for patterns like "0.10", "1.00", "100.50", "-50.00"
  // Exclude simple integers that might be ticket numbers unless they look like money
  decimalNumber: /-?\d+[\.,]\d{2,}/g, 
  
  // Specific Lot Size detection (usually small numbers 0.01 - 100.00)
  lotSize: /\b(0\.\d{2}|[1-9]\d{0,2}\.\d{2})\b/,
  
  // Time pattern (HH:MM or YYYY.MM.DD)
  time: /\b(\d{2}:\d{2})\b/
};

// Keywords to ignore lines (headers, balances)
const IGNORE_KEYWORDS = ['balance', 'credit', 'total', 'deposit', 'withdrawal', 'margin', 'free margin'];

export function inferTradesFromText(inputs: string | string[]): InferenceResult {
  const texts = Array.isArray(inputs) ? inputs : [inputs];
  let allTrades: Partial<TradeInput>[] = [];

  console.log(`[TradeInference] Starting analysis on ${texts.length} text blocks.`);

  // 1. Parse each text block
  for (const text of texts) {
    const trades = parseSingleText(text);
    allTrades = [...allTrades, ...trades];
  }

  console.log(`[TradeInference] Total raw trades detected: ${allTrades.length}`);

  // 2. Remove exact duplicates (same asset, same entry, same PnL)
  const uniqueTrades = allTrades.filter((trade, index, self) => 
    index === self.findIndex((t) => (
      t.asset === trade.asset &&
      t.entryPrice === trade.entryPrice &&
      t.lossAmount === trade.lossAmount &&
      t.lossAmount !== 0 // Keep multiple 0s? unlikely to be useful but ok.
    ))
  );

  console.log(`[TradeInference] Unique trades after dedupe: ${uniqueTrades.length}`);

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

  console.log(`[TradeInference] Parsing block with ${lines.length} lines.`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length < 10) continue; // Skip short noise

    // Debug log first few lines
    if (i < 5) console.log(`[TradeInference] Line ${i}: ${line}`);

    // Check Ignore Keywords
    if (IGNORE_KEYWORDS.some(k => line.toLowerCase().includes(k))) {
        console.log(`[TradeInference] Skipping ignore line: ${line}`);
        continue;
    }

    // 1. Asset Detection (Crucial)
    const assetMatch = line.match(PATTERNS.asset);
    if (!assetMatch) {
        // If no asset, it's not a trade row we can process reliably
        continue;
    }

    const asset = assetMatch[0].toUpperCase().replace('/', '');
    
    // 2. Extract Numbers
    const numberMatches = line.match(PATTERNS.decimalNumber);
    const numbers = numberMatches ? numberMatches.map(n => parseFloat(n.replace(',', ''))) : [];

    // If we don't have enough numbers, it's probably not a full trade row
    // We need at least: Lot, Price, Profit (3 numbers) OR Lot, Profit (2 numbers min)
    if (numbers.length < 2) continue;

    const trade: Partial<TradeInput> = {
      asset,
      direction: 'buy', // default
      entryPrice: 0,
      lossAmount: 0,
      positionSize: 0.1
    };

    // 3. Direction
    if (PATTERNS.sell.test(line)) trade.direction = 'sell';

    // 4. Heuristic Field Assignment
    
    // PROFIT: The LAST number in the row is almost always the Profit/Loss in MT4/MT5 history
    const lastNum = numbers[numbers.length - 1];
    
    // Sanity check: Profit shouldn't be a massive number relative to others if it's a price
    // But in crypto/indices, prices are big.
    // However, Profit is usually the *last* column.
    trade.lossAmount = lastNum;

    // LOT SIZE: Look for small number (0.01 - 500) that isn't the Profit
    // Usually the first small number in the sequence
    const potentialLots = numbers.filter(n => 
        n !== lastNum && 
        n > 0 && 
        n < 1000 && // Cap for lots
        Math.abs(n) !== Math.abs(trade.lossAmount!) // distinct from PnL
    );

    if (potentialLots.length > 0) {
        trade.positionSize = potentialLots[0];
    }

    // ENTRY PRICE: Number that is not Lot and not Profit
    // If multiple remain, usually Open Price, SL, TP, Close Price
    // We take the first remaining one as Open Price
    const potentialPrices = numbers.filter(n => 
        n !== lastNum && 
        n !== trade.positionSize
    );

    if (potentialPrices.length > 0) {
        trade.entryPrice = Math.abs(potentialPrices[0]);
    }

    console.log(`[TradeInference] Detected Trade: ${trade.asset} ${trade.direction} ${trade.positionSize} lots, PnL: ${trade.lossAmount}`);
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
  let overtradingScore = Math.min((trades.length / 20) * 100, 100); 
  
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
