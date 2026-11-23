import { _decorator, Component, director, EventTouch, Font, Graphics, isValid, Label, Node, profiler, resources, SpriteFrame, UITransform, Vec3 } from 'cc';
import { CombatEvent } from '../battle/CombatSystem';
import { DEMO_WAVES, ENEMIES, FIELD } from '../config/DemoConfig';
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
    private coinLabel!: Label;
    private levelLabel!: Label;
    private xpLabel!: Label;
    private formationLabel!: Label;
    private xpBar!: Graphics;
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
            if (error) console.warn('[Demo] Optional resource missing: ' + path);
            resolve(error ? null : asset as unknown as T);
        }));

        const [font, background, battlefield, wheelRotorArt, wheelRimArt, ...frames] = await Promise.all([
            load<Font>('fonts/fusion-pixel-12px-proportional-zh_hans', Font),
            load<SpriteFrame>('backgrounds/castle_background_1920x1080/spriteFrame', SpriteFrame),
            load<SpriteFrame>('ui/chapter/previews/chapter_01_border_watch/spriteFrame', SpriteFrame),
            load<SpriteFrame>('ui/icons/fate_wheel_rotor/spriteFrame', SpriteFrame),
            load<SpriteFrame>('ui/icons/fate_wheel_rim/spriteFrame', SpriteFrame),
            ...Array.from({ length: 8 }, (_, i) => load<SpriteFrame>('characters/guard/frames/guard_cape_idle_0' + (i + 1) + '/spriteFrame', SpriteFrame)),
        ]);
        if (!isValid(this.node)) return;

        this.ui.font = font as Font | null;
        this.frames = frames.filter(Boolean) as SpriteFrame[];
        this.ui.clear(this.root);
        if (background) this.ui.image(this.root, background as SpriteFrame, 'CastleBackground', 0, 0, 1920, 1080);
        this.ui.panel(this.root, 'NightVeil', 0, 0, 1920, 1080, '#080C20', '#080C20', 128);

        this.fieldView = this.ui.node(
            this.root,
            'BattleFieldView',
            BATTLE_LAYOUT.fieldX,
            BATTLE_LAYOUT.panelY,
            BATTLE_LAYOUT.fieldWidth,
            BATTLE_LAYOUT.panelHeight,
        );
        this.fieldView.setScale(BATTLE_LAYOUT.fieldScaleX, 1, 1);
        this.drawField(battlefield as SpriteFrame | null);

        this.actors = this.ui.node(this.fieldView, 'Actors', 0, 0, 1720, BATTLE_LAYOUT.panelHeight);
        this.actors.setScale(1, BATTLE_LAYOUT.fieldScaleY, 1);
        this.effects = this.ui.node(this.fieldView, 'CombatEffects', 0, 0, 1720, BATTLE_LAYOUT.panelHeight).addComponent(Graphics);
        this.effects.node.setScale(1, BATTLE_LAYOUT.fieldScaleY, 1);

        this.buildHeader();
        this.hint = this.ui.text(this.root, '', BATTLE_LAYOUT.fieldX - 300, -365, 21, '#E7D7B0', 540, 44);
        this.bossHP = this.ui.text(this.root, '', BATTLE_LAYOUT.fieldX, 270, 23, PALETTE.red, 780, 38);
        this.roulette = new RouletteUI(
            this.root,
            this.ui,
            this.game,
            wheelRotorArt as SpriteFrame | null,
            wheelRimArt as SpriteFrame | null,
            () => {
                if (!this.game.spin()) this.hint.string = this.game.recruit.error || '金币不足，无法转动命运';
            },
            message => { this.hint.string = message; },
        );

        this.controls = this.ui.node(this.root, 'Controls', 0, 0, 1920, 1080);
        this.overlays = this.ui.node(this.root, 'Overlays', 0, 0, 1920, 1080);
        this.stopChanged = this.game.changed.on(() => this.render());
        this.stopCombat = this.game.battle.events.on(event => {
            if (event.kind !== 'windup' && event.kind !== 'death' && event.kind !== 'hit') {
                if (this.fx.length >= 64) this.fx.shift();
                this.fx.push({ event, age: 0 });
            }
        });

        this.loading = false;
        this.fit();
        this.render();
    }

    private buildHeader(): void {
        this.ui.panel(this.root, 'HeaderBase', 0, 480, 1880, 104, '#0D1028', '#9B7045', 238);
        const exit = this.ui.node(this.root, 'Exit', -850, 480, 132, 78);
        const exitGraphics = exit.addComponent(Graphics);
        exitGraphics.fillColor = this.ui.color('#32152E');
        exitGraphics.roundRect(-66, -39, 132, 78, 16);
        exitGraphics.fill();
        exitGraphics.lineWidth = 7;
        exitGraphics.strokeColor = this.ui.color('#9A4B27');
        exitGraphics.stroke();
        exitGraphics.lineWidth = 3;
        exitGraphics.strokeColor = this.ui.color('#FFE18A');
        exitGraphics.roundRect(-58, -31, 116, 62, 12);
        exitGraphics.stroke();
        exitGraphics.strokeColor = this.ui.color('#FFF0B2');
        exitGraphics.lineWidth = 8;
        exitGraphics.moveTo(22, 0);
        exitGraphics.lineTo(-20, 0);
        exitGraphics.lineTo(-2, 18);
        exitGraphics.moveTo(-20, 0);
        exitGraphics.lineTo(-2, -18);
        exitGraphics.stroke();
        exit.on(Node.EventType.TOUCH_END, () => this.confirmExit());

        const coinCard = this.ui.panel(this.root, 'CoinCard', -585, 480, 310, 82, '#21172F', '#C38D4C', 245);
        const coin = this.ui.node(coinCard, 'CoinIcon', -112, 0, 42, 42);
        const coinGraphics = coin.addComponent(Graphics);
        coinGraphics.fillColor = this.ui.color('#F4B72D');
        coinGraphics.circle(0, 0, 18);
        coinGraphics.fill();
        coinGraphics.lineWidth = 3;
        coinGraphics.strokeColor = this.ui.color('#8C4B24');
        coinGraphics.circle(0, 0, 18);
        coinGraphics.stroke();
        coinGraphics.lineWidth = 2;
        coinGraphics.strokeColor = this.ui.color('#FFF0A4');
        coinGraphics.circle(0, 0, 12);
        coinGraphics.stroke();
        this.coinLabel = this.ui.text(coinCard, '金币 100', 35, 0, 29, '#FFE5A5', 210, 56);

        const levelCard = this.ui.panel(this.root, 'LevelCard', -280, 480, 160, 82, '#32143D', '#D5A34D', 248);
        const crown = this.ui.node(levelCard, 'LevelCrown', 0, 29, 54, 24);
        const crownGraphics = crown.addComponent(Graphics);
        crownGraphics.fillColor = this.ui.color('#F8C84E');
        crownGraphics.strokeColor = this.ui.color('#7B3C2A');
        crownGraphics.lineWidth = 2;
        crownGraphics.moveTo(-24, -9);
        crownGraphics.lineTo(-18, 10);
        crownGraphics.lineTo(-6, 0);
        crownGraphics.lineTo(0, 14);
        crownGraphics.lineTo(7, 0);
        crownGraphics.lineTo(19, 10);
        crownGraphics.lineTo(24, -9);
        crownGraphics.close();
        crownGraphics.fill();
        crownGraphics.stroke();
        this.levelLabel = this.ui.text(levelCard, 'Lv.1', 0, -4, 33, '#FFF0C0', 130, 58);

        const xpCard = this.ui.panel(this.root, 'ExperienceCard', 135, 480, 570, 82, '#19172E', '#B9874A', 245);
        this.xpLabel = this.ui.text(xpCard, '经验 0 / 14', 0, 17, 23, '#F3E5C8', 520, 32);
        this.xpBar = this.ui.node(xpCard, 'ExperienceBar', 0, -21, 490, 18).addComponent(Graphics);

        const formationCard = this.ui.panel(this.root, 'FormationCard', 710, 480, 330, 82, '#21172F', '#C38D4C', 245);
        const helmet = this.ui.node(formationCard, 'FormationIcon', -112, 0, 44, 44);
        const helmetGraphics = helmet.addComponent(Graphics);
        helmetGraphics.fillColor = this.ui.color('#E9C06B');
        helmetGraphics.strokeColor = this.ui.color('#70452F');
        helmetGraphics.lineWidth = 3;
        helmetGraphics.moveTo(-18, 14);
        helmetGraphics.lineTo(-14, -8);
        helmetGraphics.lineTo(0, -19);
        helmetGraphics.lineTo(14, -8);
        helmetGraphics.lineTo(18, 14);
        helmetGraphics.close();
        helmetGraphics.fill();
        helmetGraphics.stroke();
        helmetGraphics.strokeColor = this.ui.color('#583849');
        helmetGraphics.lineWidth = 4;
        helmetGraphics.moveTo(-11, 1);
        helmetGraphics.lineTo(11, 1);
        helmetGraphics.stroke();
        this.formationLabel = this.ui.text(formationCard, '阵容 0 / 3', 35, 0, 29, '#FFE5A5', 230, 56);

        const waveBanner = this.ui.panel(this.root, 'WaveBanner', BATTLE_LAYOUT.fieldX, 332, 330, 78, '#351626', '#D69A48', 248);
        const bannerGraphics = waveBanner.getComponent(Graphics)!;
        bannerGraphics.lineWidth = 2;
        bannerGraphics.strokeColor = this.ui.color('#FFF0A4');
        bannerGraphics.moveTo(-135, 27);
        bannerGraphics.lineTo(135, 27);
        bannerGraphics.stroke();
        for (const side of [-1, 1]) {
            bannerGraphics.fillColor = this.ui.color('#9B35C9');
            bannerGraphics.strokeColor = this.ui.color('#FFE18B');
            bannerGraphics.lineWidth = 2;
            bannerGraphics.moveTo(side * 150, 0);
            bannerGraphics.lineTo(side * 164, 13);
            bannerGraphics.lineTo(side * 178, 0);
            bannerGraphics.lineTo(side * 164, -13);
            bannerGraphics.close();
            bannerGraphics.fill();
            bannerGraphics.stroke();
        }
        this.title = this.ui.text(waveBanner, '第 1 波', 0, 0, 39, '#FFF0C0', 270, 62);

        const preview = this.ui.node(this.root, 'WavePreview', BATTLE_LAYOUT.fieldX + 540, 323, 100, 104);
        const previewGraphics = preview.addComponent(Graphics);
        previewGraphics.fillColor = this.ui.color('#41152A');
        previewGraphics.circle(0, 19, 34);
        previewGraphics.fill();
        previewGraphics.lineWidth = 5;
        previewGraphics.strokeColor = this.ui.color('#F4C45E');
        previewGraphics.circle(0, 19, 34);
        previewGraphics.stroke();
        previewGraphics.fillColor = this.ui.color('#E9C36D');
        previewGraphics.moveTo(-16, 31);
        previewGraphics.lineTo(-22, 17);
        previewGraphics.lineTo(-12, 6);
        previewGraphics.lineTo(12, 6);
        previewGraphics.lineTo(22, 17);
        previewGraphics.lineTo(16, 31);
        previewGraphics.close();
        previewGraphics.fill();
        previewGraphics.fillColor = this.ui.color('#E9C36D');
        previewGraphics.circle(0, 22, 21);
        previewGraphics.fill();
        previewGraphics.rect(-16, -2, 32, 15);
        previewGraphics.fill();
        previewGraphics.fillColor = this.ui.color('#4A1C2B');
        previewGraphics.circle(-8, 24, 4);
        previewGraphics.circle(8, 24, 4);
        previewGraphics.fill();
        previewGraphics.rect(-7, -5, 14, 7);
        previewGraphics.fill();
        this.ui.text(preview, '波次预览', 0, -34, 18, '#F6DDA5', 100, 28);
        preview.on(Node.EventType.TOUCH_END, () => this.showWavePreview());
    }

    private drawExperienceBar(): void {
        const next = this.game.progression.nextXP;
        const ratio = next > 0 ? Math.max(0, Math.min(1, this.game.progression.xp / next)) : 1;
        this.xpBar.clear();
        this.xpBar.fillColor = this.ui.color('#30263D');
        this.xpBar.roundRect(-235, -7, 470, 14, 7);
        this.xpBar.fill();
        this.xpBar.lineWidth = 2;
        this.xpBar.strokeColor = this.ui.color('#9A713F');
        this.xpBar.roundRect(-235, -7, 470, 14, 7);
        this.xpBar.stroke();
        if (ratio > 0) {
            this.xpBar.fillColor = this.ui.color('#F4C34F');
            this.xpBar.roundRect(-232, -4, 464 * ratio, 8, 4);
            this.xpBar.fill();
            this.xpBar.fillColor = this.ui.color('#FFF1A4');
            this.xpBar.circle(-232 + 464 * ratio, 0, 5);
            this.xpBar.fill();
        }
    }

    private drawField(background: SpriteFrame | null): void {
        const panel = this.ui.panel(
            this.fieldView,
            'Battlefield',
            0,
            0,
            BATTLE_LAYOUT.fieldWidth,
            BATTLE_LAYOUT.panelHeight,
            '#11172B',
            '#D6A34E',
            background ? 0 : 245,
        );
        if (background) {
            this.ui.image(panel, background, 'BattlefieldArt', 0, 0, BATTLE_LAYOUT.fieldWidth - 60, BATTLE_LAYOUT.panelHeight - 60);
        }
        const overlay = this.ui.node(panel, 'BattlefieldOverlay', 0, 0, BATTLE_LAYOUT.fieldWidth - 60, BATTLE_LAYOUT.panelHeight - 60);
        const graphics = overlay.addComponent(Graphics);
        graphics.fillColor = this.ui.color('#08142C38');
        graphics.rect(-820, -380, 1640, 760);
        graphics.fill();

        // A quiet translucent ally area keeps placement readable without a visible grid.
        const top = FIELD.top * BATTLE_LAYOUT.fieldScaleY;
        const bottom = FIELD.bottom * BATTLE_LAYOUT.fieldScaleY;
        graphics.fillColor = this.ui.color('#243D5A35');
        graphics.rect(FIELD.left, bottom, FIELD.formationRight - FIELD.left, top - bottom);
        graphics.fill();
        graphics.strokeColor = this.ui.color('#E8C98266');
        graphics.lineWidth = 2;
        for (let y = bottom; y < top; y += 30) {
            graphics.moveTo(FIELD.formationRight, y);
            graphics.lineTo(FIELD.formationRight, y + 14);
        }
        graphics.stroke();
        graphics.strokeColor = this.ui.color('#E8C98244');
        graphics.lineWidth = 2;
        graphics.roundRect(-820, -380, 1640, 760, 12);
        graphics.stroke();
    }

    private fit(): void {
        const transform = this.node.getComponent(UITransform);
        if (!transform) return;
        const scale = Math.min(transform.width / 1920, transform.height / 1080);
        this.root.setScale(scale, scale, 1);
    }

    private render(): void {
        const game = this.game;
        const state = game.state;
        const waveNumber = Math.min(game.wave + 1, DEMO_WAVES.length);
        this.coinLabel.string = '金币 ' + game.economy.gold;
        this.levelLabel.string = 'Lv.' + game.progression.level;
        this.xpLabel.string = '经验 ' + game.progression.xp + ' / ' + (game.progression.nextXP || 'MAX');
        this.formationLabel.string = '阵容 ' + game.formation.units.length + ' / ' + game.capacity;
        this.title.string = '第 ' + waveNumber + ' 波';
        this.drawExperienceBar();

        const battle = state === GameState.Battle;
        if (battle) this.hint.string = '全队自主作战 · 技能自动释放';
        else if (state === GameState.Placement) this.hint.string = (game.recruit.pending?.config.name || '新伙伴') + ' 已加入 · 拖动伙伴调整站位';
        else if (state === GameState.Roulette) this.hint.string = '命运正在流转 · 等待本次职业揭晓';
        else if (state === GameState.Evolution) this.hint.string = '选择一个转职方向，确认后加入阵容';
        else if (state === GameState.Replacement) this.hint.string = '阵容已满 · 选择一位伙伴替换';
        else if (state === GameState.Merge) this.hint.string = '命运共鸣 · 可选择合成或保留';
        else if (state === GameState.Upgrade) this.hint.string = '成长选择 · 选择一项强化';
        else this.hint.string = game.formation.units.length ? '拖动伙伴调整站位，准备好后开始战斗' : '先转动命运，招募第一位伙伴';

        this.roulette?.sync();
        if (this.lastState === state && state === GameState.Battle) return;
        if (state === GameState.Preparation || state === GameState.Placement || state === GameState.Battle) this.rebuildUnits(battle);
        this.lastState = state;
        this.ui.clear(this.controls);
        this.ui.clear(this.overlays);

        if (state === GameState.Evolution) new EvolutionUI(this.overlays, this.ui, game);
        if (state === GameState.Replacement) FormationUI.replacement(this.overlays, this.ui, game);
        if (state === GameState.Merge) FormationUI.merge(this.overlays, this.ui, game);
        if (state === GameState.Upgrade) new ProgressionUI(this.overlays, this.ui, game);
        if (state === GameState.Victory || state === GameState.Defeat) {
            new SettlementUI(this.overlays, this.ui, game, () => director.loadScene('Battle'), () => director.loadScene('MainMenu'));
        }

        if (state === GameState.Preparation) {
            this.actionButton(
                this.controls,
                'StartBattle',
                '开始战斗',
                BATTLE_LAYOUT.fieldX + 440,
                -355,
                360,
                86,
                () => game.startBattle(),
                game.formation.units.length > 0,
                'red',
            );
        } else if (state === GameState.Placement) {
            this.actionButton(
                this.controls,
                'ConfirmPlacement',
                '确认布阵',
                BATTLE_LAYOUT.fieldX + 440,
                -355,
                360,
                86,
                () => game.confirmPlacement(),
                true,
                'gold',
            );
        }
    }

    private actionButton(
        parent: Node,
        name: string,
        value: string,
        x: number,
        y: number,
        width: number,
        height: number,
        action: () => void,
        enabled: boolean,
        variant: 'red' | 'gold',
    ): Node {
        const node = this.ui.node(parent, name, x, y, width, height);
        const graphics = node.addComponent(Graphics);
        const base = enabled ? (variant === 'red' ? '#861D2A' : '#A96C18') : '#433A4B';
        graphics.fillColor = this.ui.color(base);
        graphics.roundRect(-width / 2, -height / 2, width, height, 18);
        graphics.fill();
        graphics.lineWidth = 8;
        graphics.strokeColor = this.ui.color(enabled ? '#8E4A22' : '#665D6C');
        graphics.stroke();
        graphics.fillColor = this.ui.color(enabled ? (variant === 'red' ? '#C42B31' : '#E7A91E') : '#62596A');
        graphics.roundRect(-width / 2 + 9, -height / 2 + 9, width - 18, height - 18, 13);
        graphics.fill();
        graphics.lineWidth = 3;
        graphics.strokeColor = this.ui.color(enabled ? '#FFE28B' : '#A69BAA');
        graphics.roundRect(-width / 2 + 14, -height / 2 + 14, width - 28, height - 28, 10);
        graphics.stroke();
        this.ui.text(node, value, 0, 0, 34, enabled ? '#FFF0C0' : '#B7AFBA', width - 28, height - 16);
        node.on(Node.EventType.TOUCH_END, () => { if (enabled) action(); });
        return node;
    }

    private showWavePreview(): void {
        const wave = DEMO_WAVES[this.game.wave] || DEMO_WAVES[DEMO_WAVES.length - 1];
        const counts: Record<string, number> = {};
        wave.enemies.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
        const lines = Object.keys(counts).map(id => {
            const enemy = ENEMIES[id];
            return (enemy ? enemy.name : id) + '  ×  ' + counts[id];
        }).join('\n');
        const panel = this.ui.modal(
            this.overlays,
            '第 ' + (this.game.wave + 1) + ' 波 · ' + wave.name,
            '敌军数量：' + wave.enemies.length + ' · 击败全部敌军即可通关本波',
            760,
            560,
        );
        this.ui.text(panel, lines || '暂无敌军数据', 0, 28, 29, PALETTE.text, 640, 190);
        this.ui.button(panel, 'CloseWavePreview', '关闭', 0, -190, 280, 72, () => panel.parent?.destroy(), true, true);
    }

    private rebuildUnits(battle: boolean): void {
        this.dragging = -1;
        this.ui.clear(this.actors);
        this.fx = [];
        this.views = (battle ? this.game.battle.units : this.game.formation.units).map(model => {
            const view = new UnitView(this.actors, this.ui, this.frames, model);
            // Keep character art undistorted while the field positions fill the framed play area.
            view.node.setScale(1 / BATTLE_LAYOUT.fieldScaleX, 1 / BATTLE_LAYOUT.fieldScaleY, 1);
            view.node.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
                if (!this.game.canArrange) return;
                this.dragging = model.id;
                this.hint.string = model.config.name + ' · ' + model.config.skill.name + ' · ' + model.config.description;
                event.propagationStopped = true;
            });
            view.node.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => {
                if (!this.game.canArrange || this.dragging !== model.id) return;
                const point = event.getUILocation();
                const local = this.actors.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(point.x, point.y));
                this.game.move(model.id, local.x, local.y);
                event.propagationStopped = true;
            });
            const end = () => {
                if (this.game.canArrange && this.dragging === model.id) this.game.formation.settle(model.id);
                this.dragging = -1;
            };
            view.node.on(Node.EventType.TOUCH_END, end);
            view.node.on(Node.EventType.TOUCH_CANCEL, end);
            return view;
        });
    }

    private confirmExit(): void {
        if ([GameState.Roulette, GameState.Evolution, GameState.Replacement, GameState.Placement, GameState.Merge].indexOf(this.game.state) >= 0) {
            this.hint.string = '请先完成当前招募、转职与布阵';
            return;
        }
        const panel = this.ui.modal(this.overlays, '离开本局挑战？', '当前局进度不会保存', 900, 470);
        this.ui.button(panel, 'CancelExit', '继续挑战', -205, -100, 340, 80, () => { panel.parent?.destroy(); });
        this.ui.button(panel, 'ConfirmExit', '返回主界面', 205, -100, 340, 80, () => director.loadScene('MainMenu'), true, true);
    }

    protected update(dt: number): void {
        if (this.loading) return;
        this.clock += dt;
        this.fit();
        this.game.updateRecruit(dt);
        this.game.battle.update(dt);
        this.roulette?.update(dt);
        for (const view of this.views) view.update(dt, this.clock);

        const boss = this.game.battle.enemies.find(enemy => enemy.config.boss);
        this.bossHP.string = this.game.state === GameState.Battle && boss
            ? boss.config.name + '   ' + Math.ceil(boss.hp) + ' / ' + boss.maxHp
            : '';

        this.effects.clear();
        this.fx = this.fx.filter(effect => { effect.age += dt; return effect.age < 0.45; });
        for (const { event, age } of this.fx) {
            const source = event.source;
            const target = event.target;
            const alpha = Math.floor((1 - age / 0.45) * 230);
            const color = this.ui.color(event.kind === 'heal' ? PALETTE.green : source.team === 'enemy' ? PALETTE.red : PALETTE.gold);
            color.a = alpha;
            this.effects.strokeColor = color;
            this.effects.lineWidth = event.kind === 'skill' ? 5 : 2;
            if (event.kind === 'skill') {
                this.effects.circle(target.x, target.y + 20, 25 + age * 100);
                this.effects.stroke();
            } else {
                this.effects.moveTo(source.x, source.y + 35);
                this.effects.lineTo(target.x, target.y + 35);
                this.effects.stroke();
            }
        }
    }

    protected onDestroy(): void {
        this.stopChanged?.();
        this.stopCombat?.();
        this.game.battle.running = false;
    }
}