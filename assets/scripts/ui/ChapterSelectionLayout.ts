import { _decorator, Component, Node, ScrollView, UITransform, Vec3 } from 'cc';

const { ccclass, executeInEditMode, property } = _decorator;

/** Presentation only: keep the chapter strip inside the bottom of the Canvas. */
@ccclass('ChapterSelectionLayout')
@executeInEditMode
export class ChapterSelectionLayout extends Component {
    @property(Node) canvasNode: Node | null = null;
    @property(Node) viewport: Node | null = null;
    @property(Node) content: Node | null = null;

    private layoutDirty = true;
    private applyingLayout = false;
    private initialLayout = true;

    protected onEnable(): void {
        this.canvasNode?.on(Node.EventType.SIZE_CHANGED, this.requestLayout, this);
        this.canvasNode?.on(Node.EventType.TRANSFORM_CHANGED, this.requestLayout, this);
        this.initialLayout = true;
        this.requestLayout();
    }

    protected onDisable(): void {
        this.canvasNode?.off(Node.EventType.SIZE_CHANGED, this.requestLayout, this);
        this.canvasNode?.off(Node.EventType.TRANSFORM_CHANGED, this.requestLayout, this);
    }

    private requestLayout(): void {
        // Size events can be emitted during Widget alignment. Never write geometry here.
        this.layoutDirty = true;
    }

    protected lateUpdate(): void {
        if (!this.layoutDirty || this.applyingLayout) return;
        this.layoutDirty = false;
        this.applyingLayout = true;
        try {
            this.applyLayout();
        } finally {
            this.applyingLayout = false;
        }
    }

    private applyLayout(): void {
        const parentUI = this.node.parent?.getComponent(UITransform);
        const ownUI = this.getComponent(UITransform);
        const canvasUI = this.canvasNode?.getComponent(UITransform);
        const viewportUI = this.viewport?.getComponent(UITransform);
        if (!parentUI || !ownUI || !canvasUI || !viewportUI) return;

        const a = parentUI.convertToNodeSpaceAR(canvasUI.convertToWorldSpaceAR(
            new Vec3(-canvasUI.width * canvasUI.anchorX, -canvasUI.height * canvasUI.anchorY, 0)));
        const b = parentUI.convertToNodeSpaceAR(canvasUI.convertToWorldSpaceAR(
            new Vec3(canvasUI.width * (1 - canvasUI.anchorX), 0, 0)));
        const width = Math.max(2, Math.floor(Math.min(1272, b.x - a.x - 48) / 2) * 2);
        const x = Math.round((a.x + b.x) / 2);
        const y = Math.round(a.y + 24 + ownUI.height / 2);
        const resized = Math.abs(viewportUI.width - width) > 0.01;

        // The strip's three old Widgets are disabled: this component is the sole geometry owner.
        if (Math.abs(ownUI.width - width) > 0.01) ownUI.setContentSize(width, ownUI.height);
        if (resized) viewportUI.setContentSize(width, viewportUI.height);
        if (this.node.position.x !== x || this.node.position.y !== y) {
            this.node.setPosition(x, y, this.node.position.z);
        }
        if (this.content && (resized || this.initialLayout)) {
            this.content.setPosition(-width / 2, 0, 0);
            this.viewport?.getComponent(ScrollView)?.stopAutoScroll();
            this.viewport?.getComponent(ScrollView)?.scrollToLeft(0);
        }
        this.initialLayout = false;
    }
}
