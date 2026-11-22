const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../tools/cocos-typescript.cjs');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
}).outputText, filename);
const { GameManager } = require('../assets/scripts/core/GameManager.ts');
const { GameState } = require('../assets/scripts/core/GameState.ts');
const { AIState, UnitController } = require('../assets/scripts/battle/UnitController.ts');
const { BattleManager } = require('../assets/scripts/battle/BattleManager.ts');
const { TargetingSystem } = require('../assets/scripts/battle/TargetingSystem.ts');
const { SeparationSystem } = require('../assets/scripts/battle/SeparationSystem.ts');
const { CombatSystem } = require('../assets/scripts/battle/CombatSystem.ts');
const { UnitAI } = require('../assets/scripts/battle/UnitAI.ts');
const { WaveDirector } = require('../assets/scripts/battle/WaveDirector.ts');
const { RouletteManager } = require('../assets/scripts/recruit/RouletteManager.ts');
const { EconomyManager } = require('../assets/scripts/progression/EconomyManager.ts');
const { PlayerLevelManager } = require('../assets/scripts/progression/PlayerLevelManager.ts');
const { BASES, EVOLUTIONS_BY_BASE, ENEMIES, DEMO_WAVES, RULES } = require('../assets/scripts/config/DemoConfig.ts');
// Test fixture ordering only. Production has no mixed evolution list.
const EVOLUTIONS = ['warrior','guardian','archer','assassin','healer','mage','knight'].flatMap(base=>EVOLUTIONS_BY_BASE[base]);
function random(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
const cases = [];
function test(name, fn) { fn(); cases.push(name); console.log(`PASS ${name}`); }
function recruit(game) {
    assert.equal(game.spin(), true);
    game.updateRecruit(4.8);
    const config = game.recruit.choices[0];
    game.selectEvolution(config.id); game.confirmEvolution();
    if (game.state === GameState.Replacement) game.replace(game.formation.units[0].id);
    game.confirmPlacement();
    while (game.state === GameState.Merge) game.resolveMerge(true);
    return config;
}
test('Initial economy, empty army, fixed recruit price and seven equal roulette classes', () => {
    const game = new GameManager(random(1));
    assert.equal(game.economy.gold, 100); assert.equal(game.formation.units.length, 0); assert.equal(game.capacity, 3);
    assert.equal(game.startBattle(), false);
    assert.deepEqual(Array.from({ length: 10 }, (_, i) => game.economy.price(i + 1)), [10,12,14,16,18,20,22,24,26,28]);
    game.spin(); assert.equal(game.economy.gold, 90); assert.equal(typeof game.recruit.drawnBase, 'string');
    for(let level=1;level<=10;level++){game.progression.level=level;assert.equal(game.price,10);}
    assert.equal(game.spin(), false); assert.equal(game.startBattle(), false);
    const roulette = new RouletteManager(random(42)), counts = Object.fromEntries(BASES.map(base => [base.id, 0]));
    for (let i = 0; i < 126000; i++) counts[roulette.spin()]++;
    for (const count of Object.values(counts)) assert.ok(Math.abs(count / 126000 - 1 / 7) < .005);
    assert.equal(BASES.length, 7); assert.equal(EVOLUTIONS.length, 21);
    BASES.forEach(base => assert.equal(EVOLUTIONS.filter(config => config.base === base.id).length, 3));
});
test('Every recruit independently offers three evolutions; placement gates next recruit', () => {
    const game = new GameManager(() => 0);
    for (let i = 0; i < 2; i++) {
        game.spin(); game.updateRecruit(4.8); assert.equal(game.recruit.choices.length, 3);
        assert.equal(game.recruit.choices[0].base, 'warrior');
        game.selectEvolution(game.recruit.choices[i].id);game.confirmEvolution(); assert.equal(game.state, GameState.Placement);
        assert.equal(game.spin(), false); assert.equal(game.startBattle(), false);
        game.confirmPlacement();
    }
    assert.notEqual(game.formation.units[0].config.id, game.formation.units[1].config.id);
});
test('Capacity, full formation replacement refund, free movement, combat locks', () => {
    const game = new GameManager(() => 0);
    for (let i = 0; i < 3; i++) recruit(game);
    // Above merges three identical units, so fill with distinct professions.
    while (game.formation.units.length < 3) {
        game.spin(); game.updateRecruit(4.8); game.selectEvolution(game.recruit.choices[game.formation.units.length % 3].id); game.confirmEvolution();game.confirmPlacement();
        while (game.state === GameState.Merge) game.resolveMerge(false);
    }
    const old = game.formation.units[0], before = game.economy.gold;
    game.spin(); game.updateRecruit(4.8); game.selectEvolution(game.recruit.choices[2].id);game.confirmEvolution();
    assert.equal(game.state, GameState.Replacement); assert.equal(game.formation.units.length, 3);
    game.replace(old.id); assert.equal(game.economy.gold, before - 10 + Math.floor(old.investment * RULES.refundRatio));
    game.confirmPlacement(); while (game.state === GameState.Merge) game.resolveMerge(false);
    const unit = game.formation.units[0]; game.move(unit.id, -300, 100); assert.equal(unit.x, -300);
    game.move(unit.id, 9000, -9000); assert.ok(unit.x < 0 && unit.y > -285);
    const x = unit.x, y = unit.y; assert.equal(game.startBattle(), true);
    game.move(unit.id, -700, 200); assert.equal(unit.x, x); assert.equal(unit.y, y); assert.equal(game.spin(), false);
    assert.equal(game.formation.capacity(8), 10); assert.equal(game.formation.capacity(10), 10);
});
test('Optional retain, three one-stars to two, nine one-stars to three; skill lineage preserved', () => {
    const game = new GameManager(() => 0); game.progression.level = 8; game.economy.gold = 1000;
    for (let i = 0; i < 3; i++) {
        game.spin(); game.updateRecruit(4.8);game.selectEvolution('blade');game.confirmEvolution(); game.confirmPlacement();
    }
    assert.equal(game.state, GameState.Merge); game.resolveMerge(false);
    assert.equal(game.formation.units.length, 3); assert.equal(game.formation.units[0].star, 1);
    recruit(game); // A new unit allows another optional group after retaining the first.
    assert.ok(game.formation.units.some(unit => unit.star === 2));
    for (let i = 4; i < 9; i++) recruit(game);
    assert.equal(game.formation.units.length, 1); assert.equal(game.formation.units[0].star, 3);
    assert.equal(game.formation.units[0].config.skill.name, '月弧斩');
    assert.equal(game.formation.units[0].investment, 9 * 10);
    assert.ok(game.formation.units[0].config.skill.starPower[2] > game.formation.units[0].config.skill.starPower[1]);
});
test('Interest timing, XP cap, queued three-way boosts and two paid refreshes', () => {
    const economy = new EconomyManager(); assert.equal(economy.interest('wave-start'), 0); assert.equal(economy.interest('wave-clear'), 5);
    economy.gold = 29; assert.equal(economy.interest('wave-clear'), 2);
    const game = new GameManager(random(4)); game.progression.gain(10000);
    assert.equal(game.progression.level, 10); assert.equal(game.progression.pending, 9); assert.equal(game.progression.xp, 0);
    game.state = GameState.Upgrade; game.progression.roll(true);
    assert.equal(new Set(game.progression.choices).size, 3);
    assert.equal(game.refreshBoost(), true); assert.equal(game.refreshBoost(), true); assert.equal(game.refreshBoost(), false);
    assert.equal(game.economy.gold, 92);
    while (game.state === GameState.Upgrade) game.chooseBoost(game.progression.choices[0]);
    assert.equal(game.progression.choicesMade, 9);
    for (const [key, value] of Object.entries(game.progression.bonuses)) assert.ok(value <= (key === 'armor' ? 10 : .5));
});
test('Wave population: simultaneous enemies, elite with adds, solo boss, no forced timeout', () => {
    const director = new WaveDirector();
    for (let i = 0; i < 4; i++) { const enemies = director.spawn(i); assert.equal(enemies.length, DEMO_WAVES[i].enemies.length); assert.ok(enemies.length <= 10); }
    assert.ok(director.spawn(3).some(unit => unit.config.id === 'elite'));
    assert.equal(director.spawn(4).length, 1); assert.equal(director.spawn(4)[0].config.boss, true);
    const game = new GameManager(() => 0); recruit(game); game.startBattle();
    game.battle.units.forEach(unit => { unit.attack = 0; unit.attackClock = 1e6; unit.skillClock = 1e6; });
    for (let i = 0; i < 2000; i++) game.battle.update(1 / 30);
    assert.equal(game.state, GameState.Battle); assert.ok(game.battle.elapsed > 60);
});
test('Healer selects injured allies, never full HP; special enemy prioritizes backline; no dead targets', () => {
    const targeting = new TargetingSystem();
    const healer = new UnitController(1, EVOLUTIONS.find(config => config.base === 'healer'), 'ally', 1, 0, 0);
    const front = new UnitController(2, EVOLUTIONS[0], 'ally', 1, 40, 0);
    const archer = new UnitController(3, EVOLUTIONS[6], 'ally', 1, 150, 0);
    assert.equal(targeting.select(healer, [healer, front, archer], []), null);
    front.hp *= .8; archer.hp *= .25;
    assert.equal(targeting.select(healer, [healer, front, archer], []), archer);
    const hunter = new UnitController(1000, ENEMIES.hunter, 'enemy', 1, 0, 0);
    assert.equal(targeting.select(hunter, [], [front, archer]), archer);
    archer.hp = 0; assert.equal(targeting.select(hunter, [], [front, archer]), front);
    const events = [], combat = new CombatSystem(event => events.push(event), () => {});
    healer.x = front.x; combat.begin(healer, front, true); combat.resolve(healer, [healer, front]);
    assert.ok(events.some(event => event.kind === 'heal')); assert.ok(front.hp > front.maxHp * .8);
});
test('Melee advances, ranged maintains distance and still attacks; automatic skill and multi-hit damage', () => {
    const front = new UnitController(1, EVOLUTIONS[0], 'ally', 1, -500, 0);
    const ranged = new UnitController(2, EVOLUTIONS[6], 'ally', 1, -400, 140);
    const foe = new UnitController(1000, { ...ENEMIES.ghoul, hp: 100000 }, 'enemy', 1, 300, 0);
    const ai = new UnitAI(), events = [], combat = new CombatSystem(event => events.push(event), () => {});
    for (let i = 0; i < 600; i++) { ai.update(front, [front, ranged], [foe], 1/30, combat); ai.update(ranged, [front, ranged], [foe], 1/30, combat); }
    assert.ok(front.x > -100); assert.ok(ranged.distance(foe) > 230);
    assert.ok(events.some(event => event.kind === 'attack' && event.source === ranged)); assert.ok(events.some(event => event.kind === 'skill'));
    ranged.x = 270; ranged.y = 0; const before = ranged.x, attacks = events.length;
    for (let i = 0; i < 150; i++) ai.update(ranged, [ranged], [foe], 1/30, combat);
    assert.ok(ranged.x < before); assert.ok(events.length > attacks);
    const second = new UnitController(1001, ENEMIES.ghoul, 'enemy', 1, foe.x + 5, foe.y + 5);
    front.x = foe.x - 50; front.y = 0;
    const hp = second.hp; combat.begin(front, foe, false); combat.resolve(front, [foe, second]); assert.ok(second.hp < hp);
});
test('Spatial soft separation resolves coincident units while keeping all units in bounds', () => {
    const units = Array.from({ length: 20 }, (_, i) => new UnitController(i + 1, EVOLUTIONS[0], i % 2 ? 'ally' : 'enemy', 1, 0, 0));
    const separation = new SeparationSystem();
    for (let i = 0; i < 120; i++) separation.apply(units, 1/30);
    let minimum = Infinity;
    for (let i = 0; i < units.length; i++) for (let j = i+1; j < units.length; j++) minimum = Math.min(minimum, units[i].distance(units[j]));
    assert.ok(minimum > 35, `minimum distance ${minimum}`);
    for (const unit of units) assert.ok(Math.abs(unit.x) <= 810 && Math.abs(unit.y) <= 285);
});
test('Team death immediately fails; dead units remain dead this wave and revive full HP next wave', () => {
    const game = new GameManager(() => 0); recruit(game); game.startBattle();
    game.battle.allies.forEach(unit => unit.hp = 1);
    game.battle.enemies.forEach(unit => { unit.x = game.battle.allies[0].x + 30; unit.y = game.battle.allies[0].y; unit.attack = 100000; unit.attackClock = 0; });
    for (let i = 0; i < 100 && game.state === GameState.Battle; i++) game.battle.update(1/30);
    assert.equal(game.state, GameState.Defeat); assert.equal(game.startBattle(), false); assert.equal(game.battle.running, false);
    const battle = new BattleManager(() => {}, () => {}), progression = new PlayerLevelManager();
    const formation = [ { id: 1, config: EVOLUTIONS[0], star: 1, x: -500, y: 0, investment: 10 } ];
    battle.start(formation, progression, 0); battle.allies[0].hp = 0; battle.allies[0].state = AIState.Dead;
    battle.update(1/30); assert.equal(battle.units[0].hp, 0);
    battle.start(formation, progression, 1); assert.equal(battle.allies[0].hp, battle.allies[0].maxHp);
});
const simulations = [];
test('A lone healer cannot indefinitely sustain a no-damage stalemate', () => {
    const game = new GameManager(() => 4.2 / 7); recruit(game); game.startBattle();
    for (let i = 0; i < 2700 && game.state === GameState.Battle; i++) game.battle.update(1 / 30);
    assert.equal(game.state, GameState.Defeat); assert.ok(game.battle.elapsed < 90);
});
test('100 seeded full five-wave games use real recruitment, progression and combat with all waves <=60s', () => {
    for (let seed = 1; seed <= 100; seed++) {
        const game = new GameManager(random(seed));
        let guard = 0;
        while (game.state !== GameState.Victory && game.state !== GameState.Defeat && guard++ < 80) {
            if (game.state === GameState.Preparation) {
                let recruits = 0;
                while (game.formation.units.length < game.capacity && game.economy.gold >= game.price && recruits++ < 12) {
                    recruit(game);
                }
                assert.equal(game.startBattle(), true);
            }
            if (game.state === GameState.Battle) {
                for (let i = 0; i < 3600 && game.state === GameState.Battle; i++) game.battle.update(1/30);
                assert.notEqual(game.state, GameState.Battle, `seed ${seed} stalled`);
            }
            while (game.state === GameState.Upgrade) game.chooseBoost(game.progression.choices[0]);
        }
        assert.equal(game.state, GameState.Victory, `seed ${seed} failed: ${game.waveTimes}`);
        assert.equal(game.cleared, 5); assert.equal(game.kills, 20);
        game.waveTimes.forEach(time => assert.ok(time <= 60, `seed ${seed}: ${time.toFixed(1)} seconds`));
        simulations.push({ seed, times: game.waveTimes.map(time => +time.toFixed(2)), level: game.progression.level, gold: game.economy.gold });
    }
});
const report = { generated: new Date().toISOString(), passed: cases.length, cases,
    simulationCount: simulations.length, longestWave: Math.max(...simulations.flatMap(game => game.times)),
    meanWaveTimes: DEMO_WAVES.map((_, i) => +(simulations.reduce((sum, game) => sum + game.times[i], 0) / simulations.length).toFixed(2)), simulations };
fs.mkdirSync(path.join(__dirname, '../temp/demo-verification'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '../temp/demo-verification/simulation-results.json'), JSON.stringify(report, null, 2));
console.log(`\n${cases.length} checks passed; ${simulations.length} complete games; longest wave ${report.longestWave}s.`);
