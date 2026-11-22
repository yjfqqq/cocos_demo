const ts = require('./cocos-typescript.cjs');
const path = require('node:path');
const configPath = path.resolve(__dirname, '../tsconfig.json');
const raw = ts.readConfigFile(configPath, ts.sys.readFile);
if (raw.error) throw new Error(ts.flattenDiagnosticMessageText(raw.error.messageText, '\n'));
const config = ts.parseJsonConfigFileContent(raw.config, ts.sys, path.dirname(configPath));
// Creator's bundled declaration files contain upstream errors. Check all project code normally.
const program = ts.createProgram(config.fileNames, { ...config.options, noEmit: true, skipLibCheck: true });
const diagnostics = [...config.errors, ...ts.getPreEmitDiagnostics(program)];
if (diagnostics.length) console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: file => file, getCurrentDirectory: ts.sys.getCurrentDirectory, getNewLine: () => '\n',
}));
console.log(`Typecheck: ${diagnostics.length} project errors.`);
process.exitCode = diagnostics.length ? 1 : 0;
