import { Graphics, Label, Node, Sprite, SpriteFrame, UIOpacity } from 'cc';
import { BASES } from '../config/DemoConfig';
import { AIState, UnitController } from '../battle/UnitController';
import { FormationUnit } from '../recruit/FormationManager';
import { DarkUI, PALETTE } from './DarkUI';
export class UnitView {
    readonly node: Node;
    private art: Sprite | null = null;
    private bar: Graphics;
    private ring: Graphics;
    private status: Label;
    private opacity: UIOpacity;
    private lastFrame = -1;
    private deathTime = 0;
    constructor(parent: Node, private ui: DarkUI, private frames: SpriteFrame[], public model: UnitController | FormationUnit) {
        const config = model.config, boss = !!config.boss;
        this.node = ui.node(parent, `Unit_${model.id}`, model.x, model.y, boss ? 160 : 108, boss ? 190 : 145);
        this.opacity = this.node.addComponent(UIOpacity);
        this.ring = ui.node(this.node, 'Footprint').addComponent(Graphics);
        if (frames.length) {
            const h = boss ? 180 : 108;
            this.art = ui.image(this.node, frames[0], 'Guard', 0, h * .31, h * 362 / 543, h);
            this.art.color = ui.color('team' in model && model.team === 'enemy' ? config.color : '#E3D9EF');
        } else {
            const body = ui.node(this.node, 'Fallback').addComponent(Graphics);
            body.fillColor = ui.color(config.color); body.moveTo(0, 75); body.lineTo(28, 10); body.lineTo(-28, 10); body.close(); body.fill();
        }
        const symbol = BASES.find(base => base.id === config.base)?.symbol || '刃';
        ui.text(this.node, boss ? '领主' : symbol, -33, 64, 20, config.color, 52, 36);
        this.bar = ui.node(this.node, 'Health', 0, boss ? 158 : 106, boss ? 140 : 92, 10).addComponent(Graphics);
        this.status = ui.text(this.node, `${config.name}${'★'.repeat(model.star)}`, 0, -29, 21, config.color, boss ? 220 : 170, 32);
    }
    update(dt: number, clock: number): void {
        const unit = this.model;
        const battle = 'alive' in unit;
        const alive = !battle || unit.alive;
        const moving = battle && unit.state === AIState.MoveToTarget;
        this.node.setPosition(unit.x, unit.y);
        this.ring.clear();
        this.ring.lineWidth = 2;
        this.ring.strokeColor = this.ui.color(battle && unit.team === 'enemy' ? '#B0769E' : '#CCB57C');
        this.ring.ellipse(0, -4, unit.config.radius, unit.config.radius * .42); this.ring.stroke();
        if (battle && unit.action?.skill) {
            this.ring.strokeColor = this.ui.color(unit.team === 'enemy' ? '#E88686' : '#D8C38D');
            this.ring.circle(0, 0, unit.config.boss ? unit.config.skill.radius : unit.config.radius + 12); this.ring.stroke();
        }
        const ratio = battle ? unit.hp / unit.maxHp : 1;
        const width = unit.config.boss ? 140 : 92;
        this.bar.clear(); this.bar.fillColor = this.ui.color('#171929'); this.bar.rect(-width / 2, -5, width, 10); this.bar.fill();
        this.bar.fillColor = this.ui.color(battle && unit.team === 'enemy' ? '#BA778B' : '#91BCA6');
        if (alive) { this.bar.rect(-width / 2, -5, width * ratio, 10); this.bar.fill(); }
        if (this.art) {
            const frame = Math.floor((clock + unit.id * .15) * (moving ? 11 : 6)) % this.frames.length;
            if (frame !== this.lastFrame) { this.art.spriteFrame = this.frames[frame]; this.lastFrame = frame; }
            const lunge = battle && unit.animation > 0 ? Math.sin(unit.animation / .38 * Math.PI) * 13 * unit.facing : 0;
            this.art.node.setPosition(lunge, (unit.config.boss ? 180 : 108) * .31 + (moving ? Math.abs(Math.sin(clock * 13)) * 5 : 0));
            this.art.node.setScale(battle ? unit.facing : 1, 1, 1);
            this.art.color = this.ui.color(battle && unit.flash > 0 ? '#FFFFFF' : battle && unit.team === 'enemy' ? unit.config.color : '#E3D9EF');
        }
        if (!alive) {
            this.deathTime += dt; this.opacity.opacity = Math.max(45, 200 - this.deathTime * 150);
            this.art?.node.setRotationFromEuler(0, 0, 78); this.status.string = '阵亡';
        }
    }
}
