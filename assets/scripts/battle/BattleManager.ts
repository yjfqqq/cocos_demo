import { AI_CONFIG } from '../config/DemoConfig';
import { EventManager } from '../core/EventManager';
import { PlayerLevelManager } from '../progression/PlayerLevelManager';
import { FormationUnit } from '../recruit/FormationManager';
import { CombatEvent, CombatSystem } from './CombatSystem';
import { SeparationSystem } from './SeparationSystem';
import { UnitAI } from './UnitAI';
import { UnitController } from './UnitController';
import { WaveDirector } from './WaveDirector';
export class BattleManager {
    units: UnitController[] = [];
    allies: UnitController[] = [];
    enemies: UnitController[] = [];
    readonly events = new EventManager<CombatEvent>();
    readonly director = new WaveDirector();
    private ai = new UnitAI();
    private separation = new SeparationSystem();
    private combat: CombatSystem;
    private accumulator = 0;
    elapsed = 0;
    running = false;
    constructor(private death: (unit: UnitController) => void, private finish: (won: boolean) => void) {
        this.combat = new CombatSystem(event => this.events.emit(event), unit => {
            // Remove immediately from the live indexes. Visual corpses remain only in units.
            this.allies = this.allies.filter(other => other !== unit);
            this.enemies = this.enemies.filter(other => other !== unit);
            this.death(unit);
        });
    }
    start(formation: FormationUnit[], progression: PlayerLevelManager, wave: number): void {
        this.allies = formation.map(unit => new UnitController(unit.id, unit.config, 'ally', unit.star, unit.x, unit.y, progression.bonuses));
        this.enemies = this.director.spawn(wave);
        this.units = [...this.allies, ...this.enemies];
        this.elapsed = 0; this.accumulator = 0; this.running = true;
    }
    update(dt: number): void {
        if (!this.running) return;
        this.accumulator += Math.min(AI_CONFIG.maxFrame, dt);
        while (this.accumulator >= AI_CONFIG.fixedStep && this.running) {
            this.accumulator -= AI_CONFIG.fixedStep;
            this.step(AI_CONFIG.fixedStep);
        }
    }
    private step(dt: number): void {
        this.elapsed += dt;
        for (const unit of this.units) {
            this.ai.update(unit, unit.team === 'ally' ? this.allies : this.enemies,
                unit.team === 'ally' ? this.enemies : this.allies, dt, this.combat);
        }
        this.separation.apply(this.units, dt);
        if (!this.allies.length || !this.enemies.length) {
            this.running = false; this.finish(this.allies.length > 0);
        }
    }
}
