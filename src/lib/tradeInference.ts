import { TradeInput, InferenceResult, AccountSummary } from './types';

// Keywords to ignore lines (headers, balances)
const IGNORE_KEYWORDS = ['balance', 'credit', 'total', 'deposit', 'withdrawal', 'margin', 'free margin'];

// Supported platform headers for detection
enum Platform {
  MT5 = 'MT5',
  MT4 = 'MT4',
  BINANCE = 'Binance',
  BYBIT = 'Bybit',
  TRADINGVIEW = 'TradingView',
  UNKNOWN = 'Unknown',
}

// Main entry
export function inferTradesFromText(inputs: string | string[]): InferenceResult {
  const texts = Array.isArray(inputs) ? inputs : [inputs];
  let allTrades: Partial<TradeInput>[] = [];

  for (const text of texts) {
    const platform = detectPlatform(text);
    let trades: Partial<TradeInput>[] = [];

    console.log(`[TradeInference] Detected Platform: ${platform}`);

    switch (platform) {
      case Platform.MT5:
      case Platform.MT4:
        trades = parseMTText(text);
        break;
      case Platform.BINANCE:
      case Platform.BYBIT:
        trades = parseCryptoText(text);
        break;
      case Platform.TRADINGVIEW:
        trades = parseTradingViewText(text);
        break;
      default:
        // Unknown platform fallback: try MT parser first, then crypto
        trades = parseMTText(text);
        if (trades.length === 0) trades = parseCryptoText(text);
    }

    allTrades.push(...trades);
  }

  // Deduplicate
  const uniqueTrades = allTrades.filter((trade, index, self) =>
    index === self.findIndex(t =>
      t.asset === trade.asset &&
      t.entryPrice === trade.entryPrice &&
      t.lossAmount === trade.lossAmount &&
      t.lossAmount !== 0
    )
  );

  const summary = calculateSummary(uniqueTrades);

  return {
    trades: uniqueTrades,
    accountSummary: summary,
    confidence: uniqueTrades.length > 0 ? 'high' : 'low'
  };
}

// -------------------- Platform Detection --------------------
function detectPlatform(text: string): Platform {
  const lower = text.toLowerCase();
  if (/\b(mt5|meta trader 5)\b/i.test(lower)) return Platform.MT5;
  if (/\b(mt4|meta trader 4)\b/i.test(lower)) return Platform.MT4;
  if (/\b(binance|realized pnl|qty|symbol)\b/i.test(lower)) return Platform.BINANCE;
  if (/\b(bybit|realized pnl|side|symbol)\b/i.test(lower)) return Platform.BYBIT;
  if (/\b(tradingview|strategy|entry|exit)\b/i.test(lower)) return Platform.TRADINGVIEW;
  return Platform.UNKNOWN;
}

// -------------------- MT4/MT5 Parsing --------------------
function parseMTText(text: string): Partial<TradeInput>[] {
  const trades: Partial<TradeInput>[] = [];
  const MT_ASSETS = /\b(XAUUSD|XAGUSD|BTCUSD|ETHUSD|US30|NAS100|GER40|EURUSD|GBPUSD|USDJPY|AUDUSD|USDCAD|NZDUSD)\b/i;

  const clean = text
    .replace(/[|]/g, ' ')
    .replace(/,/g, '.')
    .replace(/[^\S\r\n]+/g, ' ')
    .trim();

  const rows = clean.split('\n')
    .map(r => r.trim())
    .filter(r => /\b(buy|sell)\b/i.test(r));

  for (const row of rows) {
    if (IGNORE_KEYWORDS.some(k => row.toLowerCase().includes(k))) continue;

    const assetMatch = row.match(MT_ASSETS);
    if (!assetMatch) continue;
    const asset = assetMatch[0].toUpperCase();

    const directionMatch = row.match(/\b(buy|sell)\b/i);
    if (!directionMatch) continue;
    const direction = directionMatch[1].toLowerCase() as 'buy' | 'sell';

    const numbers = (row.match(/-?\d+(?:\.\d+)?/g) || [])
      .map(n => parseFloat(n))
      .filter(n => !isNaN(n));

    if (numbers.length < 5) continue;

    const pnl = numbers[numbers.length - 1];
    const positionSize = numbers.find(n => n > 0 && n <= 100) || 0;
    const entryPrice = numbers.filter(n => n > 1 && n !== pnl && n !== positionSize).sort((a, b) => b - a)[0] || 0;

    trades.push({ asset, direction, positionSize, entryPrice, lossAmount: pnl });
  }

  return trades;
}

// -------------------- Crypto Parsing (Binance/Bybit) --------------------
function parseCryptoText(text: string): Partial<TradeInput>[] {
  const trades: Partial<TradeInput>[] = [];
  const CRYPTO_ASSETS = /\b([A-Z]{2,6}USDT|[A-Z]{2,6}USD|BTC|ETH|SOL|XRP)\b/i;

  const lines = text.replace(/[|]/g, ' ').split('\n').map(l => l.trim()).filter(l => l.length > 3);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/\b(realized pnl|realized p&l|pnl)\b/i.test(line)) {
      const context = lines.slice(Math.max(0, i - 5), i + 2).join(' ');

      const pnlMatch = context.match(/[+-]?\d+(\.\d+)?/);
      if (!pnlMatch) continue;
      const pnl = parseFloat(pnlMatch[0]);

      const assetMatch = context.match(CRYPTO_ASSETS);
      if (!assetMatch) continue;
      const asset = assetMatch[0].toUpperCase();

      const direction: 'buy' | 'sell' | 'unknown' = /\b(long|buy)\b/i.test(context)
        ? 'buy'
        : /\b(short|sell)\b/i.test(context)
        ? 'sell'
        : 'unknown';

      const sizeMatch = context.match(/\b(Qty|Amount|Size)\s*[:\s]\s*(\d+(\.\d+)?)/i);
      const positionSize = sizeMatch ? parseFloat(sizeMatch[2]) : 0.1;

      trades.push({ asset, direction, positionSize, entryPrice: 0, lossAmount: pnl });
    }
  }

  return trades;
}

// -------------------- TradingView Parsing (Generic) --------------------
function parseTradingViewText(text: string): Partial<TradeInput>[] {
  const trades: Partial<TradeInput>[] = [];
  const TV_ASSETS = /\b([A-Z]{2,6}USDT|[A-Z]{2,6}USD|BTC|ETH|SOL|XRP|XAUUSD|EURUSD)\b/i;

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);

  for (const line of lines) {
    if (!/\b(entry|exit|strategy|buy|sell)\b/i.test(line)) continue;

    const assetMatch = line.match(TV_ASSETS);
    if (!assetMatch) continue;
    const asset = assetMatch[0].toUpperCase();

    const direction: 'buy' | 'sell' | 'unknown' = /\b(buy|long)\b/i.test(line)
      ? 'buy'
      : /\b(sell|short)\b/i.test(line)
      ? 'sell'
      : 'unknown';

    // Try to find PnL or Price
    const numbers = (line.match(/-?\d+(?:\.\d+)?/g) || []).map(n => parseFloat(n));
    // Heuristic: Last number might be PnL if it's a closed trade line
    const pnl = numbers.length > 0 ? numbers[numbers.length - 1] : 0;
    
    trades.push({
        asset,
        direction,
        positionSize: 1, // Default for TV
        entryPrice: numbers[0] || 0,
        lossAmount: pnl
    });
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
