import { RECRUIT_CONFIG } from '../config/RecruitConfig';
/** Sector 0 is centred under the fixed top pointer at rotation 0. */
export const SECTOR_COUNT = 7;
export const SECTOR_DEGREES = 360 / SECTOR_COUNT;
export const normalizeDegrees = (angle: number): number => (angle % 360 + 360) % 360;
export interface SpinPlan { readonly index: number; readonly start: number; readonly end: number; }
export function createSpinPlan(index: number, previousRotation: number): SpinPlan {
    if (!Number.isInteger(index) || index < 0 || index >= SECTOR_COUNT) throw new Error('Invalid roulette result');
    const start = normalizeDegrees(previousRotation);
    const end = start - RECRUIT_CONFIG.turns * 360 - normalizeDegrees(start - index * SECTOR_DEGREES);
    return Object.freeze({ index, start, end });
}
export function rotationAt(plan: SpinPlan, elapsed: number): number {
    const t = Math.max(0, Math.min(1, elapsed / RECRUIT_CONFIG.spinDuration));
    if (t === 0) return plan.start;
    if (t === 1) return plan.end;
    // Integral of 20t(1-t)^3: acceleration, inertia, then gradual deceleration to zero.
    const progress = 10 * t * t - 20 * t ** 3 + 15 * t ** 4 - 4 * t ** 5;
    return plan.start + (plan.end - plan.start) * progress;
}
export function sectorAtPointer(rotation: number): number {
    return Math.floor((normalizeDegrees(rotation) + SECTOR_DEGREES / 2) / SECTOR_DEGREES) % SECTOR_COUNT;
}
