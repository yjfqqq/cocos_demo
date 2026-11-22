import { AI_CONFIG } from '../config/DemoConfig';
import { UnitController } from './UnitController';
export class TargetingSystem {
    select(unit: UnitController, allies: UnitController[], enemies: UnitController[]): UnitController | null {
        if (unit.config.role === 'healer') {
            let selected: UnitController | null = null, score = Infinity;
            for (const ally of allies) {
                if (!ally.alive || ally.hp / ally.maxHp >= AI_CONFIG.healerThreshold) continue;
                // Lowest health ratio first, distance breaks ties. Full-health targets are excluded.
                const value = ally.hp / ally.maxHp * 10000 + unit.distance(ally);
                if (value < score) { selected = ally; score = value; }
            }
            return selected;
        }
        let selected: UnitController | null = null, best = Infinity;
        for (const enemy of enemies) {
            if (!enemy.alive) continue;
            const distance = unit.distance(enemy);
            const inRange = distance <= unit.reach(enemy);
            const backline = enemy.config.role !== 'melee';
            const score = distance - (unit.config.role === 'ranged' && inRange ? 2000 : 0)
                - (unit.config.priority === 'backline' && backline ? 4000 : 0);
            if (score < best) { best = score; selected = enemy; }
        }
        return selected;
    }
    valid(unit: UnitController, target: UnitController | null): target is UnitController {
        return !!target && target.alive && (unit.config.role !== 'healer'
            || target.hp / target.maxHp < AI_CONFIG.healerThreshold);
    }
}
