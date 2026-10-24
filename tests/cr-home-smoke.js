// ============================================================================
// cr-home-smoke.js — Home, step 2  [CR-HOME]
//
// Pins engine 1.0.11 (D-117, D-118, D-120): where each chat member is (schedule activity, schedule room link,
// the chat's room), the User with the Contact unless dropped in, the speaker told only their own room and who
// is there, nothing changed while Home is off, Arrange (tap, drag end saves), activity pictures, the event
// sheet's Activity, and the sanitizer.
//   CR_ENGINE_FILE=<engine> node cr-home-smoke.js
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

    const rec = { toasts: [], prompts: 0, ops: [], modals: [], gens: [], sent: [] }; const HOOKS = {};
    const storage = makeStore(env.storage || { characterListKey: [], userListKey: [], scenarioListKey: [] }); const storyStorage = makeStore(env.storyStorage || {}); const historyStorage = makeStore(env.historyStorage || {});
    const X = {};
    const v1 = {
        hooks: { register: (n, f) => { HOOKS[n] = f; } },
        storage, storyStorage, tempStorage: makeStore({}), historyStorage,
        random: { int: (a) => a, bool: () => false },
        tokenizer: { encode: (t) => Array.from(String(t)), decode: async () => '' },
        maxTokens: async () => 8192, rolloverTokens: async () => 1024,
        systemPrompt: { get: async () => 'SYS' },
        document: env.document || stub('document'),
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
                if (p && p.event === 'GENERATE_IMAGE') rec.sent.push(p);
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
        generate: async (msgs, params) => { rec.gens.push({ msgs, params }); return { choices: [{ text: env.genText || '' }] }; },
        generateWithStory: async (msgs, params) => { rec.gens.push({ msgs, params }); return { choices: [{ text: env.storyText || '' }] }; },
        generationParameters: { get: async () => ({ model: 'xialong-v1' }) }
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
        setTimeout, clearTimeout, __report: env.report || (() => {}), process: { exit: () => {} }
    });
    const names = ['crBridge', 'charList', 'userList', 'scenarioList', 'chatSettings', 'crBrainView', 'crHomePlace',
        'crHomeRoomsSet', 'crHomeUserRoom', 'crHomeSetOn', 'crSetResolve', 'crPickVariant', 'crUnpinVariant', 'CrHomeSurface',
        'crHomeUi', 'crHomeAddActivity', 'crHomeMoveTo', 'crHomeEndDrag', 'crHomeFind', 'crHomeGenerateActivity',
        'crEventActChoice', 'crSanitizeContactExtra', 'crGroupLoad', 'crActivitiesOf', 'crHomeOn', 'crScheduleActSet', 'crScheduleDelete'];
    const exp = names.map((n) => `${JSON.stringify(n)}: () => (typeof ${n} !== 'undefined' ? ${n} : undefined)`).join(',');
    const extra = (env.extra || []).map((t) => '{\n' + t + '\n}\n').join('');
    const exported = await vm.runInContext(`(async () => {\n${js}\n;${extra}return {${exp}};\n})()`, ctx, { filename: ENGINE });
    Object.assign(X, exported); X.rec = rec; X.HOOKS = HOOKS; X.history = historyStorage; X.story = storyStorage;
    if (env.bridge) X.crBridge().ready = true;
    return { X, rec, storage };
}



let pass = 0, fail = 0;
function ok(name, cond, got) {
    if (cond) { pass++; console.log('ok   ' + name); }
    else { fail++; console.log('FAIL ' + name); if (got !== undefined) console.log('     got ' + JSON.stringify(got).slice(0, 600)); }
}
const flat = (n, out) => { out = out || []; if (n == null || typeof n !== 'object') { if (n != null && n !== false) out.push(n); return out; }
  if (Array.isArray(n)) { n.forEach((k) => flat(k, out)); return out; }
  if (typeof n.type === 'function') { return flat(n.type(Object.assign({}, n.props, { children: n.kids })), out); }
  out.push(n); (n.kids || []).forEach((k) => flat(k, out)); return out; };
const strings = (n) => flat(n).filter((x) => typeof x === 'string').join(' | ');

const ROOMS = { id: 'sRooms', name: 'Rooms', rooms: true, variants: [
  { id: 'vKit', name: 'Kitchen', content: 'A small kitchen.' },
  { id: 'vGar', name: 'Garden', content: '' } ] };
const PORT = { cardType: 'scenario', id: 's-port', name: 'Port', environment: 'A house.', brains: [], brainsConditional: [], cr: { sets: [ROOMS] } };
const ALWAYS = (id) => ({ Daily: [{ id: id, startTime: 0, endTime: 1439, text: 'Busy', requiredIntimacy: 'none' }] });
const KAT = { cardType: 'contact', id: 'c-kat', name: 'Kat', gender: 'female', appearance: 'short hair', emotions: {}, exampleChats: [], brains: [], brainsConditional: [],
  schedule: ALWAYS('e1'),
  cr: { activities: [{ id: 'aCook', name: 'Cooking', room: 'vKit', x: 0.4, y: 0.5, scale: 0.3, prompt: 'cooking at stove, from above' },
                     { id: 'aRead', name: 'Reading', room: 'vGar', x: 0.5, y: 0.5, scale: 0.3, idle: true }],
        schedActs: { e1: 'aCook' } } };
const GARM = { cardType: 'contact', id: 'c-garm', name: 'Garm', gender: 'male', species: 'wolf', emotions: {}, exampleChats: [], brains: [], brainsConditional: [],
  schedule: ALWAYS('e2'), cr: { activities: [{ id: 'aDig', name: 'Digging', room: 'vGar', x: 0.7, y: 0.7, scale: 0.25 }], schedActs: { e2: 'aDig' } } };
const SAM = { cardType: 'user', id: 'u-sam', name: 'Sam', brains: [], brainsConditional: [] };
const SPEAKER = 'crHomeUi.__speak = (c) => { crGroupBuildChar = c; };';

(async () => {
  const L = await load({ storage: { characterListKey: [KAT, GARM], userListKey: [SAM], scenarioListKey: [PORT] },
    storyStorage: { chatSettingsKey: { char: KAT, user: SAM, scenario: PORT, intimacy: 'close', style: 'chat', responseLength: 'unspecified' },
                    'cr.group': { v: 1, members: ['c-kat', 'c-garm'], pools: {} } },
    bridge: { json: '' }, extra: [SPEAKER] });
  const X = L.X;
  await X.crGroupLoad()();
  const port = X.scenarioList()[0];
  const kat = X.charList().find((c) => c.id === 'c-kat');
  const garm = X.charList().find((c) => c.id === 'c-garm');
  const rooms = X.crHomeRoomsSet()(port);
  const brainOf = (v) => (v.brains || []).find((b) => /^Rooms: /.test(b.name));

  ok('rooms: the set marked Home rooms', rooms && rooms.id === 'sRooms');
  const pk = X.crHomePlace()(kat, rooms, 's-port');
  const pg = X.crHomePlace()(garm, rooms, 's-port');
  ok('place: the schedule event\'s activity puts Kat in its room', pk.room === 'vKit' && pk.act && pk.act.id === 'aCook' && pk.why === 'schedule', pk);
  ok('place: each member follows their own schedule', pg.room === 'vGar' && pg.act.id === 'aDig', pg);
  ok('place: the User is with the paired Contact', X.crHomeUserRoom()(rooms, 's-port') === 'vKit');
  ok('sets: the chat\'s rooms set follows the Contact\'s activity too', X.crSetResolve()(rooms, 's-port').v.id === 'vKit' && X.crSetResolve()(rooms, 's-port').why === 'schedule');

  let b = brainOf(X.crBrainView()(port));
  ok('home off: the rooms set sends as any set does, no presence line', b && b.content === 'A small kitchen.', b);
  await X.crHomeSetOn()(true);
  ok('home on: stored per story', JSON.stringify(await X.story.get('cr.home')) === '{"on":true}' && X.crHomeOn() === true);
  b = brainOf(X.crBrainView()(port));
  ok('home on: the paired Contact is told their room and who is in it', b && b.name === 'Rooms: Kitchen' && b.content === 'A small kitchen.\nAlso in Kitchen: Sam.', b);
  X.crHomeUi().__speak(garm);
  b = brainOf(X.crBrainView()(port));
  ok('home on: a member speaking is told only their own room', b && b.name === 'Rooms: Garden' && b.content === 'Nobody else is in Garden.', b);
  await X.crPickVariant()('sRooms', 'vGar');
  ok('drop in: the User is where the author dropped in', X.crHomeUserRoom()(rooms, 's-port') === 'vGar');
  b = brainOf(X.crBrainView()(port));
  ok('drop in: the member in that room now has the User with them', b && b.content === 'Also in Garden: Sam.', b);
  X.crHomeUi().__speak(null);
  b = brainOf(X.crBrainView()(port));
  ok('drop in: the Contact left behind is not told where the User went', b && b.content === 'A small kitchen.\nNobody else is in Kitchen.', b);
  ok('drop in: Kat stays where her schedule puts her', X.crHomePlace()(kat, rooms, 's-port').room === 'vKit');
  await X.crUnpinVariant()('sRooms');
  ok('follow: unpinning puts the User back with the Contact', X.crHomeUserRoom()(rooms, 's-port') === 'vKit');

  let txt = strings(X.CrHomeSurface()({ mobile: true }));
  ok('surface: rooms with how many are in each, and where everyone is', txt.indexOf('Kitchen  ·  2') >= 0 && txt.indexOf('Garden  ·  1') >= 0 && txt.indexOf('In Kitchen: Kat, you.') >= 0, txt.slice(0, 500));
  X.crHomeUi().look = 'vGar';
  txt = strings(X.CrHomeSurface()({ mobile: true }));
  ok('surface: looking at another room says where the Contact and you are, and offers Drop in and Follow', txt.indexOf('In Garden: Garm.') >= 0 && txt.indexOf('Kat is in Kitchen.') >= 0 && txt.indexOf('Drop in') >= 0 && txt.indexOf('Follow Kat') >= 0, txt.slice(0, 500));
  X.crHomeUi().arrange = true;
  await X.crHomeAddActivity()(garm, 'vGar');
  const g2 = X.charList().find((c) => c.id === 'c-garm');
  ok('arrange: Add makes an activity in the room and selects it', X.crActivitiesOf()(g2).length === 2 && X.crHomeUi().sel.indexOf('c-garm|') === 0);
  txt = strings(X.CrHomeSurface()({ mobile: true }));
  ok('arrange: the selected activity has its sliders and picture buttons', txt.indexOf('Across') >= 0 && txt.indexOf('Size') >= 0 && txt.indexOf('Generate picture') >= 0 && txt.indexOf('Add an activity in Garden for') >= 0, txt.slice(0, 800));
  X.crHomeUi().drag = X.crHomeUi().sel;
  X.crHomeMoveTo()(2, 7);
  X.crHomeEndDrag()();
  await new Promise((r) => setTimeout(r, 0));
  const saved = (await L.storage.get('characterListKey')).find((c) => c.id === 'c-garm').cr.activities[1];
  ok('arrange: a drag lands on the square\'s centre and is saved when it ends', saved.x === 0.25 && saved.y === 0.75 && X.crHomeUi().drag === '', saved);

  X.crBridge().ready = true;
  await X.crHomeGenerateActivity()(kat, X.crActivitiesOf()(kat)[0]);
  const sent = L.rec.sent[L.rec.sent.length - 1];
  ok('picture: an activity generates into its own slot with the card\'s looks', sent && sent.slot === 'a-aCook' && sent.charId === 'c-kat' && /^1girl, solo, full body, cooking at stove/.test(sent.prompt) && /short hair/.test(sent.characters[0].visuals), sent);

  txt = strings(X.crEventActChoice()(kat, 'e1'));
  ok('event sheet: Activity lists the Contact\'s activities with their rooms', txt.indexOf('Cooking (Kitchen)') >= 0 && txt.indexOf('Reading (Garden)') >= 0, txt);
  await X.crScheduleActSet()(X.charList().find((c) => c.id === 'c-kat'), 'e1', 'aRead');
  ok('event sheet: picking another activity moves her', X.crHomePlace()(X.charList().find((c) => c.id === 'c-kat'), rooms, 's-port').room === 'vGar');
  await X.crScheduleDelete()(X.charList().find((c) => c.id === 'c-kat'), 'e1');
  const k3 = X.charList().find((c) => c.id === 'c-kat');
  ok('event sheet: deleting the event drops its activity', !(k3.cr.schedActs && k3.cr.schedActs.e1));
  ok('place: with no event, the idle activity of the chat\'s room', X.crHomePlace()(k3, rooms, 's-port').room === 'vKit' && !X.crHomePlace()(k3, rooms, 's-port').act);

  const clean = X.crSanitizeContactExtra()({ activities: [{ id: 'a1', name: 'x', room: 'vKit', x: 5, y: -1, scale: 0, idle: 'yes' }, { id: 'bad id', room: 'vKit' }], schedActs: { e1: 'a1', e2: 'no good' } });
  ok('data: activities clamp to the room and drop bad ids; links keep good ones', clean.activities.length === 1 && clean.activities[0].x === 1 && clean.activities[0].y === 0 && clean.activities[0].scale === 0.03 && !clean.activities[0].idle && JSON.stringify(clean.schedActs) === '{"e1":"a1"}', clean);

  console.log('\n' + pass + ' passing, ' + fail + ' failing');
  if (fail) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
