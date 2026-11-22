import { Node } from 'cc';
import { GameManager } from '../core/GameManager';
import { GameState } from '../core/GameState';
import { DarkUI, PALETTE } from './DarkUI';
export class SettlementUI {
    constructor(parent: Node, ui: DarkUI, game: GameManager, restart: () => void, menu: () => void) {
        const victory = game.state === GameState.Victory;
        const panel = ui.modal(parent, victory ? '永夜已破 · 挑战胜利' : '命运暂歇 · 挑战失败', victory ? '你已清理全部五波敌军' : '全队已阵亡 · 调整阵型，重新迎接命运', 1100, 670);
        ui.text(panel, `完成波次 ${game.cleared} / 5     击败敌军 ${game.kills}\n玩家等级 ${game.progression.level}     剩余金币 ${game.economy.gold}`, 0, 45, 32, PALETTE.text, 960, 140);
        ui.text(panel, `各波用时：${game.waveTimes.map(time => `${time.toFixed(1)}秒`).join(' / ')}`, 0, -75, 25, PALETTE.muted, 970, 80);
        ui.button(panel, 'BackToMenu', '返回主界面', -230, -225, 380, 80, menu);
        ui.button(panel, 'RestartDemo', '再次挑战', 230, -225, 380, 80, restart, true, true);
    }
}
