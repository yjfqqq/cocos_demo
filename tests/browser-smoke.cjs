const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
    const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
        args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.stack));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(process.env.DEMO_URL || 'http://127.0.0.1:4173');
    await page.waitForFunction(() => window.cc?.director?.getScene()?.name === 'MainMenu', { timeout: 30000 });
    const info = await page.evaluate(() => {
        const scene = cc.director.getScene();
        const canvas = scene.getChildByName('Canvas');
        const button = cc.find('UIRoot/ChapterPanel/Btn_StartChallenge', canvas);
        return { scene: scene.name, components: canvas.components.map(component => component?.constructor.name),
            entry: { bound: canvas.getComponent('MainMenuEntry')?.button?.name, entering: canvas.getComponent('MainMenuEntry')?.entering,
                loaded: canvas.getComponent('MainMenuEntry')?._objFlags, hasListener: button.hasEventListener(cc.Node.EventType.TOUCH_END), enabled: canvas.getComponent('MainMenuEntry')?.enabledInHierarchy },
            position: button.worldPosition, canvas: cc.view.getVisibleSize(), rect: document.querySelector('canvas').getBoundingClientRect().toJSON() };
    });
    console.log('MENU', JSON.stringify(info));
    fs.mkdirSync(path.resolve(__dirname, '../temp/demo-verification'), { recursive: true });
    await page.screenshot({ path: path.resolve(__dirname, '../temp/demo-verification/main-menu.png') });
    await page.mouse.click(info.rect.x + info.position.x / info.canvas.width * info.rect.width, info.rect.y + (1 - info.position.y / info.canvas.height) * info.rect.height);
    try { await page.waitForFunction(() => cc.director.getScene()?.getChildByName('Canvas')?.getComponent('BattleUI')?.game && !cc.director.getScene().getChildByName('Canvas').getComponent('BattleUI').loading, null, { timeout: 12000 }); }
    catch (error) {
        console.log('AFTER', await page.evaluate(() => { const c = cc.director.getScene()?.getChildByName('Canvas'); const entry=c?.getComponent('MainMenuEntry'); return {scene:cc.director.getScene()?.name, bound:entry?.button?.name, entering:entry?.entering, components:c?.components.map(x=>x.constructor.name)}; }));
        console.log('ERRORS', errors); await browser.close(); throw error;
    }
    await page.screenshot({ path: path.resolve(__dirname, '../temp/demo-verification/preparation.png') });
    console.log('BATTLE', await page.evaluate(() => { const c = cc.director.getScene().getChildByName('Canvas').getComponent('BattleUI'); return JSON.stringify({ state: c.game.state, gold: c.game.economy.gold, units: c.game.formation.units.length }); }));
    console.log('ERRORS', JSON.stringify(errors));
    await browser.close();
    if (errors.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exit(1); });
