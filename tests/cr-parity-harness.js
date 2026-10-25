'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ts = require((function(){ try { return require.resolve('typescript'); } catch (e) { return '/home/claude/.npm-global/lib/node_modules/typescript'; } })());

function makeRng(seed) {
    let a = (seed >>> 0) || 1;
    const calls = [];
    function next() {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    return {
        calls,
        int(min, max) {
            const v = min + Math.floor(next() * (max - min + 1));
            calls.push([min, max, v]);
            return v;
        },
        bool(p) { const v = next() < (p == null ? 0.5 : p); calls.push(['bool', p, v]); return v; }
    };
}

function fakeEncode(text) {
    const n = text ? Math.max(1, Math.ceil(String(text).length / 4)) : 0;
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = i;
    return Promise.resolve(out);
}

function makeDateClass(clock) {
    const Real = Date;
    class FakeDate extends Real {
        constructor(...args) { if (args.length === 0) super(clock.now); else super(...args); }
        static now() { return clock.now; }
    }
    return FakeDate;
}

function makeStub(label) {
    const fn = function() { return Promise.resolve(stub); };
    const stub = new Proxy(fn, {
        get(t, k) {
            if (k === 'then') return undefined;
            if (k === Symbol.toPrimitive) return () => '[stub ' + label + ']';
            if (k === 'length') return 0;
            return makeStub(label + '.' + String(k));
        },
        apply() { return Promise.resolve(makeStub(label + '()')); }
    });
    return stub;
}

function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

function makeStore(initial) {
    const m = new Map(Object.entries(clone(initial || {})));
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

function makeApi(env) {
    const hooks = {};
    const logs = [];
    const clock = { now: env.now };
    const state = { rng: makeRng(env.seed || 1), sections: env.sections || [], saves: [] };
    const storage = makeStore(env.storage);
    const storyStorage = makeStore(env.storyStorage);
    const tempStorage = makeStore({});
    const historyStorage = makeStore({});
    const wrapSet = (store, scope) => {
        const orig = store.set;
        store.set = async (k, v) => { state.saves.push([scope, k, clone(v)]); return orig(k, v); };
    };
    wrapSet(storage, 'storage'); wrapSet(storyStorage, 'story');
    let uuidN = 0;
    const v1 = {
        hooks: { register: (name, cb) => { hooks[name] = cb; } },
        storage, storyStorage, tempStorage, historyStorage,
        random: { int: (a, b) => state.rng.int(a, b), bool: (p) => state.rng.bool(p) },
        tokenizer: { encode: (t) => fakeEncode(t), decode: async () => '' },
        maxTokens: async () => env.maxTokens,
        rolloverTokens: async () => env.rolloverTokens,
        systemPrompt: { get: async () => env.systemPrompt },
        document: { scan: async () => clone(state.sections) },
        permissions: { request: async () => true },
        config: { get: async () => true },
        uuid: () => 'uuid-' + (++uuidN),
        log: (...a) => logs.push(a.map(String).join(' ')),
        error: (...a) => logs.push('ERR ' + a.map(String).join(' ')),
        script: { name: 'harness', id: 'harness' },
        ui: makeStub('ui'),
        editor: {
            decorations: {
                getWidgets: async () => [], getMarkers: async () => [],
                createWidget: async () => ({ dispose() {} }), createWidgets: async (l) => (l || []).map(() => ({ dispose() {} })),
                createMarker: () => ({ dispose() {} }), createMarkers: async () => [],
                clearWidgets: () => {}, clearMarkers: () => {},
                registerRules: async () => {}, removeRules: () => {}, updateRules: async () => {}
            },
            generate: async () => {}
        },
        file: makeStub('file'),
        messaging: makeStub('messaging'),
        generate: makeStub('generate'),
        generateWithStory: makeStub('generateWithStory'),
        generationParameters: makeStub('generationParameters')
    };
    return { api: { v1 }, hooks, logs, clock, state, stores: { storage, storyStorage } };
}

function transpile(src, file) {
    const out = ts.transpileModule(src, {
        fileName: file.replace(/\.[a-z]+$/, '') + '.tsx',
        compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.None,
            jsx: ts.JsxEmit.React,
            jsxFactory: 'h',
            jsxFragmentFactory: 'Fragment',
            removeComments: false
        },
        reportDiagnostics: false
    });
    return out.outputText;
}

async function loadScript(file, env, exportNames) {
    const src = fs.readFileSync(file, 'utf8');
    const js = transpile(src, file);
    const rt = makeApi(env);
    const Fake = makeDateClass(rt.clock);
    const ctx = vm.createContext({
        api: rt.api, Date: Fake, Math, JSON, console, Promise, Set, Map, Object, Array, String,
        Number, Boolean, RegExp, Error, TypeError, Symbol, parseInt, parseFloat, isNaN,
        h: () => null, Fragment: null, useRef: () => ({}), useState: (v) => [v, () => {}],
        useEffect: () => {}, useMemo: (f) => f(), useCallback: (f) => f,
        render: () => {}, createContext: (v) => ({ _v: v }), createPortal: () => null,
        useReducer: (r, i) => [i, () => {}], useLayoutEffect: () => {},
        useContext: (c) => (c && c._v), useSyncExternalStore: (sub, get) => get(),
        createStore: (initial) => {
            let value = initial;
            return { get: () => value, set: (v) => { value = v; }, subscribe: () => (() => {}) };
        },
        useStore: (st) => [st.get(), st.set], useStoreValue: (st) => st.get(),
        useSetStore: (st) => st.set,
        setTimeout, clearTimeout
    });
    const exp = (exportNames || []).map((n) => `${JSON.stringify(n)}: () => (typeof ${n} !== 'undefined' ? ${n} : undefined)`).join(',');
    const wrapped = `(async () => {\n${js}\n;return {${exp}};\n})()`;
    const exported = await vm.runInContext(wrapped, ctx, { filename: file });
    return { rt, ctx, exported };
}

const FIXTURES = (function() {
const NOW = Date.UTC(2026, 8, 11, 15, 30);
const HOUR = 3600 * 1000;
const SYS = 'NAI-XIALONG-SYSTEM-PROMPT';
const DAYS = ['Daily', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function schedule(over) {
    const s = {};
    for (const d of DAYS) s[d] = [];
    return Object.assign(s, over || {});
}

function mira(over) {
    return Object.assign({
        cardType: 'contact', format: 'AnotherRoom @ Triplis @ 1.0.2', id: 'c-mira', author: 'anon',
        name: 'Mira', alias: '', description: 'not in prompt', species: 'Human', gender: 'female',
        pronouns: 'she/her', persona: '  Wry, quick, loyal.\nHates being called {{char}}ie by $user.  ',
        appearance: 'Short silver hair.\nA scar over one brow.', greeting: 'Hey.', greetingEmotion: 'happy',
        defaultIntimacy: 'close', defaultStyle: 'chat', cjk: false, tags: ' slice of life, drama ',
        avatar: '', emotions: {},
        exampleChats: [
            { name: 'Ex1', style: 'chat', userName: 'Sam', messages: [
                { isContact: false, text: 'hi', emotion: 'neutral' },
                { isContact: true, text: "Oh. It's you.\nAgain.", emotion: 'smug' },
                { isContact: true, text: 'Kidding.', emotion: '' }
            ] },
            { name: 'Ex2', style: 'roleplay', userName: '{{user}}', messages: [
                { isContact: true, text: '*waves*', emotion: 'happy' }
            ] }
        ],
        brains: [{ name: 'Mira Background', content: '  Grew up by the docks. Today is {{date}} {{time}} ({{time24}}); $c knows. ' }],
        brainsConditional: [
            { name: 'Sister', content: '{{char}} has a sister, Ana, who calls $contact "Mimi".', keys: ['sister', 'little   sister'], requiredIntimacy: 'none' },
            { name: 'Water', content: 'Mira cannot swim.', keys: ['swim'], requiredIntimacy: 'romantic' },
            { name: 'Lighthouse', content: 'The old lighthouse is where she goes to think.', keys: ['old lighthouse'], requiredIntimacy: 'close' }
        ],
        schedule: schedule({
            Daily: [{ id: 'd1', startTime: 1380, endTime: 120, text: 'Asleep. {{char}} snores.', requiredIntimacy: 'none' }],
            Friday: [
                { id: 'f1', startTime: 900, endTime: 960, text: 'Coffee with {{user}} at 3.', requiredIntimacy: 'none' },
                { id: 'f2', startTime: 930, endTime: 990, text: 'A private call.', requiredIntimacy: 'romantic' },
                { id: 'f3', startTime: 600, endTime: 700, text: 'Morning shift.', requiredIntimacy: 'none' }
            ],
            Saturday: [{ id: 's1', startTime: 0, endTime: 60, text: 'Night walk.', requiredIntimacy: 'none' }]
        })
    }, over || {});
}

function sam(over) {
    return Object.assign({
        cardType: 'user', format: 'x', id: 'u-sam', author: 'anon', name: 'Sam', description: '',
        species: '', gender: 'male', pronouns: 'he/him', persona: 'Curious.\nKind.', appearance: '', tags: 'student',
        brains: [{ name: 'Sam Notes', content: 'Likes tea.' }], brainsConditional: []
    }, over || {});
}

function cafe(over) {
    return Object.assign({
        cardType: 'scenario', format: 'x', id: 's-cafe', author: 'anon', name: 'Cafe', description: '',
        environment: 'A small cafe.\nRain on the glass.', scene: 'Late afternoon.', tags: 'cozy, rain ,cozy',
        brains: [{ name: 'Cafe Rules', content: 'No phones at the counter.' }], brainsConditional: []
    }, over || {});
}

const CID = 'c-mira' + 'u-sam';

function chat(over) {
    return Object.assign({ char: mira(), user: sam(), intimacy: 'close', style: 'chat', responseLength: 'unspecified' }, over || {});
}

function base(over) {
    const fx = {
        now: NOW, systemPrompt: SYS, maxTokens: 8192, rolloverTokens: 1024,
        storage: { includeGameStatsKey: false, useEmotionalModesKey: false, gameRecordKey: { RPS: {}, NumberGuess: {} } },
        storyStorage: { chatSettingsKey: chat(), trackRealTimeKey: false, trackRealTimeRecordKey: {} },
        steps: []
    };
    return Object.assign(fx, over || {});
}

const U = (t) => ({ role: 'user', content: t });
const A = (t, e) => ({ role: 'assistant', content: 'Mira: ' + t + '\n  Emotion: ' + (e || 'neutral') + '\n' });
const SLOT = { role: 'assistant', content: '' };

function msgs(turns, opts) {
    opts = opts || {};
    const out = [{ role: 'system', content: SYS }];
    for (const l of opts.lore || []) out.push({ role: 'system', content: l });
    for (const t of turns) out.push(t);
    if (opts.slot !== false) out.push(SLOT);
    return out;
}

const CHAT4 = [U('Hey Mira.'), A('Hey yourself.', 'happy'), U('Rough day?\nYou look tired.'), A('Always.', 'tired')];

function history(n, len) {
    const out = [];
    for (let i = 0; i < n; i++) {
        out.push(U('Message ' + i + ' ' + 'x'.repeat(len)));
        out.push(A('Reply ' + i + ' ' + 'y'.repeat(len), i % 2 ? 'happy' : 'thinking'));
    }
    return out;
}

function sections(emotions) {
    return emotions.map((e, i) => ({ sectionId: i + 1, section: { text: e ? 'Mira: line ' + i + '\n  Emotion: ' + e : 'Sam: hello', source: 'user' } }));
}

const built = (m, extra) => Object.assign({ hook: 'built', model: 'xialong-v1', messages: m }, extra || {});
const genEnd = (extra) => Object.assign({ hook: 'genEnd', model: 'xialong-v1' }, extra || {});
const before = (text, extra) => Object.assign({ hook: 'before', model: 'xialong-v1', storyText: text }, extra || {});

const plan = (o) => Object.assign({ name: 'P', content: 'x', startedAtCount: 0, totalTurns: 3, remainingTurns: 3, running: false, planType: 'AI', durationType: 'Limited' }, o);

function has(o, i, needle) { return JSON.stringify(o[i].ret || '').indexOf(needle) >= 0; }

return [
    Object.assign(base(), {
        name: 'basic-chat', covers: ['system-prompt', 'example-quotes', 'brains-card', 'macros', 'style'],
        steps: [built(msgs(CHAT4))],
        expect: (o) => (has(o, 0, 'Example quotes') && has(o, 0, 'Opinion') === false && has(o, 0, 'Relationship: close') ? [] : ['prompt shape not exercised'])
    }),
    Object.assign(base({ storyStorage: { chatSettingsKey: chat({ intimacy: 'stranger', scenario: cafe(), tags: 'rain, noir' }), trackRealTimeKey: false, trackRealTimeRecordKey: {} } }), {
        name: 'stranger-scenario-tags', covers: ['stranger', 'scenario', 'tags-merge'],
        steps: [built(msgs(CHAT4))],
        expect: (o) => (has(o, 0, "Doesn't know Sam") && has(o, 0, 'Tags: cozy, rain, noir') ? [] : ['stranger/tags not exercised'])
    }),
    Object.assign(base({ storyStorage: { chatSettingsKey: chat({ char: mira({ cjk: true }), responseLength: 'long', style: 'roleplay, novel style' }), trackRealTimeKey: false, trackRealTimeRecordKey: {} } }), {
        name: 'cjk-length', covers: ['cjk', 'response-length'],
        steps: [built(msgs(CHAT4))],
        expect: (o) => (has(o, 0, 'Response length: long; CJK ]') ? [] : ['cjk/length not exercised'])
    }),
    Object.assign(base(), {
        name: 'greeting', covers: ['greeting'],
        steps: [built(msgs([])), built(msgs([], { slot: false }))],
        expect: (o) => (has(o, 0, ', greeting ]') ? [] : ['greeting not exercised'])
    }),
    Object.assign(base(), {
        name: 'filters', covers: ['write-continue-filter', 'asterisk-trim', 'sysprompt-drop', 'user-prefix', 'brain-messages'],
        steps: [built(msgs([U('Sam: already prefixed'), A('ok'), U('Write.'), { role: 'assistant', content: 'Mira: scene\n***\n' },
            U('two\nlines'), U('Continue.'), { role: 'system', content: '----\nLore Entry\nThe docks.' }, { role: 'system', content: 'other system' }]))],
        expect: (o) => (has(o, 0, 'Sam: two\\n    lines') ? [] : ['filters not exercised'])
    }),
    Object.assign(base({ storage: { includeGameStatsKey: true, useEmotionalModesKey: false, gameRecordKey: {
        RPS: { [CID]: { kind: 'competitive', displayLabel: 'Rock Paper Scissors', charWins: 2, charLosses: 1, userWins: 1, userLosses: 2, ties: 3 } },
        NumberGuess: { [CID]: { kind: 'cooperative', displayLabel: 'Number Guess', sharedWins: [5, 3] } } } } }), {
        name: 'game-stats', covers: ['game-stats'],
        steps: [built(msgs(CHAT4))],
        expect: (o) => (has(o, 0, 'Game History') ? [] : ['game stats not exercised'])
    }),
    Object.assign(base({ storage: { includeGameStatsKey: true, useEmotionalModesKey: false, gameRecordKey: {
        RPS: { [CID]: { displayLabel: 'RPS legacy', charWins: 0, charLosses: 0, userWins: 4, userLosses: 0, ties: 0 } }, NumberGuess: {} } } }), {
        name: 'game-stats-legacy', covers: ['game-stats-legacy'],
        steps: [built(msgs(CHAT4))]
    }),
    Object.assign(base(), {
        name: 'wrong-model', covers: ['model-gate'],
        steps: [built(msgs(CHAT4), { model: 'glm-4-6' }), before('sister', { model: 'glm-4-6' })]
    }),
    Object.assign(base({ storyStorage: { chatSettingsKey: { intimacy: 'close', style: 'chat', responseLength: 'unspecified', user: sam() }, trackRealTimeKey: false, trackRealTimeRecordKey: {} } }), {
        name: 'no-contact', covers: ['pairing-gate'],
        steps: [built(msgs(CHAT4)), before('sister')]
    }),
    Object.assign(base({ maxTokens: 3200, rolloverTokens: 600 }), {
        name: 'rollover', covers: ['trim-initial', 'trim-hard', 'prefix-valid', 'prefix-invalid', 'rollover-release'],
        steps: (function() {
            const h = history(24, 160);
            const h2 = h.concat([U('more ' + 'z'.repeat(160)), A('ok ' + 'w'.repeat(160))]);
            const h3 = h2.slice(); h3[0] = U('EDITED early message');
            return [
                built(msgs(h)),
                genEnd(),
                built(msgs(h2)),
                built(msgs(h2.concat(history(6, 160)))),
                built(msgs(h3)),
                built(msgs(h3.slice(0, 33))),
                built(msgs(CHAT4))
            ];
        })(),
        expect: (o) => {
            const p = [];
            if (!(o[0].roll.startIndex > 0 && o[0].roll.trimmed)) p.push('initial trim not exercised');
            if (!(o[2].roll.startIndex > o[0].roll.startIndex)) p.push('continuation not exercised');
            if (!(o[3].roll.startIndex > o[2].roll.startIndex)) p.push('hard trim not exercised');
            return p;
        }
    }),
    Object.assign(base({ maxTokens: 3200, rolloverTokens: 600 }), {
        name: 'rollover-no-initial', covers: ['trim-soft-only-after-first-gen'],
        steps: (function() {
            const small = history(2, 40);
            const mid = history(14, 160);
            return [built(msgs(small)), genEnd(), built(msgs(mid)), built(msgs(mid.concat(history(10, 160))))];
        })()
    }),
    Object.assign(base({ storyStorage: { chatSettingsKey: chat(), trackRealTimeKey: true, trackRealTimeRecordKey: { [CID]: NOW - 5 * HOUR - 60000 } } }), {
        name: 'time-apart-schedule', covers: ['time-apart', 'schedule', 'schedule-intimacy-gate', 'genEnd-stamp'],
        steps: [built(msgs(CHAT4)), genEnd(), built(msgs(CHAT4), { now: NOW + 90 * 60000 }), built(msgs(CHAT4), { now: NOW + 30 * 60000 })],
        expect: (o) => (has(o, 0, 'Time Apart') && has(o, 0, 'Coffee with Sam') && !has(o, 0, 'private call') ? [] : ['time/schedule not exercised'])
    }),
    Object.assign(base({ storyStorage: { chatSettingsKey: chat({ intimacy: 'romantic' }), trackRealTimeKey: true, trackRealTimeRecordKey: {} } }), {
        name: 'schedule-romantic-midnight', covers: ['schedule-wrap', 'schedule-daily'],
        steps: [built(msgs(CHAT4)), built(msgs(CHAT4), { now: Date.UTC(2026, 8, 12, 0, 30) }), built(msgs(CHAT4), { now: Date.UTC(2026, 8, 12, 5, 0) })],
        expect: (o) => (has(o, 0, 'A private call') && has(o, 1, 'Asleep') && has(o, 1, 'Night walk') ? [] : ['romantic/midnight not exercised'])
    }),
    Object.assign(base(), {
        name: 'schedule-off-without-track', covers: ['schedule-gated-by-track'],
        steps: [built(msgs(CHAT4))],
        expect: (o) => (!has(o, 0, 'Current Events') ? [] : ['schedule leaked without Track Real Time'])
    }),
    Object.assign(base({ storage: { includeGameStatsKey: false, useEmotionalModesKey: true, gameRecordKey: { RPS: {}, NumberGuess: {} } } }), {
        name: 'modes-from-emotions', covers: ['modes-multi', 'modes-single', 'modes-none', 'modes-empty-doc'],
        steps: [
            built(msgs(CHAT4), { sections: sections(['happy', null, 'angry', 'hurt', 'irritated']), seed: 7 }),
            built(msgs(CHAT4), { sections: sections(['bored', 'bored', 'bored']), seed: 3 }),
            built(msgs(CHAT4), { sections: sections(['happy', 'sad', 'tired']), seed: 3 }),
            built(msgs(CHAT4), { sections: [], seed: 3 }),
            built(msgs(CHAT4), { sections: sections(['love', 'love']), seed: 11 })
        ],
        expect: (o) => (has(o, 0, "Mira's Mood") && o[0].rng.length === 1 && has(o, 1, 'Vulnerable') && !has(o, 2, 'Mood') ? [] : ['modes not exercised'])
    }),
    Object.assign(base({ storage: { includeGameStatsKey: false, useEmotionalModesKey: true, gameRecordKey: { RPS: {}, NumberGuess: {} } },
        storyStorage: { chatSettingsKey: chat(), trackRealTimeKey: true, trackRealTimeRecordKey: { [CID]: NOW - 3 * HOUR } } }), {
        name: 'modes-time-away', covers: ['modes-away'],
        steps: [built(msgs(CHAT4), { seed: 5, sections: sections(['bored', 'bored', 'bored']) }), built(msgs(CHAT4), { seed: 9 })],
        expect: (o) => (has(o, 0, 'While away from the chat') ? [] : ['time-away mode not exercised'])
    }),
    Object.assign(base({ storyStorage: { chatSettingsKey: chat(), trackRealTimeKey: false, trackRealTimeRecordKey: {}, actionPlansRecordKey: { [CID]: [
        plan({ name: 'Tease', content: 'Plan to tease {{user}} about the rain.' }),
        plan({ name: 'Curious', content: 'Stay curious about Sam.', durationType: 'Ongoing' }),
        plan({ name: 'UserAsk', content: 'Sam wants Mira to open up.', planType: 'User', totalTurns: 2, remainingTurns: 2 }),
        plan({ name: 'Blank', content: '' })
    ] } } }), {
        name: 'plans-lifecycle', covers: ['plans-dryrun', 'plans-think', 'plans-countdown', 'plans-expire', 'plans-user', 'plans-ongoing'],
        steps: (function() {
            const t = (n) => { const h = []; for (let i = 0; i < n; i++) { h.push(U('u' + i)); h.push(A('a' + i)); } return h; };
            return [
                built(msgs(t(2)), { dryRun: true, seed: 1 }),
                built(msgs(t(2)), { seed: 1 }),
                built(msgs(t(3)), { seed: 2 }),
                built(msgs(t(4)), { seed: 2 }),
                built(msgs(t(6)), { seed: 4 }),
                built(msgs(t(8)), { seed: 4 }),
                built(msgs(t(9)), { seed: 6 })
            ];
        })(),
        expect: (o) => (has(o, 1, '<think>') && o[1].saves.length > 0 && o[0].saves.length === 0 ? [] : ['plans not exercised'])
    }),
    Object.assign(base({ storyStorage: { chatSettingsKey: chat(), trackRealTimeKey: false, trackRealTimeRecordKey: {}, actionPlansRecordKey: { [CID]: [
        plan({ name: 'Started', content: 'Already running.', running: true, startedAtCount: 5 }) ] } } }), {
        name: 'plans-history-deleted', covers: ['plans-rewind-delete'],
        steps: [built(msgs([U('only one'), A('ok')]), { seed: 1 })]
    }),
    Object.assign(base({ storyStorage: { chatSettingsKey: chat(), trackRealTimeKey: false, trackRealTimeRecordKey: {}, actionPlansRecordKey: { [CID]: [
        plan({ name: 'Orphan', content: 'Plan with nowhere to go.' }) ] } } }), {
        name: 'plans-no-assistant', covers: ['plans-throw-without-assistant'],
        steps: [built(msgs([U('hello')], { slot: false }), { seed: 1 })],
        expect: (o) => (o[0].err ? [] : ['expected AR to throw here'])
    }),
    Object.assign(base({ storyStorage: { chatSettingsKey: chat({ intimacy: 'romantic', char: mira({ schedule: schedule({
            Friday: [
                { id: 'f1', startTime: 900, endTime: 960, text: 'Coffee with {{user}} at 3.', requiredIntimacy: 'none' },
                { id: 'f4', startTime: 900, endTime: 960, text: 'Watching the boats.', requiredIntimacy: 'close' }
            ] }) }) }), trackRealTimeKey: true, trackRealTimeRecordKey: {} } }), {
        // CR D-126 (engine 1.0.17): a relationship level reaches everything gated at or below it. AR gates on an exact
        // match, so the built script deliberately differs here: the kernel still matches AR, and the product is held
        // to productExpect instead of the oracle on the steps in productDiverges.
        name: 'ladder-reaches-lower', covers: ['ladder-brains', 'ladder-schedule'],
        steps: [before('The old lighthouse again.'), built(msgs(CHAT4))],
        productDiverges: [0, 1],
        expect: (o) => (!has(o, 0, 'Lighthouse') && !has(o, 1, 'Watching the boats') && has(o, 1, 'Coffee with Sam') ? [] : ['AR should gate on an exact match here']),
        productExpect: (p) => (has(p, 0, 'Lighthouse') && has(p, 1, 'Watching the boats') && has(p, 1, 'Coffee with Sam') && !has(p, 1, 'A private call') ? [] : ['the ladder was not applied'])
    }),
    Object.assign(base({ storyStorage: {
        chatSettingsKey: chat(), trackRealTimeKey: false, trackRealTimeRecordKey: {},
        floatyBrainsKey: [
            { id: 'f1', active: true, entry: { name: 'Docks', content: 'The docks smell of tar. {{user}} loves them.' } },
            { id: 'f2', active: false, entry: { name: 'Off', content: 'Inactive but still passed through.' } },
            { id: 'f3', active: true, entry: { name: '', content: 'nameless, skipped' } }
        ],
        rememberMeKey: { [CID]: [{ id: 'j1', text: '{{user}} takes tea with honey.' }, { id: 'j2', text: '' }, { id: 'j3', text: 'Sam is afraid of $c.' }] },
        diaryBrainsRecordKey: { [CID]: [
            { name: 'Diary: Storm', content: 'The storm scared me.', keys: ['storm'] },
            { name: 'Diary: Far', content: 'Never matched.', keys: ['zebra'] }
        ] },
        emotionalMemoryRecordKey: { [CID]: [{ name: 'Memory: Tea', content: 'Warm.', keys: ['honey tea'] }] }
    } }), {
        name: 'brains-before', covers: ['floaty', 'jots', 'diary-keys', 'process-keys', 'conditional-keys', 'phrase-keys', 'punctuation', 'intimacy-gate-brains', 'lookback'],
        steps: [
            before('Sam said: "Your little sister... is she okay after the storm?" We had honey tea. Old lighthouse? No. old lighthouse!'),
            before('zebra ' + 'filler '.repeat(1200) + 'sister'),
            before('Can you swim? The old lighthouse, honey tea.')
        ],
        expect: (o) => (has(o, 0, 'Diary: Storm') && has(o, 0, 'Memory: Tea') && has(o, 0, 'Sister') && has(o, 0, 'Facts About Sam') && !has(o, 1, 'Never matched') && !has(o, 2, 'Water') ? [] : ['brains not exercised'])
    })
];
})();

const AR_FILE = process.env.CR_AR_FILE || '/mnt/project/AnotherRoom_v1_1_5.naiscript';
function extractKernel(engineFile) {
    const fs = require('fs');
    const L = fs.readFileSync(engineFile, 'utf8').split('\n');
    const k = L.findIndex((l) => l.startsWith('// SECTION K — CHARACTERROOM KERNEL'));
    if (k < 1) throw new Error('SECTION K header not found in ' + engineFile);
    let e = L.findIndex((l, i) => i > k && /^\/\/ SECTION [A-Z]/.test(l));
    if (e < 0) throw new Error('no section after SECTION K');
    const body = L.slice(k - 1, e - 1).join('\n');
    const out = require('os').tmpdir() + '/cr-kernel-extracted.ts';
    fs.writeFileSync(out, body);
    return out;
}
const ENGINE_FILE = process.env.CR_ENGINE_FILE || '';
const KERNEL_FILE = ENGINE_FILE ? extractKernel(ENGINE_FILE) : (process.env.CR_KERNEL_FILE || 'cr-kernel.ts');
const PRODUCT_FILE = ENGINE_FILE || process.env.CR_PRODUCT_FILE || '';
const PRODUCT_EXPORTS = ['actionPlansRecord', 'crRoll', 'trackRealTimeRecord'];

const K_EXPORTS = ['crkBuildSystemPrompt', 'crkBrainEntries', 'crkContextBuilt', 'crkRollDefault',
    'crkRecentEmotionsFromSections'];
const AR_EXPORTS = ['actionPlansRecord', 'rolloverState', 'checkInitialTrim', 'trimmed', 'trackRealTimeRecord'];

function envOf(fx) {
    return {
        now: fx.now, seed: 1, sections: [], systemPrompt: fx.systemPrompt,
        maxTokens: fx.maxTokens, rolloverTokens: fx.rolloverTokens,
        storage: fx.storage, storyStorage: fx.storyStorage
    };
}

async function runOracle(fx, file, product) {
    const { rt, exported } = await loadScript(file || AR_FILE, envOf(fx), product ? PRODUCT_EXPORTS : AR_EXPORTS);
    const out = [];
    for (const st of fx.steps) {
        rt.clock.now = st.now != null ? st.now : fx.now;
        rt.state.rng = makeRng(st.seed || 1);
        rt.state.sections = st.sections || [];
        rt.state.saves = [];
        let ret, err = null;
        try {
            if (st.hook === 'before') {
                ret = await rt.hooks.onBeforeContextBuild({ model: st.model, storyText: { content: st.storyText || '' } });
            } else if (st.hook === 'built') {
                ret = await rt.hooks.onContextBuilt({ messages: clone(st.messages), model: st.model, dryRun: !!st.dryRun });
            } else if (st.hook === 'genEnd') {
                ret = await rt.hooks.onGenerationEnd({ model: st.model });
            }
        } catch (e) { err = String(e && e.message || e); }
        const rs = product ? exported.crRoll() : exported.rolloverState();
        const flags = product ? { checkInitialTrim: rs.checkInitialTrim, trimmed: rs.trimmed }
                              : { checkInitialTrim: exported.checkInitialTrim(), trimmed: exported.trimmed() };
        out.push(clone({
            ret: ret === undefined ? null : ret, err,
            rng: rt.state.rng.calls,
            saves: rt.state.saves.filter((s) => s[1] === 'actionPlansRecordKey' || s[1] === 'trackRealTimeRecordKey'),
            plans: exported.actionPlansRecord(),
            roll: { startIndex: rs.startIndex, pathIdList: rs.pathIdList,
                    checkInitialTrim: flags.checkInitialTrim, trimmed: flags.trimmed },
            lastContact: exported.trackRealTimeRecord()
        }));
    }
    return out;
}

async function runCandidate(fx) {
    const { exported: K } = await loadScript(KERNEL_FILE, envOf(fx), K_EXPORTS);
    const S = clone(fx.storage) || {};
    const SS = clone(fx.storyStorage) || {};
    const chat = SS.chatSettingsKey || { intimacy: 'stranger', style: 'chat', responseLength: 'unspecified' };
    let plansRec = SS.actionPlansRecordKey || {};
    let lastRec = SS.trackRealTimeRecordKey || {};
    const roll = K.crkRollDefault()();
    const out = [];
    for (const st of fx.steps) {
        const now = st.now != null ? st.now : fx.now;
        const rng = makeRng(st.seed || 1);
        const saves = [];
        const cid = chat.char && chat.user ? chat.char.id + chat.user.id : '';
        const ctx = {
            char: chat.char, user: chat.user, scenario: chat.scenario,
            chat: { tags: chat.tags, intimacy: chat.intimacy, style: chat.style, responseLength: chat.responseLength },
            includeGameStats: S.includeGameStatsKey, gameRecord: S.gameRecordKey || { RPS: {}, NumberGuess: {} },
            floaty: SS.floatyBrainsKey || [],
            jots: (SS.rememberMeKey || {})[cid],
            diary: (SS.diaryBrainsRecordKey || {})[cid],
            process: (SS.emotionalMemoryRecordKey || {})[cid],
            plans: plansRec[cid],
            trackRealTime: SS.trackRealTimeKey,
            lastContactMs: lastRec[cid],
            useEmotionalModes: S.useEmotionalModesKey,
            nowMs: now
        };
        const deps = {
            rngInt: (a, b) => rng.int(a, b),
            encode: (t) => fakeEncode(t),
            maxTokens: async () => fx.maxTokens,
            rolloverTokens: async () => fx.rolloverTokens,
            naiSystemPrompt: async () => fx.systemPrompt,
            recentEmotions: async (n) => K.crkRecentEmotionsFromSections()(clone(st.sections || []), n),
            log: () => {}
        };
        let ret = null, err = null;
        try {
            if (st.hook === 'before') {
                ret = K.crkBrainEntries()(st.model, st.storyText || '', ctx);
            } else if (st.hook === 'built') {
                if (ctx.char && ctx.user) {
                    const r = await K.crkContextBuilt()(clone(st.messages), st.model, !!st.dryRun, ctx, deps, roll);
                    if (cid && r.plans !== plansRec[cid] && r.plans !== undefined) plansRec[cid] = r.plans;
                    if (r.planSave) saves.push(['story', 'actionPlansRecordKey', clone(plansRec)]);
                    ret = r.messages ? { messages: r.messages } : null;
                }
            } else if (st.hook === 'genEnd') {
                if (st.model === 'xialong-v1' && chat.char && chat.user && SS.trackRealTimeKey === true) {
                    lastRec[cid] = now;
                    saves.push(['story', 'trackRealTimeRecordKey', clone(lastRec)]);
                }
                if (roll.checkInitialTrim === true) roll.checkInitialTrim = false;
                ret = null;
            }
        } catch (e) { err = String(e && e.message || e); }
        out.push({
            ret, err, rng: rng.calls, saves, plans: clone(plansRec),
            roll: { startIndex: roll.startIndex, pathIdList: clone(roll.pathIdList),
                    checkInitialTrim: roll.checkInitialTrim, trimmed: roll.trimmed },
            lastContact: clone(lastRec)
        });
    }
    return out;
}

function firstDiff(a, b) {
    const sa = JSON.stringify(a, null, 1), sb = JSON.stringify(b, null, 1);
    if (sa === sb) return null;
    let i = 0; while (i < sa.length && sa[i] === sb[i]) i++;
    const path = [];
    (function walk(x, y, p) {
        if (path.length) return;
        if (JSON.stringify(x) === JSON.stringify(y)) return;
        if (x && y && typeof x === 'object' && typeof y === 'object') {
            const ks = Array.from(new Set(Object.keys(x).concat(Object.keys(y))));
            for (const k of ks) { walk(x[k], y[k], p.concat(k)); if (path.length) return; }
            return;
        }
        path.push(p.join('.'), JSON.stringify(x), JSON.stringify(y));
    })(a, b, []);
    return { at: i, oracle: path[0] + ' = ' + String(path[1]).slice(0, 600), candidate: path[0] + ' = ' + String(path[2]).slice(0, 600) };
}

(async () => {
    const only = process.argv.slice(2).filter((a) => !a.startsWith('--'))[0];
    const verbose = process.argv.includes('--verbose');
    let pass = 0, fail = 0, steps = 0;
    const coverage = {};
    for (const fx of FIXTURES) {
        if (only && fx.name !== only) continue;
        const o = await runOracle(fx);
        const c = await runCandidate(fx);
        const p = PRODUCT_FILE ? await runOracle(fx, PRODUCT_FILE, true) : null;
        let ok = true;
        for (let i = 0; i < fx.steps.length; i++) {
            steps++;
            const d = firstDiff(o[i], c[i]);
            if (d) {
                ok = false;
                console.log(`FAIL ${fx.name} step ${i} (${fx.steps[i].hook}) [kernel]\n  oracle:    ${d.oracle}\n  candidate: ${d.candidate}`);
                break;
            }
            const dp = (p && (fx.productDiverges || []).indexOf(i) < 0) ? firstDiff(o[i], p[i]) : null;
            if (dp) {
                ok = false;
                console.log(`FAIL ${fx.name} step ${i} (${fx.steps[i].hook}) [product]\n  oracle:  ${dp.oracle}\n  product: ${dp.candidate}`);
                break;
            }
            if (verbose) console.log(`  ${fx.name}[${i}] ${JSON.stringify(o[i]).length} bytes identical`);
        }
        for (const tag of fx.covers || []) coverage[tag] = (coverage[tag] || 0) + 1;
        if (ok) { pass++; console.log(`ok   ${fx.name}`); } else fail++;
        if (fx.expect) {
            const problems = fx.expect(o);
            if (problems && problems.length) { console.log(`WEAK ${fx.name}: ${problems.join('; ')}`); fail++; }
        }
        if (p && fx.productExpect) {
            const problems = fx.productExpect(p);
            if (problems && problems.length) { console.log(`FAIL ${fx.name} [product, deliberate change]: ${problems.join('; ')}`); fail++; if (ok) { ok = false; pass--; } }
        }
    }
    console.log(`\n${pass} fixtures identical, ${fail} failing, ${steps} steps compared` + (PRODUCT_FILE ? ' (AR vs kernel vs built script)' : ' (AR vs kernel)'));
    console.log('coverage: ' + Object.keys(coverage).sort().join(', '));
    process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
