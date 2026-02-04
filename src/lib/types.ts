export type AssetType = 'crypto' | 'forex' | 'commodity' | 'index';

export type Asset = {
  symbol: string;
  type: AssetType;
};

export type PropFirmConfig = {
  maxRiskPerTrade: number;   // % of account per trade
  maxPositionSize: number;   // max lots
  maxDailyLoss: number;      // % of account per day
  allowedAssets: string[];   // list of symbols allowed
};

export type TradeInput = {
  accountSize: number;
  asset: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit?: number;
  positionSize: number; // lots or units
  leverage?: number;
  timeframe: string;
  lossAmount?: number;
  direction?: 'buy' | 'sell' | 'unknown';
  timestamp?: number;
};

export type AccountSummary = {
  netPnl: number;
  tradeCount: number;
  winRate: number;
  largestLoss: number;
  avgLot: number;
  overtradingScore: number; // 0-100
  riskStacking?: boolean;
};

export type AnalysisResult = {
  riskPercentage: number;
  riskRewardRatio: number;
  stopDistancePercentage: number;
  leverageExposure: number;
  verdict: string;
  causeOfDeath: string;
  fix: string[];
  propFirmViolation?: string;
  date: string;
  id: string;
  asset: string;
  accountSize: number;
  lossAmount: number;
  // New fields for batch analysis
  isBatch?: boolean;
  accountSummary?: AccountSummary;
};

export type InferenceResult = {
  trades: Partial<TradeInput>[];
  accountSummary: AccountSummary;
  confidence: 'high' | 'medium' | 'low';
};

export type PropFirm = 'None' | 'FTMO' | 'TopStep' | 'The5ers' | 'FundingTalent' | 'MyForexFunds' | 'OneUp';

export type AffiliateLink = {
  name: string;
  url: string;
  code?: string;
  description: string;
  recommended: boolean;
};
