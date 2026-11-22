import { Node } from 'cc';
import { BOOSTS, RULES } from '../config/DemoConfig';
import { GameManager } from '../core/GameManager';
import { DarkUI, PALETTE } from './DarkUI';
export class ProgressionUI {
    constructor(parent: Node, ui: DarkUI, game: GameManager) {
        const level = game.progression;
        const panel = ui.modal(parent, '全队强化', `等级 ${level.level} · 待选强化 ${level.pending} 次 · 本次选择永久作用于全队`, 1240, 650);
        level.choices.forEach((id, i) => {
            const boost = BOOSTS.find(boost => boost.id === id)!;
            const card = ui.panel(panel, `Boost_${id}`, (i - 1) * 390, -15, 350, 270);
            ui.text(card, boost.name, 0, 65, 34, PALETTE.gold, 320);
            ui.text(card, boost.description, 0, -15, 26, PALETTE.text, 310, 80);
            ui.button(card, `ChooseBoost_${id}`, '选择强化', 0, -95, 285, 66, () => game.chooseBoost(id), true, true);
        });
        ui.button(panel, 'RefreshBoost', `刷新 ${RULES.refreshCost} 金币（${level.refreshes}/${RULES.maxRefresh}）`, 0, -245, 490, 70,
            () => game.refreshBoost(), level.refreshes < RULES.maxRefresh && game.economy.gold >= RULES.refreshCost);
    }
}
