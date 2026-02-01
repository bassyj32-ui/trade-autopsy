import { Asset, PropFirm, PropFirmConfig, AffiliateLink } from './types';

export const ASSETS: Asset[] = [
  // Forex Majors
  { symbol: "EUR/USD", type: "forex" },
  { symbol: "GBP/USD", type: "forex" },
  { symbol: "USD/JPY", type: "forex" },
  { symbol: "USD/CAD", type: "forex" },
  { symbol: "AUD/USD", type: "forex" },
  { symbol: "USD/CHF", type: "forex" },
  { symbol: "NZD/USD", type: "forex" },
  
  // Forex Crosses (Popular)
  { symbol: "GBP/JPY", type: "forex" },
  { symbol: "EUR/JPY", type: "forex" },
  { symbol: "EUR/GBP", type: "forex" },
  { symbol: "AUD/JPY", type: "forex" },
  
  // Crypto
  { symbol: "BTC/USD", type: "crypto" },
  { symbol: "ETH/USD", type: "crypto" },
  { symbol: "SOL/USD", type: "crypto" },
  { symbol: "XRP/USD", type: "crypto" },
  { symbol: "BNB/USD", type: "crypto" },
  { symbol: "DOGE/USD", type: "crypto" },
  
  // Commodities
  { symbol: "XAU/USD (Gold)", type: "commodity" },
  { symbol: "XAG/USD (Silver)", type: "commodity" },
  { symbol: "WTI (Oil)", type: "commodity" },
  
  // Indices
  { symbol: "US30 (Dow)", type: "index" },
  { symbol: "NAS100 (Nasdaq)", type: "index" },
  { symbol: "SPX500 (S&P)", type: "index" },
  { symbol: "GER40 (DAX)", type: "index" },
];

export const LOT_SUGGESTIONS = {
  forex: [0.01, 0.05, 0.10, 0.25, 0.50, 1.00, 2.00, 5.00, 10.00],
  crypto: [0.001, 0.01, 0.1, 0.5, 1.0, 5.0, 10.0],
  commodity: [0.01, 0.1, 1.0, 10.0],
  index: [0.1, 0.5, 1.0, 5.0, 10.0, 100.0],
};

export const PROP_FIRM_RULES: Record<PropFirm, PropFirmConfig> = {
  FTMO: { maxRisk: 0.02, dailyDrawdown: 0.05, totalDrawdown: 0.1 },
  MyFundedFX: { maxRisk: 0.02, dailyDrawdown: 0.05, totalDrawdown: 0.08 },
  FundingPips: { maxRisk: 0.02, dailyDrawdown: 0.05, totalDrawdown: 0.1 },
  None: { maxRisk: 1.0, dailyDrawdown: 1.0, totalDrawdown: 1.0 }, // No strict rules
};

export const YOUTUBE_CHANNEL_URL = "https://youtube.com/@stop_the_loss?si=NrdMpqTKx-WzwQW_";
export const YOUTUBE_FEATURED_VIDEO_URL = "https://www.youtube.com/watch?v=8DaFJZYiYwQ";

export const AFFILIATE_LINKS: AffiliateLink[] = [
  {
    name: "FTMO",
    url: "https://ftmo.com/en/", // TODO: Replace with your affiliate link
    description: "The industry standard. Reliable payouts, great conditions, and established trust.",
    recommended: true
  },
  {
    name: "Funding Pips",
    url: "https://fundingpips.com/", // TODO: Replace with your affiliate link
    description: "Low spreads, fast scaling, and modern dashboard. Great for aggressive scaling.",
    recommended: false
  },
  {
    name: "MyFundedFX",
    url: "https://myfundedfx.com/", // TODO: Replace with your affiliate link
    description: "Excellent for crypto traders. No time limits and competitive pricing.",
    recommended: false
  }
];
