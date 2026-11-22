import { Graphics, isValid, Node, resources, SpriteFrame } from 'cc';
import { BaseClass } from '../config/DemoConfig';
import { CLASS_PRESENTATION } from '../config/RecruitConfig';
import { DarkUI } from './DarkUI';
/** Matching pixel silhouettes; optional per-class sprite path is a drop-in replacement. */
export function classIcon(parent: Node, ui: DarkUI, base: BaseClass, size = 58): Node {
    const node = ui.node(parent, `Icon_${base}`, 0, 0, size, size);
    const graphics = node.addComponent(Graphics);
    node.setScale(size / 64, size / 64, 1);
    const light = CLASS_PRESENTATION[base].light;
    graphics.fillColor = ui.color(light); graphics.strokeColor = ui.color(light); graphics.lineWidth = 4;
    const rect = (x: number, y: number, w: number, h: number) => { graphics.rect(x, y, w, h); graphics.fill(); };
    const polygon = (points: number[][]) => { graphics.moveTo(points[0][0], points[0][1]); points.slice(1).forEach(([x,y]) => graphics.lineTo(x,y)); graphics.close(); graphics.fill(); };
    if (base === 'warrior' || base === 'assassin') {
        for (const side of base === 'assassin' ? [-1, 1] : [0]) {
            polygon([[side * 13 - 5, -10], [side * 13 - 5, 17], [side * 13, 27], [side * 13 + 5, 17], [side * 13 + 5, -10]]);
            rect(side * 13 - 12, -13, 24, 5); rect(side * 13 - 3, -27, 6, 14);
        }
    } else if (base === 'guardian') {
        polygon([[-24,24],[24,24],[24,-4],[16,-16],[0,-28],[-16,-16],[-24,-4]]);
        graphics.fillColor = ui.color('#20263C'); polygon([[-16,16],[16,16],[16,-2],[0,-19],[-16,-2]]);
        graphics.fillColor = ui.color(light); rect(-3,-10,6,26); rect(-12,1,24,5);
    } else if (base === 'archer') {
        graphics.moveTo(-14,26); graphics.lineTo(2,18); graphics.lineTo(12,0); graphics.lineTo(2,-18); graphics.lineTo(-14,-26); graphics.stroke();
        graphics.lineWidth = 2; graphics.moveTo(-14,26); graphics.lineTo(-14,-26); graphics.stroke();
        rect(-25,-2,49,4); polygon([[26,0],[16,8],[16,-8]]);
    } else if (base === 'healer') {
        rect(-7,-26,14,52); rect(-25,-7,50,14);
        graphics.fillColor = ui.color('#EFF2CA'); rect(-3,-15,6,30); rect(-15,-3,30,6);
    } else if (base === 'mage') {
        rect(-3,-27,6,39); polygon([[0,30],[14,16],[0,2],[-14,16]]);
        rect(-24,16,5,5); rect(20,4,5,5); graphics.fillColor = ui.color('#E3D7FF'); polygon([[0,24],[6,16],[0,8],[-6,16]]);
    } else {
        polygon([[-22,-20],[19,-20],[24,-11],[10,-5],[10,8],[22,8],[22,18],[9,28],[-5,21],[-14,8],[-15,-5]]);
        graphics.fillColor = ui.color('#2A2936'); rect(7,14,5,4);
        graphics.fillColor = ui.color(light); rect(-25,-28,52,5);
    }
    const resource = CLASS_PRESENTATION[base].iconResource;
    if (resource) resources.load(resource, SpriteFrame, (error, frame) => {
        if (error || !isValid(node)) return;
        graphics.clear(); ui.image(node, frame, 'ClassSprite', 0, 0, 64, 64);
    });
    return node;
}
