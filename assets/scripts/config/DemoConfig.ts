/** Demo-only tuning. None of these names/numbers are final game design. */
export type BaseClass = 'warrior' | 'guardian' | 'assassin' | 'archer' | 'healer' | 'mage' | 'knight';
export type Role = 'melee' | 'ranged' | 'healer';
export type TargetPriority = 'nearest' | 'backline';
export interface SkillConfig {
    name: string; cooldown: number; multiplier: number; targets: number; radius: number;
    starPower: number[]; starTargets: number[];
}
export interface UnitConfig {
    id: string; name: string; base: BaseClass; role: Role; hp: number; attack: number;
    armor: number; speed: number; range: number; minRange: number; interval: number;
    radius: number; attackTargets: number; splash: number; priority: TargetPriority;
    skill: SkillConfig; color: string; description: string; extension?: boolean;
    gold?: number; xp?: number; boss?: boolean; tags?: string[];
}
export const BASES: { id: BaseClass; name: string; symbol: string }[] = [
    { id: 'warrior', name: '战士', symbol: '刃' }, { id: 'guardian', name: '盾卫', symbol: '盾' },
    { id: 'assassin', name: '刺客', symbol: '影' }, { id: 'archer', name: '弓箭手', symbol: '弓' },
    { id: 'healer', name: '治疗师', symbol: '愈' }, { id: 'mage', name: '法师', symbol: '法' },
    { id: 'knight', name: '骑士', symbol: '骑' },
];
const skill = (name: string, multiplier: number, targets = 1, cooldown = 6, radius = 120): SkillConfig =>
    ({ name, cooldown, multiplier, targets, radius, starPower: [1, 1.4, 2.1], starTargets: [0, 1, 2] });
const prototype: UnitConfig = {
    id: '', name: '', base: 'warrior', role: 'melee', hp: 310, attack: 30, armor: 3,
    speed: 108, range: 58, minRange: 0, interval: 1, radius: 23,
    attackTargets: 1, splash: 95, priority: 'nearest', skill: skill('重击', 2),
    color: '#C8B17B', description: '', tags: [],
};
function unit(id: string, name: string, base: BaseClass, values: Partial<UnitConfig>): UnitConfig {
    return { ...prototype, id, name, base, ...values };
}
/** Authoritative catalog: no public mixed list; queries always start with a base class ID. */
export const EVOLUTIONS_BY_BASE: Record<BaseClass, UnitConfig[]> = {
    warrior: [
    unit('blade', '月刃剑士', 'warrior', { description: '月弧斩：挥斩附近多个敌人', attackTargets: 2, skill: skill('月弧斩', 1.8, 3), color: '#D9C58A' }),
    unit('berserker', '赤誓狂战', 'warrior', { description: '血誓斩：快速单体爆发', hp: 290, attack: 39, interval: .86, skill: skill('血誓斩', 2.6), color: '#CE828D' }),
    unit('spellblade', '暮光魔剑', 'warrior', { description: '暮光裂隙：中距离群体斩击', range: 86, skill: skill('暮光裂隙', 1.9, 3, 7, 155), color: '#A999DC' }),
    ], guardian: [
    unit('iron', '铁壁守卫', 'guardian', { description: '壁垒震击：坚韧前排、范围打击', hp: 530, armor: 9, speed: 75, attack: 21, skill: skill('壁垒震击', 2, 3), color: '#8EAFBF' }),
    unit('holy', '圣誓盾卫', 'guardian', { description: '圣誓重击：高生命单体重击', hp: 480, armor: 7, speed: 80, attack: 25, skill: skill('圣誓重击', 3), color: '#D8CC9C' }),
    unit('thorn', '荆棘卫士', 'guardian', { description: '荆棘震荡：近身多目标攻击', hp: 450, armor: 6, speed: 82, attack: 24, attackTargets: 2, skill: skill('荆棘震荡', 2.1, 4), color: '#83B4A0' }),
    ], archer: [
    unit('longbow', '银月长弓', 'archer', { description: '穿月箭：远距离精准射击', role: 'ranged', hp: 220, armor: 1, attack: 36, range: 330, minRange: 115, speed: 110, skill: skill('穿月箭', 3), color: '#9BC7D9' }),
    unit('volley', '逐星游侠', 'archer', { description: '星雨齐射：普攻与技能命中多人', role: 'ranged', hp: 235, attack: 26, range: 290, minRange: 105, speed: 120, attackTargets: 2, skill: skill('星雨齐射', 1.8, 4, 6, 200), color: '#A6B9E1' }),
    unit('shadowbow', '幽影猎手', 'archer', { description: '幽影狙击：优先威胁敌方后排', role: 'ranged', hp: 230, attack: 33, range: 310, minRange: 110, speed: 125, priority: 'backline', skill: skill('幽影狙击', 2.8), color: '#B598D7' }),
    ], assassin: [], healer: [], mage: [], knight: [],
};
// Four extension classes use explicitly provisional directions so the seven equal-probability
// roulette entries remain playable. The first nine evolutions above are the primary Demo content.
const extensions: { base: BaseClass; names: string[]; values: Partial<UnitConfig> }[] = [
    { base: 'assassin', names: ['影袭', '疾刃', '夜行'], values: { hp: 250, speed: 155, attack: 37, interval: .8, priority: 'backline', color: '#B6A0D3' } },
    { base: 'healer', names: ['月愈', '祈愿', '守望'], values: { role: 'healer', hp: 260, attack: 20, range: 310, minRange: 125, speed: 112, interval: 1.5, color: '#91CBB3' } },
    { base: 'mage', names: ['星火', '霜月', '奥术'], values: { role: 'ranged', hp: 215, attack: 34, range: 280, minRange: 110, speed: 100, attackTargets: 2, color: '#B29EE2' } },
    { base: 'knight', names: ['冲锋', '银誓', '暮骑'], values: { hp: 390, attack: 29, armor: 5, speed: 145, color: '#C5B58E' } },
];
extensions.forEach(group => group.names.forEach((name, i) => EVOLUTIONS_BY_BASE[group.base].push(unit(
    `${group.base}_test_${i}`, `${name}·试作`, group.base,
    { ...group.values, extension: true, description: group.base === 'healer'
        ? `月光祈愈：优先治疗重伤友军${i ? '，祈愈可扩散至附近伙伴' : ''}`
        : `${name}技：${i ? '攻击目标及其附近的多个敌人' : '对单个敌人造成强力打击'}`,
        skill: skill(group.base === 'healer' ? '月光祈愈' : `${name}技`, 1.8 + i * .25, i + 1) },
))));
export const ENEMIES: Record<string, UnitConfig> = {
    ghoul: unit('ghoul', '荒原食尸鬼', 'warrior', { hp: 105, attack: 11, armor: 1, speed: 92, interval: 1.3, color: '#B88691', gold: 7, xp: 5 }),
    skeleton: unit('skeleton', '骸骨射手', 'archer', { role: 'ranged', hp: 85, attack: 12, range: 270, minRange: 100, speed: 85, interval: 1.5, color: '#B5A6D0', gold: 8, xp: 6 }),
    hunter: unit('hunter', '幽影潜猎者', 'archer', { role: 'ranged', hp: 100, attack: 14, range: 300, minRange: 100, speed: 110, priority: 'backline', color: '#B08BCC', gold: 9, xp: 7 }),
    elite: unit('elite', '裂甲统领', 'guardian', { hp: 410, attack: 24, armor: 5, speed: 80, radius: 31, range: 70, skill: skill('裂甲震击', 1.7, 3, 6, 150), color: '#D19A70', gold: 22, xp: 18 }),
    boss: unit('boss', '永夜守门者', 'knight', { boss: true, hp: 2100, attack: 32, armor: 6, speed: 86, radius: 51, range: 100, interval: 1.65, skill: skill('永夜崩裂', 2.1, 10, 7, 210), color: '#D8A36F', gold: 60, xp: 35 }),
};
export interface WaveConfig { name: string; enemies: string[]; }
export const DEMO_WAVES: WaveConfig[] = [
    { name: '城外游魂', enemies: ['ghoul', 'ghoul', 'skeleton'] },
    { name: '骸骨巡游', enemies: ['ghoul', 'ghoul', 'skeleton', 'hunter'] },
    { name: '暗潮涌动', enemies: ['ghoul', 'ghoul', 'ghoul', 'skeleton', 'hunter', 'skeleton'] },
    { name: '裂甲统领', enemies: ['elite', 'ghoul', 'ghoul', 'skeleton', 'hunter', 'hunter'] },
    { name: '永夜守门者', enemies: ['boss'] },
];
/** Formal twenty-wave data must be supplied by design; Demo never overwrites it. */
export const FORMAL_WAVES: WaveConfig[] = [];
export const RULES = {
    initialGold: 100, maxLevel: 10, maxSlots: 10, maxBoosts: 10,
    slotByLevel: [3, 4, 5, 6, 7, 8, 9, 10, 10, 10],
    xpToNext: [14, 22, 30, 38, 48, 58, 70, 85, 100],
    recruitBase: 10, recruitPerLevel: 2, recruitMax: 28,
    refundRatio: .5, refreshCost: 4, maxRefresh: 2,
    interestEvery: 10, interestCap: 5, interestTiming: 'wave-clear' as 'wave-clear' | 'wave-start',
    starHp: [1, 1.85, 3.4], starAttack: [1, 1.75, 3.05],
    boostStep: .05, maxStatBonus: .5,
};
export const AI_CONFIG = {
    searchInterval: .24, fixedStep: 1 / 30, maxFrame: .2,
    rangeHysteresis: 22, retreatDuration: .45, retreatCooldown: 1.1,
    windup: .22, bossWindup: .8, separationStrength: 7, separationPasses: 2,
    healerThreshold: .95,
    initialAttackDelay: .2, attackStagger: .07, initialSkillDelay: 2.8, skillStagger: .3,
};
export const FIELD = { left: -810, right: 810, bottom: -285, top: 285, formationRight: -60 };
export const BOOSTS = [
    { id: 'attack', name: '锋芒之誓', description: '全队攻击 +5%（加法叠加）' },
    { id: 'hp', name: '坚韧之誓', description: '全队生命 +5%（加法叠加）' },
    { id: 'haste', name: '迅捷之誓', description: '全队攻速 +5%（加法叠加）' },
    { id: 'armor', name: '守护之誓', description: '全队护甲 +1' },
    { id: 'speed', name: '疾行之誓', description: '全队移速 +5%（加法叠加）' },
] as const;
export type BoostId = typeof BOOSTS[number]['id'];
