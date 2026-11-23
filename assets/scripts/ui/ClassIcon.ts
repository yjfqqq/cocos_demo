import { Graphics, isValid, Node, resources, SpriteFrame } from 'cc';
import { BaseClass } from '../config/DemoConfig';
import { CLASS_PRESENTATION } from '../config/RecruitConfig';
import { DarkUI } from './DarkUI';

/** Seven distinct, compact fantasy class emblems drawn in a shared pixel-RPG palette. */
export function classIcon(parent: Node, ui: DarkUI, base: BaseClass, size = 64): Node {
    const node = ui.node(parent, 'Icon_' + base, 0, 0, size, size);
    node.setScale(size / 64, size / 64, 1);
    const graphics = node.addComponent(Graphics);
    const outline = '#34213E';
    const gold = '#F5C75F';
    const silver = '#DCE6EF';

    const polygon = (points: number[][], fill: string, stroke = outline, width = 3) => {
        graphics.fillColor = ui.color(fill);
        graphics.strokeColor = ui.color(stroke);
        graphics.lineWidth = width;
        graphics.moveTo(points[0][0], points[0][1]);
        points.slice(1).forEach(([x, y]) => graphics.lineTo(x, y));
        graphics.close();
        graphics.fill();
        graphics.stroke();
    };
    const line = (points: number[][], color: string, width = 4) => {
        graphics.strokeColor = ui.color(color);
        graphics.lineWidth = width;
        graphics.moveTo(points[0][0], points[0][1]);
        points.slice(1).forEach(([x, y]) => graphics.lineTo(x, y));
        graphics.stroke();
    };
    const circle = (x: number, y: number, radius: number, fill: string, stroke = outline, width = 3) => {
        graphics.fillColor = ui.color(fill);
        graphics.strokeColor = ui.color(stroke);
        graphics.lineWidth = width;
        graphics.circle(x, y, radius);
        graphics.fill();
        graphics.stroke();
    };

    if (base === 'warrior') {
        // Crossed swords.
        polygon([[-25, -14], [-17, -23], [22, 14], [14, 22]], silver, '#5C5368', 3);
        polygon([[25, -14], [17, -23], [-22, 14], [-14, 22]], '#F4E5C5', '#5C5368', 3);
        polygon([[-29, -22], [-22, -29], [-12, -19], [-19, -12]], '#A76A36', '#4A2A27', 3);
        polygon([[29, -22], [22, -29], [12, -19], [19, -12]], '#A76A36', '#4A2A27', 3);
        line([[-23, -14], [-12, -3], [-5, 4]], gold, 5);
        line([[23, -14], [12, -3], [5, 4]], gold, 5);
        circle(-25, -23, 4, '#E8B64D', '#6B3C2A', 2);
        circle(25, -23, 4, '#E8B64D', '#6B3C2A', 2);
    } else if (base === 'guardian') {
        polygon([[-25, 22], [25, 22], [22, -5], [0, -29], [-22, -5]], '#F2C45B', '#6B3D29', 4);
        polygon([[-18, 16], [18, 16], [16, -4], [0, -21], [-16, -4]], '#3478B5', '#FBE8A2', 2);
        polygon([[0, 12], [5, 3], [15, 0], [5, -4], [0, -15], [-5, -4], [-15, 0], [-5, 3]], '#FFF0B1', '#D99A3B', 2);
    } else if (base === 'assassin') {
        polygon([[-26, 17], [-24, -5], [-12, -24], [0, -29], [12, -24], [24, -5], [26, 17], [12, 27], [-12, 27]], '#49345F', '#B28AD7', 3);
        polygon([[-16, 10], [-14, -6], [0, -20], [14, -6], [16, 10], [0, 19]], '#191629', '#8E6AB7', 2);
        polygon([[-13, 3], [-3, 0], [-8, 8]], '#E4B9FF', '#A77BD6', 1);
        polygon([[13, 3], [3, 0], [8, 8]], '#E4B9FF', '#A77BD6', 1);
        line([[-21, -17], [-27, -26], [-13, -22]], gold, 3);
        line([[21, -17], [27, -26], [13, -22]], gold, 3);
    } else if (base === 'archer') {
        line([[-16, 27], [-7, 20], [0, 8], [3, 0], [0, -8], [-7, -20], [-16, -27]], '#C58A3F', 6);
        line([[-16, 27], [-16, 0], [-16, -27]], '#F4E2B7', 2);
        line([[-25, 0], [24, 0]], silver, 4);
        polygon([[28, 0], [16, 9], [17, 0], [16, -9]], '#F2C45B', '#65402D', 2);
        polygon([[-25, 0], [-17, 7], [-18, 0], [-17, -7]], '#B6D6D8', '#526D7A', 2);
        circle(0, 0, 4, '#F4D26F', '#6D452A', 2);
    } else if (base === 'healer') {
        line([[0, -27], [0, 27]], '#D9A34A', 6);
        line([[-4, -24], [4, -24]], '#F7D98C', 2);
        polygon([[-26, 7], [-18, 18], [-8, 12], [-2, 5], [-13, 1]], '#DDE8C2', '#6C9B78', 2);
        polygon([[26, 7], [18, 18], [8, 12], [2, 5], [13, 1]], '#DDE8C2', '#6C9B78', 2);
        polygon([[-7, 19], [7, 19], [7, 5], [20, 5], [20, -5], [7, -5], [7, -19], [-7, -19], [-7, -5], [-20, -5], [-20, 5], [-7, 5]], '#F5E9B5', '#9D6B36', 3);
        line([[-16, -24], [0, -29], [16, -24]], gold, 3);
    } else if (base === 'mage') {
        polygon([[-26, -17], [26, -17], [18, -10], [-18, -10]], '#E6B64F', '#6A3E2A', 3);
        polygon([[-18, -10], [-10, 7], [-3, 28], [5, 23], [20, -10]], '#3158A2', '#E9C56E', 3);
        polygon([[-7, 5], [0, 15], [8, 6], [0, -2]], '#8ED8FF', '#FFF0A2', 2);
        circle(0, 8, 4, '#F8E9A4', '#8D5A32', 2);
        line([[-14, -15], [14, -15]], '#FFF0A0', 2);
    } else {
        // Knight helmet with a red plume and a gold visor.
        polygon([[-23, 18], [-22, -4], [-12, -20], [12, -20], [22, -4], [23, 18], [0, 26]], '#BFC9D5', '#6A4B3B', 4);
        polygon([[-16, 12], [-15, -3], [-7, -14], [7, -14], [15, -3], [16, 12]], '#71869A', '#F5D47B', 2);
        polygon([[-5, 23], [-11, 31], [0, 27], [11, 31], [5, 23]], '#B83C45', '#5E2635', 2);
        line([[-14, 4], [14, 4]], '#2A2637', 4);
        line([[0, -14], [0, 19]], '#E8D7AE', 2);
        circle(0, 0, 3, '#F9D56D', '#7A4B2A', 1);
    }

    const resource = CLASS_PRESENTATION[base].iconResource;
    if (resource) {
        resources.load(resource, SpriteFrame, (error, frame) => {
            if (error || !isValid(node)) return;
            graphics.clear();
            ui.image(node, frame, 'ClassSprite', 0, 0, 64, 64);
        });
    }
    return node;
}