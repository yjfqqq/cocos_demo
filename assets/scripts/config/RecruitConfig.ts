import { BaseClass } from './DemoConfig';
/** Recruitment/presentation tuning; battle AI and economy/XP rewards stay unchanged. */
export const RECRUIT_CONFIG = { price: 10, spinDuration: 3.8, revealDuration: 1, turns: 5 };
export interface ClassPresentation { color: string; light: string; role: string; iconResource?: string; }
/** Optional resources path replaces the vector placeholder icon without changing roulette logic. */
export const CLASS_PRESENTATION: Record<BaseClass, ClassPresentation> = {
    warrior: { color: '#493345', light: '#D7A694', role: '近战 · 持续输出' },
    guardian: { color: '#293C50', light: '#A1C7D4', role: '前排 · 承受伤害' },
    assassin: { color: '#3A2D50', light: '#BBA4DC', role: '近战 · 快速突袭' },
    archer: { color: '#293F43', light: '#A0C9BC', role: '远程 · 箭矢输出' },
    healer: { color: '#30443E', light: '#B1D5AE', role: '支援 · 自动治疗' },
    mage: { color: '#343453', light: '#ADADE7', role: '远程 · 范围伤害' },
    knight: { color: '#49402F', light: '#DACE9C', role: '近战 · 快速接敌' },
};
export const BATTLE_LAYOUT = { fieldX: 330, fieldScaleX: .7, wheelX: -650, wheelY: 20, wheelRadius: 216 };
