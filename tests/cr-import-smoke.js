// ============================================================================
// cr-import-smoke.js — smart import, offline  [CR-SMARTIMPORT]
//
// Pins engine 1.0.1: every Import button reads the file first and files the card by what it
// is — cardType when present, the fields when not, the pressed tab when the file says nothing —
// refuses files that are not cards, and settles the bridge's held images by where the card went.
//   CR_ENGINE_FILE=<engine> node cr-import-smoke.js
// ============================================================================
const fs = require('fs');
const vm = require('vm');
let ts;
try { ts = require('typescript'); }
catch (e) { ts = require(require('child_process').execSync('npm root -g').toString().trim() + '/typescript'); }

const ENGINE = process.env.CR_ENGINE_FILE || './characterroom.naiscript';
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

function makeStore(init) {
    const m = new Map(Object.entries(clone(init) || {}));
    return {
        _map: m,
        get: async (k) => clone(m.get(k)),
        getOrDefault: async (k, d) => (m.has(k) ? clone(m.get(k)) : d),
        set: async (k, v) => { m.set(k, clone(v)); },
        setIfAbsent: async (k, v) => { if (!m.has(k)) m.set(k, clone(v)); },
        remove: async (k) => { m.delete(k); },
        list: async () => Array.from(m.keys())
    };
}

function stub(label) {
    const fn = function() { return Promise.resolve(s); };
    const s = new Proxy(fn, {
        get(t, k) {
            if (k === 'then') return undefined;
            if (k === Symbol.toPrimitive) return () => '[stub ' + label + ']';
            if (k === 'length') return 0;
            return stub(label + '.' + String(k));
        },
        apply() { return Promise.resolve(stub(label + '()')); }
    });
    return s;
}

// env.file: the text the native picker returns. env.bridge: { json, slots } served by a fake bridge.
async function load(env) {
    const src = fs.readFileSync(ENGINE, 'utf8');
    const js = ts.transpileModule(src, {
        fileName: 'engine.tsx',
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None, jsx: ts.JsxEmit.React,
            jsxFactory: 'h', jsxFragmentFactory: 'Fragment', removeComments: false },
        reportDiagnostics: false
    }).outputText;

    const rec = { toasts: [], prompts: 0, ops: [] };
    const storage = makeStore(env.storage || { characterListKey: [], userListKey: [], scenarioListKey: [] });
    const X = {};
    const v1 = {
        hooks: { register: () => {} },
        storage, storyStorage: makeStore({}), tempStorage: makeStore({}), historyStorage: makeStore({}),
        random: { int: (a) => a, bool: () => false },
        tokenizer: { encode: (t) => Array.from(String(t)), decode: async () => '' },
        maxTokens: async () => 8192, rolloverTokens: async () => 1024,
        systemPrompt: { get: async () => 'SYS' },
        document: stub('document'),
        permissions: { has: async () => true, request: async () => true },
        config: { get: async () => true },
        uuid: (() => { let n = 0; return () => 'uuid-' + (++n); })(),
        log: () => {}, error: () => {},
        script: { name: 'smoke', id: 'smoke', version: '0.0.0', getAllowedOutput: () => 5000, getAllowedInput: () => 60000 },
        ui: new Proxy({}, { get(t, k) {
            if (k === 'toast') return async (m, o) => { rec.toasts.push({ text: String(m), type: o && o.type }); };
            if (k === 'then') return undefined;
            return stub('ui.' + String(k));
        } }),
        editor: stub('editor'),
        timers: { sleep: async () => {}, setTimeout: async () => 1, clearTimeout: async () => {} },
        file: { prompt: async () => { rec.prompts++; return env.file; }, save: async () => {} },
        messaging: {
            onMessage: async () => 0,
            broadcast: async (msg) => {
                const p = msg && msg.payload;
                if (!p || p.event !== 'AE_CARD_IMPORT') return;
                rec.ops.push({ op: p.op, charId: p.charId || '' });
                if (p.op === 'pick' && env.bridge) {
                    setTimeout(() => {
                        X.crCardImportReceive()({ ticket: p.ticket, phase: 'ack', ok: true });
                        X.crCardImportReceive()({ ticket: p.ticket, phase: 'pick', ok: true, json: env.bridge.json, slots: env.bridge.slots || [] });
                    }, 0);
                }
            },
            send: async () => {}
        },
        generate: stub('generate'), generateWithStory: stub('generateWithStory'), generationParameters: stub('generationParameters')
    };
    const ctx = vm.createContext({
        api: { v1 }, Date, Math, JSON, console, Promise, Set, Map, Object, Array, String,
        Number, Boolean, RegExp, Error, TypeError, Symbol, parseInt, parseFloat, isNaN,
        h: (type, props, ...kids) => ({ type, props: props || {}, kids }), Fragment: null, useRef: () => ({}), useState: (v) => [v, () => {}],
        useEffect: () => {}, useMemo: (f) => f(), useCallback: (f) => f,
        render: () => {}, createContext: (v) => ({ _v: v }), createPortal: () => null,
        useReducer: (r, i) => [i, () => {}], useLayoutEffect: () => {},
        useContext: (c) => (c && c._v), useSyncExternalStore: (sub, get) => get(),
        createStore: (initial) => { let value = initial; return { get: () => value, set: (v) => { value = v; }, subscribe: () => (() => {}) }; },
        useStore: (st) => [st.get(), st.set], useStoreValue: (st) => st.get(), useSetStore: (st) => st.set,
        setTimeout, clearTimeout
    });
    const names = ['crSmartImport', 'crClassifyCardFile', 'crCardImportReceive', 'crBridge', 'charList', 'userList',
        'scenarioList', 'crUiStore', 'importCharacter', 'importUser', 'importScenario'];
    const exp = names.map((n) => `${JSON.stringify(n)}: () => (typeof ${n} !== 'undefined' ? ${n} : undefined)`).join(',');
    const exported = await vm.runInContext(`(async () => {\n${js}\n;return {${exp}};\n})()`, ctx, { filename: ENGINE });
    Object.assign(X, exported);
    if (env.bridge) X.crBridge().ready = true;
    return { X, rec, storage };
}

let pass = 0, fail = 0;
function ok(name, cond, got) {
    if (cond) { pass++; console.log('ok   ' + name); }
    else { fail++; console.log('FAIL ' + name); if (got !== undefined) console.log('     got ' + JSON.stringify(got).slice(0, 500)); }
}
const counts = (X) => [X.charList().length, X.userList().length, X.scenarioList().length].join('/');
const tab = (X) => X.crUiStore().get().cardTab;
const lastToast = (L) => (L.rec.toasts.length ? L.rec.toasts[L.rec.toasts.length - 1] : { text: '' });

const CONTACT = { cardType: 'contact', id: 'c-1', name: 'Mira', greeting: 'Hey.', relationship: 'close', exampleMessages: [], brains: [], brainsConditional: [] };
const AETHER = { name: 'Rook', gndr: 'male', avatarUri: '', persona: 'Grim.', exampleMessages: [], relationship: 'stranger' };
const USER = { cardType: 'user', id: 'u-1', name: 'Sam', persona: 'Curious.', brains: [], brainsConditional: [] };
const SCEN = { cardType: 'scenario', id: 's-1', name: 'Cafe', environment: 'A cafe.', brains: [], brainsConditional: [] };
const SCEN_BARE = { name: 'Docks', environment: 'Tar and salt.', scene: 'Night.' };
const PLAIN = { name: 'Nobody', persona: 'Plain.', description: 'Says nothing about what it is.' };

(async () => {
    // ---- classifier
    {
        const L = await load({});
        const c = L.X.crClassifyCardFile();
        ok('class: cardType decides', c(CONTACT, 'user').kind === 'contact' && c(USER, 'contact').kind === 'user' && c(SCEN, 'contact').kind === 'scenario');
        ok('class: cardType is read case-insensitively', c(Object.assign({}, USER, { cardType: ' User ' }), 'contact').kind === 'user');
        ok('class: an AetherRoom card with no cardType is a Contact', c(AETHER, 'scenario').kind === 'contact' && !c(AETHER, 'scenario').refuse);
        ok('class: environment/scene with no cardType is a Scenario', c(SCEN_BARE, 'contact').kind === 'scenario');
        ok('class: a file that says nothing goes where it was imported', c(PLAIN, 'user').kind === 'user' && c(PLAIN, 'scenario').kind === 'scenario' && !c(PLAIN, 'user').refuse);
        ok('class: an empty marker does not count', c({ name: 'X', greeting: '' }, 'user').kind === 'user');
        ok('class: a brains file is refused with a pointer', /Brains tab/.test(c({ fileType: 'cardBrainsAlone', brains: [] }, 'contact').refuse));
        ok('class: a jots file is refused', /jots/.test(c({ fileType: 'rememberMe', list: [] }, 'contact').refuse));
        ok('class: any other export is refused by name', /floatyBrains export/.test(c({ fileType: 'floatyBrains' }, 'contact').refuse));
        ok('class: an unknown cardType is refused', /"lorebook"/.test(c({ cardType: 'lorebook', name: 'x' }, 'contact').refuse));
        ok('class: a spec card is refused', /chara_card_v2/.test(c({ spec: 'chara_card_v2', data: {} }, 'contact').refuse));
        ok('class: an array or a primitive is not a card', !!c([], 'contact').refuse && !!c(5, 'contact').refuse && !!c(null, 'contact').refuse);
    }

    // ---- no bridge: the native picker, routed by content
    const run = async (file, pressed, extra) => {
        const L = await load(Object.assign({ file: JSON.stringify(file) }, extra || {}));
        await L.X.crSmartImport()('fileInput', pressed);
        return L;
    };
    {
        const L = await run(CONTACT, 'user');
        ok('route: a Contact card imported from Users lands in Contacts', counts(L.X) === '1/0/0' && L.X.charList()[0].name === 'Mira', counts(L.X));
        ok('route: the Cards surface switches to the tab it landed on', tab(L.X) === 'contacts', tab(L.X));
        ok('route: the toast names the kind', lastToast(L).text === 'Imported Mira as a Contact.' && lastToast(L).type === 'success', lastToast(L));
        ok('route: saved to account storage', (L.storage._map.get('characterListKey') || []).length === 1);
    }
    {
        const L = await run(USER, 'contact');
        ok('route: a User card imported from Contacts lands in Users', counts(L.X) === '0/1/0' && tab(L.X) === 'users', [counts(L.X), tab(L.X)]);
    }
    {
        const L = await run(SCEN_BARE, 'contact');
        ok('route: a bare Scenario lands in Scenarios', counts(L.X) === '0/0/1' && L.X.scenarioList()[0].environment === 'Tar and salt.' && tab(L.X) === 'scenarios', counts(L.X));
    }
    {
        const L = await run(AETHER, 'scenario');
        const c = L.X.charList()[0];
        ok('route: an AetherRoom card keeps AR\'s field mapping', counts(L.X) === '1/0/0' && c.gender === 'male' && c.defaultIntimacy === 'stranger' && c.name === 'Rook', c);
    }
    {
        const L = await run(PLAIN, 'user');
        ok('route: an ambiguous file goes to the pressed tab and the tab does not move', counts(L.X) === '0/1/0' && tab(L.X) === 'contacts', [counts(L.X), tab(L.X)]);
    }
    {
        const L = await run(CONTACT, 'contact');
        ok('route: the old buttons still work through their AR names', counts(L.X) === '1/0/0');
        await L.X.importUser()('fileInput');
        ok('route: importUser with a Contact file still files a Contact, and refuses the duplicate id', counts(L.X) === '1/0/0' && /same id/.test(lastToast(L).text), [counts(L.X), lastToast(L)]);
    }
    {
        const L = await run({ fileType: 'cardBrainsAlone', brains: [{ name: 'a', content: 'b' }], brainsConditional: [] }, 'contact');
        ok('refuse: a brains file adds nothing and says why', counts(L.X) === '0/0/0' && /Brains tab/.test(lastToast(L).text) && lastToast(L).type === 'warning', lastToast(L));
    }
    {
        const L = await load({ file: '{ not json' });
        await L.X.crSmartImport()('fileInput', 'contact');
        ok('refuse: invalid JSON says so', counts(L.X) === '0/0/0' && /not valid JSON/.test(lastToast(L).text), lastToast(L));
    }
    {
        const L = await load({ file: undefined });
        await L.X.crSmartImport()('fileInput', 'contact');
        ok('cancel: a cancelled picker does nothing and says nothing', counts(L.X) === '0/0/0' && L.rec.toasts.length === 0 && L.rec.prompts === 1);
    }

    // ---- with the bridge: held images go with the card, or are dropped
    const viaBridge = async (file, pressed, slots) => {
        const L = await load({ bridge: { json: JSON.stringify(file), slots: slots || [] } });
        await L.X.crSmartImport()('fileInput', pressed);
        return L;
    };
    {
        const L = await viaBridge(Object.assign({}, CONTACT, { avatarUri: '' }), 'user', ['Avatar', 'happy']);
        ok('bridge: the picker is the bridge\'s, not the native one', L.rec.prompts === 0 && L.rec.ops[0].op === 'pick', L.rec.ops);
        ok('bridge: a Contact commits its held images to its own id', counts(L.X) === '1/0/0' && L.rec.ops.some((o) => o.op === 'commit' && o.charId === 'c-1') && !L.rec.ops.some((o) => o.op === 'discard'), L.rec.ops);
    }
    {
        const L = await viaBridge(USER, 'contact', ['Avatar']);
        ok('bridge: a User commits too (Users are cast)', counts(L.X) === '0/1/0' && L.rec.ops.some((o) => o.op === 'commit' && o.charId === 'u-1'), L.rec.ops);
    }
    {
        const L = await viaBridge(SCEN, 'contact', ['Avatar']);
        ok('bridge: a Scenario discards anything held, never commits', counts(L.X) === '0/0/1' && L.rec.ops.some((o) => o.op === 'discard') && !L.rec.ops.some((o) => o.op === 'commit'), L.rec.ops);
    }
    {
        const L = await viaBridge({ fileType: 'rememberMe' }, 'contact', []);
        ok('bridge: a refused file discards its ticket', counts(L.X) === '0/0/0' && L.rec.ops.some((o) => o.op === 'discard'), L.rec.ops);
    }

    console.log('\n' + pass + ' passing, ' + fail + ' failing');
    process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
