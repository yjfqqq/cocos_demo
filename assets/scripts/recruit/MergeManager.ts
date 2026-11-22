import { FormationManager, FormationUnit } from './FormationManager';
export interface MergeOffer { units: FormationUnit[]; configId: string; star: number; }
export class MergeManager {
    private declined = new Set<string>();
    key(units: FormationUnit[]): string { return units.map(unit => unit.id).sort((a, b) => a - b).join(','); }
    next(formation: FormationManager): MergeOffer | undefined {
        for (const unit of formation.units) {
            if (unit.star >= 3) continue;
            const matches = formation.units.filter(other => other.config.id === unit.config.id && other.star === unit.star);
            // Sliding groups let a new recruit offer a merge again after a previous retain choice.
            for (let i = 0; i + 2 < matches.length; i++) {
                const units = matches.slice(i, i + 3);
                if (!this.declined.has(this.key(units))) return { units, configId: unit.config.id, star: unit.star };
            }
        }
        return undefined;
    }
    decline(offer: MergeOffer): void { this.declined.add(this.key(offer.units)); }
    merge(offer: MergeOffer, formation: FormationManager): void {
        const survivor = offer.units[0];
        survivor.star++;
        survivor.investment = offer.units.reduce((sum, unit) => sum + unit.investment, 0);
        formation.units = formation.units.filter(unit => unit === survivor || offer.units.indexOf(unit) < 0);
    }
}
