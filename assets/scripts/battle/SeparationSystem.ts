import { AI_CONFIG } from '../config/DemoConfig';
import { MovementSystem } from './MovementSystem';
import { UnitController } from './UnitController';
/** Uniform spatial hash: separation only visits neighbouring cells, never an all-pairs frame scan. */
export class SeparationSystem {
    private movement = new MovementSystem();
    apply(units: UnitController[], dt: number): void {
        const cell = 120;
        for (let pass = 0; pass < AI_CONFIG.separationPasses; pass++) {
            const buckets = new Map<string, UnitController[]>();
            for (const unit of units) {
                if (!unit.alive) continue;
                const key = `${Math.floor(unit.x / cell)},${Math.floor(unit.y / cell)}`;
                const bucket = buckets.get(key) || []; bucket.push(unit); buckets.set(key, bucket);
            }
            for (const unit of units) {
                if (!unit.alive) continue;
                const bx = Math.floor(unit.x / cell), by = Math.floor(unit.y / cell);
                for (let x = bx - 1; x <= bx + 1; x++) for (let y = by - 1; y <= by + 1; y++) {
                    for (const other of buckets.get(`${x},${y}`) || []) {
                        if (unit.id >= other.id) continue;
                        let dx = unit.x - other.x, dy = unit.y - other.y;
                        let distance = Math.hypot(dx, dy);
                        const minimum = unit.radius + other.radius;
                        if (distance >= minimum) continue;
                        if (distance < .001) { dx = unit.id % 2 ? 1 : -1; dy = .6; distance = Math.hypot(dx, dy); }
                        const push = (minimum - distance) * Math.min(.48, AI_CONFIG.separationStrength * dt);
                        const px = dx / distance * push, py = dy / distance * push;
                        unit.x += px; unit.y += py; other.x -= px; other.y -= py;
                        this.movement.clamp(unit); this.movement.clamp(other);
                    }
                }
            }
        }
    }
}
