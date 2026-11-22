import { _decorator, Component, director, EventTouch, Font, Graphics, isValid, Label, Node, profiler, resources, SpriteFrame, UITransform, Vec3 } from 'cc';
import { CombatEvent } from '../battle/CombatSystem';
import { BASES, DEMO_WAVES, FIELD } from '../config/DemoConfig';
import { BATTLE_LAYOUT } from '../config/RecruitConfig';
import { GameManager } from '../core/GameManager';
import { GameState } from '../core/GameState';
import { DarkUI, PALETTE } from './DarkUI';
import { EvolutionUI } from './EvolutionUI';
import { FormationUI } from './FormationUI';
import { ProgressionUI } from './ProgressionUI';
import { RouletteUI } from './RouletteUI';
import { SettlementUI } from './SettlementUI';
import { UnitView } from './UnitView';
const { ccclass } = _decorator;
interface Effect { event: CombatEvent; age: number; }
@ccclass('BattleUI')
export class BattleUI extends Component {
    readonly game = new GameManager();
    private ui = new DarkUI();
    private root!: Node;
    private actors!: Node;
    private fieldView!: Node;
    private overlays!: Node;
    private controls!: Node;
    private effects!: Graphics;
    private hud!: Label;
    private title!: Label;
    private hint!: Label;
    private bossHP!: Label;
    private views: UnitView[] = [];
    private frames: SpriteFrame[] = [];
    private roulette: RouletteUI | null = null;
    private fx: Effect[] = [];
    private clock = 0;
    private loading = true;
    private dragging = -1;
    private stopChanged: (() => void) | null = null;
    private stopCombat: (() => void) | null = null;
    private lastState: GameState | null = null;
    protected async start(): Promise<void> {
        profiler.hideStats();
        this.root = this.ui.node(this.node, 'BattleRoot', 0, 0, 1920, 1080);
        this.ui.text(this.root, '正在打开命运之门…', 0, 0, 38, PALETTE.gold);
        const load = <T>(path: string, type: any): Promise<T | null> => new Promise(resolve => resources.load(path, type, (error, asset) => {
            if (error) console.warn(`[Demo] Optional resource missing: ${path}`);
            resolve(error ? null : asset as unknown as T);
        }));
        const [font, background, ...frames] = await Promise.all([
            load<Font>('fonts/fusion-pixel-12px-proportional-zh_hans', Font),
            load<SpriteFrame>('backgrounds/castle_background_1920x1080/spriteFrame', SpriteFrame),
            ...Array.from({ length: 8 }, (_, i) => load<SpriteFrame>(`characters/guard/frames/guard_cape_idle_0${i + 1}/spriteFrame`, SpriteFrame)),
        ]);
        if (!isValid(this.node)) return;
        this.ui.font = font as Font | null;
        this.frames = frames.filter(Boolean) as SpriteFrame[];
        this.ui.clear(this.root);
        if (background) this.ui.image(this.root, background as SpriteFrame, 'CastleBackground', 0, 0, 1920, 1080);
        this.ui.panel(this.root, 'NightVeil', 0, 0, 1920, 1080, '#080C20', '#080C20', 166);
        this.roulette = new RouletteUI(this.root, this.ui, this.game);
        this.fieldView = this.ui.node(this.root,'BattleFieldView',BATTLE_LAYOUT.fieldX,0,1700,636);
        this.fieldView.setScale(BATTLE_LAYOUT.fieldScaleX,1,1);
        this.drawField();
        this.actors = this.ui.node(this.fieldView, 'Actors', 0, 0, 1720, 650);
        this.effects = this.ui.node(this.fieldView, 'CombatEffects').addComponent(Graphics);
        this.ui.panel(this.root, 'Header', 0, 463, 1800, 100, '#101429', '#5E526F');
        this.hud = this.ui.text(this.root, '', 0, 463, 29, PALETTE.text, 1480, 70);
        this.ui.button(this.root, 'Exit', '返回', -818, 463, 120, 65, () => this.confirmExit());
        this.title = this.ui.text(this.root, '', BATTLE_LAYOUT.fieldX, 372, 35, PALETTE.gold, 1190);
        this.bossHP = this.ui.text(this.root, '', BATTLE_LAYOUT.fieldX, 305, 25, PALETTE.red, 1000, 45);
        this.hint = this.ui.text(this.root, '', BATTLE_LAYOUT.fieldX, -357, 24, PALETTE.muted, 1190, 56);
        this.controls = this.ui.node(this.root, 'Controls', 0, 0, 1800, 240);
        this.overlays = this.ui.node(this.root, 'Overlays', 0, 0, 1920, 1080);
        this.stopChanged = this.game.changed.on(() => this.render());
        this.stopCombat = this.game.battle.events.on(event => {
            if (event.kind !== 'windup' && event.kind !== 'death' && event.kind !== 'hit') {
                if (this.fx.length >= 64) this.fx.shift(); this.fx.push({ event, age: 0 });
            }
        });
        this.loading = false; this.fit(); this.render();
    }
    private drawField(): void {
        this.ui.panel(this.fieldView, 'Battlefield', 0, 0, 1700, 636, '#10172B', '#A98C63', 215);
        const node = this.ui.node(this.fieldView, 'FormationTerritory'), graphics = node.addComponent(Graphics);
        graphics.fillColor = this.ui.color('#29344A55'); graphics.rect(FIELD.left, FIELD.bottom, FIELD.formationRight - FIELD.left, FIELD.top - FIELD.bottom); graphics.fill();
        graphics.lineWidth = 1; graphics.strokeColor = this.ui.color('#9DA3C220');
        for (let x = -750; x <= 750; x += 150) { graphics.moveTo(x, -285); graphics.lineTo(x, 285); }
        for (let y = -270; y <= 270; y += 90) { graphics.moveTo(-810, y); graphics.lineTo(810, y); }
        graphics.stroke();
        graphics.strokeColor = this.ui.color('#A9966C80'); graphics.lineWidth = 2;
        for (let y = -280; y < 280; y += 26) { graphics.moveTo(-60, y); graphics.lineTo(-60, y + 12); }
        graphics.stroke();
        this.ui.text(this.root, '友军布阵区', BATTLE_LAYOUT.fieldX-620*BATTLE_LAYOUT.fieldScaleX, 283, 22, '#8C99B0', 330, 35);
        this.ui.text(this.root, '敌军生成区', BATTLE_LAYOUT.fieldX+620*BATTLE_LAYOUT.fieldScaleX, 283, 22, '#AF91A9', 330, 35);
    }
    private fit(): void {
        const transform = this.node.getComponent(UITransform);
        if (!transform) return;
        const scale = Math.min(transform.width / 1920, transform.height / 1080);
        this.root.setScale(scale, scale, 1);
    }
    private render(): void {
        const game = this.game, state = game.state;
        this.hud.string = `第 ${Math.min(game.wave + 1, 5)} / 5 波     金币 ${game.economy.gold}     等级 ${game.progression.level}     经验 ${game.progression.xp} / ${game.progression.nextXP || 'MAX'}     阵容 ${game.formation.units.length} / ${game.capacity}`;
        const battle = state === GameState.Battle;
        this.title.string = `${battle ? '交战中' : state === GameState.Preparation || state === GameState.Placement ? '准备阶段' : '命运抉择'}  ·  ${DEMO_WAVES[game.wave].name}`;
        this.hint.string = battle ? '全队自主作战 · 阵容已锁定 · 技能自动释放' : state === GameState.Placement ? '在转盘右侧的友军区域拖动布阵，完成后确认' : state===GameState.Roulette?'命运正在流转 · 本次只抽取一个基础职业':'在战场友军区域自由布阵 · 无独立备战区';
        if (this.lastState === state && state === GameState.Battle) return;
        if (state === GameState.Preparation || state === GameState.Placement || state === GameState.Battle) this.rebuildUnits(battle);
        this.lastState = state;
        this.ui.clear(this.controls); this.ui.clear(this.overlays);
        if (state === GameState.Evolution) new EvolutionUI(this.overlays, this.ui, game);
        if (state === GameState.Replacement) FormationUI.replacement(this.overlays, this.ui, game);
        if (state === GameState.Merge) FormationUI.merge(this.overlays, this.ui, game);
        if (state === GameState.Upgrade) new ProgressionUI(this.overlays, this.ui, game);
        if (state === GameState.Victory || state === GameState.Defeat) new SettlementUI(this.overlays, this.ui, game, () => director.loadScene('Battle'), () => director.loadScene('MainMenu'));
        if (state === GameState.Preparation) {
            this.ui.text(this.controls, game.formation.units.length ? `全队 ${game.formation.units.length} 位 · 可自由调整站位` : '阵容为空 · 请先转动命运招募伙伴', 330, -405, 25, PALETTE.gold, 1190, 45);
            this.ui.button(this.controls, 'Recruit', `转动命运  ${game.price} 金`, 80, -465, 440, 92, () => { if(!game.spin())this.hint.string=game.recruit.error||'金币不足，无法转动命运'; }, game.economy.gold >= game.price, true);
            this.ui.button(this.controls, 'StartBattle', '开始战斗', 650, -465, 440, 92, () => game.startBattle(), game.formation.units.length > 0, true);
        } else if (state === GameState.Placement) {
            this.ui.text(this.controls, `${game.recruit.pending?.config.name || '新单位'} 已加入`, 50, -460, 27, PALETTE.gold, 540, 80);
            this.ui.button(this.controls, 'ConfirmPlacement', '确认布阵', 650, -465, 440, 92, () => game.confirmPlacement(), true, true);
        } else if (battle) {
            this.ui.text(this.controls, 'AUTOBATTLE  /  永夜战线', 330, -453, 31, PALETTE.gold,1190);
            this.ui.text(this.controls, '击败所有敌军后进入下一波 · 波内阵亡不会复活', 330, -500, 22, PALETTE.muted,1190);
        } else {
            this.ui.button(this.controls,'RecruitLocked','本次招募进行中',80,-465,440,92,()=>{},false);
            this.ui.button(this.controls,'StartLocked','完成招募后开战',650,-465,440,92,()=>{},false);
        }
        this.ui.text(this.controls,'每次招募 10 金币',-650,-451,26,PALETTE.gold,500,55);
        this.ui.text(this.controls,`本波结算利息 +${game.lastInterest} 金币`,-650,-499,21,PALETTE.muted,500,42);
    }
    private rebuildUnits(battle: boolean): void {
        this.dragging = -1; this.ui.clear(this.actors); this.fx = [];
        this.views = (battle ? this.game.battle.units : this.game.formation.units).map(model => {
            const view = new UnitView(this.actors, this.ui, this.frames, model);
            // Compress only battlefield positions, keeping character art and labels undistorted.
            view.node.setScale(1/BATTLE_LAYOUT.fieldScaleX,1,1);
            view.node.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
                if (!this.game.canArrange) return;
                this.dragging = model.id;
                this.hint.string = `${model.config.name} · ${model.config.skill.name} · ${model.config.description}`;
                event.propagationStopped = true;
            });
            view.node.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => {
                if (!this.game.canArrange || this.dragging !== model.id) return;
                const point = event.getUILocation();
                const local = this.actors.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(point.x, point.y));
                this.game.move(model.id, local.x, local.y);
                event.propagationStopped = true;
            });
            const end = () => { if (this.game.canArrange && this.dragging === model.id) this.game.formation.settle(model.id); this.dragging = -1; };
            view.node.on(Node.EventType.TOUCH_END, end); view.node.on(Node.EventType.TOUCH_CANCEL, end);
            return view;
        });
    }
    private confirmExit(): void {
        if([GameState.Roulette,GameState.Evolution,GameState.Replacement,GameState.Placement,GameState.Merge].indexOf(this.game.state)>=0) {
            this.hint.string='请先完成当前招募、转职与布阵';return;
        }
        const panel = this.ui.modal(this.overlays, '离开本局挑战？', '当前局进度不会保存', 900, 470);
        this.ui.button(panel, 'CancelExit', '继续挑战', -205, -100, 340, 80, () => { panel.parent?.destroy(); });
        this.ui.button(panel, 'ConfirmExit', '返回主界面', 205, -100, 340, 80, () => director.loadScene('MainMenu'), true, true);
    }
    protected update(dt: number): void {
        if (this.loading) return;
        this.clock += dt; this.fit(); this.game.updateRecruit(dt); this.game.battle.update(dt); this.roulette?.update(dt);
        for (const view of this.views) view.update(dt, this.clock);
        const boss = this.game.battle.enemies.find(enemy => enemy.config.boss);
        this.bossHP.string = this.game.state === GameState.Battle && boss ? `${boss.config.name}   ${Math.ceil(boss.hp)} / ${boss.maxHp}` : '';
        this.effects.clear();
        this.fx = this.fx.filter(effect => { effect.age += dt; return effect.age < .45; });
        for (const { event, age } of this.fx) {
            const source = event.source, target = event.target;
            const alpha = Math.floor((1 - age / .45) * 230);
            const color = this.ui.color(event.kind === 'heal' ? PALETTE.green : source.team === 'enemy' ? PALETTE.red : PALETTE.gold); color.a = alpha;
            this.effects.strokeColor = color; this.effects.lineWidth = event.kind === 'skill' ? 5 : 2;
            if (event.kind === 'skill') {
                this.effects.circle(target.x, target.y + 20, 25 + age * 100); this.effects.stroke();
            } else {
                this.effects.moveTo(source.x, source.y + 35); this.effects.lineTo(target.x, target.y + 35); this.effects.stroke();
            }
        }
    }
    protected onDestroy(): void { this.stopChanged?.(); this.stopCombat?.(); this.game.battle.running = false; }
}
