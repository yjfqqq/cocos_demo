/** Headless Creator integration. Test-only RNG fixtures cover all seven outcomes;
 * choices, confirmation, replacement, dragging and combat use actual pointer events. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const output=path.resolve(__dirname,'../temp/roulette-verification');
fs.mkdirSync(output,{recursive:true});
(async()=>{
    const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],warnings=[],draws=[];
    page.on('pageerror',error=>errors.push(error.stack));
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text());if(message.type()==='warning')warnings.push(message.text());});
    page.on('response',response=>{if(response.status()>=400)errors.push(`HTTP ${response.status()} ${response.url()}`);});
    const state=()=>page.evaluate(()=>{
        const ui=window.cc?.director.getScene()?.getChildByName('Canvas')?.getComponent('BattleUI');if(!ui)return null;
        const game=ui.game;return {state:game.state,loading:ui.loading,gold:game.economy.gold,price:game.price,capacity:game.capacity,
            units:game.formation.units.map(u=>({id:u.id,base:u.config.base,name:u.config.name,configId:u.config.id,x:u.x,y:u.y})),
            drawn:game.recruit.drawnBase,elapsed:game.recruit.elapsed,rotation:game.recruit.rotation,
            actualRotation:ui.roulette.rotor.eulerAngles.z,selected:game.recruit.selectedEvolutionId,
            choices:game.recruit.choices.map(c=>({id:c.id,base:c.base})),boosts:game.progression.choices,times:game.waveTimes,
            pending:game.recruit.pending?.id};
    });
    async function waitState(expected,timeout=20000){await page.waitForFunction(expected=>{const c=window.cc?.director.getScene()?.getChildByName('Canvas')?.getComponent('BattleUI');return c&&!c.loading&&c.game.state===expected;},expected,{timeout});}
    async function point(name){return page.evaluate(name=>{
        function find(node){if(node.name===name&&node.activeInHierarchy)return node;for(const child of node.children){const match=find(child);if(match)return match;}}
        const node=find(cc.director.getScene());if(!node)throw Error(`No visible node ${name}`);
        const p=node.worldPosition,size=cc.view.getVisibleSize(),rect=document.querySelector('canvas').getBoundingClientRect();
        return {x:rect.x+p.x/size.width*rect.width,y:rect.y+(1-p.y/size.height)*rect.height};
    },name);}
    async function click(name){const p=await point(name);await page.mouse.click(p.x,p.y);}
    async function shot(name){await page.screenshot({path:path.join(output,name+'.png')});}
    async function fixture(index){await page.evaluate(index=>{const c=cc.director.getScene().getChildByName('Canvas').getComponent('BattleUI');c.game.recruit.roulette.random=()=>(index+.5)/7;},index);}
    const ids=['warrior','guardian','assassin','archer','healer','mage','knight'];
    function sector(rotation){const norm=(rotation%360+360)%360;return Math.floor((norm+360/7/2)/(360/7))%7;}
    async function draw(index,capture=false){
        await fixture(index);let before=await state();const full=before.units.length>=before.capacity;
        await click('Recruit');await waitState('Roulette');let info=await state();assert.equal(info.gold,before.gold-10);
        assert.equal(info.drawn,ids[index]);assert.equal(info.units.length,before.units.length);
        const button=await point('RecruitLocked');await page.mouse.click(button.x,button.y,{clickCount:3});
        assert.equal((await state()).gold,before.gold-10);assert.equal((await state()).state,'Roulette');
        const wheel=await point('WheelRotor');await page.mouse.click(wheel.x,wheel.y-100);assert.equal((await state()).state,'Roulette');
        if(capture)await shot('spinning');
        await page.waitForFunction(()=>{const c=cc.director.getScene().getChildByName('Canvas').getComponent('BattleUI');return c.game.recruit.revealing;});
        info=await state();assert.equal(sector(info.rotation),index);assert.equal(sector(info.actualRotation),index);
        if(capture)await shot(`result-${ids[index]}`);
        await waitState('Evolution');info=await state();assert.equal(info.choices.length,3);assert.ok(info.choices.every(c=>c.base===ids[index]));
        await click('ConfirmEvolution');assert.equal((await state()).units.length,before.units.length);assert.equal((await state()).state,'Evolution');
        await page.keyboard.press('Escape');assert.equal((await state()).state,'Evolution');
        await click(`Evolution_${info.choices[0].id}`);assert.equal((await state()).selected,info.choices[0].id);
        await click(`Evolution_${info.choices[1].id}`);assert.equal((await state()).selected,info.choices[1].id);
        assert.equal((await state()).units.length,before.units.length);
        if(capture)await shot(`evolution-${ids[index]}`);
        await click('ConfirmEvolution');
        if(full){await waitState('Replacement');await click(`Replace_${before.units[0].id}`);}
        await waitState('Placement');info=await state();const fresh=info.units.find(u=>u.id===info.pending);assert.ok(fresh);assert.equal(fresh.configId,info.choices[1].id);
        const location=await point(`Unit_${fresh.id}`);await page.mouse.move(location.x,location.y);await page.mouse.down();await page.mouse.move(location.x+25,location.y+12,{steps:6});await page.mouse.up();
        const moved=(await state()).units.find(u=>u.id===fresh.id);assert.ok(Math.hypot(moved.x-fresh.x,moved.y-fresh.y)>15,'World/field inverse mapping broke drag');
        assert.equal(await page.evaluate(()=>cc.director.getScene().getChildByName('Canvas').getComponent('BattleUI').game.spin()),false);
        await click('ConfirmPlacement');info=await state();while(info.state==='Merge'){await click('KeepUnits');await page.waitForTimeout(80);info=await state();}
        await waitState('Preparation');if(capture)await shot('formation');
        draws.push({base:ids[index],rotation:info.rotation,actualRotation:info.actualRotation,unit:fresh.configId});
        console.log(`PASS UI ${ids[index]}: one debit, exact pointer, 3 matching choices, confirmation, drag`);
    }
    try{
        await page.goto(process.env.DEMO_URL||'http://127.0.0.1:4173');await page.waitForFunction(()=>window.cc?.director.getScene()?.name==='MainMenu');await click('Btn_StartChallenge');await waitState('Preparation');
        let info=await state();assert.equal(info.gold,100);assert.equal(info.units.length,0);
        const structure=await page.evaluate(()=>{const c=cc.director.getScene().getChildByName('Canvas').getComponent('BattleUI');const root=c.root;
            const sectors=c.roulette.rotor.children.filter(n=>n.name.startsWith('Sector_'));
            const transform=node=>node.components.find(component=>typeof component.getBoundingBoxToWorld==='function');
            const wheel=transform(c.roulette.node).getBoundingBoxToWorld();
            const field=transform(cc.find('BattleFieldView/Battlefield',root)).getBoundingBoxToWorld();
            const names=[];function walk(n){names.push(n.name);n.children.forEach(walk);}walk(root);
            return {sectors:sectors.map(n=>n.name),overlap:wheel.xMax>=field.xMin,oldGrid:names.some(n=>n.startsWith('Result_')),wheelHandlers:c.roulette.rotor.hasEventListener('touch-end')};});
        assert.equal(structure.sectors.length,7);assert.equal(new Set(structure.sectors).size,7);assert.equal(structure.overlap,false);assert.equal(structure.oldGrid,false);assert.equal(structure.wheelHandlers,false);
        await shot('preparation');
        for(const index of [0,1,3,5,2,4,6])await draw(index,true);
        // Same node tree at the requested design size and a small landscape window.
        for(const [width,height]of [[1920,1080],[844,390]]){await page.setViewportSize({width,height});await page.waitForTimeout(250);await shot(`layout-${width}x${height}`);}
        await page.setViewportSize({width:1280,height:720});await page.waitForTimeout(200);
        for(let wave=0;wave<5;wave++){
            info=await state();let attempts=0;
            while(info.units.length<info.capacity&&info.gold>=10&&attempts++<10){await draw(info.units.some(u=>u.base==='healer')?3:info.units.length>3?4:3);info=await state();}
            assert.equal(info.price,10);await click('StartBattle');await waitState('Battle');
            const locked=(await state()).units, p=await point(`Unit_${locked[0].id}`);
            await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+70,p.y+40,{steps:4});await page.mouse.up();assert.deepEqual((await state()).units,locked);
            await page.waitForFunction(()=>cc.director.getScene().getChildByName('Canvas').getComponent('BattleUI').game.battle.elapsed>2);
            await shot(wave===4?'boss-battle':`battle-${wave+1}`);
            await page.waitForFunction(()=>cc.director.getScene().getChildByName('Canvas').getComponent('BattleUI').game.state!=='Battle',null,{timeout:90000});
            info=await state();assert.notEqual(info.state,'Defeat');
            while(info.state==='Upgrade'){await click(`ChooseBoost_${info.boosts[0]}`);await page.waitForTimeout(100);info=await state();}
            console.log(`PASS UI wave ${wave+1}: ${info.times[wave].toFixed(2)} seconds`);
        }
        info=await state();assert.equal(info.state,'Victory');const times=info.times;await shot('victory');
        await click('RestartDemo');await waitState('Preparation');
        await page.evaluate(()=>{const c=cc.director.getScene().getChildByName('Canvas').getComponent('BattleUI');c.game.economy.gold=9;c.render();});
        await click('Recruit');assert.equal((await state()).state,'Preparation');assert.equal((await state()).gold,9);await shot('insufficient-gold');
        // Creator 3.8.8 emits its combined LANDSCAPE (4|8 = 12) warning on hot desktop
        // viewport resize. Preserve it in the report and reject every other warning.
        const unexpectedWarnings=warnings.filter(message=>message!=='Unexpected screen orientation: 12');
        assert.deepEqual(errors,[]);assert.deepEqual(unexpectedWarnings,[]);
        fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({passed:true,structure,draws,times,insufficientGold:true,errors,warnings,unexpectedWarnings},null,2));
        console.log('PASS complete roulette UI acceptance, all 7 outcomes, full 5-wave game, zero runtime errors.');
    }catch(error){console.error('STATE',await state());console.error('ERRORS',errors);await shot('failure');throw error;}
    finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
