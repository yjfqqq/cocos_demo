import { RULES } from '../config/DemoConfig';
export class EconomyManager {
    gold = RULES.initialGold;
    earned = 0;
    price(level: number): number { return Math.min(RULES.recruitBase + (level - 1) * RULES.recruitPerLevel, RULES.recruitMax); }
    spend(amount: number): boolean {
        if (amount < 0 || this.gold < amount) return false;
        this.gold -= amount; return true;
    }
    gain(amount: number): void { this.gold += amount; this.earned += amount; }
    interest(timing: typeof RULES.interestTiming): number {
        if (RULES.interestTiming !== timing) return 0;
        const amount = Math.min(Math.floor(this.gold / RULES.interestEvery), RULES.interestCap);
        this.gain(amount); return amount;
    }
}
