import { FIELD, RULES, UnitConfig } from '../config/DemoConfig';
export interface FormationUnit { id: number; config: UnitConfig; star: number; x: number; y: number; investment: number; }
export class FormationManager {
    units: FormationUnit[] = [];
    private serial = 0;
    capacity(level: number): number { return Math.min(RULES.maxSlots, RULES.slotByLevel[level - 1]); }
    create(config: UnitConfig, investment: number): FormationUnit {
        const i = this.units.length;
        return { id: ++this.serial, config, star: 1, x: -600 + Math.floor(i / 3) * 145, y: 175 - (i % 3) * 175, investment };
    }
    move(id: number, x: number, y: number): void {
        const unit = this.units.find(candidate => candidate.id === id);
        if (!unit) return;
        unit.x = Math.max(FIELD.left + unit.config.radius, Math.min(FIELD.formationRight - unit.config.radius, x));
        unit.y = Math.max(FIELD.bottom + unit.config.radius, Math.min(FIELD.top - unit.config.radius, y));
    }
    /** Preparation uses a few relaxation passes to keep manual positions free of total overlaps. */
    settle(id: number): void {
        const unit = this.units.find(candidate => candidate.id === id);
        if (!unit) return;
        for (let pass = 0; pass < 12; pass++) for (const other of this.units) {
            if (other === unit) continue;
            let dx = unit.x - other.x, dy = unit.y - other.y;
            const d = Math.hypot(dx, dy), minimum = unit.config.radius + other.config.radius + 8;
            if (d >= minimum) continue;
            if (d < .01) { dx = 1; dy = .6; }
            const length = Math.hypot(dx, dy);
            this.move(id, unit.x + dx / length * (minimum - d), unit.y + dy / length * (minimum - d));
        }
    }
}
