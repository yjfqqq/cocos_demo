import { BASES, BaseClass, UnitConfig } from '../config/DemoConfig';
import { RECRUIT_CONFIG } from '../config/RecruitConfig';
import { EvolutionManager } from './EvolutionManager';
import { FormationUnit } from './FormationManager';
import { RouletteManager } from './RouletteManager';
import { createSpinPlan, normalizeDegrees, rotationAt, SpinPlan } from './RouletteSpin';
export class RecruitManager {
    readonly roulette: RouletteManager;
    readonly evolution = new EvolutionManager();
    drawnBase: BaseClass | null = null;
    choices: UnitConfig[] = [];
    selectedEvolutionId: string | null = null;
    pending: FormationUnit | null = null;
    paid = 0;
    elapsed = 0;
    plan: SpinPlan | null = null;
    error = '';
    private lastRotation = 0;
    constructor(random: () => number = Math.random) { this.roulette = new RouletteManager(random); }
    get rotation(): number { return this.plan ? rotationAt(this.plan, this.elapsed) : this.lastRotation; }
    get revealing(): boolean { return !!this.plan && this.elapsed >= RECRUIT_CONFIG.spinDuration; }
    /** Validation precedes the gold debit, preventing paid draws with missing configuration. */
    spin(price: number): boolean {
        this.error = '';
        try {
            const base = this.roulette.spin();
            const choices = this.evolution.choices(base);
            if (choices.length !== 3 || new Set(choices.map(choice => choice.id)).size !== 3
                || choices.some(choice => choice.base !== base)) throw new Error('该职业的三个转职配置尚未完整，未扣金币');
            this.drawnBase = base; this.choices = choices; this.selectedEvolutionId = null;
            this.plan = createSpinPlan(BASES.findIndex(candidate => candidate.id === base), this.lastRotation);
            this.paid = price; this.elapsed = 0; return true;
        } catch (error) {
            this.error = error instanceof Error ? error.message : '命运转盘暂时无法开启，未扣金币';
            return false;
        }
    }
    advance(dt: number): boolean {
        if (!this.plan || !Number.isFinite(dt) || dt <= 0) return false;
        this.elapsed = Math.min(this.elapsed + dt, RECRUIT_CONFIG.spinDuration + RECRUIT_CONFIG.revealDuration);
        if (this.elapsed < RECRUIT_CONFIG.spinDuration + RECRUIT_CONFIG.revealDuration) return false;
        this.lastRotation = normalizeDegrees(this.plan.end); return true;
    }
}
