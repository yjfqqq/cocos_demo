import { BASES, BaseClass } from '../config/DemoConfig';
export class RouletteManager {
    constructor(private random: () => number = Math.random) {}
    spin(): BaseClass {
        const value = this.random();
        if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Random source must return [0, 1)');
        return BASES[Math.floor(value * BASES.length)].id;
    }
}
