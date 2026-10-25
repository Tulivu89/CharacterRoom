// ============================================================================
// cr-home-smoke.js — Home  [CR-HOME]
//
// Pins engine 1.0.16 (D-117, D-118, D-120 to D-125): a Contact's schedule lines carry Home per Scenario (room,
// spot, picture), a nothing-on place, the User with the Contact unless dropped in, a speaker told only their own
// room, nothing changed while Home is off, the Scenario's Locations with layers and atmosphere on the chat clock,
// Arrange (tap, drag end saves, fresh targets), pictures, routines, the event sheet, the 1.0.13 migration and
// the sanitizers; Arrange's line list drawn as the Schedule tab draws lines; needs and actions (drain on the chat
// clock, effects, set picks, the needs brain, a low need's look, reactions written and sent); the Clock panel's draft
// and Set the clock with its tally; While you were away (hand-set and real-time gaps, Catch up); Snapshot.
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
        file: { prompt: async () => { rec.prompts++; return env.file; }, save: async (n, c) => { rec.saved = { n: n, c: c }; } },
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
        'crHomeUi', 'crHomePlaceLine', 'crHomeUnplace', 'crHomeNewPic', 'crHomeMoveTo', 'crHomeEndDrag', 'crHomeFind', 'crHomeGeneratePic',
        'crEventHomeChoice', 'crEventSetChoices', 'crSanitizeContactExtra', 'crSanitizeScenarioExtra', 'crGroupLoad', 'crHomeOn',
        'crScheduleDelete', 'crHomeTarget', 'crHomeAddLayer', 'crHomeFindLayer', 'crLayerShown', 'crRoomPicSlot', 'crAtmosLive',
        'CrLocationsTab', 'crLocOpen', 'crRoutineSave', 'crRoutineLoad', 'crRoutineExport', 'crRoutineImport', 'crScheduleOf',
        'crLineHomeOf', 'crHomeIdleOf', 'crPicsOf', 'crSchedPresetsOf', 'CrRoutinesSection',
        'crNeedsCommit', 'crNeedsStarter', 'crNeedsOf', 'crHomeActionsOf', 'crNeedValue', 'crNeedsState', 'crHomeDoAction',
        'crHomeLog', 'crHomeSetNeedsLine', 'crHomeReact', 'crHomeSendReaction', 'CrNeedsSection', 'crNeedsText', 'crClockNow',
        'CrScheduleTab', 'crSetActive', 'crClockSetMode', 'crClockDraftSet', 'crClockApplyDraft', 'crClockTallyNote', 'crHomeTally',
        'crHomeAwayInit', 'crIllus', 'CrClockPanel', 'CrHomeAway', 'crHomeSnapshot', 'crUiStore', 'crClockDraft'];
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
  { id: 'vKit', name: 'Kitchen', content: 'A small kitchen.', layers: [{ id: 'lC', name: 'Candles', above: true, fill: true, x: 0.5, y: 0.5, scale: 0.5, opacity: 1, blend: 'screen', shown: false }] },
  { id: 'vGar', name: 'Garden', content: '' } ] };
const MOOD = { id: 'sMood', name: 'Weather', variants: [{ id: 'vSun', name: 'Sunny', content: '' }, { id: 'vRain', name: 'Rain', content: '' }] };
const PORT = { cardType: 'scenario', id: 's-port', name: 'Port', environment: 'A house.', brains: [], brainsConditional: [], cr: { sets: [ROOMS, MOOD] } };
const ALWAYS = (id, text) => ({ Daily: [{ id: id, startTime: 0, endTime: 1439, text: text || 'Busy', requiredIntimacy: 'none' }] });
const KAT = { cardType: 'contact', id: 'c-kat', name: 'Kat', gender: 'female', appearance: 'short hair', emotions: {}, exampleChats: [], brains: [], brainsConditional: [],
  schedule: ALWAYS('e1', 'Cooking dinner'),
  cr: { pics: [{ id: 'pCook', name: 'Cooking', prompt: 'cooking at stove, from above' }, { id: 'pRead', name: 'Reading' }],
        lineHome: { e1: { 's-port': { room: 'vKit', x: 0.4, y: 0.5, scale: 0.3, pic: 'pCook' } } },
        homeIdle: { 's-port': { room: 'vGar', x: 0.5, y: 0.5, scale: 0.3, pic: 'pRead' } } } };
const GARM = { cardType: 'contact', id: 'c-garm', name: 'Garm', gender: 'male', species: 'wolf', emotions: {}, exampleChats: [], brains: [], brainsConditional: [],
  schedule: ALWAYS('e2', 'Digging'), cr: { lineHome: { e2: { 's-port': { room: 'vGar', x: 0.7, y: 0.7, scale: 0.25 } } } } };
const OLD = { cardType: 'contact', id: 'c-old', name: 'Vex', gender: 'female', emotions: {}, exampleChats: [], brains: [], brainsConditional: [],
  schedule: ALWAYS('e9', 'Napping'),
  cr: { activities: [{ id: 'aNap', name: 'Napping', room: 'vGar', x: 0.2, y: 0.3, scale: 0.2 }, { id: 'aSit', name: 'Sitting', room: 'vKit', x: 0.6, y: 0.6, scale: 0.2, idle: true }, { id: 'aNo', name: 'Elsewhere', room: 'vNone', x: 0.5, y: 0.5, scale: 0.2 }],
        schedActs: { e9: 'aNap' } } };
const SAM = { cardType: 'user', id: 'u-sam', name: 'Sam', brains: [], brainsConditional: [] };
const SPEAKER = 'crHomeUi.__speak = (c) => { crGroupBuildChar = c; };';
// Reactions without a model: the assembled chat, the generation and the write are stood in for.
const FAKEGEN = 'crHomeUi.__fake = () => { crGroupAssemble = async () => [{ role: "system", content: "S" }, { role: "user", content: "U" }, { role: "assistant", content: "Garm:" }];'
  + ' crGroupRunLocal = async (m) => { crHomeUi.__msgs = m; return "Garm: Thanks, that hit the spot."; };'
  + ' crGroupGenerate = async (id, m) => { crHomeUi.__msgs = m; return "Garm: Thanks, that hit the spot."; };'
  + ' crGroupWrite = async (t) => { crHomeUi.__wrote = t; }; crGroupDropEmptyOpener = async () => {}; };';

(async () => {
  const L = await load({ storage: { characterListKey: [KAT, GARM, OLD], userListKey: [SAM], scenarioListKey: [PORT], crSlotIndexKey: { 'c-garm': ['Avatar', 'irritated'] } },
    storyStorage: { chatSettingsKey: { char: KAT, user: SAM, scenario: PORT, intimacy: 'close', style: 'chat', responseLength: 'unspecified' },
                    'cr.group': { v: 1, members: ['c-kat', 'c-garm'], pools: {} } },
    bridge: { json: '' }, extra: [SPEAKER, FAKEGEN] });
  const X = L.X;
  await X.crGroupLoad()();
  const port = () => X.scenarioList()[0];
  const kat = () => X.charList().find((c) => c.id === 'c-kat');
  const garm = () => X.charList().find((c) => c.id === 'c-garm');
  const rooms = () => X.crHomeRoomsSet()(port());
  const brainOf = (v) => (v.brains || []).find((b) => /^Rooms: /.test(b.name));

  // ---- the 1.0.13 migration
  const old = X.charList().find((c) => c.id === 'c-old');
  ok('migrate: activities fold into the lines, the idle one into the nothing-on place, all kept as pictures',
    !old.cr.activities && !old.cr.schedActs && old.cr.lineHome.e9['s-port'].room === 'vGar' && old.cr.lineHome.e9['s-port'].pic === 'aNap'
    && old.cr.homeIdle['s-port'].room === 'vKit' && old.cr.pics.map((p) => p.id).join() === 'aNap,aSit,aNo', old.cr);
  ok('migrate: stored once', JSON.stringify(await L.storage.get('characterListKey')).indexOf('schedActs') < 0);

  // ---- places
  ok('rooms: the set marked as locations', rooms() && rooms().id === 'sRooms');
  const pk = X.crHomePlace()(kat(), rooms(), 's-port');
  ok('place: a line on now with a Home part here puts Kat there, with its picture', pk.room === 'vKit' && pk.line === 'e1' && pk.spot.pic === 'pCook' && pk.why === 'schedule', pk);
  ok('place: each member follows their own lines', X.crHomePlace()(garm(), rooms(), 's-port').room === 'vGar');
  ok('place: the User is with the paired Contact', X.crHomeUserRoom()(rooms(), 's-port') === 'vKit');
  ok('sets: the chat\'s location follows the line\'s place in this Scenario', X.crSetResolve()(rooms(), 's-port').v.id === 'vKit' && X.crSetResolve()(rooms(), 's-port').why === 'schedule');
  ok('place: another Scenario sees no Home part for the same line', X.crHomePlace()(kat(), rooms(), 's-other').why !== 'schedule');

  // ---- the speaker's room
  let b = brainOf(X.crBrainView()(port()));
  ok('home off: the location sends as any set does', b && b.content === 'A small kitchen.', b);
  await X.crHomeSetOn()(true);
  b = brainOf(X.crBrainView()(port()));
  ok('home on: the paired Contact is told their room and who is in it', b && b.content === 'A small kitchen.\nAlso in Kitchen: Sam.', b);
  X.crHomeUi().__speak(garm());
  b = brainOf(X.crBrainView()(port()));
  ok('home on: a member speaking is told only their own room', b && b.name === 'Rooms: Garden' && b.content === 'Nobody else is in Garden.', b);
  await X.crPickVariant()('sRooms', 'vGar');
  b = brainOf(X.crBrainView()(port()));
  ok('drop in: the member there now has the User with them', b && b.content === 'Also in Garden: Sam.', b);
  X.crHomeUi().__speak(null);
  b = brainOf(X.crBrainView()(port()));
  ok('drop in: the Contact left behind is not told where the User went', b && b.content === 'A small kitchen.\nNobody else is in Kitchen.', b);
  await X.crUnpinVariant()('sRooms');
  ok('follow: unpinning puts the User back with the Contact', X.crHomeUserRoom()(rooms(), 's-port') === 'vKit');

  // ---- atmosphere
  const kit = () => rooms().variants[0];
  ok('layers: a layer hidden by default is hidden', X.crLayerShown()(kit(), kit().layers[0]) === false);
  kit().atmos = [{ id: 't1', day: 'Daily', start: 0, end: 1439, text: 'The lamps are lit.', on: ['lC'] }];
  ok('atmosphere: a line on now shows its layer', X.crLayerShown()(kit(), kit().layers[0]) === true);
  b = brainOf(X.crBrainView()(port()));
  ok('atmosphere: its words join the place\'s brain', b && b.content === 'A small kitchen.\nThe lamps are lit.\nAlso in Kitchen: Sam.', b);
  ok('atmosphere: the place\'s own Home picture unless the line has one', X.crRoomPicSlot()(kit()) === 'h-vKit');
  kit().atmos[0].alt = true;
  ok('atmosphere: a line with its own picture swaps it in', X.crRoomPicSlot()(kit()) === 'h-vKit-t1');
  kit().atmos = undefined;

  // ---- surface and Arrange
  let txt = strings(X.CrHomeSurface()({ mobile: true }));
  ok('surface: rooms with how many are in each', txt.indexOf('Kitchen  ·  2') >= 0 && txt.indexOf('Garden  ·  1') >= 0 && txt.indexOf('In Kitchen: Kat, you.') >= 0, txt.slice(0, 400));
  X.crHomeUi().look = 'vGar';
  X.crHomeUi().arrange = true;
  txt = strings(X.CrHomeSurface()({ mobile: true }));
  ok('arrange: each person\'s lines fold under one row with a count', txt.indexOf('Put Kat here | 1 line') >= 0 && txt.indexOf('Put Garm here | 1 line  ·  1 here') >= 0 && txt.indexOf('Cooking dinner') < 0, txt.slice(0, 900));
  X.crHomeUi().open['c-kat'] = true;
  txt = strings(X.CrHomeSurface()({ mobile: true }));
  ok('arrange: open, the lines read as the Schedule tab\'s — times, words, where each is now — by day, nothing-on first',
    /Any time \| When nothing is on \| here \| Every day \| 00:00 – 23:5\d \| Cooking dinner \| in Kitchen/.test(txt), txt.slice(0, 900));
  const putTree = flat(X.CrHomeSurface()({ mobile: true }));
  ok('arrange: the rows are the Schedule tab\'s own', putTree.filter((n) => n && n.props && n.props.class === 'cr-line-row').length === 2);
  X.crHomeUi().open['c-kat'] = false;
  await X.crHomePlaceLine()(garm(), X.crScheduleOf()(garm()).Daily[0].id, 's-port', 'vKit');
  ok('arrange: putting a line in another room moves its Home part, keeping its spot', X.crLineHomeOf()(garm()).e2['s-port'].room === 'vKit' && X.crLineHomeOf()(garm()).e2['s-port'].x === 0.7 && X.crHomeUi().sel === 'c-garm|e2');
  X.crHomeUi().look = 'vKit';
  txt = strings(X.CrHomeSurface()({ mobile: true }));
  ok('arrange: the selected line shows its picture choice, sliders and the way out', txt.indexOf('Garm  ·  ') >= 0 && txt.indexOf('Digging') >= 0 && txt.indexOf('New picture') >= 0 && txt.indexOf('Across') >= 0 && txt.indexOf('Take out of Kitchen') >= 0, txt.slice(0, 900));
  await X.crHomeNewPic()(garm(), 'c-garm|e2', 'Digging');
  const gp = X.crPicsOf()(garm());
  ok('pictures: New picture makes one named for the line and gives it to the line', gp.length === 1 && gp[0].name === 'Digging' && X.crLineHomeOf()(garm()).e2['s-port'].pic === gp[0].id, gp);
  let t1 = X.crHomeTarget()('c-garm|e2');
  t1.pos.x = 0.11;
  await t1.save();
  let t2 = X.crHomeTarget()('c-garm|e2');
  t2.pos.x = 0.22;
  await t2.save();
  ok('arrange: a target is found afresh after a save, and the change after it is the one kept', t2.pos !== t1.pos && (await L.storage.get('characterListKey')).find((c) => c.id === 'c-garm').cr.lineHome.e2['s-port'].x === 0.22);
  X.crHomeUi().drag = 'c-garm|e2';
  X.crHomeMoveTo()(2, 7);
  X.crHomeEndDrag()();
  await new Promise((r) => setTimeout(r, 0));
  const saved = (await L.storage.get('characterListKey')).find((c) => c.id === 'c-garm').cr.lineHome.e2['s-port'];
  ok('arrange: a drag lands on the square\'s centre and is saved when it ends', saved.x === 0.25 && saved.y === 0.75, saved);
  await X.crHomeUnplace()(garm(), 'e2', 's-port');
  ok('arrange: Take out removes the Home part here', !X.crLineHomeOf()(garm()).e2);

  X.crBridge().ready = true;
  await X.crHomeGeneratePic()(kat(), X.crPicsOf()(kat())[0]);
  const sent = L.rec.sent[L.rec.sent.length - 1];
  ok('pictures: generating draws into the picture\'s own slot with the card\'s looks', sent && sent.slot === 'a-pCook' && /^1girl, solo, full body, cooking at stove/.test(sent.prompt) && /short hair/.test(sent.characters[0].visuals), sent);

  // ---- event sheet
  txt = strings(X.crEventHomeChoice()(kat(), 'e1'));
  ok('event sheet: the line\'s place in this Scenario, its picture, and Place it', txt.indexOf('In Port') >= 0 && txt.indexOf('Kitchen') >= 0 && txt.indexOf('Cooking') >= 0 && txt.indexOf('Place it in Home') >= 0, txt);
  txt = strings(X.crEventSetChoices()(kat(), 'e1'));
  ok('event sheet: While this is on leaves the Locations to the place above', txt.indexOf('Port  ·  Weather') >= 0 && txt.indexOf('Port  ·  Rooms') < 0, txt);
  await X.crScheduleDelete()(kat(), 'e1');
  ok('event sheet: deleting the line drops its Home parts', !X.crLineHomeOf()(kat()).e1);
  const pn = X.crHomePlace()(kat(), rooms(), 's-port');
  ok('place: with no line on, the nothing-on place and its picture', pn.room === 'vGar' && pn.why === 'idle' && pn.spot.pic === 'pRead', pn);

  // ---- Locations tab
  txt = strings(X.CrLocationsTab()({ scenario: port(), mobile: true }));
  ok('locations: the places, which is the chat\'s, and Add a place', txt.indexOf('Kitchen') >= 0 && txt.indexOf('Garden') >= 0 && txt.indexOf('Add a place') >= 0 && txt.indexOf('the chat\'s') >= 0, txt.slice(0, 500));
  X.crLocOpen()['vKit'] = true;
  txt = strings(X.CrLocationsTab()({ scenario: port(), mobile: true }));
  ok('locations: an open place has its brain, pictures, layers and atmosphere', txt.indexOf('Home picture') >= 0 && txt.indexOf('Stage picture') >= 0 && txt.indexOf('Candles (hidden)') >= 0 && txt.indexOf('Add an atmosphere line') >= 0, txt.slice(0, 900));

  // ---- routines
  const k0 = kat();
  k0.schedule = ALWAYS('e5', 'Working');
  await X.crRoutineSave()(k0);
  ok('routines: the current schedule kept as a routine', X.crSchedPresetsOf()(kat()).length === 1 && X.crSchedPresetsOf()(kat())[0].schedule.Daily[0].text === 'Working');
  kat().schedule = ALWAYS('e6', 'Holiday');
  await X.crRoutineLoad()(kat(), X.crSchedPresetsOf()(kat())[0].id);
  ok('routines: Use swaps it back in, ids and all', X.crScheduleOf()(kat()).Daily[0].id === 'e5' && X.crScheduleOf()(kat()).Daily[0].text === 'Working');
  await X.crRoutineExport()(kat());
  const file = L.rec.saved && JSON.parse(L.rec.saved.c);
  ok('routines: Export writes the schedule with its Home parts and pictures', file && file.kind === 'cr-schedule' && file.schedule.Daily[0].id === 'e5' && Array.isArray(file.pics), file);

  // ---- layers and zoom (1.0.12, 1.0.13)
  X.crHomeUi().look = 'vKit';
  X.crHomeUi().arrange = true;
  await X.crHomeAddLayer()(port(), 'vKit');
  const lk = X.crHomeUi().sel;
  const fl = X.crHomeFindLayer()(lk);
  ok('layers: Add makes a whole-room layer over the people, shown, and selects it', lk.indexOf('L:vKit|') === 0 && fl && fl.layer.fill && fl.layer.above && fl.layer.shown === true);
  const lt = X.crHomeTarget()(lk);
  lt.pos.opacity = 0.4;
  await lt.save();
  ok('layers: stored on the place', (await L.storage.get('scenarioListKey'))[0].cr.sets[0].variants[0].layers[1].opacity === 0.4);
  X.crBridge().bridgeZoom = true;
  const tree = flat(X.CrHomeSurface()({ mobile: true }));
  const boxEl = tree.find((n) => n && n.props && n.props.class === 'cr-home-room');
  ok('zoom: the box is marked for the bridge; Arrange zooms without panning', boxEl && boxEl.props['data-ce-zoom'] === 'zoom' && tree.some((n) => n && n.props && n.props['data-ce-zoom-world'] === '1'));
  txt = tree.filter((x) => typeof x === 'string').join(' | ');
  ok('arrange: a hidden layer is listed as hidden now', txt.indexOf('Candles (hidden now)') >= 0, txt.slice(0, 600));

  // ---- needs and actions (1.0.15, D-124)
  txt = strings(X.CrNeedsSection()({ char: garm() }));
  ok('needs: an empty Contact is offered the usual four', txt.indexOf('Start with Hunger, Energy, Fun and Company') >= 0, txt.slice(0, 300));
  const kitN = X.crNeedsStarter()();
  kitN.actions[0].set = { setId: 'sMood', variantId: 'vRain' };
  await X.crNeedsCommit()(garm(), kitN.needs, kitN.actions);
  const gStored = (await L.storage.get('characterListKey')).find((c) => c.id === 'c-garm').cr;
  ok('needs: stored on the card', gStored.needs.length === 4 && gStored.homeActions.length === 4 && gStored.homeActions[0].set.variantId === 'vRain');
  const hunger = () => X.crNeedsOf()(garm())[0];
  ok('needs: full until the story first sets them', X.crNeedValue()('c-garm', hunger()) === 100);
  X.crNeedsState()['c-garm'] = { hunger: { v: 50, at: X.crClockNow()() - 5 * 3600000 } };
  ok('needs: drain by the hour on the chat clock', Math.round(X.crNeedValue()('c-garm', hunger())) === 20);
  ok('needs: the low ones as one line', X.crNeedsText()(garm()) === 'Garm: Hunger 20/100 — running low.', X.crNeedsText()(garm()));
  ok('needs brain: off unless asked for — the card goes as it is', X.crBrainView()(garm()) === garm());
  await X.crHomeSetNeedsLine()(true);
  let nb = (X.crBrainView()(garm()).brains || []).find((x) => x.name === 'Needs');
  ok('needs brain: on, a low need joins the speaker\'s brains', nb && nb.content === 'Garm: Hunger 20/100 — running low.', nb);
  ok('needs brain: the switch keeps Home on beside it', JSON.stringify(await X.story.get('cr.home')) === '{"on":true,"needsLine":true}');
  ok('needs brain: a Scenario carries none', !(X.crBrainView()(port()).brains || []).some((x) => x.name === 'Needs'));
  X.crHomeUi().arrange = false;
  X.crHomeUi().look = X.crHomePlace()(garm(), rooms(), 's-port').room;
  const careTree = flat(X.CrHomeSurface()({ mobile: true }));
  txt = careTree.filter((x) => typeof x === 'string').join(' | ');
  ok('care: meters, levels and actions on Home', txt.indexOf('Garm  ·  in ') >= 0 && txt.indexOf('Hunger | 20/100') >= 0 && txt.indexOf('Feed') >= 0 && txt.indexOf('Needs go to the chat') >= 0, txt.slice(0, 900));
  ok('care: a low need puts its emotion on a figure with no picture of its own',
    careTree.some((n) => n && n.props && String(n.props['data-ce-img'] || '').indexOf('c-garm|irritated') === 0));
  await X.crHomeDoAction()(garm(), 'feed');
  const lastLog = () => X.crHomeLog()[X.crHomeLog().length - 1];
  ok('action: effects add from where the need stands, logged on the chat clock', Math.round(X.crNeedValue()('c-garm', hunger())) === 60 && lastLog().action === 'Feed' && lastLog().whoId === 'c-garm');
  ok('action: its set pick is chosen for the chat', X.crSetActive().sMood === 'vRain');
  ok('action: needs and the log are the story\'s', Math.round((await X.story.get('cr.needs'))['c-garm'].hunger.v) === 60 && (await X.story.get('cr.homeLog')).items.length === 1);
  await X.crHomeDoAction()(garm(), 'play');
  ok('action: a negative effect takes away', Math.round(X.crNeedValue()('c-garm', X.crNeedsOf()(garm())[1])) === 90);
  X.crHomeUi().__fake();
  const feedId = X.crHomeLog()[0].id;
  await X.crHomeReact()(feedId);
  const msgs = X.crHomeUi().__msgs || [];
  ok('reaction: the action\'s line goes in as one system line before the reply', msgs.length === 4 && msgs[2].role === 'system' && msgs[2].content === '[ Home: Sam brings Garm something to eat. ]', msgs);
  ok('reaction: kept on Home until sent', X.crHomeLog()[0].text.indexOf('Thanks, that hit the spot.') >= 0 && X.crHomeLog()[0].sent === false, X.crHomeLog()[0]);
  await X.crHomeSendReaction()(feedId);
  ok('reaction: Send writes it into the story once', X.crHomeUi().__wrote === X.crHomeLog()[0].text && X.crHomeLog()[0].sent === true);
  // ---- the clock's draft and While you were away (1.0.16, D-125)
  await X.crClockSetMode()('story');
  const t0 = X.crClockNow()();
  X.crClockDraftSet()(t0 + 3 * 3600000);
  X.crClockDraftSet()(X.crClockDraft() + 30 * 60000);
  ok('clock: hand moves build a draft and leave the clock alone', X.crClockNow()() === t0 && X.crClockDraft() === t0 + 210 * 60000);
  txt = strings(X.CrClockPanel()({ mobile: true }));
  ok('clock: the draft shows where it would land, with Set the clock', txt.indexOf('+3h 30m') >= 0 && txt.indexOf('Set the clock') >= 0 && txt.indexOf('Cancel') >= 0, txt.slice(0, 700));
  const awayBefore = X.crHomeLog().filter((x) => x.kind === 'away').length;
  await X.crClockApplyDraft()();
  ok('clock: Set the clock moves it once', X.crClockNow()() === t0 + 210 * 60000 && X.crClockDraft() === 0);
  const note = X.crClockTallyNote();
  ok('clock: the tally says what passed, what each was doing and how needs fell',
    note[0] === '3h 30m passed.' && note.some((l) => l === 'Garm was: Digging.') && note.some((l) => /^Garm's needs: Hunger \d+ → \d+\/100/.test(l)), note);
  const away = X.crHomeLog().filter((x) => x.kind === 'away');
  ok('away: a hand-set gap is logged on Home with its lines', away.length === awayBefore + 1 && away[away.length - 1].from === t0 && away[away.length - 1].lines.length === note.length - 1);
  txt = strings(X.CrHomeAway()());
  ok('away: Home shows the latest gap with Catch up', txt.indexOf('While you were away  ·  3h 30m') >= 0 && txt.indexOf('Garm was: Digging.') >= 0 && txt.indexOf('Catch up') >= 0, txt);
  await X.crHomeReact()(away[away.length - 1].id);
  const am = X.crHomeUi().__msgs;
  ok('away: Catch up frames the gap as one system line in the Contact\'s voice', /^\[ Home: Time passes: 3h 30m, .* Garm was: Digging\. .*Kat tells Sam what happened meanwhile\. \]$/.test(am[2].content), am[2].content);
  X.crClockDraftSet()(X.crClockNow()() - 3600000);
  await X.crClockApplyDraft()();
  ok('clock: going back logs nothing and says needs stay', X.crHomeLog().filter((x) => x.kind === 'away').length === away.length && /went back 1h/.test(X.crClockTallyNote()[0]));
  await X.crClockSetMode()('real');
  await X.story.set('cr.homeSeen', Date.now() - 2 * 3600000);
  await X.crHomeAwayInit()();
  const away2 = X.crHomeLog().filter((x) => x.kind === 'away');
  ok('away: on open in real time, two hours closed is logged, and the visit restamped', away2.length === away.length + 1 && Date.now() - (await X.story.get('cr.homeSeen')) < 5000);
  await X.crHomeAwayInit()();
  ok('away: reopening at once logs nothing more', X.crHomeLog().filter((x) => x.kind === 'away').length === away2.length);
  const sTree = flat(X.CrHomeSurface()({ mobile: true }));
  ok('snapshot: offered on Home', sTree.some((n) => typeof n === 'string' && n === 'Snapshot'));
  const gRoom = X.crHomePlace()(garm(), rooms(), 's-port').room;
  X.crHomeSnapshot()(port(), rooms(), gRoom);
  ok('snapshot: the room and who is in it go to Illustrate', X.crIllus().prompt.indexOf('@Garm: digging') >= 0 && X.crIllus().cast.indexOf('c-garm') >= 0 && X.crUiStore().get().surface === 'illustrator', X.crIllus().prompt);

  txt = strings(X.CrScheduleTab()({ char: garm(), mobile: true }));
  ok('schedule tab: its lines and the needs editor', txt.indexOf('Digging') >= 0 && txt.indexOf('Needs and actions') >= 0 && txt.indexOf('Drops an hour') >= 0, txt.slice(0, 600));

  // ---- sanitizers
  const clean = X.crSanitizeContactExtra()({ lineHome: { e1: { s1: { room: 'vKit', x: 5, y: -1, scale: 0, pic: 'bad id' }, s2: { room: 'no good' } } }, homeIdle: { s1: { room: 'vGar' } },
    pics: [{ id: 'p1', name: 'x' }, { id: 'p1', name: 'dup' }], schedPresets: [{ id: 'r1', name: 'R', schedule: { Daily: [{ id: 'z', startTime: 9999, endTime: 30, text: 't', requiredIntimacy: 'weird' }] } }] });
  ok('data: Home parts clamp, bad rooms and pictures drop, duplicate pictures drop, routines are schedules',
    clean.lineHome.e1.s1.x === 1 && clean.lineHome.e1.s1.y === 0 && clean.lineHome.e1.s1.scale === 0.03 && !clean.lineHome.e1.s1.pic && !clean.lineHome.e1.s2
    && clean.homeIdle.s1.room === 'vGar' && clean.pics.length === 1 && clean.schedPresets[0].schedule.Daily[0].startTime === 1439 && clean.schedPresets[0].schedule.Daily[0].requiredIntimacy === 'none', clean);
  const sc = X.crSanitizeScenarioExtra()({ sets: [{ id: 'sR', name: 'R', rooms: true, variants: [{ id: 'v1', name: 'a', content: '',
    atmos: [{ id: 't1', day: 'Funday', start: -5, end: 3000, text: 'x', on: ['l1', 'bad id'], alt: true }, { id: 'no good' }],
    layers: [{ id: 'l1', shown: false }] }] }] });
  const at = sc.sets[0].variants[0].atmos;
  ok('data: atmosphere lines clamp to the day and keep good layer ids', at.length === 1 && at[0].day === 'Daily' && at[0].start === 0 && at[0].end === 1439 && JSON.stringify(at[0].on) === '["l1"]' && at[0].alt === true && sc.sets[0].variants[0].layers[0].shown === false, at);

  const nd = X.crSanitizeContactExtra()({ needs: [{ id: 'a', name: 'A', max: 5000, decay: -3, low: 9999, lowEmotion: 'tired' }, { id: 'bad id' }, { id: 'b', lowEmotion: 'grumpy' }],
    homeActions: [{ id: 'x', name: 'X', effects: { a: 10, b: 0, 'bad id': 5 }, set: { setId: 's1', variantId: 'no good' } }, { id: 'no good' }] });
  ok('data: needs clamp, bad ids and unknown emotions drop; zero or bad effects and broken set picks drop',
    nd.needs.length === 2 && nd.needs[0].max === 1000 && nd.needs[0].decay === 0 && nd.needs[0].low === 1000 && nd.needs[0].lowEmotion === 'tired' && !nd.needs[1].lowEmotion
    && nd.homeActions.length === 1 && JSON.stringify(nd.homeActions[0].effects) === '{"a":10}' && !nd.homeActions[0].set, nd);

  console.log('\n' + pass + ' passing, ' + fail + ' failing');
  if (fail) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
