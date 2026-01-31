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
};

export type PropFirm = 'FTMO' | 'MyFundedFX' | 'FundingPips' | 'None';
