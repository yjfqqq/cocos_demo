import { Graphics, Label, Node } from 'cc';
import { BASES } from '../config/DemoConfig';
import { BATTLE_LAYOUT, CLASS_PRESENTATION, RECRUIT_CONFIG } from '../config/RecruitConfig';
import { GameManager } from '../core/GameManager';
import { GameState } from '../core/GameState';
import { SECTOR_DEGREES } from '../recruit/RouletteSpin';
import { DarkUI } from './DarkUI';
import { classIcon } from './ClassIcon';

export class RouletteUI {
    readonly node: Node;
    readonly rotor: Node;
    readonly pointer: Node;
    private highlight: Graphics;
    private recruitButton: Node;
    private recruitButtonGraphics: Graphics;
    private recruitButtonLabel: Label;
    private lastButtonKey = '';

    constructor(
        parent: Node,
        private ui: DarkUI,
        private game: GameManager,
        private onRecruit: () => void,
        private onMessage: (message: string) => void,
    ) {
        this.node = ui.panel(
            parent,
            'FateWheelPanel',
            BATTLE_LAYOUT.wheelX,
            BATTLE_LAYOUT.panelY,
            BATTLE_LAYOUT.wheelWidth,
            BATTLE_LAYOUT.panelHeight,
            '#1B102A',
            '#C58A42',
            248,
        );
        this.drawTitle();

        const frame = ui.node(this.node, 'WheelFrame', 0, BATTLE_LAYOUT.wheelY, 500, 500);
        const rim = frame.addComponent(Graphics);
        rim.fillColor = ui.color('#100B24');
        rim.circle(0, 0, 246);
        rim.fill();
        rim.lineWidth = 9;
        rim.strokeColor = ui.color('#6D3A24');
        rim.circle(0, 0, 246);
        rim.stroke();
        rim.lineWidth = 5;
        rim.strokeColor = ui.color('#F2B94F');
        rim.circle(0, 0, 238);
        rim.stroke();
        rim.lineWidth = 2;
        rim.strokeColor = ui.color('#FFF0A6');
        rim.circle(0, 0, 229);
        rim.stroke();
        for (let i = 0; i < 56; i++) {
            const angle = i / 56 * Math.PI * 2;
            const outer = i % 8 === 0 ? 216 : 222;
            rim.moveTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
            rim.lineTo(Math.cos(angle) * 230, Math.sin(angle) * 230);
        }
        rim.stroke();

        this.rotor = ui.node(frame, 'WheelRotor', 0, 0, 432, 432);
        const sectors = this.rotor.addComponent(Graphics);
        BASES.forEach((base, index) => {
            this.sector(sectors, index);
            sectors.fillColor = ui.color(CLASS_PRESENTATION[base.id].color);
            sectors.fill();
            sectors.strokeColor = ui.color('#E7B85C');
            sectors.lineWidth = 3;
            sectors.stroke();

            const angle = (90 - index * SECTOR_DEGREES) * Math.PI / 180;
            sectors.strokeColor = ui.color(CLASS_PRESENTATION[base.id].light + '66');
            sectors.lineWidth = 3;
            sectors.arc(0, 0, 198, angle - 0.34, angle + 0.34, false);
            sectors.stroke();

            for (const radius of [82, 91, 184]) {
                sectors.fillColor = ui.color(CLASS_PRESENTATION[base.id].light);
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                sectors.circle(x, y, radius === 184 ? 2.5 : 2);
                sectors.fill();
            }

            // Icons only: class names are intentionally omitted from the seven sectors.
            const iconRoot = ui.node(
                this.rotor,
                'Sector_' + base.id,
                Math.cos(angle) * 145,
                Math.sin(angle) * 145,
                92,
                92,
            );
            const icon = classIcon(iconRoot, ui, base.id, 70);
            icon.setPosition(0, 0);
        });

        this.highlight = ui.node(this.rotor, 'WinningSector').addComponent(Graphics);

        const centre = ui.node(frame, 'ArcaneHub', 0, 0, 140, 140);
        const hub = centre.addComponent(Graphics);
        hub.fillColor = ui.color('#241039');
        hub.circle(0, 0, 68);
        hub.fill();
        hub.lineWidth = 7;
        hub.strokeColor = ui.color('#9D542C');
        hub.circle(0, 0, 68);
        hub.stroke();
        hub.lineWidth = 3;
        hub.strokeColor = ui.color('#F7D77E');
        hub.circle(0, 0, 58);
        hub.stroke();
        hub.fillColor = ui.color('#7C39B7');
        hub.strokeColor = ui.color('#FFE28B');
        hub.lineWidth = 4;
        hub.moveTo(0, 47);
        hub.lineTo(34, 0);
        hub.lineTo(0, -47);
        hub.lineTo(-34, 0);
        hub.close();
        hub.fill();
        hub.stroke();
        hub.fillColor = ui.color('#F2D5FF');
        hub.moveTo(0, 28);
        hub.lineTo(16, 0);
        hub.lineTo(0, -28);
        hub.lineTo(-16, 0);
        hub.close();
        hub.fill();

        this.pointer = ui.node(frame, 'FixedPointer', 0, 239, 64, 70);
        const pointer = this.pointer.addComponent(Graphics);
        pointer.fillColor = ui.color('#7B2ED0');
        pointer.strokeColor = ui.color('#FFE18A');
        pointer.lineWidth = 5;
        pointer.moveTo(0, 31);
        pointer.lineTo(25, 0);
        pointer.lineTo(0, -30);
        pointer.lineTo(-25, 0);
        pointer.close();
        pointer.fill();
        pointer.stroke();
        pointer.fillColor = ui.color('#F4D8FF');
        pointer.moveTo(0, 18);
        pointer.lineTo(12, 0);
        pointer.lineTo(0, -18);
        pointer.lineTo(-12, 0);
        pointer.close();
        pointer.fill();

        this.drawCost();
        this.recruitButton = ui.node(this.node, 'Recruit', 0, -365, 390, 86);
        this.recruitButtonGraphics = this.recruitButton.addComponent(Graphics);
        this.recruitButtonLabel = ui.text(this.recruitButton, '转动命运', 0, 0, 35, '#421923', 350, 68);
        this.recruitButton.on(Node.EventType.TOUCH_END, () => {
            if (this.game.state !== GameState.Preparation) return;
            if (this.game.economy.gold < this.game.price) {
                this.onMessage('金币不足，无法转动命运');
                return;
            }
            this.onRecruit();
        });
        this.sync();
    }

    private drawTitle(): void {
        const banner = this.ui.node(this.node, 'RouletteTitle', 0, 345, 450, 100);
        const graphics = banner.addComponent(Graphics);
        graphics.fillColor = this.ui.color('#32112F');
        graphics.roundRect(-180, -35, 360, 70, 14);
        graphics.fill();
        graphics.lineWidth = 8;
        graphics.strokeColor = this.ui.color('#7A3A25');
        graphics.roundRect(-180, -35, 360, 70, 14);
        graphics.stroke();
        graphics.lineWidth = 4;
        graphics.strokeColor = this.ui.color('#F8C65A');
        graphics.roundRect(-172, -28, 344, 56, 11);
        graphics.stroke();
        graphics.lineWidth = 2;
        graphics.strokeColor = this.ui.color('#FFF0B0');
        graphics.moveTo(-150, 20);
        graphics.lineTo(150, 20);
        graphics.stroke();

        const leaf = (side: number, offset: number) => {
            graphics.fillColor = this.ui.color('#E3A93F');
            graphics.strokeColor = this.ui.color('#6D351F');
            graphics.lineWidth = 2;
            graphics.moveTo(side * 170, offset);
            graphics.lineTo(side * 207, offset + 15);
            graphics.lineTo(side * 194, offset + 2);
            graphics.lineTo(side * 211, offset - 10);
            graphics.lineTo(side * 176, offset - 13);
            graphics.close();
            graphics.fill();
            graphics.stroke();
        };
        leaf(-1, 13);
        leaf(-1, -10);
        leaf(1, 13);
        leaf(1, -10);

        graphics.fillColor = this.ui.color('#9B39D8');
        graphics.strokeColor = this.ui.color('#FFE18A');
        graphics.lineWidth = 3;
        graphics.moveTo(0, 49);
        graphics.lineTo(15, 31);
        graphics.lineTo(0, 13);
        graphics.lineTo(-15, 31);
        graphics.close();
        graphics.fill();
        graphics.stroke();
        this.ui.text(banner, '命运转盘', 0, -1, 43, '#FFE5A4', 320, 70);
    }

    private drawCost(): void {
        const coin = this.ui.node(this.node, 'RecruitCoin', -58, -291, 40, 40);
        const graphics = coin.addComponent(Graphics);
        graphics.fillColor = this.ui.color('#EFAF24');
        graphics.circle(0, 0, 17);
        graphics.fill();
        graphics.lineWidth = 3;
        graphics.strokeColor = this.ui.color('#7C3E1D');
        graphics.circle(0, 0, 17);
        graphics.stroke();
        graphics.lineWidth = 2;
        graphics.strokeColor = this.ui.color('#FFF0A0');
        graphics.circle(0, 0, 12);
        graphics.stroke();
        graphics.fillColor = this.ui.color('#FFE38B');
        graphics.moveTo(0, 8);
        graphics.lineTo(7, 0);
        graphics.lineTo(0, -8);
        graphics.lineTo(-7, 0);
        graphics.close();
        graphics.fill();
        this.ui.text(this.node, '10 金币', 38, -291, 30, '#F8D77F', 150, 48);
    }

    private drawRecruitButton(enabled: boolean): void {
        const graphics = this.recruitButtonGraphics;
        const width = 390;
        const height = 86;
        graphics.clear();
        graphics.fillColor = this.ui.color(enabled ? '#7E281D' : '#3C3446');
        graphics.roundRect(-width / 2, -height / 2, width, height, 19);
        graphics.fill();
        graphics.lineWidth = 8;
        graphics.strokeColor = this.ui.color(enabled ? '#8D481E' : '#625A6B');
        graphics.stroke();
        graphics.fillColor = this.ui.color(enabled ? '#F5B92B' : '#796E7C');
        graphics.roundRect(-width / 2 + 9, -height / 2 + 9, width - 18, height - 18, 14);
        graphics.fill();
        graphics.lineWidth = 3;
        graphics.strokeColor = this.ui.color(enabled ? '#FFF0A0' : '#B0A2AD');
        graphics.roundRect(-width / 2 + 13, -height / 2 + 13, width - 26, height - 26, 11);
        graphics.stroke();
        graphics.strokeColor = this.ui.color(enabled ? '#FFF3B9' : '#A99EAA');
        graphics.lineWidth = 2;
        graphics.moveTo(-145, 23);
        graphics.lineTo(145, 23);
        graphics.stroke();
        for (const side of [-1, 1]) {
            graphics.fillColor = this.ui.color(enabled ? '#FFF0A0' : '#B0A2AD');
            graphics.moveTo(side * 164, 0);
            graphics.lineTo(side * 174, 9);
            graphics.lineTo(side * 184, 0);
            graphics.lineTo(side * 174, -9);
            graphics.close();
            graphics.fill();
        }
        this.recruitButtonLabel.color = this.ui.color(enabled ? '#421923' : '#D0C4C8');
    }

    private sync(): void {
        const state = this.game.state;
        const available = state === GameState.Preparation;
        const enabled = available && this.game.economy.gold >= this.game.price;
        this.recruitButton.name = available ? 'Recruit' : 'RecruitLocked';
        let label = '暂不可招募';
        if (state === GameState.Preparation) label = '转动命运';
        else if (state === GameState.Roulette) label = '命运流转中…';
        else if (state === GameState.Evolution) label = '选择转职方向';
        else if (state === GameState.Placement) label = '完成布阵后继续';
        else if (state === GameState.Battle) label = '战斗进行中';
        const key = state + ':' + enabled + ':' + label;
        if (key === this.lastButtonKey) return;
        this.lastButtonKey = key;
        this.recruitButtonLabel.string = label;
        this.drawRecruitButton(enabled);
    }

    private sector(graphics: Graphics, index: number): void {
        graphics.moveTo(0, 0);
        for (let step = 0; step <= 40; step++) {
            const angle = (90 + SECTOR_DEGREES / 2 - index * SECTOR_DEGREES - step / 40 * SECTOR_DEGREES) * Math.PI / 180;
            graphics.lineTo(
                Math.cos(angle) * BATTLE_LAYOUT.wheelRadius,
                Math.sin(angle) * BATTLE_LAYOUT.wheelRadius,
            );
        }
        graphics.close();
    }

    update(_dt: number): void {
        this.sync();
        const recruit = this.game.recruit;
        const spinning = this.game.state === GameState.Roulette && !recruit.revealing;
        this.rotor.setRotationFromEuler(0, 0, recruit.rotation);
        const index = recruit.revealing && recruit.plan ? recruit.plan.index : -1;
        if (index !== this.highlighted) {
            this.highlighted = index;
            this.highlight.clear();
            if (index >= 0) {
                this.sector(this.highlight, index);
                this.highlight.fillColor = this.ui.color('#F1C77A33');
                this.highlight.fill();
                this.highlight.strokeColor = this.ui.color('#FFF0A5');
                this.highlight.lineWidth = 6;
                this.highlight.stroke();
            }
        }
        const age = recruit.elapsed - RECRUIT_CONFIG.spinDuration;
        const kick = index >= 0 && age < 0.55 ? Math.sin(age / 0.55 * Math.PI) * 0.07 : 0;
        this.pointer.setScale(1 + kick, 1 + kick, 1);
        if (spinning) this.recruitButtonLabel.string = '命运流转中…';
    }
}