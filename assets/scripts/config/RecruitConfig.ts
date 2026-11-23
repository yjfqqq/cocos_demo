import { BaseClass } from './DemoConfig';
/** Recruitment/presentation tuning; combat rules remain independent from the visual layout. */
export const RECRUIT_CONFIG = { price: 10, spinDuration: 3.8, revealDuration: 1, turns: 5 };
export interface ClassPresentation { color: string; light: string; role: string; iconResource?: string; }
/** Optional resources path replaces the vector class icon without changing roulette logic. */
export const CLASS_PRESENTATION: Record<BaseClass, ClassPresentation> = {
    warrior: { color: '#493345', light: '#F2C77A', role: '近战 · 持续输出' },
    guardian: { color: '#293C50', light: '#A8D8E9', role: '前排 · 承受伤害' },
    assassin: { color: '#3A2D50', light: '#C7A6F2', role: '近战 · 快速突袭' },
    archer: { color: '#293F43', light: '#A5D9B8', role: '远程 · 箭矢输出' },
    healer: { color: '#30443E', light: '#C4E7A7', role: '支援 · 自动治疗' },
    mage: { color: '#343453', light: '#B9B5FF', role: '远程 · 范围伤害' },
    knight: { color: '#49402F', light: '#F0D38C', role: '近战 · 快速接敌' },
};
/**
 * 1920×1080 battle preparation composition.
 * The two framed panels share the same vertical bounds. The battlefield is
 * horizontally compressed to fit the right column; actor visuals compensate
 * for that transform while their model coordinates remain unchanged.
 */
export const BATTLE_LAYOUT = {
    fieldX: 325,
    fieldScaleX: 0.75,
    fieldScaleY: 1.25,
    fieldWidth: 1700,
    panelY: -10,
    panelHeight: 820,
    wheelX: -632.5,
    wheelY: 0,
    wheelWidth: 620,
    wheelRadius: 216,
};