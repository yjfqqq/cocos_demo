import { Graphics, Label, Node } from 'cc';
import { BASES } from '../config/DemoConfig';
import { BATTLE_LAYOUT, CLASS_PRESENTATION, RECRUIT_CONFIG } from '../config/RecruitConfig';
import { GameManager } from '../core/GameManager';
import { GameState } from '../core/GameState';
import { SECTOR_DEGREES } from '../recruit/RouletteSpin';
import { DarkUI, PALETTE } from './DarkUI';
import { classIcon } from './ClassIcon';
export class RouletteUI {
    readonly node: Node;
    readonly rotor: Node;
    readonly pointer: Node;
    private highlight: Graphics;
    private result: Label;
    private detail: Label;
    private highlighted = -2;
    private clock = 0;
    constructor(parent: Node, private ui: DarkUI, private game: GameManager) {
        this.node = ui.panel(parent, 'FateWheelPanel', BATTLE_LAYOUT.wheelX, 0, 530, 790, '#13172C', '#88734F', 235);
        ui.text(this.node, '命运转盘', 0, 345, 39, PALETTE.gold, 470, 60);
        ui.text(this.node, '七道命运  /  等概率降临', 0, 295, 22, PALETTE.muted, 470, 45);
        const frame = ui.node(this.node, 'WheelFrame', 0, BATTLE_LAYOUT.wheelY, 490, 490);
        const rim = frame.addComponent(Graphics);
        rim.fillColor = ui.color('#090E22'); rim.circle(0,0,244); rim.fill();
        rim.lineWidth = 7; rim.strokeColor = ui.color('#8F704C'); rim.circle(0,0,237); rim.stroke();
        rim.lineWidth = 2; rim.strokeColor = ui.color('#E5CEA0'); rim.circle(0,0,231); rim.stroke();
        rim.circle(0,0,244); rim.stroke();
        for (let i = 0; i < 56; i++) {
            const a = i / 56 * Math.PI * 2, r = i % 8 === 0 ? 220 : 225;
            rim.moveTo(Math.cos(a)*r,Math.sin(a)*r); rim.lineTo(Math.cos(a)*230,Math.sin(a)*230);
        }
        rim.stroke();
        this.rotor = ui.node(frame, 'WheelRotor', 0, 0, 432, 432);
        const sectors = this.rotor.addComponent(Graphics);
        BASES.forEach((base, i) => {
            this.sector(sectors, i); sectors.fillColor = ui.color(CLASS_PRESENTATION[base.id].color); sectors.fill();
            sectors.strokeColor = ui.color('#B29A6A'); sectors.lineWidth = 2; sectors.stroke();
            // Subtle inlaid arc, pips and engraved lines, rather than a flat colour disc.
            const angle = (90-i*SECTOR_DEGREES)*Math.PI/180;
            sectors.strokeColor = ui.color(`${CLASS_PRESENTATION[base.id].light}66`); sectors.lineWidth = 3;
            sectors.arc(0,0,199,angle-.34,angle+.34,false); sectors.stroke();
            for (const radius of [83, 91, 185]) {
                sectors.fillColor = ui.color(`${CLASS_PRESENTATION[base.id].light}99`);
                const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius;
                sectors.rect(x-2,y-2,4,4); sectors.fill();
            }
            const labelRoot = ui.node(this.rotor, `Sector_${base.id}`, Math.cos(angle)*145,Math.sin(angle)*145,125,105);
            labelRoot.setRotationFromEuler(0,0,-i*SECTOR_DEGREES);
            const icon = classIcon(labelRoot,ui,base.id,53); icon.setPosition(0,17);
            ui.text(labelRoot,base.name,0,-29,24,CLASS_PRESENTATION[base.id].light,125,38);
        });
        this.highlight = ui.node(this.rotor,'WinningSector').addComponent(Graphics);
        const centre = ui.node(frame,'ArcaneHub'), hub = centre.addComponent(Graphics);
        hub.fillColor=ui.color('#0C142B');hub.circle(0,0,66);hub.fill();hub.strokeColor=ui.color(PALETTE.gold);hub.lineWidth=3;hub.stroke();
        hub.circle(0,0,57);hub.stroke();
        hub.fillColor=ui.color('#3E355C');hub.moveTo(0,47);hub.lineTo(36,0);hub.lineTo(0,-47);hub.lineTo(-36,0);hub.close();hub.fill();hub.stroke();
        hub.fillColor=ui.color('#C7B4E6');hub.moveTo(0,26);hub.lineTo(13,0);hub.lineTo(0,-26);hub.lineTo(-13,0);hub.close();hub.fill();
        ui.text(centre,'命',0,0,25,'#FAE7B7',45,45);
        this.pointer=ui.node(frame,'FixedPointer',0,237,56,65);
        const pointer=this.pointer.addComponent(Graphics);
        pointer.fillColor=ui.color('#E5C88B');pointer.strokeColor=ui.color('#755638');pointer.lineWidth=3;
        pointer.moveTo(-22,27);pointer.lineTo(22,27);pointer.lineTo(0,-20);pointer.close();pointer.fill();pointer.stroke();
        pointer.fillColor=ui.color('#795268');pointer.moveTo(-9,19);pointer.lineTo(9,19);pointer.lineTo(0,-3);pointer.close();pointer.fill();
        this.result=ui.text(this.node,'静候命运的召唤',0,-287,25,PALETTE.gold,485,54);
        this.result.node.name='DrawResult';
        this.detail=ui.text(this.node,'转动后直接抽取一位基础职业\n完成转职与布阵后可再次招募',0,-345,20,PALETTE.muted,470,65);
    }
    private sector(graphics: Graphics,index: number): void {
        graphics.moveTo(0,0);
        for(let step=0;step<=40;step++) {
            const angle=(90+SECTOR_DEGREES/2-index*SECTOR_DEGREES-step/40*SECTOR_DEGREES)*Math.PI/180;
            graphics.lineTo(Math.cos(angle)*BATTLE_LAYOUT.wheelRadius,Math.sin(angle)*BATTLE_LAYOUT.wheelRadius);
        }
        graphics.close();
    }
    update(dt: number): void {
        this.clock+=dt;
        const recruit=this.game.recruit, spinning=this.game.state===GameState.Roulette&&!recruit.revealing;
        this.rotor.setRotationFromEuler(0,0,recruit.rotation);
        const index=recruit.revealing&&recruit.plan?recruit.plan.index:-1;
        if(index!==this.highlighted) {
            this.highlighted=index;this.highlight.clear();
            if(index>=0) {
                this.sector(this.highlight,index);this.highlight.fillColor=this.ui.color('#F1C77A22');this.highlight.fill();
                this.highlight.strokeColor=this.ui.color('#F4D497');this.highlight.lineWidth=5;this.highlight.stroke();
            }
        }
        const age=recruit.elapsed-RECRUIT_CONFIG.spinDuration;
        const kick=index>=0&&age<.55?Math.sin(age/.55*Math.PI)*.07:0;
        this.pointer.setScale(1+kick,1+kick,1);
        const selected=BASES.find(base=>base.id===recruit.drawnBase);
        this.result.string=spinning?'命运正在流转…':index>=0&&selected?`命运选择了你 · ${selected.name}`:'静候命运的召唤';
        this.result.node.setScale(index>=0&&age<1?1+Math.sin(Math.max(0,age)*Math.PI)*.06:1,1,1);
        this.detail.string=spinning?'指针停下之前，命运尚未揭晓':index>=0?'专属转职已开启 · 选择一个方向':'转动后直接抽取一位基础职业\n完成转职与布阵后可再次招募';
    }
}
