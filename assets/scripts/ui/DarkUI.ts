import { Color, Font, Graphics, Label, Layers, Node, Sprite, SpriteFrame, UITransform } from 'cc';
export const PALETTE = { gold: '#D5B97C', text: '#E5E0D7', muted: '#A3A9C2', panel: '#15182E', blue: '#759FC4', red: '#D78B95', green: '#8CC5AB' };
export class DarkUI {
    font: Font | null = null;
    color(hex: string): Color { return new Color().fromHEX(hex); }
    node(parent: Node, name: string, x = 0, y = 0, w = 100, h = 100): Node {
        const node = new Node(name); node.layer = Layers.Enum.UI_2D; parent.addChild(node);
        node.setPosition(x, y); node.addComponent(UITransform).setContentSize(w, h); return node;
    }
    panel(parent: Node, name: string, x: number, y: number, w: number, h: number,
        fill = PALETTE.panel, stroke = '#61567A', opacity = 245): Node {
        const node = this.node(parent, name, x, y, w, h), graphics = node.addComponent(Graphics);
        const color = this.color(fill); color.a = opacity; graphics.fillColor = color;
        graphics.roundRect(-w / 2, -h / 2, w, h, 12); graphics.fill();
        graphics.lineWidth = 2; graphics.strokeColor = this.color(stroke); graphics.stroke();
        if (w < 2000 && h >= 140) {
            // Inset corner filigree echoes the existing gold chapter frames without covering art.
            graphics.lineWidth = 2;
            for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
                const cx = sx * (w / 2 - 11), cy = sy * (h / 2 - 11);
                graphics.moveTo(cx - sx * 30, cy); graphics.lineTo(cx, cy); graphics.lineTo(cx, cy - sy * 24);
                graphics.moveTo(cx - sx * 7, cy - sy * 7); graphics.lineTo(cx - sx * 15, cy - sy * 7);
            }
            graphics.stroke();
        }
        return node;
    }
    text(parent: Node, value: string, x: number, y: number, size = 26, color = PALETTE.text, w = 900, h = 60): Label {
        const node = this.node(parent, 'Text', x, y, w, h), label = node.addComponent(Label);
        label.overflow = Label.Overflow.SHRINK;
        if (this.font) { label.font = this.font; label.useSystemFont = false; }
        label.string = value; label.fontSize = size; label.lineHeight = size + 10;
        label.color = this.color(color); label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.enableWrapText = true;
        // Label initially uses auto sizing when attached; restore the intended layout bounds
        // after setting overflow/font/string, otherwise long text can shrink to a tiny box.
        node.getComponent(UITransform)!.setContentSize(w, h);
        return label;
    }
    button(parent: Node, name: string, value: string, x: number, y: number, w: number, h: number,
        action: () => void, enabled = true, accent = false): Node {
        const node = this.panel(parent, name, x, y, w, h, enabled ? accent ? '#3A3042' : '#20263F' : '#171B2C', enabled ? accent ? PALETTE.gold : '#696080' : '#393C4E');
        if (enabled && accent) {
            const graphics = node.getComponent(Graphics)!;
            graphics.fillColor = this.color(PALETTE.gold);
            for (const sx of [-1, 1]) {
                const cx = sx * (w / 2 - 16);
                graphics.moveTo(cx, 6); graphics.lineTo(cx + 4, 0); graphics.lineTo(cx, -6); graphics.lineTo(cx - 4, 0); graphics.close(); graphics.fill();
            }
        }
        this.text(node, value, 0, 0, 27, enabled ? accent ? '#F3D99B' : PALETTE.text : '#656B85', w - 24, h - 8);
        node.on(Node.EventType.TOUCH_END, () => { if (enabled) action(); }); return node;
    }
    image(parent: Node, frame: SpriteFrame, name: string, x: number, y: number, w: number, h: number): Sprite {
        const node = this.node(parent, name, x, y, w, h), sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.spriteFrame = frame; return sprite;
    }
    modal(parent: Node, title: string, subtitle: string, w = 1120, h = 790): Node {
        const backdrop = this.panel(parent, 'ModalBackdrop', 0, 0, 2400, 1400, '#050711', '#050711', 205);
        // The full-screen UITransform consumes touches, including on empty modal space.
        backdrop.on(Node.EventType.TOUCH_START, () => {});
        backdrop.on(Node.EventType.TOUCH_END, () => {});
        const panel = this.panel(backdrop, 'Modal', 0, 0, w, h, '#13172C', PALETTE.gold);
        this.text(panel, title, 0, h / 2 - 65, 43, PALETTE.gold, w - 60, 65);
        this.text(panel, subtitle, 0, h / 2 - 128, 24, PALETTE.muted, w - 70, 60);
        return panel;
    }
    clear(node: Node): void { for (const child of [...node.children]) { child.removeFromParent(); child.destroy(); } }
}
