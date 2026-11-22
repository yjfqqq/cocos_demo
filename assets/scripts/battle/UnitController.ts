import { AI_CONFIG, RULES, UnitConfig } from '../config/DemoConfig';
import { PlayerLevelManager } from '../progression/PlayerLevelManager';
export enum AIState {
    Idle = 'Idle', SearchTarget = 'SearchTarget', MoveToTarget = 'MoveToTarget',
    KeepDistance = 'KeepDistance', Attack = 'Attack', CastSkill = 'CastSkill', Dead = 'Dead',
}
export interface PendingAction { target: UnitController; skill: boolean; time: number; }
export class UnitController {
    state = AIState.Idle;
    hp: number;
    maxHp: number;
    attack: number;
    armor: number;
    speed: number;
    interval: number;
    target: UnitController | null = null;
    threat: UnitController | null = null;
    searchClock = 0;
    attackClock: number;
    skillClock: number;
    retreatClock = 0;
    retreatRemaining = 0;
    action: PendingAction | null = null;
    flash = 0;
    animation = 0;
    facing = 1;
    constructor(public id: number, public config: UnitConfig, public team: 'ally' | 'enemy',
        public star: number, public x: number, public y: number, bonuses?: PlayerLevelManager['bonuses']) {
        this.maxHp = config.hp * RULES.starHp[star - 1] * (1 + (bonuses?.hp || 0));
        this.hp = this.maxHp;
        this.attack = config.attack * RULES.starAttack[star - 1] * (1 + (bonuses?.attack || 0));
        this.armor = config.armor + (bonuses?.armor || 0);
        this.speed = config.speed * (1 + (bonuses?.speed || 0));
        this.interval = config.interval / (1 + (bonuses?.haste || 0));
        this.attackClock = AI_CONFIG.initialAttackDelay + (id % 5) * AI_CONFIG.attackStagger;
        this.skillClock = Math.min(config.skill.cooldown, AI_CONFIG.initialSkillDelay + (id % 4) * AI_CONFIG.skillStagger);
        this.searchClock = (id % 7) * AI_CONFIG.searchInterval / 7;
    }
    get alive(): boolean { return this.hp > 0; }
    get radius(): number { return this.config.radius; }
    distance(other: UnitController): number { return Math.hypot(other.x - this.x, other.y - this.y); }
    reach(other: UnitController): number { return this.config.range + other.radius; }
}
