export type AssetType = 'crypto' | 'forex' | 'commodity' | 'index';

export type Asset = {
  symbol: string;
  type: AssetType;
};

export type PropFirmConfig = {
  maxRisk: number; // Single trade risk limit (e.g., 0.02 for 2%)
  dailyDrawdown: number;
  totalDrawdown: number;
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
  direction?: 'buy' | 'sell';
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

export type PropFirm = 'FTMO' | 'MyFundedFX' | 'FundingPips' | 'None';

export type AffiliateLink = {
  name: string;
  url: string;
  code?: string;
  description: string;
  recommended: boolean;
};
