import { BOOSTS, BoostId, RULES } from '../config/DemoConfig';
export class PlayerLevelManager {
    level = 1;
    xp = 0;
    pending = 0;
    choicesMade = 0;
    refreshes = 0;
    choices: BoostId[] = [];
    bonuses: Record<BoostId, number> = { attack: 0, hp: 0, haste: 0, armor: 0, speed: 0 };
    constructor(private random: () => number = Math.random) {}
    get nextXP(): number { return RULES.xpToNext[this.level - 1] || 0; }
    gain(xp: number): void {
        this.xp += xp;
        while (this.level < RULES.maxLevel && this.xp >= this.nextXP) {
            this.xp -= this.nextXP; this.level++;
            if (this.choicesMade + this.pending < RULES.maxBoosts) this.pending++;
        }
        if (this.level === RULES.maxLevel) this.xp = 0;
    }
    roll(resetRefresh = false): void {
        if (resetRefresh) this.refreshes = 0;
        const pool: BoostId[] = BOOSTS.map(boost => boost.id);
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        this.choices = pool.slice(0, 3);
    }
    choose(id: BoostId): boolean {
        if (this.pending <= 0 || this.choices.indexOf(id) < 0) return false;
        this.bonuses[id] = id === 'armor' ? Math.min(10, this.bonuses[id] + 1)
            : Math.min(RULES.maxStatBonus, this.bonuses[id] + RULES.boostStep);
        this.pending--; this.choicesMade++; this.choices = [];
        return true;
    }
}
