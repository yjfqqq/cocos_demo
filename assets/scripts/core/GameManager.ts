import { BoostId, DEMO_WAVES, RULES } from '../config/DemoConfig';
import { BattleManager } from '../battle/BattleManager';
import { EventManager } from './EventManager';
import { GameState } from './GameState';
import { EconomyManager } from '../progression/EconomyManager';
import { PlayerLevelManager } from '../progression/PlayerLevelManager';
import { FormationManager } from '../recruit/FormationManager';
import { MergeManager, MergeOffer } from '../recruit/MergeManager';
import { RecruitManager } from '../recruit/RecruitManager';
import { RECRUIT_CONFIG } from '../config/RecruitConfig';
export class GameManager {
    state = GameState.Preparation;
    wave = 0;
    cleared = 0;
    kills = 0;
    lastInterest = 0;
    waveTimes: number[] = [];
    readonly changed = new EventManager<GameManager>();
    readonly economy = new EconomyManager();
    readonly formation = new FormationManager();
    readonly progression: PlayerLevelManager;
    readonly recruit: RecruitManager;
    readonly merge = new MergeManager();
    mergeOffer: MergeOffer | undefined;
    readonly battle: BattleManager;
    private finalVictory = false;
    constructor(random: () => number = Math.random) {
        this.progression = new PlayerLevelManager(random);
        this.recruit = new RecruitManager(random);
        this.battle = new BattleManager(unit => {
            if (unit.team === 'enemy') {
                this.kills++; this.economy.gain(unit.config.gold || 0); this.progression.gain(unit.config.xp || 0);
                this.notify();
            }
        }, won => this.finishWave(won));
    }
    get price(): number { return RECRUIT_CONFIG.price; }
    get capacity(): number { return this.formation.capacity(this.progression.level); }
    get canArrange(): boolean { return this.state === GameState.Preparation || this.state === GameState.Placement; }
    private notify(): void { this.changed.emit(this); }
    spin(): boolean {
        if (this.state !== GameState.Preparation || this.economy.gold < this.price) return false;
        if (!this.recruit.spin(this.price)) return false;
        this.economy.spend(this.price);
        this.state = GameState.Roulette; this.notify(); return true;
    }
    updateRecruit(dt: number): void {
        if (this.state === GameState.Roulette && this.recruit.advance(dt)) {
            this.state = GameState.Evolution; this.notify();
        }
    }
    selectEvolution(id: string): boolean {
        if (this.state !== GameState.Evolution || !this.recruit.choices.some(choice => choice.id === id && choice.base === this.recruit.drawnBase)) return false;
        this.recruit.selectedEvolutionId = id; this.notify(); return true;
    }
    confirmEvolution(): boolean {
        if (this.state !== GameState.Evolution || !this.recruit.selectedEvolutionId) return false;
        const config = this.recruit.choices.find(choice => choice.id === this.recruit.selectedEvolutionId && choice.base === this.recruit.drawnBase);
        if (!config) return false;
        this.recruit.pending = this.formation.create(config, this.recruit.paid);
        if (this.formation.units.length >= this.capacity) this.state = GameState.Replacement;
        else { this.formation.units.push(this.recruit.pending); this.formation.settle(this.recruit.pending.id); this.state = GameState.Placement; }
        this.notify(); return true;
    }
    replace(id: number): boolean {
        if (this.state !== GameState.Replacement || !this.recruit.pending) return false;
        const index = this.formation.units.findIndex(unit => unit.id === id);
        if (index < 0) return false;
        const old = this.formation.units[index];
        this.economy.gain(Math.floor(old.investment * RULES.refundRatio));
        this.recruit.pending.x = old.x; this.recruit.pending.y = old.y;
        this.formation.units[index] = this.recruit.pending;
        this.state = GameState.Placement; this.notify(); return true;
    }
    move(id: number, x: number, y: number): void { if (this.canArrange) this.formation.move(id, x, y); }
    confirmPlacement(): void {
        if (this.state !== GameState.Placement) return;
        this.recruit.pending = null; this.checkMerge();
    }
    private checkMerge(): void {
        this.mergeOffer = this.merge.next(this.formation);
        this.state = this.mergeOffer ? GameState.Merge : GameState.Preparation; this.notify();
    }
    resolveMerge(accept: boolean): void {
        if (this.state !== GameState.Merge || !this.mergeOffer) return;
        if (accept) this.merge.merge(this.mergeOffer, this.formation);
        else this.merge.decline(this.mergeOffer);
        this.checkMerge();
    }
    startBattle(): boolean {
        if (this.state !== GameState.Preparation || !this.formation.units.length) return false;
        this.lastInterest = this.economy.interest('wave-start');
        this.state = GameState.Battle;
        this.battle.start(this.formation.units, this.progression, this.wave); this.notify(); return true;
    }
    private finishWave(won: boolean): void {
        this.waveTimes.push(this.battle.elapsed);
        if (!won) { this.state = GameState.Defeat; this.notify(); return; }
        this.cleared++; this.lastInterest = this.economy.interest('wave-clear');
        this.finalVictory = this.cleared >= DEMO_WAVES.length;
        if (!this.finalVictory) this.wave++;
        this.resumeAfterUpgrade();
    }
    private resumeAfterUpgrade(): void {
        if (this.progression.pending) {
            this.progression.roll(true); this.state = GameState.Upgrade;
        } else this.state = this.finalVictory ? GameState.Victory : GameState.Preparation;
        this.notify();
    }
    chooseBoost(id: BoostId): void {
        if (this.state !== GameState.Upgrade || !this.progression.choose(id)) return;
        this.resumeAfterUpgrade();
    }
    refreshBoost(): boolean {
        if (this.state !== GameState.Upgrade || this.progression.refreshes >= RULES.maxRefresh
            || !this.economy.spend(RULES.refreshCost)) return false;
        this.progression.refreshes++; this.progression.roll(); this.notify(); return true;
    }
}
