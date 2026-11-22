import { FIELD } from '../config/DemoConfig';
import { UnitController } from './UnitController';
export class MovementSystem {
    move(unit: UnitController, target: UnitController, dt: number, retreat = false): boolean {
        let dx = target.x - unit.x, dy = target.y - unit.y;
        const length = Math.hypot(dx, dy);
        if (length < .01) { dx = unit.id % 2 ? 1 : -1; dy = .5; }
        const norm = Math.hypot(dx, dy);
        const step = Math.min(unit.speed * dt * (retreat ? .8 : 1), retreat ? Infinity : Math.max(0, length - unit.reach(target) + 4));
        const oldX = unit.x, oldY = unit.y;
        unit.x += dx / norm * step * (retreat ? -1 : 1);
        unit.y += dy / norm * step * (retreat ? -1 : 1);
        unit.facing = dx >= 0 ? 1 : -1;
        this.clamp(unit);
        return Math.hypot(unit.x - oldX, unit.y - oldY) > .1;
    }
    clamp(unit: UnitController): void {
        unit.x = Math.max(FIELD.left + unit.radius, Math.min(FIELD.right - unit.radius, unit.x));
        unit.y = Math.max(FIELD.bottom + unit.radius, Math.min(FIELD.top - unit.radius, unit.y));
    }
}
