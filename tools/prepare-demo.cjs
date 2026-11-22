// One-time scene/metadata wiring, also safe to re-run after adding scripts.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const scriptUUIDs = {
    'ui/BattleUI.ts': 'd7d0179d-7844-4f2b-b82a-3f6bfd9421ae',
    'ui/MainMenuEntry.ts': '52d96132-b163-45e6-b56b-f6225baa1533',
};
function meta(filename, importer, ver, uuid) {
    if (fs.existsSync(filename + '.meta')) return;
    fs.writeFileSync(filename + '.meta', JSON.stringify({ ver, importer, imported: true,
        uuid: uuid || crypto.randomUUID(), files: importer === 'scene' ? ['.json'] : [], subMetas: {}, userData: {} }, null, 2) + '\n');
}
function walk(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
        const full = path.join(folder, entry.name);
        if (entry.isDirectory()) { meta(full, 'directory', '1.2.0'); walk(full); }
        else if (entry.name.endsWith('.ts')) meta(full, 'typescript', '4.0.24', scriptUUIDs[path.relative(path.join(root, 'assets/scripts'), full).replaceAll('\\', '/')]);
    }
}
walk(path.join(root, 'assets/scripts'));
// An already-open Creator can create metadata before this script runs; use its real UUIDs.
for (const filename of Object.keys(scriptUUIDs)) scriptUUIDs[filename] = JSON.parse(fs.readFileSync(path.join(root, 'assets/scripts', filename + '.meta'), 'utf8')).uuid;
function compress(uuid) {
    const hex = uuid.replaceAll('-', ''), chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let output = hex.slice(0, 5);
    for (let i = 5; i < 32; i += 3) { const n = parseInt(hex.slice(i, i + 3), 16); output += chars[n >> 6] + chars[n & 63]; }
    return output;
}
const mainPath = path.join(root, 'assets/scenes/MainMenu.scene');
let mainText = fs.readFileSync(mainPath, 'utf8');
const legacyIDs = { 'ui/MainMenuEntry.ts': '522WEysWNF5rVr9iJbqhUz', 'ui/BattleUI.ts': 'd70BedeERPK7gqP2v9lCGu' };
mainText = mainText.replaceAll(legacyIDs['ui/MainMenuEntry.ts'], compress(scriptUUIDs['ui/MainMenuEntry.ts']));
if (mainText !== fs.readFileSync(mainPath, 'utf8')) fs.writeFileSync(mainPath, mainText);
const main = JSON.parse(mainText);
const component = (uuid, node) => ({ __type__: compress(uuid), _name: '', _objFlags: 0, __editorExtras__: {}, node: { __id__: node }, _enabled: true, __prefab: null, _id: crypto.randomUUID() });
if (!main.some(object => object.__type__ === compress(scriptUUIDs['ui/MainMenuEntry.ts']))) {
    const canvas = main.findIndex(object => object.__type__ === 'cc.Node' && object._name === 'Canvas');
    const originalCanvas = JSON.stringify(main[canvas], null, 2).split('\n').map(line => '  ' + line).join('\n');
    main[canvas]._components.push({ __id__: main.length });
    const changedCanvas = JSON.stringify(main[canvas], null, 2).split('\n').map(line => '  ' + line).join('\n');
    if (!mainText.includes(originalCanvas)) throw new Error('MainMenu formatting changed; inspect before wiring.');
    mainText = mainText.replace(originalCanvas, changedCanvas);
    mainText = mainText.trimEnd().replace(/\]$/, ',\n' + JSON.stringify(component(scriptUUIDs['ui/MainMenuEntry.ts'], canvas), null, 2).split('\n').map(line => '  ' + line).join('\n') + '\n]');
    fs.writeFileSync(mainPath, mainText + '\n');
}
const battlePath = path.join(root, 'assets/scenes/Battle.scene');
const battleUUID = '2c2871f4-0f7e-4ea3-93a1-d12823d4b81b';
if (fs.existsSync(battlePath)) {
    const text = fs.readFileSync(battlePath, 'utf8');
    const changed = text.replaceAll(legacyIDs['ui/BattleUI.ts'], compress(scriptUUIDs['ui/BattleUI.ts']));
    if (text !== changed) fs.writeFileSync(battlePath, changed);
}
if (!fs.existsSync(battlePath)) {
    const source = JSON.parse(fs.readFileSync(mainPath, 'utf8'));
    const selected = new Map();
    function take(index) {
        if (selected.has(index)) return;
        let object = structuredClone(source[index]);
        if (index === 0 || index === 1) object._name = 'Battle';
        if (index === 1) { object._prefab = null; object._id = battleUUID; }
        if (index === 2) { object._children = [{ __id__: 3 }]; object._components = [{ __id__: 202 }, { __id__: 203 }, { __id__: 204 }]; }
        selected.set(index, object);
        function visit(value) { if (!value || typeof value !== 'object') return; if ('__id__' in value) take(value.__id__); else Object.values(value).forEach(visit); }
        visit(object);
    }
    take(0);
    const indexes = [...selected.keys()];
    const remap = new Map(indexes.map((old, index) => [old, index]));
    function map(value) {
        if (!value || typeof value !== 'object') return value;
        if ('__id__' in value) return { __id__: remap.get(value.__id__) };
        if (Array.isArray(value)) return value.map(map);
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, map(item)]));
    }
    const battle = indexes.map(index => map(selected.get(index)));
    const canvas = remap.get(2);
    battle[canvas]._components.push({ __id__: battle.length });
    battle.push(component(scriptUUIDs['ui/BattleUI.ts'], canvas));
    fs.writeFileSync(battlePath, JSON.stringify(battle, null, 2) + '\n');
}
meta(battlePath, 'scene', '1.1.50', battleUUID);
console.log('Demo scene and metadata ready. Existing menu content preserved.');
