import { _decorator, Component, director, find, Label, Node, profiler } from 'cc';
const { ccclass } = _decorator;
/** Only wires the existing challenge button. All existing menu art/layout remains intact. */
@ccclass('MainMenuEntry')
export class MainMenuEntry extends Component {
    private entering = false;
    private button: Node | null = null;
    protected onLoad(): void {
        profiler.hideStats();
        this.button = find('UIRoot/ChapterPanel/Btn_StartChallenge', this.node);
        this.button?.on(Node.EventType.TOUCH_END, this.enterBattle, this);
        director.preloadScene('Battle');
    }
    private enterBattle(): void {
        if (this.entering) return;
        this.entering = true;
        const label = this.button?.getChildByName('Label_Title')?.getComponent(Label);
        if (label) label.string = '命运之门开启中…';
        director.loadScene('Battle', error => {
            if (error) {
                this.entering = false;
                if (label) label.string = '重试挑战';
                console.error('[Demo] Cannot load Battle. Include both scenes in build settings.', error);
            }
        });
    }
    // Child nodes release their own listeners. During scene destruction they may already be
    // destroyed before the Canvas component, so never call Node.off on the cached child here.
    protected onDestroy(): void { this.button = null; }
}
