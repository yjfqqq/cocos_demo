import { AI_CONFIG } from '../config/DemoConfig';
import { AIState, UnitController } from './UnitController';
export interface CombatEvent {
    kind: 'attack' | 'skill' | 'hit' | 'heal' | 'death' | 'windup';
    source: UnitController; target: UnitController; amount?: number; skill?: boolean;
}
export class CombatSystem {
    constructor(private emit: (event: CombatEvent) => void, private onDeath: (unit: UnitController) => void) {}
    begin(unit: UnitController, target: UnitController, skill: boolean): void {
        unit.action = { target, skill, time: unit.config.boss && skill ? AI_CONFIG.bossWindup : AI_CONFIG.windup };
        unit.state = skill ? AIState.CastSkill : AIState.Attack;
        if (skill) unit.skillClock = unit.config.skill.cooldown;
        unit.attackClock = unit.interval;
        unit.animation = .38;
        unit.facing = target.x >= unit.x ? 1 : -1;
        this.emit({ kind: 'windup', source: unit, target, skill });
    }
    resolve(unit: UnitController, targets: UnitController[]): void {
        const action = unit.action;
        unit.action = null;
        if (!action || !unit.alive || !action.target.alive) return;
        const target = action.target;
        if (unit.distance(target) > unit.reach(target) + AI_CONFIG.rangeHysteresis) return;
        const config = unit.config;
        const count = action.skill ? config.skill.targets + config.skill.starTargets[unit.star - 1] : config.attackTargets;
        const radius = action.skill ? config.skill.radius : config.splash;
        const hits = [target, ...targets.filter(other => other !== target && other.alive && target.distance(other) <= radius)
            .sort((a, b) => target.distance(a) - target.distance(b))].slice(0, count);
        const power = unit.attack * (action.skill ? config.skill.multiplier * config.skill.starPower[unit.star - 1] : 1);
        this.emit({ kind: action.skill ? 'skill' : 'attack', source: unit, target, skill: action.skill });
        for (const hit of hits) {
            if (!hit.alive) continue;
            if (config.role === 'healer') {
                if (hit.hp >= hit.maxHp) continue;
                const amount = Math.min(power, hit.maxHp - hit.hp); hit.hp += amount;
                this.emit({ kind: 'heal', source: unit, target: hit, amount });
            } else {
                const amount = Math.max(1, power * 100 / (100 + hit.armor * 5));
                hit.hp = Math.max(0, hit.hp - amount); hit.flash = .15;
                this.emit({ kind: 'hit', source: unit, target: hit, amount });
                if (!hit.alive) {
                    hit.state = AIState.Dead; hit.target = null; hit.action = null;
                    this.onDeath(hit); this.emit({ kind: 'death', source: unit, target: hit });
                }
            }
        }
    }
}
