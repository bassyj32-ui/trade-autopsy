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
    let verdict = "You didn't just lose. You bled out slowly, trade by trade, refusing to apply a tourniquet.";
    let fix = ["Stop overtrading immediately", "Set a hard daily loss limit", "Walk away after 2 consecutive losses"];

    if (propFirmViolation) {
        causeOfDeath = "Instant Disqualification";
        verdict = `Congratulations. You failed ${propFirm === 'None' ? 'the prop firm' : propFirm} faster than it takes to fill out the application. ${propFirmViolation}`;
        fix = ["Respect the drawdown limits or quit", "Size down by 90%", "Read the rules before you burn cash"];
    } else if (accountSummary.riskStacking) {
        causeOfDeath = "Martingale Suicide";
        verdict = "You kept adding to losers. That's not trading, that's a ego problem. You tried to fight the market to get your money back, and the market crushed you.";
        fix = ["Never add to a losing position", "Reset risk to 0.5% after a loss", "Accept the L before it becomes a blow-up"];
    } else if (accountSummary.overtradingScore > 70) {
        causeOfDeath = "Terminal Dopamine Addiction";
        verdict = `You took ${accountSummary.tradeCount} trades. You're not a hedge fund algorithm. You're a bored gambler clicking buttons for a hit.`;
        fix = ["Limit yourself to 3 trades/day MAX", "Trade higher timeframes (4H+)", "Get a hobby that isn't burning money"];
    } else if (accountSummary.winRate < 30) {
        causeOfDeath = "Inverse Guru";
        verdict = `Your win rate is ${accountSummary.winRate.toFixed(1)}%. If you had simply done the EXACT OPPOSITE of every instinct you had, you'd be rich.`;
        fix = ["Backtest your strategy (it sucks)", "Stop guessing tops and bottoms", "Trade with the trend, not against it"];
    } else if (accountSummary.avgLot > 0 && (accountSummary.largestLoss / accountSummary.avgLot) > 1000) { 
        causeOfDeath = "Ego Trading";
        verdict = "You refused to be wrong. One bad trade wiped out weeks of progress because you couldn't admit you made a mistake.";
        fix = ["Use a hard stop loss every time", "Leave your ego at the door", "Define your risk BEFORE entering"];
    }

    return {
        riskPercentage: maxDrawdownPercent, 
        riskRewardRatio: 0, 
        stopDistancePercentage: 0, 
        leverageExposure: 0, 
        verdict,
        causeOfDeath,
        fix,
        propFirmViolation,
        date: new Date().toISOString(),
        id: crypto.randomUUID(),
        asset: "Multiple Assets",
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
      quantity = positionSize * 100000; 
  } else if (assetType === 'commodity') {
      if (asset.includes('XAU')) quantity = positionSize * 100; 
      else if (asset.includes('XAG')) quantity = positionSize * 5000; 
      else if (asset.includes('WTI')) quantity = positionSize * 1000; 
  } else if (assetType === 'index') {
      quantity = positionSize; 
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
  let causeOfDeath = "Blind Speculation";
  let verdict = "You entered this trade with hope, not a plan. The market charged you for that arrogance.";
  let fix = ["Identify your edge", "Wait for clear confirmation", "Don't trade if you don't know why"];

  // Priority 1: Position Size / Prop Firm Kill
  if (propFirmViolation || riskPercentage > (rules.dailyDrawdown * 100 || 10)) {
       causeOfDeath = "Size Queen";
       verdict = propFirmViolation 
          ? `You blew the ${propFirm} challenge instantly. ${propFirmViolation} You don't deserve capital.`
          : `You risked ${riskPercentage.toFixed(1)}% on a single trade. That's not trading, that's lighting money on fire.`;
       fix = ["Cut position size by 90%", "Use a position size calculator", "Respect the drawdown limits"];
  }
  // Priority 2: Over-Leverage
  else if (leverageExposure > 50) { 
      causeOfDeath = "Leverage Junkie";
      verdict = `DEATH BY MARGIN. ${leverageExposure.toFixed(1)}x leverage? You're not a bank. You're a liquidity provider for people who actually know what they're doing.`;
      fix = ["Reduce leverage to max 10x", "Focus on notional value, not margin", "Stop trying to get rich quick"];
  }
  // Priority 3: Stop Too Tight
  else if ((assetType === 'forex' && stopDistancePercentage < 0.05) || (assetType === 'crypto' && stopDistancePercentage < 0.5)) {
       causeOfDeath = "Market Maker's Lunch";
       verdict = "Your stop was so tight the spread alone probably killed you. You tried to be perfect and got wrecked.";
       fix = ["Base stop loss on ATR", "Give the trade room to breathe", "Stop trying to snipe tops/bottoms"];
  }
  // Priority 4: Bad R:R
  else if (takeProfit && riskRewardRatio < 1.0) {
      causeOfDeath = "Mathematical Suicide";
      verdict = `Risking $1 to make $${riskRewardRatio.toFixed(2)}? Even if you win, you lose long term. The math guarantees your bankruptcy.`;
      fix = ["Target at least 1:2 R:R", "Don't take trades with poor upside", "Wait for better setups"];
  }
  // Priority 5: Emotional Trade
  else if (riskPercentage > 2 && ["1m", "5m"].includes(timeframe) && !takeProfit) {
       causeOfDeath = "Emotional Tilt";
       verdict = "Scalping on the 1-minute chart with high risk? This was a dopamine hit, not a trade. Seek help.";
       fix = ["Step away after a loss", "Plan trade before entering", "Stop scalping without a proven system"];
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