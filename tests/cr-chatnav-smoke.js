// ============================================================================
// cr-chatnav-smoke.js — Chat > Chat opens cards and lists the group; Group tab order  [CR-CHATNAV]
//
// Pins engine 1.0.3: the pairing rows and the group-member chips open the card's profile, the
// row offers Add/Edit into the Group tab, and the Group tab puts Replies before the picker once
// there are members. Loader shared with cr-import-smoke.js.
//   CR_ENGINE_FILE=<engine> node cr-chatnav-smoke.js
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
    const storage = makeStore(env.storage || { characterListKey: [], userListKey: [], scenarioListKey: [] }); const storyStorage = makeStore(env.storyStorage || {});
    const X = {};
    const v1 = {
        hooks: { register: () => {} },
        storage, storyStorage, tempStorage: makeStore({}), historyStorage: makeStore({}),
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
        'scenarioList', 'crUiStore', 'importCharacter', 'importUser', 'importScenario', 'CrPairingPanel', 'CrGroupTab', 'CrGroupMembersRow', 'crGroupInit', 'CrPairRow', 'CrPressable'];
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


const flat = (n, out) => { out = out || []; if (n == null || typeof n !== 'object') { if (n != null && n !== false) out.push(n); return out; }
  if (Array.isArray(n)) { n.forEach((k) => flat(k, out)); return out; }
  if (typeof n.type === 'function') { return flat(n.type(Object.assign({}, n.props, { children: n.kids })), out); }
  out.push(n); (n.kids || []).forEach((k) => flat(k, out)); return out; };
(async () => {
  const MIRA = { cardType: 'contact', id: 'c-mira', name: 'Mira', emotions: {}, exampleChats: [], brains: [], brainsConditional: [] };
  const TAL = Object.assign({}, MIRA, { id: 'c-tal', name: 'Tallis' });
  const SAM = { cardType: 'user', id: 'u-sam', name: 'Sam', brains: [], brainsConditional: [] };
  const L = await load({ storage: { characterListKey: [MIRA, TAL], userListKey: [SAM], scenarioListKey: [] },
    storyStorage: { chatSettingsKey: { char: MIRA, user: SAM, intimacy: 'close', style: 'chat' }, 'cr.group': { v: 1, members: ['c-tal'], pools: { 'c-tal': [1] } } } });
  await L.X.crGroupInit()();
  const tree = flat(L.X.CrPairingPanel()({ mobile: false }));
  const texts = tree.filter((x) => typeof x === 'string');
  ok('chat: the pairing panel lists the group member', texts.indexOf('Group') >= 0 && texts.indexOf('Tallis') >= 0, texts);
  const chip = tree.find((x) => x && x.props && x.props.title === 'Open the card' && x.kids && JSON.stringify(x.kids).indexOf('Tallis') >= 0);
  chip.props.onClick();
  const st = L.X.crUiStore().get();
  ok('chat: tapping a member opens its card on Cards', st.surface === 'cards' && st.openContactId === 'c-tal' && st.openKind === 'contact' && st.cardTab === 'contacts', st);
  const userRow = tree.filter((x) => x && x.props && x.props.title === 'Open the card').find((x) => JSON.stringify(x.kids).indexOf('"Sam"') >= 0);
  userRow.props.onClick();
  const st2 = L.X.crUiStore().get();
  ok('chat: tapping the User row opens the User', st2.openContactId === 'u-sam' && st2.openKind === 'user' && st2.cardTab === 'users', st2);
  const g = flat(L.X.CrGroupTab()({ mobile: false })).filter((x) => typeof x === 'string');
  ok('group: with members, Replies comes before the picker', g.indexOf('Replies') >= 0 && g.indexOf('Replies') < g.indexOf('Add or remove members'), g.slice(0, 12));
  const L2 = await load({ storage: { characterListKey: [MIRA, TAL], userListKey: [SAM], scenarioListKey: [] },
    storyStorage: { chatSettingsKey: { char: MIRA, user: SAM, intimacy: 'close', style: 'chat' } } });
  await L2.X.crGroupInit()();
  const g2 = flat(L2.X.CrGroupTab()({ mobile: false })).filter((x) => typeof x === 'string');
  ok('group: with none, the picker leads', g2.indexOf('Group') >= 0 && g2.indexOf('Group') < g2.indexOf('Helpers'), g2.slice(0, 8));
  const t2 = flat(L2.X.CrPairingPanel()({ mobile: false })).filter((x) => typeof x === 'string');
  ok('chat: with no members the row says none and offers Add', t2.indexOf('none') >= 0 && t2.indexOf('Add') >= 0, t2);
  console.log(pass + ' passing, ' + fail + ' failing');
})().catch((e) => { console.error(e); process.exit(2); });
