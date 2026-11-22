import { DEMO_WAVES, ENEMIES } from '../config/DemoConfig';
import { UnitController } from './UnitController';
export class WaveDirector {
    readonly waves = DEMO_WAVES;
    spawn(index: number): UnitController[] {
        const wave = this.waves[index];
        if (!wave) return [];
        return wave.enemies.map((id, i) => new UnitController(1000 + i, ENEMIES[id], 'enemy', 1,
            ENEMIES[id].boss ? 540 : 400 + Math.floor(i / 4) * 130,
            ENEMIES[id].boss ? 0 : 210 - (i % 4) * 140));
    }
}
