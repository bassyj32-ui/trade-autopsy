import { TradeInput, AnalysisResult, PropFirm } from './types';
import { PROP_FIRM_RULES, ASSETS } from './constants';

export function analyzeTrade(input: TradeInput, propFirm: PropFirm): AnalysisResult {
  const { accountSize, entryPrice, stopLoss, takeProfit, positionSize, leverage: inputLeverage, timeframe, asset } = input;

  // 1. Calculate Risk & Quantity
  let quantity = positionSize;
  const assetObj = ASSETS.find(a => a.symbol === asset);
  const assetType = assetObj?.type || 'forex';

  // Realistic Contract Size Assumptions
  if (assetType === 'forex') {
      quantity = positionSize * 100000; // Standard Lot = 100k units
  } else if (assetType === 'commodity') {
      if (asset.includes('XAU')) quantity = positionSize * 100; // Gold 100oz
      else if (asset.includes('XAG')) quantity = positionSize * 5000; // Silver 5000oz
      else if (asset.includes('WTI')) quantity = positionSize * 1000; // Oil 1000 barrels
  } else if (assetType === 'index') {
      quantity = positionSize; // Usually 1 contract = $1 per point or similar, varies wildly. Treating as 1 unit for MVP.
  }
  // Crypto is usually raw units (1 BTC = 1 Lot on some, but usually people type "0.5" meaning 0.5 BTC)
  // We assume positionSize IS the quantity for Crypto and Indices for simplicity unless specified.

  const riskPerUnit = Math.abs(entryPrice - stopLoss);
  const totalRisk = riskPerUnit * quantity;
  const riskPercentage = (totalRisk / accountSize) * 100;

  // 2. Calculate R:R
  let riskRewardRatio = 0;
  if (takeProfit) {
      const rewardPerUnit = Math.abs(takeProfit - entryPrice);
      riskRewardRatio = rewardPerUnit / riskPerUnit;
  }

  // 3. Stop Distance %
  const stopDistancePercentage = (riskPerUnit / entryPrice) * 100;

  // 4. Leverage Exposure
  // Notional Value = Entry * Quantity
  const notionalValue = entryPrice * quantity;
  const leverageExposure = inputLeverage || (notionalValue / accountSize);

  // 5. Check Prop Firm Rules
  const rules = PROP_FIRM_RULES[propFirm];
  let propFirmViolation = undefined;
  
  if (riskPercentage > (rules.maxRisk * 100)) {
      propFirmViolation = `Violated ${rules.maxRisk * 100}% Max Risk per Trade rule.`;
  }
  else if (riskPercentage > (rules.dailyDrawdown * 100)) {
      propFirmViolation = `Violated ${rules.dailyDrawdown * 100}% Max Daily Loss rule.`;
  }
  else if (riskPercentage > (rules.totalDrawdown * 100)) {
      propFirmViolation = `Violated ${rules.totalDrawdown * 100}% Max Total Loss rule (Instant Kill).`;
  }

  // 6. Determine Cause of Death
  let causeOfDeath = "Direction Wrong";
  let verdict = "Direction was wrong. This happens.";
  let fix = ["Check your bias", "Wait for confirmation"];

  // Priority 1: Position Size / Prop Firm Kill
  if (propFirmViolation || riskPercentage > (rules.dailyDrawdown * 100 || 10)) {
       causeOfDeath = "Position Size Kill";
       verdict = propFirmViolation 
          ? `IMMEDIATE TERMINATION. You violated the ${propFirmViolation}`
          : `SUICIDE MISSION. You risked ${riskPercentage.toFixed(1)}% of the account on a single trade.`;
       fix = ["Cut position size by 90%", "Use a position size calculator", "Respect the drawdown limits"];
  }
  // Priority 2: Over-Leverage
  else if (leverageExposure > 50) { 
      causeOfDeath = "Over-Leverage";
      verdict = `DEATH BY MARGIN. ${leverageExposure.toFixed(1)}x leverage? You're not a bank. One wick and you're gone.`;
      fix = ["Reduce leverage to max 10x", "Focus on notional value, not margin"];
  }
  // Priority 3: Stop Too Tight
  else if ((assetType === 'forex' && stopDistancePercentage < 0.05) || (assetType === 'crypto' && stopDistancePercentage < 0.5)) {
       causeOfDeath = "Stop Hunted";
       verdict = "SUFFOCATION. You choked the trade. Market noise took you out before the move started.";
       fix = ["Base stop loss on ATR", "Give the trade room to breathe"];
  }
  // Priority 4: Bad R:R
  else if (takeProfit && riskRewardRatio < 1.0) {
      causeOfDeath = "Negative R:R";
      verdict = `MATHEMATICAL SUICIDE. Risking $1 to make $${riskRewardRatio.toFixed(2)}? The casino has better odds.`;
      fix = ["Target at least 1:2 R:R", "Don't take trades with poor upside"];
  }
  // Priority 5: Emotional Trade
  else if (riskPercentage > 2 && ["1m", "5m"].includes(timeframe) && !takeProfit) {
       causeOfDeath = "Emotional Tilt";
       verdict = "GAMBLING ADDICTION. High risk, scalping timeframe, no plan. You were chasing dopamine, not profits.";
       fix = ["Step away after a loss", "Plan trade before entering", "Stop scalping without a system"];
  }
  
  return {
      riskPercentage,
      riskRewardRatio,
      stopDistancePercentage,
      leverageExposure,
      verdict,
      causeOfDeath,
      fix,
      propFirmViolation,
      date: new Date().toISOString(),
      id: crypto.randomUUID(),
      asset,
      accountSize,
      lossAmount: totalRisk
  };
}
