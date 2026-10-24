// ============================================================================
// cr-brains-smoke.js — brain sets and per-chat brain switches  [CR-SETS]
//
// Pins engine 1.0.5 (D-107) and 1.0.6 (D-108): a set sends its variant in use as one brain, Suppress takes a card,
// conditional or set brain out of this story's context, the variant's image pair joins the
// pictures, a Stage set replaces the Banner, and with no sets or switches the kernel receives
// the card itself. AnotherRoom has no such feature, so parity cannot pin it; this file does.
//   CR_ENGINE_FILE=<engine> node cr-brains-smoke.js
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

    const rec = { toasts: [], prompts: 0, ops: [], modals: [] }; const HOOKS = {};
    const storage = makeStore(env.storage || { characterListKey: [], userListKey: [], scenarioListKey: [] }); const storyStorage = makeStore(env.storyStorage || {}); const historyStorage = makeStore(env.historyStorage || {});
    const X = {};
    const v1 = {
        hooks: { register: (n, f) => { HOOKS[n] = f; } },
        storage, storyStorage, tempStorage: makeStore({}), historyStorage,
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
            if (k === 'modal') return { open: async (o) => { rec.modals.push(o && o.content && o.content[0] && o.content[0].id); return { close: async () => {}, update: async () => {}, isClosed: () => false, closed: Promise.resolve() }; } };
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
        'scenarioList', 'crUiStore', 'importCharacter', 'importUser', 'importScenario', 'CrPairingPanel', 'CrGroupTab', 'CrGroupMembersRow', 'crGroupInit', 'CrPairRow', 'CrPressable', 'crBrainView', 'crPickVariant', 'crSetBrainOff', 'crBrainsFired', 'crAssembleCharacterPrompt', 'crSceneBasePrompt', 'crStageBackdropSlot', 'crSanitizeContactExtra', 'CrChatBrainsTab', 'crSetActive', 'crBrainsOff', 'chatSettings', 'crSetCondMode', 'crCondMode', 'crJsxModal', 'crPickFolderFor', 'crPickApply'];
    const exp = names.map((n) => `${JSON.stringify(n)}: () => (typeof ${n} !== 'undefined' ? ${n} : undefined)`).join(',');
    const exported = await vm.runInContext(`(async () => {\n${js}\n;return {${exp}};\n})()`, ctx, { filename: ENGINE });
    Object.assign(X, exported); X.rec = rec; X.HOOKS = HOOKS; X.history = historyStorage; X.story = storyStorage;
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
  const SET = { id: 'sOutfit1', name: 'Outfit', variants: [
    { id: 'vCasual1', name: 'Casual', content: 'Hoodie and jeans.', prompt: 'grey hoodie, jeans' },
    { id: 'vFormal1', name: 'Formal', content: 'A black evening dress.', prompt: 'black evening dress', uc: 'hoodie' } ] };
  const LOC = { id: 'sLoc0001', name: 'Location', stage: true, variants: [
    { id: 'vDocks01', name: 'Docks', content: 'Tar and salt at night.', prompt: 'harbour at night' },
    { id: 'vCafe001', name: 'Cafe', content: 'A small cafe.', prompt: 'cafe interior' } ] };
  const MIRA = { cardType: 'contact', id: 'c-mira', name: 'Mira', appearance: 'silver hair', emotions: {}, exampleChats: [],
    brains: [{ name: 'Mira Background', content: 'Grew up by the docks.' }],
    brainsConditional: [{ name: 'Sister', content: 'Mira has a sister.', keys: ['sister'], requiredIntimacy: 'none' }],
    cr: { sets: [SET] } };
  const SAM = { cardType: 'user', id: 'u-sam', name: 'Sam', brains: [{ name: 'Sam Notes', content: 'Likes tea.' }], brainsConditional: [] };
  const PORT = { cardType: 'scenario', id: 's-port', name: 'Port', environment: 'A port town.', brains: [], brainsConditional: [],
    cr: { img: { basePrompt: 'port town' }, sets: [LOC] } };
  const PLAIN = Object.assign({}, MIRA, { id: 'c-plain', cr: undefined });
  const L = await load({ storage: { characterListKey: [MIRA, PLAIN], userListKey: [SAM], scenarioListKey: [PORT] },
    storyStorage: { chatSettingsKey: { char: MIRA, user: SAM, scenario: PORT, intimacy: 'close', style: 'chat', responseLength: 'unspecified' } } });
  const X = L.X;
  const MSGS = [{ role: 'system', content: 'SYS' }, { role: 'user', content: 'hi' }, { role: 'assistant', content: 'Mira: Hey.\n  Emotion: happy' }, { role: 'assistant', content: '' }];
  const sheet = async () => { const r = await X.HOOKS.onContextBuilt({ messages: JSON.parse(JSON.stringify(MSGS)), model: 'xialong-v1', dryRun: true, continuityId: 'x' });
    return r && r.messages ? r.messages[0].content : ''; };
  const before = async (text) => X.HOOKS.onBeforeContextBuild({ model: 'xialong-v1', storyText: { content: text } });

  ok('identity: a card with no sets or switches reaches the kernel untouched', X.crBrainView()(PLAIN) === PLAIN);
  let p = await sheet();
  ok('set: the first variant is in use by default and sent as one brain', p.indexOf('----\nOutfit: Casual\nHoodie and jeans.') >= 0 && p.indexOf('Formal') < 0, p.slice(-400));
  ok('set: the Scenario\'s set reaches the sheet too', p.indexOf('Location: Docks') >= 0, p.slice(-300));
  await X.crPickVariant()('sOutfit1', 'vFormal1');
  p = await sheet();
  ok('switch: the variant in use changes what is sent', p.indexOf('Outfit: Formal\nA black evening dress.') >= 0 && p.indexOf('Casual') < 0, p.slice(-300));
  ok('switch: stored in history storage, so undo takes it back', JSON.stringify(await X.history.get('cr.setActive')) === '{"sOutfit1":"vFormal1"}');
  await X.history.set('cr.setActive', {});
  p = await sheet();
  ok('undo: the build reads the history node it is building at', p.indexOf('Outfit: Casual') >= 0, p.slice(-300));
  await X.crSetBrainOff()('c-mira', 'b:Mira Background', true);
  p = await sheet();
  ok('suppress: a card brain leaves context', p.indexOf('Grew up by the docks.') < 0 && p.indexOf('Outfit: Casual') >= 0);
  ok('suppress: stored per story', JSON.stringify(await X.story.get('cr.brainsOff')) === '{"c-mira":["b:Mira Background"]}');
  await X.crSetBrainOff()('c-mira', 'b:Mira Background', false);
  p = await sheet();
  ok('restore: it comes back', p.indexOf('Grew up by the docks.') >= 0);
  await X.crSetBrainOff()('c-mira', 's:sOutfit1', true);
  p = await sheet();
  ok('suppress: a whole set leaves context', p.indexOf('Outfit:') < 0);
  await X.crSetBrainOff()('c-mira', 's:sOutfit1', false);
  await X.crSetBrainOff()('u-sam', 'b:Sam Notes', true);
  p = await sheet();
  ok('suppress: a User brain too', p.indexOf('Likes tea.') < 0);
  let r = await before('my little sister');
  ok('conditional: fires on its key and is recorded as fired', JSON.stringify(r).indexOf('Mira has a sister.') >= 0 && X.crBrainsFired()['c-mira'].names.indexOf('Sister') >= 0, r);
  await X.crSetBrainOff()('c-mira', 'c:Sister', true);
  r = await before('my little sister');
  ok('conditional: suppressed, it does not fire', JSON.stringify(r).indexOf('Mira has a sister.') < 0, r);
  const vis = X.crAssembleCharacterPrompt()(MIRA, 'illustrate');
  ok('image: the variant in use joins the character prompt', /grey hoodie, jeans/.test(vis.visuals), vis);
  const prev = X.crAssembleCharacterPrompt()(MIRA, 'avatar', { setId: 'sOutfit1', variantId: 'vFormal1' });
  ok('image: a variant preview uses that variant, not the one in use', /black evening dress/.test(prev.visuals) && !/grey hoodie/.test(prev.visuals) && /hoodie/.test(prev.uc), prev);
  const sc = X.crSceneBasePrompt()();
  ok('image: the Scenario\'s variant joins the scene base', sc.base === 'port town, harbour at night', sc);
  ok('stage: a Stage set puts its variant behind the Stage', X.crStageBackdropSlot()(PORT) === 'v-vDocks01');
  await X.crSetBrainOff()('s-port', 's:sLoc0001', true);
  ok('stage: suppressed, the Banner is back', X.crStageBackdropSlot()(PORT) === 'Banner');
  const clean = X.crSanitizeContactExtra()({ sets: [{ id: 'ok1', name: 'A', variants: [{ id: 'v1', name: 'x', content: 'y' }, { id: 'bad id!', name: 'z' }] }, { id: '', name: 'B' }] });
  ok('data: sets survive the sanitizer, malformed ids do not', clean && clean.sets.length === 1 && clean.sets[0].variants.length === 1, clean);
  const tab = flat(X.CrChatBrainsTab()({ mobile: false })).filter((x) => typeof x === 'string');
  ok('tab: every owner and the floaty section are listed', ['Mira  ·  Contact', 'Sam  ·  User', 'Port  ·  Scenario', 'Floaty brains'].every((t) => tab.indexOf(t) >= 0), tab.slice(0, 40));
  ok('tab: states read from the switches', tab.indexOf('suppressed') >= 0 && tab.indexOf('in context') >= 0, tab);
  // ---- 1.0.6: Always
  await X.crSetCondMode()('c-mira', 'Sister', 'always');
  p = await sheet();
  ok('always: a conditional entry is sent every build, keys or not', p.indexOf('----\nSister\nMira has a sister.') >= 0, p.slice(-300));
  r = await before('nothing relevant');
  ok('always: and it is not also sent through the keys', JSON.stringify(r).indexOf('Mira has a sister.') < 0, r);
  ok('always: the switch is stored as one mode', JSON.stringify((await X.story.get('cr.brainsOff'))['c-mira']) === '["a:Sister"]', await X.story.get('cr.brainsOff'));
  await X.crSetCondMode()('c-mira', 'Sister', 'off');
  ok('modes: Off replaces Always', X.crCondMode()('c-mira', 'Sister') === 'off' && (await sheet()).indexOf('Mira has a sister.') < 0);
  await X.crSetCondMode()('c-mira', 'Sister', 'auto');
  ok('modes: Auto clears the switch', X.crCondMode()('c-mira', 'Sister') === 'auto' && !X.crBrainsOff()['c-mira']);
  const SAM2 = X.chatSettings().user;
  SAM2.brainsConditional = [{ name: 'Sam Secret', content: 'Sam is afraid of the dark.', keys: ['dark'], requiredIntimacy: 'none' }];
  await X.crSetCondMode()('u-sam', 'Sam Secret', 'always');
  p = await sheet();
  ok('always: works on a User, where Auto never fires', p.indexOf('Sam is afraid of the dark.') >= 0, p.slice(-300));
  // ---- 1.0.6: modals
  await X.crJsxModal()('A', 'small', () => null);
  await X.crJsxModal()('B', 'small', () => null);
  ok('modal: each modal mounts under its own part id', X.rec.modals.length === 2 && X.rec.modals[0] !== X.rec.modals[1], X.rec.modals);
  await X.crPickFolderFor()('contact', MIRA);
  const n0 = X.rec.modals.length;
  X.crPickApply()('__new');
  await new Promise((res) => setTimeout(res, 0)); await new Promise((res) => setTimeout(res, 0));
  ok('folder: New folder from the picker opens the name sheet in its own modal', X.rec.modals.length === n0 + 1 && X.rec.modals[n0] !== X.rec.modals[n0 - 1], X.rec.modals);
  console.log(pass + ' passing, ' + fail + ' failing');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
