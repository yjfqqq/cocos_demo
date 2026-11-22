import { AI_CONFIG } from '../config/DemoConfig';
import { CombatSystem } from './CombatSystem';
import { MovementSystem } from './MovementSystem';
import { TargetingSystem } from './TargetingSystem';
import { AIState, UnitController } from './UnitController';
export class UnitAI {
    private targeting = new TargetingSystem();
    private movement = new MovementSystem();
    update(unit: UnitController, friends: UnitController[], enemies: UnitController[], dt: number, combat: CombatSystem): void {
        if (!unit.alive) return;
        unit.attackClock -= dt; unit.skillClock -= dt; unit.searchClock -= dt; unit.retreatClock -= dt;
        unit.flash = Math.max(0, unit.flash - dt); unit.animation = Math.max(0, unit.animation - dt);
        if (unit.action) {
            unit.action.time -= dt;
            if (unit.action.time <= 0) combat.resolve(unit, unit.config.role === 'healer' ? friends : enemies);
            return;
        }
        const valid = this.targeting.valid(unit, unit.target);
        // Stable targets: retain until invalid. Healers periodically re-evaluate triage.
        if ((!valid && (unit.searchClock <= 0 || !!unit.target)) || (unit.config.role === 'healer' && unit.searchClock <= 0)) {
            unit.target = null;
            if (unit.searchClock <= 0 || !valid) {
                unit.state = AIState.SearchTarget;
                unit.target = this.targeting.select(unit, friends, enemies);
                unit.threat = unit.config.role === 'healer' ? enemies.reduce<UnitController | null>((best, enemy) => !enemy.alive ? best
                    : !best || unit.distance(enemy) < unit.distance(best) ? enemy : best, null) : unit.target;
                unit.searchClock = AI_CONFIG.searchInterval;
            }
        }
        const target = unit.target;
        if (!target) {
            unit.state = AIState.Idle;
            return;
        }
        const distance = unit.distance(target), reach = unit.reach(target);
        const nearestThreat = unit.config.role === 'healer' ? unit.threat : target;
        const canRetreat = unit.config.role !== 'melee' && nearestThreat && unit.distance(nearestThreat) < unit.config.minRange;
        if (canRetreat && unit.retreatClock <= 0) {
            unit.retreatRemaining = AI_CONFIG.retreatDuration;
            unit.retreatClock = AI_CONFIG.retreatDuration + AI_CONFIG.retreatCooldown;
        }
        if (unit.retreatRemaining > 0 && nearestThreat) {
            unit.retreatRemaining -= dt;
            unit.state = AIState.KeepDistance;
            // Bounded retreat bursts alternate with attacks; clamped edges cannot deadlock attacks.
            this.movement.move(unit, nearestThreat, dt, true);
            return;
        }
        if (distance > reach + (unit.state === AIState.MoveToTarget ? 0 : AI_CONFIG.rangeHysteresis * .25)) {
            unit.state = AIState.MoveToTarget;
            this.movement.move(unit, target, dt);
            return;
        }
        unit.state = unit.config.role === 'melee' ? AIState.Attack : AIState.KeepDistance;
        if (distance <= reach && unit.attackClock <= 0) combat.begin(unit, target, unit.skillClock <= 0);
    }
}
