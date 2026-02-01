import { AnalysisResult } from "./types";

export type CertificateType = 
  | 'The Autopsy' // Default
  | 'The Donor' // High Risk / Huge Loss
  | 'The Sniper' // High R:R + Won (if we knew result, but here we analyze input. We can infer "Sniper" if R:R > 3 and tight stop?) -> Let's stick to "The Sniper" for potential high R:R setups or if input has "lossAmount" > 0 (profit).
  | 'Paper Hands' // Closed early (if input has lossAmount small but TP huge? Hard to detect without outcome. Let's assume input might have "closePrice" later. For now, trigger on "Break Even" or small win/loss logic if we add it.) -> Trigger if RR < 0.5?
  | 'Liquidity Provider' // Stop Hunted
  | 'The Gambler' // Max Leverage / No SL
  | 'Rekt'; // 90%+ Loss

export function getCertificateType(result: AnalysisResult): CertificateType {
    const { riskPercentage, leverageExposure, causeOfDeath, propFirmViolation } = result;

    // 1. The Donor (Charity)
    // Risking > 5% or Prop Firm Violation
    if (propFirmViolation || riskPercentage > 5) {
        return 'The Donor';
    }

    // 2. The Gambler
    // Leverage > 50x OR No SL (implied if stopDistance is huge/undefined, but our type has it. Let's use leverage or "Emotional Tilt" cause)
    if (leverageExposure > 50 || causeOfDeath === 'Emotional Tilt' || causeOfDeath === 'Over-Leverage') {
        return 'The Gambler';
    }

    // 3. Liquidity Provider
    // Stop Hunted
    if (causeOfDeath === 'Stop Hunted') {
        return 'Liquidity Provider';
    }

    // 4. Paper Hands
    // Negative R:R often implies "I just want a quick buck" or fear
    if (causeOfDeath === 'Negative R:R') {
        return 'Paper Hands';
    }

    // 5. Rekt
    // If loss amount is massive relative to account (already covered by Donor, but maybe Rekt is extreme?)
    // Let's make Rekt if risk > 20%
    if (riskPercentage > 20) {
        return 'Rekt';
    }

    // Default
    return 'The Autopsy';
}

export const CERTIFICATE_THEMES: Record<CertificateType, { title: string; subtitle: string; color: string; stamp: string; icon: string }> = {
    'The Autopsy': {
        title: "OFFICIAL AUTOPSY REPORT",
        subtitle: "FORENSIC ANALYSIS OF A FAILED TRADE",
        color: "text-slate-900",
        stamp: "DECEASED",
        icon: "💀"
    },
    'The Donor': {
        title: "CERTIFICATE OF DONATION",
        subtitle: "GENEROUSLY DONATING LIQUIDITY TO INSTITUTIONS",
        color: "text-red-900",
        stamp: "PHILANTHROPIST",
        icon: "💸"
    },
    'The Sniper': { // Not used in logic yet, but ready
        title: "PRECISION STRIKE",
        subtitle: "CONFIRMED KILL",
        color: "text-green-900",
        stamp: "TARGET ELIMINATED",
        icon: "🎯"
    },
    'Paper Hands': {
        title: "CERTIFICATE OF COWARDICE",
        subtitle: "FOLDED UNDER PRESSURE",
        color: "text-yellow-900",
        stamp: "WEAK HANDS",
        icon: "🧻"
    },
    'Liquidity Provider': {
        title: "LIQUIDITY PROVIDER AWARD",
        subtitle: "THANK YOU FOR YOUR STOP LOSS",
        color: "text-blue-900",
        stamp: "STOP HUNTED",
        icon: "💧"
    },
    'The Gambler': {
        title: "CASINO VIP MEMBERSHIP",
        subtitle: "SIR, THIS IS A WENDY'S",
        color: "text-purple-900",
        stamp: "DEGENERATE",
        icon: "🎰"
    },
    'Rekt': {
        title: "NOTICE OF EVICTION",
        subtitle: "MARKET HAS EVICTED YOU FROM SOLVENCY",
        color: "text-red-700",
        stamp: "LIQUIDATED",
        icon: "📉"
    }
};
