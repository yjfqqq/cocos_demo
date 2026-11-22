import { BaseClass, EVOLUTIONS_BY_BASE, UnitConfig } from '../config/DemoConfig';
export class EvolutionManager {
    choices(base: BaseClass): UnitConfig[] { return [...(EVOLUTIONS_BY_BASE[base] || [])]; }
}
