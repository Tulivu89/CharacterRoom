// ============================================================================
// cr-folders-smoke.js — card lists: folders, search, sort, grid, organise  [CR-FOLDERS]
//
// Pins engine 1.0.4 (D-106): the Cards tabs, the Group tab's picker and the pairing sheet
// share one list that groups by account-level folders, filters, sorts and draws rows or tiles.
//   CR_ENGINE_FILE=<engine> node cr-folders-smoke.js
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
        'scenarioList', 'crUiStore', 'importCharacter', 'importUser', 'importScenario', 'CrPairingPanel', 'CrGroupTab', 'CrGroupMembersRow', 'crGroupInit', 'CrPairRow', 'CrPressable', 'CrCardsSurface', 'crFolderAdd', 'crFolderMove', 'crFolderRename', 'crFolderRemove', 'crSetListLook', 'crListFilter', 'crListOrganise', 'crFolders', 'crPickTitle', 'CrCardPickSheet', 'crGroup'];
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
  const mk = (id, name) => ({ cardType: 'contact', id: id, name: name, description: name + ' desc', emotions: {}, exampleChats: [], brains: [], brainsConditional: [] });
  const CHARS = [mk('c-mira', 'Mira'), mk('c-tal', 'Tallis'), mk('c-jun', 'Jun'), mk('c-ada', 'Ada')];
  const SAM = { cardType: 'user', id: 'u-sam', name: 'Sam', brains: [], brainsConditional: [] };
  const env = (extra) => Object.assign({ storage: { characterListKey: CHARS, userListKey: [SAM], scenarioListKey: [] },
    storyStorage: { chatSettingsKey: { char: CHARS[0], user: SAM, intimacy: 'close', style: 'chat' } } }, extra || {});
  const L = await load(env());
  const X = L.X;
  const st = () => X.crUiStore().get();
  const surf = () => flat(X.CrCardsSurface()({ st: st() }));
  const strs = () => surf().filter((x) => typeof x === 'string');
  const rowNames = () => surf().filter((x) => x && x.props && x.props.class && String(x.props.class).indexOf('cr-card-row') === 0)
    .map((r) => JSON.stringify(r.kids)).map((k) => (k.match(/"(Mira|Tallis|Jun|Ada)"/) || [])[1]);
  const tiles = () => surf().filter((x) => x && x.props && x.props.class === 'cr-card-tile').map((t) => t.props.title);

  ok('rows: no folders means one plain list in storage order', JSON.stringify(rowNames()) === '["Mira","Tallis","Jun","Ada"]' && strs().indexOf('Unfiled') < 0, rowNames());
  await X.crFolderAdd()('contact', 'Friends');
  await X.crFolderMove()('c-jun', 'Friends');
  ok('folders: a folder heads its cards, Unfiled holds the rest', JSON.stringify(rowNames()) === '["Jun","Mira","Tallis","Ada"]' && strs().indexOf('Friends') >= 0 && strs().indexOf('Unfiled') >= 0, [rowNames(), strs().slice(0, 30)]);
  await X.crSetListLook()({ sort: 'name' });
  ok('sort: A-Z within each group', JSON.stringify(rowNames()) === '["Jun","Ada","Mira","Tallis"]', rowNames());
  await X.crSetListLook()({ sort: 'newest' });
  ok('sort: newest reverses storage order', JSON.stringify(rowNames()) === '["Jun","Ada","Tallis","Mira"]', rowNames());
  X.crListFilter()['cards:contact'] = 'ta';
  ok('search: filters by name and drops empty folders', JSON.stringify(rowNames()) === '["Tallis"]' && strs().indexOf('Friends') < 0, [rowNames(), strs().slice(0, 20)]);
  X.crListFilter()['cards:contact'] = '';
  await X.crSetListLook()({ layout: 'grid' });
  ok('grid: faces and names, no rows', rowNames().length === 0 && JSON.stringify(tiles()) === '["Jun","Ada","Tallis","Mira"]', tiles());
  const tile = surf().find((x) => x && x.props && x.props.title === 'Ada');
  tile.props.onClick();
  ok('grid: a tile opens the profile', st().openContactId === 'c-ada' && st().openKind === 'contact', st());
  X.crListOrganise()['cards:contact'] = true;
  surf().find((x) => x && x.props && x.props.title === 'Mira').props.onClick();
  await new Promise((r) => setTimeout(r, 0));
  ok('organise: a tap asks for a folder instead of opening', X.crPickTitle() === 'Folder for Mira' && st().openContactId === 'c-ada', [X.crPickTitle(), st().openContactId]);
  X.crListOrganise()['cards:contact'] = false;
  await X.crFolderRename()('contact', 'Friends', 'Crew');
  ok('rename: cards follow the folder', X.crFolders().of['c-jun'] === 'Crew' && X.crFolders().names.contact.join() === 'Crew', X.crFolders());
  const saved = JSON.parse(JSON.stringify(await L.storage.get('cr.cardFolders')));
  ok('storage: kept account-level under cr.cardFolders', saved && saved.of['c-jun'] === 'Crew' && saved.layout === 'grid' && saved.sort === 'newest', saved);
  const L2 = await load(env({ storage: { characterListKey: CHARS, userListKey: [SAM], scenarioListKey: [],
    'cr.cardFolders': { v: 1, names: { contact: ['Crew', '', 'Crew'], user: [], scenario: [] }, of: { 'c-jun': 'Crew', 'c-gone': 'Crew' }, layout: 'grid', sort: 'bogus' } } }));
  ok('load: sanitised on the way in', JSON.stringify(L2.X.crFolders().names.contact) === '["Crew"]' && L2.X.crFolders().sort === 'added' && L2.X.crFolders().layout === 'grid', L2.X.crFolders());
  await L2.X.crFolderMove()('c-mira', 'Crew');
  ok('save: entries for cards that no longer exist are pruned', !(('c-gone') in L2.X.crFolders().of) && L2.X.crFolders().of['c-mira'] === 'Crew', L2.X.crFolders().of);
  await X.crFolderRemove()('contact', 'Crew');
  ok('remove: its cards go back to Unfiled', !X.crFolders().of['c-jun'] && X.crFolders().names.contact.length === 0, X.crFolders());
  await X.crSetListLook()({ layout: 'rows' });

  await X.crGroupInit()();
  const gtiles = flat(X.CrGroupTab()({ mobile: false }));
  const grows = gtiles.filter((x) => x && x.props && x.props.class === 'cr-pick-row');
  ok('group picker: the shared list draws the candidates', grows.length === 3, grows.length);
  grows[0].props.onClick();
  await new Promise((r) => setTimeout(r, 0));
  ok('group picker: a tap still toggles membership', X.crGroup().members.length === 1, X.crGroup().members);
  console.log(pass + ' passing, ' + fail + ' failing');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
