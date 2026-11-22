const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('../tools/cocos-typescript.cjs');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText,filename);
const {GameManager}=require('../assets/scripts/core/GameManager.ts');
const {GameState}=require('../assets/scripts/core/GameState.ts');
const {BASES,EVOLUTIONS_BY_BASE}=require('../assets/scripts/config/DemoConfig.ts');
const {RECRUIT_CONFIG}=require('../assets/scripts/config/RecruitConfig.ts');
const {SECTOR_DEGREES,createSpinPlan,rotationAt,sectorAtPointer}=require('../assets/scripts/recruit/RouletteSpin.ts');
let count=0;
function test(name,fn){fn();count++;console.log('PASS',name);}
test('Seven exactly equal sectors; all results match fixed pointer over repeated rotations',()=>{
    assert.equal(SECTOR_DEGREES*7,360);
    for(let previous=-1080;previous<=1080;previous+=13.7)for(let i=0;i<7;i++){
        const plan=createSpinPlan(i,previous);
        assert.equal(sectorAtPointer(rotationAt(plan,3.8)),i);
        assert.equal(rotationAt(plan,99),plan.end);
        let angle=plan.start;
        for(let j=1;j<=100;j++){const next=rotationAt(plan,j/100*3.8);assert.ok(next<=angle+1e-8);angle=next;}
        const middleSpeed=Math.abs(rotationAt(plan,2)-rotationAt(plan,1.9));
        const endSpeed=Math.abs(rotationAt(plan,3.8)-rotationAt(plan,3.7));assert.ok(endSpeed<middleSpeed);
    }
});
test('Every sampled base opens only its own three options, after animation and result reveal',()=>{
    BASES.forEach((base,index)=>{
        const game=new GameManager(()=>(index+.5)/7);
        assert.equal(game.spin(),true);assert.equal(game.recruit.drawnBase,base.id);
        assert.equal(game.economy.gold,90);assert.equal(game.state,GameState.Roulette);
        assert.equal(game.selectEvolution(EVOLUTIONS_BY_BASE[base.id][0].id),false);
        game.updateRecruit(3.79);assert.equal(game.state,GameState.Roulette);assert.equal(game.recruit.revealing,false);
        game.updateRecruit(.02);assert.equal(game.recruit.revealing,true);assert.equal(game.state,GameState.Roulette);
        assert.equal(sectorAtPointer(game.recruit.rotation),index);
        game.updateRecruit(1);assert.equal(game.state,GameState.Evolution);
        assert.equal(game.recruit.choices.length,3);assert.ok(game.recruit.choices.every(c=>c.base===base.id));
        assert.equal(game.confirmEvolution(),false);assert.equal(game.formation.units.length,0);
        const wrong=BASES[(index+1)%7];assert.equal(game.selectEvolution(EVOLUTIONS_BY_BASE[wrong.id][0].id),false);
        assert.equal(game.selectEvolution(game.recruit.choices[1].id),true);
        assert.equal(game.selectEvolution(game.recruit.choices[2].id),true);
        const selected=game.recruit.choices[2];assert.equal(game.confirmEvolution(),true);
        assert.equal(game.confirmEvolution(),false);assert.equal(game.formation.units.length,1);
        assert.equal(game.formation.units[0].config.id,selected.id);assert.equal(game.economy.gold,90);
        assert.equal(game.spin(),false);game.confirmPlacement();assert.equal(game.spin(),true);assert.equal(game.economy.gold,80);
    });
});
test('Insufficient gold, repeated clicks, invalid random and missing catalog never double charge or soft-lock',()=>{
    const game=new GameManager(()=>0);game.economy.gold=9;
    assert.equal(game.spin(),false);assert.equal(game.economy.gold,9);assert.equal(game.recruit.plan,null);
    game.economy.gold=100;assert.equal(game.spin(),true);
    for(let i=0;i<50;i++){assert.equal(game.spin(),false);assert.equal(game.startBattle(),false);}
    assert.equal(game.economy.gold,90);game.updateRecruit(100);assert.equal(game.state,GameState.Evolution);
    for(let i=0;i<5;i++)assert.equal(game.spin(),false);
    const bad=new GameManager(()=>NaN);assert.equal(bad.spin(),false);assert.equal(bad.economy.gold,100);assert.equal(bad.state,GameState.Preparation);
    const missing=new GameManager(()=>0);missing.recruit.evolution.choices=()=>[];
    assert.equal(missing.spin(),false);assert.equal(missing.economy.gold,100);assert.equal(missing.state,GameState.Preparation);
    assert.ok(missing.recruit.error);
});
test('Subframe updates and large background delta both finish without a UI callback',()=>{
    const game=new GameManager(()=>.9);game.spin();
    for(let i=0;i<600&&game.state===GameState.Roulette;i++)game.updateRecruit(1/60);
    assert.equal(game.state,GameState.Evolution);assert.equal(game.recruit.drawnBase,'knight');
    const elapsed=game.recruit.elapsed;game.updateRecruit(1000);assert.equal(game.recruit.elapsed,elapsed);
    assert.equal(RECRUIT_CONFIG.price,10);
});
console.log(`${count} roulette checks passed.`);
