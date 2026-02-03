import { TradeInput, AnalysisResult, PropFirm, InferenceResult } from './types';
import { PROP_FIRM_RULES, ASSETS } from './constants';

// Type guard to check if input is InferenceResult (Batch)
function isBatchInput(input: any): input is InferenceResult & { userAccountSize: number } {
    return 'accountSummary' in input && 'trades' in input;
}

export function analyzeTrade(input: TradeInput | (InferenceResult & { userAccountSize: number }), propFirm: PropFirm): AnalysisResult {
    if (isBatchInput(input)) {
        return analyzeBatch(input, propFirm);
    } else {
        return analyzeSingle(input, propFirm);
    }
}

function analyzeBatch(input: InferenceResult & { userAccountSize: number }, propFirm: PropFirm): AnalysisResult {
    const { accountSummary, userAccountSize } = input;
    const rules = PROP_FIRM_RULES[propFirm];
    
    // 1. Calculate Risk Metrics
    const maxDrawdownPercent = (Math.abs(accountSummary.largestLoss) / userAccountSize) * 100;
    const netPnlPercent = (Math.abs(accountSummary.netPnl) / userAccountSize) * 100;
    const isNetLoss = accountSummary.netPnl < 0;

    // 2. Check Prop Firm Rules
    let propFirmViolation = undefined;
    if (rules) {
        // Check Daily Loss (approximated by largest loss or net pnl if all same day)
        // For batch, we assume these trades might be on the same day if time clustering detected, 
        // but for safety, if largest single loss > daily limit, it's a fail.
        if (maxDrawdownPercent > (rules.dailyDrawdown * 100)) {
            propFirmViolation = `Violated ${rules.dailyDrawdown * 100}% Max Daily Loss rule on a single trade.`;
        } else if (isNetLoss && netPnlPercent > (rules.dailyDrawdown * 100)) {
             propFirmViolation = `Violated ${rules.dailyDrawdown * 100}% Max Daily Loss rule (Cumulative).`;
        } else if (isNetLoss && netPnlPercent > (rules.totalDrawdown * 100)) {
            propFirmViolation = `Violated ${rules.totalDrawdown * 100}% Max Total Loss rule.`;
        }
    }

    // 3. Determine Cause of Death (Batch)
    let causeOfDeath = "Death by a Thousand Cuts";
    let verdict = "You bled out slowly. No discipline.";
    let fix = ["Stop overtrading", "Set a daily loss limit", "Walk away after 2 losses"];

    if (propFirmViolation) {
        causeOfDeath = "Prop Firm Execution";
        verdict = `You would have failed ${propFirm === 'None' ? 'a prop firm' : propFirm} before you finished your coffee. ${propFirmViolation}`;
        fix = ["Respect the drawdown limits", "Size down significantly", "Read the rules again"];
    } else if (accountSummary.riskStacking) {
        causeOfDeath = "Martingale Suicide";
        verdict = "You kept adding to losers (or increasing size after losses). This works until it doesn't. Today, it didn't.";
        fix = ["Never add to a loser", "Reset risk after a loss", "Accept the L"];
    } else if (accountSummary.overtradingScore > 70) {
        causeOfDeath = "Dopamine Addiction";
        verdict = `You took ${accountSummary.tradeCount} trades. This wasn't strategy. This was dopamine seeking behavior.`;
        fix = ["Limit yourself to 3 trades/day", "Trade higher timeframes", "Get a hobby"];
    } else if (accountSummary.winRate < 30) {
        causeOfDeath = "Coin Flipper";
        verdict = `Your win rate is ${accountSummary.winRate.toFixed(1)}%. A blind monkey throwing darts does better (50%).`;
        fix = ["Backtest your strategy", "Stop guessing", "Follow the trend"];
    } else if (accountSummary.avgLot > 0 && (accountSummary.largestLoss / accountSummary.avgLot) > 1000) { // Rough heuristic for huge relative loss
        causeOfDeath = "Ego Trading";
        verdict = "You refused to be wrong. One bad trade wiped out ten good ones.";
        fix = ["Use a hard stop loss", "Leave your ego at the door"];
    }

    return {
        riskPercentage: maxDrawdownPercent, // showing max single risk equivalent
        riskRewardRatio: 0, // N/A for batch
        stopDistancePercentage: 0, // N/A
        leverageExposure: 0, // Hard to calc without more data
        verdict,
        causeOfDeath,
        fix,
        propFirmViolation,
        date: new Date().toISOString(),
        id: crypto.randomUUID(),
        asset: "Multiple",
        accountSize: userAccountSize,
        lossAmount: Math.abs(accountSummary.netPnl),
        isBatch: true,
        accountSummary
    };
}

function analyzeSingle(input: TradeInput, propFirm: PropFirm): AnalysisResult {
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
      quantity = positionSize; // Treating as 1 unit for MVP.
  }

  let totalRisk = 0;
  let riskPerUnit = 0;

  if (input.lossAmount) {
      totalRisk = Math.abs(input.lossAmount);
      riskPerUnit = quantity > 0 ? totalRisk / quantity : 0;
  } else {
      riskPerUnit = Math.abs(entryPrice - stopLoss);
      totalRisk = riskPerUnit * quantity;
  }

  const riskPercentage = (totalRisk / accountSize) * 100;

  // 2. Calculate R:R
  let riskRewardRatio = 0;
  if (takeProfit && riskPerUnit > 0) {
      const rewardPerUnit = Math.abs(takeProfit - entryPrice);
      riskRewardRatio = rewardPerUnit / riskPerUnit;
  }

  // 3. Stop Distance %
  let stopDistancePercentage = 0;
  if (entryPrice > 0) {
    stopDistancePercentage = (riskPerUnit / entryPrice) * 100;
  }

  // 4. Leverage Exposure
  const notionalValue = entryPrice * quantity;
  const leverageExposure = inputLeverage || (notionalValue / accountSize);

  // 5. Check Prop Firm Rules
  const rules = PROP_FIRM_RULES[propFirm];
  let propFirmViolation = undefined;
  
  if (riskPercentage > (rules.maxRisk * 100)) {
      propFirmViolation = `Violated ${rules.maxRisk * 100}% Max Risk rule.`;
  }
  else if (riskPercentage > (rules.dailyDrawdown * 100)) {
      propFirmViolation = `Violated ${rules.dailyDrawdown * 100}% Max Daily Loss rule.`;
  }
  else if (riskPercentage > (rules.totalDrawdown * 100)) {
      propFirmViolation = `Violated ${rules.totalDrawdown * 100}% Max Total Loss rule.`;
  }

  // 6. Determine Cause of Death (Brutal Copy Upgrade)
  let causeOfDeath = "Direction Wrong";
  let verdict = "Direction wasn't the problem. Timing was.";
  let fix = ["Check your bias", "Wait for confirmation"];

  // Priority 1: Position Size / Prop Firm Kill
  if (propFirmViolation || riskPercentage > (rules.dailyDrawdown * 100 || 10)) {
       causeOfDeath = "Position Size Kill";
       verdict = propFirmViolation 
          ? `You would have failed ${propFirm} before your second trade. ${propFirmViolation}`
          : `Direction wasn't the problem. Size was. You risked ${riskPercentage.toFixed(1)}% on one trade.`;
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
       verdict = "You choked the trade. Your stop was so tight the spread alone probably killed you.";
       fix = ["Base stop loss on ATR", "Give the trade room to breathe"];
  }
  // Priority 4: Bad R:R
  else if (takeProfit && riskRewardRatio < 1.0) {
      causeOfDeath = "Negative R:R";
      verdict = `Mathematical suicide. Risking $1 to make $${riskRewardRatio.toFixed(2)}? Your edge died before you entered.`;
      fix = ["Target at least 1:2 R:R", "Don't take trades with poor upside"];
  }
  // Priority 5: Emotional Trade
  else if (riskPercentage > 2 && ["1m", "5m"].includes(timeframe) && !takeProfit) {
       causeOfDeath = "Emotional Tilt";
       verdict = "This wasn't strategy. This was dopamine. Scalping with high risk and no plan is just gambling.";
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