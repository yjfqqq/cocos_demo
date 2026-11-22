import { Node } from 'cc';
import { RULES } from '../config/DemoConfig';
import { GameManager } from '../core/GameManager';
import { DarkUI, PALETTE } from './DarkUI';
export class FormationUI {
    static replacement(parent: Node, ui: DarkUI, game: GameManager): void {
        const panel = ui.modal(parent, '阵容已满 · 选择替换', `新单位：${game.recruit.pending?.config.name} · 旧单位返还投入金币的 ${RULES.refundRatio * 100}%`, 1260, 800);
        game.formation.units.forEach((unit, i) => {
            const x = (i % 2 ? 1 : -1) * 295, y = 170 - Math.floor(i / 2) * 104;
            ui.button(panel, `Replace_${unit.id}`, `${unit.config.name} ${'★'.repeat(unit.star)}  ·  返还 ${Math.floor(unit.investment * RULES.refundRatio)} 金`, x, y, 550, 86, () => game.replace(unit.id));
        });
        ui.text(panel, '无备战区 · 确认替换后可自由拖动新单位', 0, -345, 23, PALETTE.muted);
    }
    static merge(parent: Node, ui: DarkUI, game: GameManager): void {
        const offer = game.mergeOffer!;
        const panel = ui.modal(parent, '命运共鸣', '三位相同转职与星级的单位可以合成 · 也可以保留', 1060, 600);
        ui.text(panel, offer.units[0].config.name, 0, 35, 43, offer.units[0].config.color);
        ui.text(panel, `${'★'.repeat(offer.star)} × 3     →     ${'★'.repeat(offer.star + 1)}`, 0, -45, 38, PALETTE.gold);
        ui.text(panel, offer.star === 2 ? '三星：原技能进化为终极形态，固定冷却自动释放' : '二星：提升属性并强化原有技能', 0, -115, 24, PALETTE.muted);
        ui.button(panel, 'KeepUnits', '保留三位', -220, -220, 350, 76, () => game.resolveMerge(false));
        ui.button(panel, 'MergeUnits', '确认合成', 220, -220, 350, 76, () => game.resolveMerge(true), true, true);
    }
}
