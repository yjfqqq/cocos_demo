import { Node } from 'cc';
import { GameManager } from '../core/GameManager';
import { BASES } from '../config/DemoConfig';
import { BATTLE_LAYOUT, CLASS_PRESENTATION } from '../config/RecruitConfig';
import { DarkUI, PALETTE } from './DarkUI';
import { classIcon } from './ClassIcon';
export class EvolutionUI {
    constructor(parent: Node, ui: DarkUI, game: GameManager) {
        const base=BASES.find(base=>base.id===game.recruit.drawnBase)!;
        const panel = ui.modal(parent, `${base.name} · 选择转职`, '命运已经选定职业 · 选择一个方向，然后确认招募', 1170, 740);
        panel.name='EvolutionModal';panel.setPosition(BATTLE_LAYOUT.fieldX,0);
        game.recruit.choices.forEach((config, index) => {
            const x = (index - 1) * 370, selected=game.recruit.selectedEvolutionId===config.id;
            const card = ui.panel(panel, `Evolution_${config.id}`, x, -20, 342, 380, selected?'#363047':'#202139', selected?PALETTE.gold:config.color);
            const icon=classIcon(card,ui,config.base,58);icon.setPosition(0,126);
            ui.text(card, config.name, 0, 64, 29, config.color, 315, 52);
            ui.text(card, CLASS_PRESENTATION[config.base].role, 0, 12, 22, PALETTE.muted, 315, 42);
            if(config.description)ui.text(card, config.description, 0, -61, 23, PALETTE.text, 300, 100);
            ui.text(card, `生命 ${config.hp} · 攻击 ${config.attack}`, 0, -134, 20, PALETTE.muted, 315, 36);
            ui.text(card, selected?'◆ 已选中':'点击选择',0,-170,22,selected?PALETTE.gold:PALETTE.muted,315,35);
            card.on(Node.EventType.TOUCH_END,()=>game.selectEvolution(config.id));
        });
        ui.button(panel,'ConfirmEvolution','确认转职并招募',0,-280,440,78,()=>game.confirmEvolution(),!!game.recruit.selectedEvolutionId,true);
        ui.text(panel, 'Demo 测试职业与技能 · 试作方向保留标记', 0, -340, 20, PALETTE.muted, 1000, 32);
    }
}
