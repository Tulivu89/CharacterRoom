// ============================================================================
// cr-imgv5-smoke.js — the image pipeline from CR-IMAGE-PROMPTS v1.2  [CR-IMGV5]
//
// Pins engine 1.0.7 (D-109, D-110): the review's own tests (cr-scene-v2.test.ts, 67 cases;
// cr-img-chunks.test.ts, 26 cases) run inside the whole engine, then the engine's wiring:
// User detection, Generate / Enhance / photo payloads on GLM-4.6 with thinking off, picked people
// always drawn, POV photos draw nobody, slot prompts, emotion defaults, per-model tuning, the
// one-time standard-chunk merge, the bridge flags, and the compact phone Brains rows.
//   CR_ENGINE_FILE=<engine> node cr-imgv5-smoke.js
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
    const names = ['crBridge', 'charList', 'userList', 'scenarioList', 'chatSettings', 'crIllus', 'crIllusBuild',
        'crIllusEnhance', 'crIllusGenerate', 'crIllusShown', 'crChatImgBuildPrompt', 'crDetectCast', 'crAssembleCharacterPrompt',
        'crGenerateSlot', 'crSlotTag', 'crImgFields', 'crImgSettings', 'crCompileImgFields', 'crImgPickModel',
        'CrChatBrainsTab', 'crBrainOpen', 'CR_ARCH_INSTRUCTION', 'CR_ARCH_PHOTO_INSTRUCTION', 'crSanitizeContactExtra',
        'crImgAddStandard', 'CR_IMG_FIELDS_STANDARD', 'crPostsImgAsk'];
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

function vendored(file) {
    let t = fs.readFileSync(require('path').join(__dirname, file), 'utf8');
    const tail = 'console.log(pass + " passed, " + fail + " failed");\nif (fail){ process.exit(1); }';
    if (t.indexOf(tail) < 0) throw new Error(file + ': report tail not found');
    t = t.replace(tail, '__report(' + JSON.stringify(file) + ', pass, fail);');
    return ts.transpileModule(t, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None }, reportDiagnostics: false }).outputText;
}

const SUNNY = { cardType: 'contact', id: 'c1', name: 'Sunny', gender: 'female', species: 'cat girl', appearance: '', emotions: {}, exampleChats: [],
  brains: [{ name: 'Sunny Background', content: 'Grew up by the docks.' }],
  brainsConditional: [{ name: 'Sister', content: 'Sunny has a sister.', keys: ['sister'], requiredIntimacy: 'none' }],
  cr: { img: { universalPrompt: 'girl, cat girl, orange hair, green eyes', basePrompt: 'warm palette',
    outfits: [{ id: 'o1', label: 'casual', prompt: 'white tank top, denim shorts, sneakers', uc: '', active: true }] } } };
const MARCO = { cardType: 'contact', id: 'c2', name: 'Marco', gender: 'male', species: '', emotions: {}, exampleChats: [], brains: [], brainsConditional: [],
  cr: { img: { universalPrompt: 'boy, black hair, stubble', handle: 'man in apron' } } };
const SAM = { cardType: 'user', id: 'u-sam', name: 'Sam', gender: 'male', brains: [], brainsConditional: [],
  cr: { img: { universalPrompt: 'boy, glasses, brown hair' } } };
const PORT = { cardType: 'scenario', id: 's-port', name: 'Port', environment: 'A port town.', brains: [], brainsConditional: [],
  cr: { img: { basePrompt: 'port town, harbour' } } };
const PAIRED = (extra) => Object.assign({ storage: { characterListKey: [SUNNY, MARCO], userListKey: [SAM], scenarioListKey: [PORT] },
    storyStorage: { chatSettingsKey: { char: SUNNY, user: SAM, scenario: PORT, intimacy: 'close', style: 'chat', responseLength: 'unspecified' } },
    bridge: { json: '' } }, extra || {});

(async () => {
  // --- the review's own tests, inside the engine
  for (const file of ['cr-scene-v2.test.ts', 'cr-img-chunks.test.ts']) {
    let got = null;
    await load({ storage: { characterListKey: [], userListKey: [], scenarioListKey: [] }, extra: [vendored(file)],
                 report: (f, p, fl) => { got = { p, fl }; } });
    ok(file + ' runs inside the engine: ' + (got ? got.p + ' passed, ' + got.fl + ' failed' : 'no report'), got && got.fl === 0 && got.p > 20, got);
  }

  // --- cast detection finds the paired User
  let L = await load(PAIRED());
  let X = L.X;
  const found = X.crDetectCast()('Sunny waved at Sam across the deck.');
  ok('detect: the User is in the cast when named', found.map((c) => c.id).join() === 'c1,u-sam', found.map((c) => c.id));

  // --- Generate: @ lines, positions, picked person without a line, flags, scene base kept
  const ill = X.crIllus();
  ill.prompt = 'cowboy shot, indoors, kitchen, night, rating:general. Cat girl at left stirs pot. Sunny laughs.\n@Sunny (left): standing, laughing\n@Marco (right): standing, smile';
  ill.cast = ['c1', 'c2'];
  await X.crIllusGenerate()();
  let sent = L.rec.sent[L.rec.sent.length - 1];
  ok('generate: counts from the @ lines lead the prompt', sent && /^1girl, 1boy, cowboy shot/.test(sent.prompt), sent && sent.prompt);
  ok('generate: no name reaches the image model', sent && sent.prompt.indexOf('Sunny') < 0 && sent.prompt.indexOf('Cat girl laughs') >= 0, sent && sent.prompt);
  ok('generate: each pose sits in its own caption', sent && sent.characters[0].visuals.indexOf('laughing') >= 0 && sent.characters[1].visuals.indexOf('smile') >= 0, sent && sent.characters);
  ok('generate: positions sent when everyone has one', sent && sent.characters[0].center.x === 0.3 && sent.characters[1].center.x === 0.7, sent && sent.characters);
  ok('generate: cowboy shot drops footwear from the card', sent && sent.characters[0].visuals.indexOf('sneakers') < 0, sent && sent.characters[0].visuals);
  ok('generate: scene base and the drawn card base kept, nsfw guard in the negative', sent && /port town/.test(sent.extraBaseVisuals) && /warm palette/.test(sent.extraBaseVisuals) && /nsfw/.test(sent.extraBaseUC), sent);
  ok('generate: settings carry qualityLast and siteParams', sent && sent.settings.qualityLast === true && sent.settings.siteParams === true, sent && sent.settings);
  ill.prompt = 'full body, outdoors, street, day. Cat girl waves.\n@Sunny: standing, waving';
  ill.cast = ['c1', 'c2'];
  await X.crIllusGenerate()();
  sent = L.rec.sent[L.rec.sent.length - 1];
  ok('generate: a picked person with no @ line is still drawn and counted', sent && /^1girl, 1boy/.test(sent.prompt) && sent.characters.length === 2, sent && [sent.prompt, sent.characters.length]);
  ill.prompt = '2girls, night, rain. Two figures argue.';
  await X.crIllusGenerate()();
  sent = L.rec.sent[L.rec.sent.length - 1];
  ok('generate: old text without @ lines goes as written', sent && sent.prompt === '2girls, night, rain. Two figures argue.' && sent.characters.length === 2, sent && sent.prompt);

  // --- Enhance: GLM-4.6, thinking off, one format, cast from the @ lines
  L = await load(PAIRED({ genText: '1girl, upper body, night, rating:general. Cat girl reads by lamp.\n@Sunny: sitting, reading, looking down' }));
  X = L.X;
  X.crIllus().prompt = 'Sunny and Marco, cosy evening';
  X.crIllus().cast = [];
  await X.crIllusEnhance()();
  let g = L.rec.gens[L.rec.gens.length - 1];
  ok('enhance: GLM-4.6 at 0.5 with thinking off', g && g.params.model === 'glm-4-6' && g.params.temperature === 0.5 && g.params.enable_thinking === false, g && g.params);
  ok('enhance: the Scan system prompt, a rough-idea user message with handles', g && g.msgs[0].content === X.CR_ARCH_INSTRUCTION() && /Rough idea/.test(g.msgs[1].content) && /Handle: man in apron/.test(g.msgs[1].content) && /Location: drawn separately/.test(g.msgs[1].content), g && g.msgs[1].content);
  ok('enhance: the box gets the text and the cast becomes the people in view', X.crIllus().prompt.indexOf('@Sunny') >= 0 && X.crIllus().cast.join() === 'c1', X.crIllus().cast);

  // --- photos: photo prompt, sender flagged, no Scenario location; POV draws nobody
  L = await load(PAIRED({ genText: 'upper body, from above, beach, day, sunlight, rating:general. Cat girl holds phone at arm\'s length.\n@Sunny: selfie, holding phone, smile, looking at viewer' }));
  X = L.X;
  let ph = await X.crChatImgBuildPrompt()('Me at the beach with Sam', SUNNY);
  g = L.rec.gens[L.rec.gens.length - 1];
  ok('photo: photo Architect, sender marked as the one who took it', g && g.msgs[0].content === X.CR_ARCH_PHOTO_INSTRUCTION() && /Sunny: girl\. Handle: cat girl\. Took the photo\./.test(g.msgs[1].content) && /Location: none given\./.test(g.msgs[1].content), g && g.msgs[1].content);
  ok('photo: the User named in the description is listed too', g && /- Sam: boy/.test(g.msgs[1].content), g && g.msgs[1].content);
  ok('photo: selfie draws only the sender, solo', ph && /^1girl, solo, upper body/.test(ph.prompt) && ph.characters.length === 1, ph);
  ok('photo: the Scenario location is left out', ph && ph.base.indexOf('port town') < 0 && /warm palette/.test(ph.base), ph && ph.base);
  L = await load(PAIRED({ genText: 'pov, pov hands, holding food, ice cream, beach, day, rating:general. Pov hands hold ice cream cone toward sea.' }));
  X = L.X;
  ph = await X.crChatImgBuildPrompt()('My ice cream', SUNNY);
  ok('photo: a POV with no @ lines draws nobody', ph && ph.characters.length === 0 && /^pov, pov hands/.test(ph.prompt), ph);

  // --- slots and emotion tags
  L = await load(PAIRED());
  X = L.X;
  ok('slot: built-in emotion tags stand in for the bare name', X.crSlotTag()(MARCO, 'playful') === ':p, one eye closed, looking at viewer');
  await X.crGenerateSlot()(SUNNY, 'happy');
  sent = L.rec.sent[L.rec.sent.length - 1];
  ok('slot: count, solo, one framing tag, then the emotion', sent && sent.prompt === '1girl, solo, upper body, happy, smile, looking at viewer', sent && sent.prompt);
  await X.crGenerateSlot()(MARCO, 'Avatar');
  sent = L.rec.sent[L.rec.sent.length - 1];
  ok('slot: the avatar looks at the viewer', sent && sent.prompt === '1boy, solo, upper body, looking at viewer', sent && sent.prompt);

  // --- per-model tuning and chunks
  await X.crImgPickModel()('nai-diffusion-5-full');
  ok('model: switching to V5 offers guidance 4.5 and 23 steps', X.crImgSettings().scale === 4.5 && X.crImgSettings().steps === 23, X.crImgSettings());
  X.crImgSettings().scale = 3.5;
  await X.crImgPickModel()('nai-diffusion-5-curated');
  ok('model: within a family the tuning is left alone', X.crImgSettings().scale === 3.5);
  ok('chunks: a new install gets the standard set, V5 quality tags at the end', X.crCompileImgFields()().quality === 'very aesthetic, masterpiece, no text', X.crCompileImgFields()());
  await X.crImgAddStandard()();
  ok('chunks: Add standard chunks with all present adds none', X.crImgFields().length === X.CR_IMG_FIELDS_STANDARD().length);

  const LEGACY = [{ id: 'cr-base', label: 'Base quality', basePrompt: 'best quality, very aesthetic, absurdres',
    uc: 'lowres, worst quality, bad anatomy, bad hands, jpeg artifacts, watermark, signature', weight: 1, active: true }];
  L = await load(PAIRED({ storage: { characterListKey: [], userListKey: [], scenarioListKey: [], crImgFieldsKey: LEGACY } }));
  ok('merge: an existing install gains the standard chunks once, old default off', L.X.crImgFields().length === 16 && L.X.crImgFields()[0].active === false && (await L.storage.get('cr.imgStdMerged')) === true, L.X.crImgFields().length);
  L = await load(PAIRED({ storage: { characterListKey: [], userListKey: [], scenarioListKey: [], crImgFieldsKey: LEGACY, 'cr.imgStdMerged': true } }));
  ok('merge: never runs twice', L.X.crImgFields().length === 1 && L.X.crImgFields()[0].active === true);

  // --- handle survives the sanitizer
  const ex = L.X.crSanitizeContactExtra()({ img: { handle: 'fox girl', universalPrompt: 'girl' } });
  ok('handle: kept on the image card', ex && ex.img && ex.img.handle === 'fox girl', ex);

  // --- the post photo ask says who is in it first
  L = await load(PAIRED({ storyText: 'Sunset from the pier.' }));
  await L.X.crPostsImgAsk()(SUNNY, { originalPost: { title: 'Pier', content: 'Nice evening.' } });
  g = L.rec.gens[L.rec.gens.length - 1];
  ok('posts: the photo ask asks whether they are in it', g && JSON.stringify(g.msgs).indexOf('Say first whether you are in it.') >= 0);

  // --- Brains tab on a phone: one line per brain, text on tap
  L = await load(PAIRED());
  X = L.X;
  let strs = flat(X.CrChatBrainsTab()({ mobile: true })).filter((x) => typeof x === 'string').join(' | ');
  ok('brains (phone): no text preview until tapped', strs.indexOf('Grew up by the docks.') < 0 && strs.indexOf('Sunny Background') >= 0, strs.slice(0, 400));
  ok('brains (phone): a conditional row hides its Auto/Always/Off until tapped', strs.indexOf('| Auto |') < 0, strs.slice(0, 600));
  X.crBrainOpen()['c1|b:0'] = true;
  X.crBrainOpen()['c1|c:0'] = true;
  strs = flat(X.CrChatBrainsTab()({ mobile: true })).filter((x) => typeof x === 'string').join(' | ');
  ok('brains (phone): tapping opens the text and the choices', strs.indexOf('Grew up by the docks.') >= 0 && strs.indexOf('Sunny has a sister.') >= 0 && strs.indexOf('| Auto | Always | Off') >= 0, strs.slice(0, 600));
  strs = flat(X.CrChatBrainsTab()({ mobile: false })).filter((x) => typeof x === 'string').join(' | ');
  ok('brains (desktop): text shown as before', strs.indexOf('Grew up by the docks.') >= 0);

  console.log('\n' + pass + ' passing, ' + fail + ' failing');
  if (fail) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
