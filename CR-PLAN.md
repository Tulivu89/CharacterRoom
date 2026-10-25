# CharacterRoom — Plan & Inventory (CR-PLAN)

**Doc version** 0.85 · **Source baseline** AnotherRoom 1.1.5 (Triplis), 10,275 lines, of which
the last three are the random-name tables · **Target artifacts** `characterroom-vX.naiscript`
(engine, LF) and the **shared bridge** — CE's bridge extended to serve both engines (D-15)

## How to maintain this document

- **Decisions (§1) are append-only.** A reversed decision gets a new ID that names the one it
  supersedes; the old row stays, struck through. The reason for a decision is part of it.
- **The inventory (§3) is a ledger, not a history.** Each row's *Status* moves
  `inventoried → kernel → data → door → live-passed`. When a row reaches live-passed, its
  AR line reference can be dropped; the CR-INDEX in the engine is then the home.
- **Unknowns (§2) close with evidence** — a probe result with date and build, never a
  reading of the typings alone.
- **Line numbers here refer to AnotherRoom 1.1.5 only.** They will not be maintained against
  CR code; CR code is navigated by its own CR-INDEX and `[CR-*]` tags.
- **One changelog line per doc revision** at the bottom (§10).

---

## 1. Decisions

### 1.1 Settled

| ID | Decision | Consequence carried into the plan |
|---|---|---|
| D-01 | Fork approved by Triplis. Name: **CharacterRoom**. | New script id ⇒ new `api.v1.storage` space (storage is "for the script", script-types ~L2950). AR's stored cast is not readable by CR, and that is accepted: **no migration** (D-20). |
| D-02 | **xialong-v1 only.** | The kernel is AR's AetherRoom builder with no second format. CR stays inert in context on any other model, as AR does. |
| D-03 | Utility generation by **direct generate** (`api.v1.generate` / `generateWithStory`). No yoink. Helper-script offload (CE generation-helper pattern) is a later option. | Every utility gen is budgeted and user-initiated. A budget readout is required wherever a generate button lives (§7, `aeBudgetReport` pattern). |
| D-04 | Shell: **floating window primary**, full-screen modal supported from the first build. | One root component, two hosts — CE's shell already does exactly this (engine ~L35897: `window.open` 46%×82% resizable, else `modal.open` size `'full'`). Switching host = close one, open the other. |
| D-05 | **One chat per story.** | AR's model stands: chat settings in `storyStorage`, pairing-keyed records (`combinedId`) stay. |
| D-06 | **Images in bridge IndexedDB**, with export/import for transfer between browsers. | Card export inlines images as data URLs — which is **AR's current export shape** (`avatarUri`, `emotions{}`), so AR/AetherRoom card compatibility holds in both directions. |
| D-07 | **Image generation is one image per user action.** No batch, no queue, no auto-fill of an emotion set. | `[CR-IMG-ONE]` is a hard rule, not a setting. **Partial emotion sets become the normal state**, so a per-emotion fallback chain is required (AR only uses emotion images when all 24 exist, L3822). |
| D-08 | Schedule **clock is a per-chat choice** (real / story). ~~CE's schedule visuals are adopted.~~ (visual clause superseded by D-14) | Macros `{{date}}` `{{time}}` `{{time24}}`, Time Apart and Current Events must all read **one** clock function (§6.6). |
| D-09 | **No feature is cut.** Games are lowest priority. A feature may exist without a door. | Kernel + data for every AR feature are carried; UI entry points ("doors") are scheduled per phase (§5). |

| D-10 | **Kit: CE's kit is the starting point, not a contract** (was O-01). Copy it in and let it drift; no shared kit source. | Direction is **social media**: feeds, profile cards, photo grids, status lines. CE-STYLE is reference, not rule — CR keeps only what earns its place. Platform facts (§8) still bind; style rules do not. |
| D-11 | **Field generation is split by field kind** (was O-02). | Voiced fields (greeting, example chats, anything written *as* the Contact) on xialong-v1 with AR's primer pattern; descriptive fields on glm-4-6. The bucket for each field is set by S-03. |
| D-12 | **Bridge optional** (was O-03). | Text chat, cards, schedules and memories work without it. Images do not exist without it: no placeholders pretending otherwise, generate and upload controls hidden, one notice in Settings. |
| D-13 | **Editor avatars and decorations with display options** (was O-04): placement, size, shape, source (emotion portrait / avatar), emoji on/off, indent. | Prior art: the older CE CharChat avatar display (`CE_CCAV_SIZES`, `CE_CCAV_SHAPES`, `ceChatAvatarDisplay`, deleted in the current engine). Mechanism: D-21. |
| D-14 | **Schedules keep AR's model** (was O-05): per-weekday + Daily lists of possibly overlapping events, 30-minute steps, intimacy-gated. | Visualization built fresh for one Contact with few fields — not CE's `ceDayStrip`/`ceMonthGrid`, which were drawn for many characters and locations. Card import of schedules is a straight copy. |
| D-15 | **One bridge serves both engines** (was O-06). CE and CR never run in the same story, so they share transport, channels and message names. | CR speaks CE's existing `AE_*` protocol wherever the payload fits; new ops only where CR differs (§4.4). Image keys use the same scheme as CE's portraits (`<id>_em_Avatar`, `<id>_em_<emotion>`; legacy `<id>_portrait` read-only) — both engines use the **same 24-emotion vocabulary**. The id difference is real but harmless: CR ids are AR uuids, CE ids are CE's; keys never collide. What differs is **scope** — CR's cast is account-wide, CE's gallery is story-scoped (U-08). |
| D-16 | **Version scheme** (was O-07): 0.0.x until the first public release, then 0.1.0. | 0.1.0 is a deliberate release, never reached by a patch. |
| D-17 | **Card format** (was O-08): CR-native superset with a `format` string, still reading AR/AetherRoom field names (`gndr`, `relationship`, `avatarUri`, `exampleMessages`, `style`). | Export writes AR-readable fields plus a `cr` block AR ignores. |
| D-18 | **Chat → card binding** (was O-09): ids plus a text-only snapshot. | A chat survives its card's deletion without copying image bytes into every story. |
| D-19 | **Social-media profile is the Contact's home** and the launchpad for image generation and setup. | §6.3. |
| D-20 | **No migration.** Users bring Contacts, Users and Scenarios in by importing card files. | Legacy in-story AR data is not read. U-01 closed as moot. |
| D-23 | **Side generations assemble their own context through the kernel** (was O-12), called with `suppressScriptHooks: 'self'`. | Keeps the AetherRoom character sheet AR's side gens depend on; drops plan aging, `<think>` on the primer and the second style tag. One side-by-side read against AR's current output before it ships (P7). |
| D-24 | **Storage keys keep AnotherRoom's names**; only new record families get `cr.*` keys. | CR has its own script id, so AR's names cannot collide with an installed AnotherRoom, and renaming them buys nothing but a migration. §4.6 updated. |
| D-25 | **CR 0.0.x ships AnotherRoom's UI under CR names** with the kernel inside. The JSX shell replaces those doors in P4. | Every build is importable and complete; nothing waits on the shell to be usable. |
| D-21 | **Editor portraits are painted by the bridge** (was O-10). | The mechanism exists live today in CE's STORYIMG path: the engine creates a **node widget** holding a 1px transparent **sentinel text** (`ce-storyimg:<id>`); the bridge finds it with a TreeWalker, re-scans on a debounced MutationObserver, climbs a bounded number of ancestors to the widget's own box, and paints there. CR's avatar uses the same channel with the older CharChat sentinel `ce-chatava:` — the bridge still parses `id\|emotion` and still has `_ccavFindSentinels`, `_ccavContainerFor` and `_ccavSettings`; only `_ccavPaintOne` is gone and is rebuilt on `_ceStoryImgRender`'s pattern. No image bytes cross into the worker. §6.8. |
| D-22 | **Display options: account default, per-Contact override** (was O-11). | Stored on the Contact card as `display?`; resolved by one function (§6.8). |
| D-121 | **Home: sliders fixed, zoom, room layers, animated pictures.** Arrange edits a target found afresh by key every time (`crHomeTarget`) and saves 0.5 s after the last change (`crHomeSaveSoon`); each slider also has − and + (one point). **Zoom** 1×–4× widens an inner world inside the room's box, which scrolls — the browser pans, by swipe or scroll. **Layers** on a room version (`layers` on the variant, picture slot `l-<id>` on the Scenario, up to 8): over or under the people, the whole room or one spot, blend (normal, screen, lighten, overlay, soft-light, multiply) and opacity. **Bridge 3.0.39** stores an animated GIF or APNG as it came, as WebP already was, so animated rooms, people and layers keep moving. **Built in engine 1.0.12, bridge 3.0.39.** | Author's live test of 1.0.11: the sliders started to move and snapped back. Cause: the platform delivers a range's `change` as it moves, so every step saved, the save rebuilt the card through its sanitizer, and the next step wrote to the old object the slider's closure still held. Every layer is its own `data-ce-ar-host`, a whole-room one too, or its picture would publish its ratio onto the room's box. `cr-home-smoke.js` 32; bridge check 7. |
| D-120 | **Home step 2 is built: Chat > Home.** A Scenario set marked **Home rooms** (else its first set) is the house; each version gets a **Home picture** of any shape (slot `h-<id>`, upload or generate from above). A Contact's **activities** (`cr.activities`: name, room, centre x/y and width as fractions, Idle, picture prompt; picture slot `a-<id>`) are made and placed in **Arrange**: tap a square of a 10×10 grid, drag with a mouse, or Across / Down / Size sliders; a drag saves when it ends. The schedule event sheet gains **Activity** (`cr.schedActs`); an event's activity puts them in its room and also picks the rooms set (D-119). Each chat member is placed by their own schedule, else the chat's room (pins aside); the User is with the paired Contact unless the author **drops in** (a pin on the rooms set; **Follow** unpins); **Look** views another room only. **Home is per story, off by default** (`storyStorage` `cr.home`): while off nothing reaches the context; on, a speaker's rooms-set brain is their own room plus one line of who is there (D-118). **Built in engine 1.0.11.** | Author: proceed after step 1 checked. The grid is 10×10 rather than 0.81's 20×20: every cell is a live element with two handlers, and the sliders give the fine placement. With Home off, `crBrainView` is unchanged, so parity holds (20/20, mutation 19/19); `cr-home-smoke.js` (25) pins the places, the drop-in, the per-speaker brain, Arrange and the data. A figure with no activity stands as the card's Avatar along the bottom. |
| D-119 | **A set's version in use resolves itself: pinned, else by schedule, else by relationship, else the first** (Home step 1, §6.12). A pick on Chat > Brains pins it for the story (`cr.setActive`, undo rewinds it); **Auto** unpins. A Contact's schedule event can name a version per set — its own sets and the paired Scenario's — in the event sheet's **While this is on** (`cr.schedLinks` on the Contact, keyed by event id, never inside AR's `ScheduleEvent`). A version can list the relationship levels it is for (**Use at**, `intimacy` on the variant). The schedule read is `crStatusRead` on the chat clock, so an event held back by intimacy links nothing and sets agree with Current Events and the status line. **The chat clock rules Home too** — real or story, one setting. **Built in engine 1.0.10.** | Author: schedules should choose locations, and schedule and relationship should choose outfits; one clock for everything. With no pin, no link and no level marked, the result is the first version, exactly as before, so parity holds (20/20, mutation 19/19); the new behaviour is pinned in `cr-brains-smoke.js` (16 new cases), as D-107's was, since AnotherRoom has no sets to oracle it. A Scenario's or User's set follows the **paired** Contact's schedule; per-speaker resolution waits for D-118 (step 2). |
| D-118 | **In Home, a speaker is told only their own room and who is in it with them; who replies stays the author's choice.** The Scenario's Location set resolves per speaker to that speaker's room, plus one line naming those present (the User counted where the camera put them). Member buttons and native Send are unchanged. **Design only** (§6.12, O-19); lands with step 2 and a parity fixture. | Author's call, closing 0.81's open question. Per-speaker resolution fits the group path, which already builds each speaker's context on its own; the paired Contact on native Send gets the same treatment, so nobody "knows" a room they are not in. |
| D-117 | **Home's rooms take any shape, positions are fractions, and the camera follows the paired Contact.** A room's Home picture keeps its own ratio (the bridge's `--ce-img-ar`); anchors are x of width and y of height, a figure's size a fraction of the room's width, placed by tap-tap, mouse drag over a grid, or X/Y/Scale sliders. Home shows the paired Contact's room; the author can look at another room or drop in, which pins the chat's Location set to that room until **Follow**. **Design only** (§6.12, O-19). | Author's call, answering 0.80's question. Fractions of each axis make the square requirement unnecessary: nothing is measured, the box simply carries the picture's ratio. The camera rule keeps the chat's Location honest: by default it is where the Contact is, and it becomes where the User is only when the author drops in. |
| D-116 | **Plan-only changes go straight to `main`;** engine and test changes still go through a branch and a PR. The plan lives only in the repo; the project copy under `claude/` is a convenience snapshot. | Author's call. Closes D-105's worry about the plan being out of step between accounts: whoever works on the plan pushes it to the one place. |
| D-115 | **Illustrate, streamlined.** Compose has three sections: Scene, Who is in it, Generate. Who is in it lists each picked person's sets that have more than one version, so this picture can wear another outfit (or any set's version) without changing the chat's (`crIllus.picks`, in memory; picking the chat's own version clears it). The separate Location and What gets sent sections and the chunk lines under Generate are folded into one **What gets sent** toggle beside Generate, closed by default: the location line, the whole prompt in send order (start chunks, scene, after-scene chunks, location and card base, end chunks), each caption with its negative, and the full negative. **Built in engine 1.0.9.** | Author: the menu had two blocks of prompt text and no way to swap an outfit for one picture. The prompt it shows is the one the bridge assembles, so what you read is what is sent. |
| D-114 | **The Images tab's Outfits are gone; outfits are sets** (supersedes D-107's "image-only outfits stay as layers"). A set gains **Clothes** (`wear`), on by default for a new Contact or User set: a scene's `@Name wears:` line replaces a Clothes set's image prompt. Cards carrying old outfits are converted once at load (and on import) into an `Outfit` Clothes set: the outfits that were on lead (joined as `Worn` when several were, a bare `None` when none were), so every picture is unchanged; the versions carry no brain text, so context is unchanged too. **Built in engine 1.0.9.** | Author: the outfits field duplicated what sets now do, and sets add the per-story switch, pictures and Chat > Brains. Variant ids are fixed (`oWorn`, `oNone`, `o1`…) so a re-conversion picks the same ones. `cr-imgv5-smoke.js` pins the conversion; the review's scene tests now give their cards a Clothes set and pass unchanged. |
| D-113 | **An image's people are the chat's people.** Scan, Enhance and photos list the paired Contact, its group members and the User (`crChatCast`) instead of every card named in the text, and the composer's picker offers only them (every card only when no Contact is paired). Photos list the sender, then chat members the description names, then the rest, up to four. An `@` line that uses a description instead of a name (`@woman`, `@wolf-man`) resolves to the one chat member whose species or kind fits, hyphens read as spaces; a fit two members share stays unknown. The writer is told to put the listed name after `@`. **Built in engine 1.0.8.** | Author's live test of 1.0.7: the writer wrote `@woman` and `@wolf-man`, and name detection in the story text missed people who were plainly present; the picker listed every card. The chat already knows who is in it, so the writer no longer has to guess. Pinned in `cr-imgv5-smoke.js`. |
| D-112 | **A chunk has a position: Start, After scene, or End** (`spot`; missing = End). The base caption is sent as start chunks → scene → after-scene chunks → location and card base → end chunks; Presets shows that order. Bridge 3.0.38 places them (`settings.qualityStart` / `qualityMid`, and `imgSpots` in the ACK); for an older bridge `crImgSend` folds them into the prompt so the order still holds. **Built in engine 1.0.8, bridge 3.0.38.** | Author: V4.5 is strongly order-sensitive, so the author, not the script, decides where a chunk falls. End stays the default because the site appends its quality tags last (D-110). The UC is unchanged (chunks, then base UC). The review's chunk test compares only `quality`/`negative` now that the result carries the spots. |
| D-111 | **On a phone, Chat > Brains shows one line per brain.** A row is its name and switch; tapping the name opens its text, a set's versions, or a conditional entry's Auto / Always / Off. A suppressed row keeps its pill so it still reads as off. Desktop is unchanged. **Built in engine 1.0.7.** | Author's screenshot: every row's preview made the tab a wall of text on mobile. Which rows are open is in-memory only (`crBrainOpen`), so a reload folds them again. Pinned in `cr-imgv5-smoke.js`. |
| D-110 | **Standard prompt chunks per model, merged into existing installs once.** Each chunk may name the models it serves (`models`, known ids only; none = every model, as before). New installs get the 15-chunk standard set — the site's Quality Tags and UC presets written out, one quality and one UC chunk on per model — and an existing list gains the missing ones once (`storage` `cr.imgStdMerged`), with the 1.0.0 `cr-base` chunk switched off only while untouched. Illustrate > Presets shows the current model's chunks (Show all for the rest), a Used by choice per chunk, and Add standard chunks. A model switch across families sets guidance and steps to that family's (V5 4.5 / 23, V4.5 5 / 28). A weighted chunk closes `N::text ::` so a trailing digit is not a weight. **Built in engine 1.0.7.** | Review v1.2 §1 #1, #11 and §8. `absurdres` gives V5 a white outline, and the API applies neither the quality toggle nor a UC preset, so CR must send them; quality goes last (bridge 3.0.37, `qualityLast`). Merging once rather than on every load lets a user delete a standard chunk and keep it deleted. The review's `cr-img-chunks.test.ts` (26) runs inside the whole engine in `cr-imgv5-smoke.js`. |
| D-109 | **Image prompts v1.2: one writer format for V4.5 and V5, and the script does the mechanical part.** Scan, Enhance and chat/post photos run on GLM-4.6 (`glm-4-6`, temperature 0.5, `enable_thinking: false` — script-types `GenerationParams.enable_thinking`). The writer returns tags then 2–4 plain sentences, then one `@Name (left): pose, gaze, expression, touch, state` line per visible person and an optional `@Name wears:`. `crParseScene`/`crBuildScene` (CR-SCAN) make the count tags and `solo`, give captions only to people with an `@` line, put a lone person's state in the base caption and each pose in its own caption otherwise, drop card tags the framing hides, turn names into handles, strip weights/brackets/pipes, remove scene tags that repeat a card tag, move the rating to the tail with `nsfw` in the UC for general/sensitive, and send positions only when everyone visible has one and the shot is not tight. Text without `@` lines (old composer text, a format slip) goes as written with everyone picked drawn. Cards gain **Handle** (`cr.img.handle`; fallback species + girl/man/figure, a hint when two cards share it); the paired User counts as cast when named. Enhance no longer sees or rewrites captions (the JSON contract, `char_visuals` and per-scene visual overrides are gone). Photos: the photo Architect decides who is in view; a POV with no `@` lines draws nobody; **the Scenario's location is left out of photos** (a beach selfie is not in the tavern). Slots send `1girl, solo, upper body, <emotion>` with built-in emotion tags that carry their own gaze; set-variant pictures gain count and `solo`. The Photos brain asks who is in it first and clothes only if unusual; the post-photo ask says first whether the poster is in it. **Built in engine 1.0.7, bridge 3.0.37.** | Review v1.2 (`CR-IMAGE-PROMPTS-v1_2_0-review.md`), written against engine 1.0.3 by the author's prompt project and adapted here: `crAssembleCharacterPrompt`'s third argument is now `mods {state, wears, hides, only}`, merging the review's per-image changes with D-107's set preview (`only`); sets stay after the outfit and are subject to hides; everyone picked in the composer is drawn even without an `@` line; the cast list after Scan/Enhance is the people in view. `GENERATE_IMAGE` gains `settings.qualityLast`, `settings.siteParams` and `characters[].center` — CE sends none, so the bridge path for CE is byte-for-byte the old one. **Unverified**: GLM-4.6 on these prompts (review §9.3), and the server-resolved V5 fields (§9.1, one CR-made V5 image's metadata settles it). The review's `cr-scene-v2.test.ts` (67) runs inside the whole engine; `cr-imgv5-smoke.js` adds 33 wiring cases. Kernel untouched; parity 20/20. |
| D-108 | **A conditional entry is Auto, Always or Off for this chat, and every modal mounts under its own part id.** Chat > Brains gives each conditional entry three states: Auto (its keys and intimacy decide, as before), Always (sent with the card's own brains every build, whatever the keys) and Off. Always works on a User or Scenario too, where AnotherRoom never reads conditional entries. Floaty brains keep On/Off — they have no keys, so On already means every build. **Built in engine 1.0.6.** | Author's report and request. **The crash**: New folder chosen from the folder picker in Organise mode opened the name sheet from inside the picker's callback, and every CR modal mounted its jsx part under the same id, `cr-modal-jsx` — so the picker's close took the new sheet's mount callback with it ("JSX mount callback not found"). `crJsxModal` now numbers its part ids, which fixes it for any modal opened from another's callback, and the folder picker closes before the name sheet opens. **Always** is stored as `a:<name>` in `cr.brainsOff` beside `c:<name>` for Off, one mode per entry; `crBrainView` moves an Always entry into the copy's brains and out of its conditional list, so it is never sent twice. Kernel untouched; parity 20/20 (no switch, the card itself); `cr-brains-smoke.js` 29 cases. |
| D-107 | **Brain sets and Chat > Brains** (closes O-18 and O-20 on their leanings). A card — Contact, User or Scenario — carries `cr.sets`: up to 8 sets of up to 16 variants, each a name, brain text, an image prompt pair and a picture slot `v-<id>`. One variant per set is in use per story, kept in `historyStorage` `cr.setActive` so undo takes a switch back; the first variant is in use until one is picked. Chat > Brains lists every brain the chat can send — the paired Contact, User, Scenario and each group member, plus floaty brains — with its state and a Suppress/Restore switch kept per story in `storyStorage` `cr.brainsOff` ({cardId: [`b:`/`c:`/`s:` + name or set id]}). Floaty brains use their own existing on/off. **Built in engine 1.0.5.** | Author's design. **The kernel is not touched**: `crKernelCtx` passes each card through `crBrainView`, which returns a copy with suppressed brains removed and each set's variant in use appended as one brain named `Set: Variant`; with no sets and nothing suppressed it returns the card itself, so parity holds (20/20, mutation 19/19) and `cr-brains-smoke.js` (21 cases) pins the new behaviour, which AnotherRoom cannot oracle. Both context hooks re-read `cr.setActive` before each build, because undo moves the history node under the cache; `onBeforeContextBuild` became async for that. The last build's fired names are kept per speaker so a conditional row can say `fired last build`. **What the tab shows honestly**: AR reads conditional brains from the speaking Contact only, so a User's or Scenario's conditional entries are marked `not read` rather than offered as live. **Images**: the variant in use joins `crAssembleCharacterPrompt` (Contact/User) and `crSceneBasePrompt` (Scenario); a variant's picture can be uploaded or generated (outfit: full body on the card's visuals with that variant; place: scenery like the Banner). A Scenario set marked **Stage backdrop** replaces the Banner behind the Stage with its variant's picture. Sets are on the card's `cr` bag, so they export and import with it; the switches and the choice are the story's. Existing image-only outfits stay as layers (O-18 (i)). Model-driven switching is not built (D-63). |
| D-106 | **Card lists: folders the author names, search, sort and a grid** (closes O-17 on (a) + (c), author's go-ahead). One list component serves the three Cards tabs, the Group tab's member picker and the pairing sheet. Folders are per kind, kept account-level in `storage` `cr.cardFolders` ({names, of: cardId → folder, layout, sort}), never on the card. Folders show A–Z with Unfiled last, fold on their heading, and rename or remove from it (removing files its cards back under Unfiled). Sort is Oldest, Newest or A–Z; Rows or Grid (faces and names only) is one account setting. On Cards, **Organise** makes a tap choose the card's folder instead of opening it, which works in both layouts. **Built in engine 1.0.4.** | Author's call (folders; a grid of avatar and name for long lists). Search, sort and grid need no data; folders do, and account-level is the D-53 choice made once — moving a record later is a migration. Entries for deleted cards are pruned on save. The picker and the pairing sheet show the search row only past six cards. Pinned by `cr-folders-smoke.js` (15 cases). |
| D-105 | **The GitHub repository is the source of truth for the engine** (`Tulivu89/CharacterRoom`, `characterroom.naiscript`), because more than one Claude account works on it; the project copy is a snapshot. A patch starts from the repo's head, and the version continues from the repo's. | Author's call. Found the hard way: the project held 1.0.0 while the repo was at 1.0.2 (group replies keep their asterisks in the document and the editor shows them italic through two decoration rules, `crEmphRuleApply`), so smart import was first built on a stale file. **The decisions behind GitHub's 1.0.1 and 1.0.2 are not in this copy of the plan**, and IDs from D-103 on may collide with another account's; the plan should live in the repo beside the engine. |
| D-104 | **Chat > Chat is a way into the cards, and the group is on it.** Tapping the Contact, User or Scenario in the Pairing panel opens that card's profile on Cards (Change still picks a different one); a Group row lists the active members as chips, each opening its card, with Add/Edit going to the Group tab. On the Group tab, once there are members, Replies (each member's helper pool) and Helpers come before the member picker, so the helper distribution no longer sits below the whole Contact list. **Built in engine 1.0.3.** | Author's request. A member chip outlines in the accent while that member is writing. The picker itself is unchanged: how a long list is organised is O-17's, and the same answer applies to this list (see O-17). Pinned by `cr-chatnav-smoke.js` (6 cases). |
| D-103 | **Every Import button is one import that reads the file first.** `crSmartImport` files a card by its `cardType` when it has one; when it has none, by the fields only one kind carries (Contact: `greeting`, `greetingEmotion`, `exampleMessages`, `emotions`, `avatarUri`, `relationship`, `gndr`, `schedule`, `alias`, `cjk`; Scenario: `environment`, `scene`); and when the file says neither, by the tab the button was pressed on — a User has no field of its own, so that last rule is what files a bare one. A brains, jots or other CR export, a card with an unknown `cardType`, and a `spec` card (Tavern-style) are refused by name and nothing is added. The Cards surface moves to the tab the card landed on, and a toast names the kind. **Built in engine 1.0.3** (first built as a 1.0.1 on the project's stale 1.0.0; rebased onto GitHub's 1.0.2, see D-105). | Author's request. **Before, a Contact card pressed on Users was refused by its own cardType, and an AetherRoom card (which has no cardType) pressed on Scenarios became an empty Scenario**; both now land where they belong. All three kinds now go through the bridge picker (D-80), not only Contacts: a User is cast, so whatever the bridge lifted is committed to its id as for a Contact; a Scenario has no portrait slots, so its ticket is discarded. AR's `importCharacter`, `importUser` and `importScenario` stay as one-line wrappers so the names remain greppable against upstream (D-28), and their field mapping moved verbatim into `crImportContactData` / `crImportUserData` / `crImportScenarioData`, so a card imports exactly as before once it is filed. No storage key, bridge message or `api.v1` symbol is new. Pinned by `cr-import-smoke.js` (30 cases). 11.3-0(a), the unvalidated `relationship`, is untouched and still open. |
| D-102 | **Height is the only thing that sizes a figure on the Stage. Keeping a figure inside the frame is POSITION's job, not width's.** The first and last figures are pinned to the ends of the cast row; only the ones between them stand on marks. **Built in engine 0.2.13, correcting D-101(c).** | Author's live report. D-101 kept a figure inside the frame by clamping its `max-width` to the room around its mark — and since the picture is `fit=contain`, a narrowed box shrinks it **whole**, so the outer figures came out smaller than the middle one, at roughly half its size on a five-figure stage. The fix was worse than the fault: a cast is read as one scene and a figure that is smaller because of *where it stands* reads as further away, which is a claim the Stage has no business making. **The constraint was misplaced, not miscalculated.** A figure's width follows from its height and its own ratio and must not be touched; what can move is where it is put. Pinning the outermost two to the ends of the row makes their own width unable to carry them out of it — `left: 0` and `right: 0` are satisfied whatever the picture turns out to be — and the marks are then only for the figures between, which are the ones a wide portrait cannot push out of frame anyway. The row is inset 2% so a pinned figure stands just inside the frame rather than against it. **Two is now the ends of the room rather than thirds of it**, which is the older visual-novel staging and reads better for a Contact and a User. Middles can overlap on a crowded stage; that was already accepted (D-98) and is the right trade against unequal sizes. |
| D-101 | **Fill means the window, and a backdrop can sit anywhere in it. Presets and Tags move to Illustrate, a Scenario's picture is its Banner wherever an avatar goes, and Photos and Visuals go to the end of a card's tab row.** **Built in engine 0.2.12.** | Author's live report, second pass. **(a) Fill still only resized the cast.** D-98 fixed the host collision and the box still came out window-shaped, because a covering box at the picture's own ratio is the one thing CSS will not build from a `W / H` custom property: `min-height: 100%` on a box whose width is already definite raises the height and never widens it back. So the ratio survived only to decide what the figures were measured against — resizing the cast while the backdrop sat there. **Fill now carries no `aspect-ratio` at all**: the box is `inset: 0`, the window, and the cropping is the painter's `fit=cover`, which is the same option every avatar in CR already uses. Fit keeps the picture's shape, which is what D-77 wanted it for. **(b) The scene was pinned to the bottom**, so a backdrop shorter than the window sat behind the text panel and was read through it. **Backdrop sits** — Top, Middle (default), Bottom — moves the whole scene box, figures included, since they stand on its floor. Only Bottom passes `pos=bottom` to the painter; `pos` has exactly one value anywhere in CR and the rest of its vocabulary is unverified, so the other two send none and take the painter's default rather than guessing. **(c) Figures could be cut by the stage edge**: a figure is centred on its mark and takes its width from its height and its own ratio, so a wide portrait or a tall Figure height reached past 0% or 100% and met the stage's `overflow: hidden`. The widest a figure centred on a mark can be and stay whole is twice the distance to the nearer edge, which is now its `max-width`; `fit=contain` then shrinks the picture inside the clamped box instead of cropping it. **(d) Presets (was Images) and Tags are Illustrate's**, not Global's — both are image-generation settings and Global had become where image settings went to be hard to find. Global keeps General, Editor, Bubbles and Report. **(e) A Scenario has no Avatar slot** (D-46), so every place that painted a card's portrait asked for a slot that could not exist and fell back to initials. `CrAvatar`, `CrCardRow` and `CrPairRow` take a `slot` prop now, defaulting to Avatar, and the three Scenario call sites pass Banner — the Scenario card row had not been passing a `charId` at all, so it had never painted anything. **(f) Photos and Visuals last**: they are the two tabs a card is least often opened for, and on mobile the row scrolls. |
| D-100 | **`ccav-smoke`'s portrait block had been failing since 0.2.2 and the engine was right every time. Two independent drifts from D-94, in one file, neither of which any other check could see.** Ten to eleven failures, reported on 0.2.4, 0.2.7, 0.2.8, 0.2.10 and dismissed as pre-existing in each of those sessions. Both fixed at engine 0.2.11; the engine is unchanged in this area and the repinned cases pass on 0.2.10 as well, which is the proof. | **Drift one: `doc()` built sections with no `origin` at all.** It predates D-42, when the author's side stopped being matched by text. Since D-94 the portrait pass reads `crChatSegment`, which asks origin who wrote a paragraph — so a section carrying none is neither the author's nor the model's, and **D-83's provisional-greeting rule then opens a phantom run on every author turn in the fixture**. Six cases failed on that alone, all of them counting or anchoring runs. `originDoc` in the same file had carried origin since 0.0.42; only the older helper was left behind. **Drift two: the block asserted a design D-94 did not ship** — `clear=1` as an anchor option on the wire (the engine has never written one) and no clearing widget at all (D-94 skips the clear INSIDE a message; a reply the author answers still needs one). `cr-bubble-smoke`, written with that patch, pins the shipped shape and has been green throughout; the two files disagreed and nobody read them side by side. **The rule this leaves**: an offline check that depends on a bridge capability must SAY SO. `crBridge.bridgeCcavClear` is advertised on HANDSHAKE_ACK and no handshake ever fires in a smoke, so a file that does not set it is exercising the older bridge's fallback while asserting the newer one's output — with no error anywhere, which is D-65's failure mode one subsystem over. `emit()` now defaults the capability on and takes an `oldBridge` flag, and the fallback path is pinned for the first time. **And the wider one**: a standing failure count is a bug with a waiting room. Three sessions recorded "the same N failures on the previous build" as evidence it was safe to ignore; it was only ever evidence that nobody had looked. |
| D-99 | **AnotherRoom's `CR Games` script panel is retired, and Include Game Stats gets its shell home in the same patch.** The panel's Rock Paper Scissors and Number Guess modals, its Reset Stats buttons, its hidden Blackjack button and `getResetStatsUi` / `openBlackjack` go with it. **Built in engine 0.2.11.** | Author's call, and it is the condition P8 already named. D-97 kept the panel alive for one thing only — the Include Game Stats checkbox, which is a **context** setting with no other door — so the toggle landed on the Games tab first, as a `CrChoice` under a Both games section, writing the same `includeGameStatsKey`. **The kernel still reads that key from storage at build time**, so the module mirror beside it is the surface's readout and never a second source of truth. `crPlayResetStats` loses its `setUiPartVisState` call, which had been reaching for a button that no longer exists. **`openBlackjack` went rather than being kept**: it is AnotherRoom's, which normally means leave it alone (D-28), but it is an unfinished stub behind a permanently hidden button that opens a modal and deals no cards — the same class as the 32 UIParts card surfaces the shell replaced, which is a deletion upstream never conflicts with. **`getVisState` and `setUiPartVisState` stay** though nothing calls them now: those are AR's generic helpers rather than a surface, and 0.0.28's orphan sweep set the precedent for keeping upstream's. **One number moved that usually does not**: the standing `tsc` TS2345 was AR's Number Guess `onSubmit` handler, so the histogram went from one error to **zero** — the first clean run since the fork. |
| D-98 | **The Stage's three live faults were one attribute collision, one wrong reading of the document, and one setting with nothing left to choose. Group members join the cast; a crowded stage overlaps and lights the speaker.** **Built in engine 0.2.11.** | Author's live report with a screenshot. **(a) The figure was not sized against the backdrop and Fill filled the window with a face, and the cause was not geometry.** Every painted image writes `--ce-img-ar` onto the **nearest** `[data-ce-ar-host]` ancestor (D-77) — and the Stage carried exactly one host, with three pictures under it. The backdrop and both portraits wrote to the same element, last painter won, and the scene box took **the avatar's** ratio: a landscape room squeezed into a contained strip at the bottom of a portrait-shaped box, with a figure at 88% of that box sprawling over it. Each figure is now its own host, so the stage's property is the backdrop's alone — and a figure reads its OWN ratio for `aspect-ratio`, which is a gain rather than a workaround: a portrait box hugs its picture instead of taking a flat 50% of the row, which is what lets two figures sit at their true widths and what makes overlap mean anything. The backdrop anchor also passes the real `fit=` at last; it had been hardcoded `contain` since 0.0.50 and was only ever right because the box happened to share the picture's shape. **(b) Only the first paragraph of a reply was read.** `crStageBuildBeats` pushed a paragraph only when it opened with `Name:` — and a multi-paragraph reply carries that prefix **once**, so every continuation was dropped outright, not merged: the panel showed one paragraph per message and stepping forward jumped to the next reply. Rebuilt on `crChatSegment`, which is D-94's argument reused rather than a second reading of the same document — a beat is a paragraph, its owner is the segmenter's, and **group members come free** because the segmenter already knows whose name a line carries (D-89). The author's own consecutive paragraphs become separate beats too, which is the same bug from the other side. D-83's greeting — written straight in with no name line — is now a beat instead of nothing. **(c) The Backdrop picker is gone, field and all.** A Scenario has one image worth standing in front of and it is the Banner (D-46, and 0.0.66 had already stopped the picker offering Avatar), so the control had one option in it. `bg` leaves `CrStageOpts` rather than being unsurfaced — the opposite call to D-73's, and for the opposite reason: a banner pointer is a stored slot worth keeping, a backdrop name is a setting with one legal value. The Scenario slot probe went with it, since nothing lists slots any more. **(d) Group members on the stage** (P9's last open item but one): User, paired Contact, then members in roster order, capped at five characters so a six-member group is not a row of slivers, with the speaker always on the stage even when the cap would have cut them. Three or more switches the row from `space-around` to centred with a negative-margin overlap, and the speaker lifts on `z-index` — which needs the figure to own a stacking context, since the bridge paints its `<img>` at z-index 1 and that is what bit 0.0.51. **Overlap applies from the third figure only**: two is a scene and wants the space, more is a crowd and has to nest. |
| D-97 | **AnotherRoom's two table games become a Games subtab, its rules and records called rather than copied; a resource says which way is bad; and three duplicated controls collapse into two primitives.** `SECTION CR-PLAY` rebuilds Rock Paper Scissors and Number Guess as jsx over AR's own `gameRecord`, `CompetitiveStats`, `CoopStats` and `genGameReaction`. **Built in engine 0.2.10.** | Author's request. **Only the SURFACE is CR's** — the rules, the record shapes and the reaction generator are AR's and are called, so the kernel's Game History line reads the same numbers whichever door played the game, and an AnotherRoom user switching back finds their score. That is D-25's line exactly: AR's UI is replaced by the shell, which is a deletion upstream never conflicts with, while its records and functions are left alone (D-28). AR's own panel STAYS for now (D-49): it still owns the Include Game Stats checkbox and its Reset Stats buttons, and CR's reset calls `setUiPartVisState` so the panel's own button hides in step. The staleness that leaves is CR-MODALSTALE and is known. **What reaches the document differs by game and the reason is D-63's**: RPS writes its moves with the reply, because who threw what IS narrative; Number Guess writes the reply only, because its mechanics are two integers. Both go through `crGroupWrite` as one `Name:`-led message, so portraits and bubbles treat it as that Contact's turn (D-89, D-94) — the same path D-93's reaction uses, refused during a Send both ways (D-88). **AR's one-in-five reply rate is kept** for Number Guess: a long game is not one generation per guess, and a win always speaks. AR's Grug-throws-Rock joke is kept too. **A resource now carries `look` and `tone`** — pips up to twelve and a bar past that by default, and a colour ramp that reddens as a hit-point pool drains or a stress pool fills; `flat` is the default and means nothing, which is right for a count nobody scores. **The style pass was the find**: `CrRpgChips` was a byte-for-byte duplicate of `CrChoice`, and the minus/value/plus row had been hand-rolled in three places. `CrStepper` and `CrMeter` join the primitive set (CR-STYLE §9.3's own rule for this case), `CrRpgLabel`, `CrRpgStepper` and `CrRpgChips` are gone, and nine chip rows plus the Advantage and Reacting rows now render through `CrChoice`. |
| D-96 | **A die is generated geometry, the odds are the roller run many times, and the readout is a ribbon before it is a number.** Faces for d4/d6/d8/d10/d12/d20/d100/dF computed from a radius and a rotation; the result box gets a tray that tumbles; each sheet row gets a 5px stacked band ribbon; the roll that was made gets a band ladder. **Built in engine 0.2.9.** | Author's design after a rendered preview. **Generated rather than sourced**: jsx-typings has no `<use>` and no `<image>` (L1111-1163), so a found SVG has to be transcribed into `path`/`polygon` children by hand anyway — and a generated face inherits the token scale, so a kept die goes `CR_ACCENT` and a dropped one dims with no second asset. D-72's argument against emoji, one subsystem over. **The odds cost nothing to derive because `crRpgRoll` already takes its rng as a parameter** (D-91): running it 2000 times and tallying the band labels needs no per-system maths, so a hand-built ruleset, an exploding pool and an empty-pool rule all read correctly with nothing written for them. **XORSHIFT AND NEVER AN LCG, and this was measured rather than assumed**: a plain LCG's low bits are short enough on a d6 that PbtA reads 33/33/33 against a true 28/44/28 and a Blades critical never fires at all — a wrong bar with no error anywhere. Seeded, so a repaint never moves a bar nothing has changed. **Rows holding the same number share one simulation**, which turns a fourteen-row Chronicles sheet from 78 ms into 4 ms (2 sims) and Blades' twelve ratings into one; the cache is cleared whenever a system is used, edited or deleted. **A ladder's order is derived, not declared**: a labelled trigger is pinned to whichever END its condition points at — a trigger reading a HIGH natural die is the good end on an at-least system and the bad end on an at-most one — which puts every preset's criticals and fumbles where a player expects with no table to keep. **The animation is inline `transform` flipped across two renders with a transition between them**, held in the tray's own `useState` (D-41): a jsx part carries no stylesheet so there is no `@keyframes`, and the typings carry no SMIL. **Nothing here reaches context** — D-91's rule is untouched, and the ladder and ribbon are display over a roll that already happened. |
| D-95 | **Reasoning turns were built, measured and removed.** A `<think>` block prefilled onto the tail assistant message, left open so the model reasoned before replying, then cut back out of the document. Shipped off-by-default in engine 0.2.6 with an editable seed in 0.2.7; removed in 0.2.8. The kernel's own closed `<think>` for Action Plans is untouched and is AnotherRoom's again byte for byte. | Three blind-scored live runs against a trap scene with a known character (Leia), a matched original (Sol) and a deferential control (Neve) whose in-character answer was the opposite. Thinking never beat no-thinking on character adherence or prose quality; the same seed ranked first in one run and second-to-last in the next, so the differences were inside the noise at 6–10 per cell. Two things were consistent: mechanical failure (leaked blocks, a generation that stopped dead on `</think>`) occurred **only** in thinking cells, and the most in-character block in the corpus still fabricated the fact that won its argument — voice and grounding are independent, and a seed buys only the first. The prefill DID control format reliably (message count, emotion tag), which is the one reusable finding. Do not rebuild this without a result that beats the measured no-think baseline: disposition 1.67–1.80, secondary 6.0–6.6 on the trial rig. |
| D-94 | **One segmenter, one bubble per message, and no clear inside a message.** `crChatSegment` reads the document once for both passes: the portrait runs as before (D-82, D-83), plus the author's turns and model paragraphs outside a run. Bubbles are **markers only**, shaped per message — the first paragraph takes the top corners, padding and border, the last the bottom, blank lines and hidden photo tags inside are filled square — over the last **120** sections. The name-line and Emotion rules are gone (supersedes the rule half of D-53 and D-75, and D-89's group/non-group Emotion split). With bridge 3.0.36 the portrait's own box clears the float above it, so the wrap-clearing widget is no longer moved inside a message when the next reply follows directly; an older bridge keeps 0.2.1's placement. | Found from three live screenshots. **The gaps were widgets, not styles**: every node widget takes height, and when a reply was followed directly by another portrait, the clear moved to the second-last paragraph, which is between the text and its Emotion line — so a member reply (written with no blank paragraph) split, and a reply followed by the author's turn did not. The two passes had also decided ownership separately, and every paragraph was drawn as its own rounded bubble. **The trade-off, taken as the safe default and open to reversal**: history older than the window loses bubbles, where before it kept bubbled name lines without their continuations. A refused shaped batch is repainted flat and the Report says so (D-61). The bridge advertises the capability as `ccavClear: true` on HANDSHAKE_ACK rather than a version, which CE ignores. Built in engine 0.2.2 with bridge 3.0.36. |
| D-93 | **A reaction is the Contact's own reply, built as usual with the outcome at the tail, kept on the tab until the author sends it** (closes O-16). The reacting Contact's context is assembled exactly as a group member's is (`crGroupAssemble`), as a **dry run** so a reaction nobody sends does not age a plan; `crRpgFrame` adds one system message, `[ Dice: … ]`, after the last transcript turn and before the lifted style block; the reply shows on the Games tab with Send to the story, React again and Discard. Send writes the reply only, as origin `ai` paragraphs through `crGroupWrite`, so portraits and bubbles treat it as that Contact's message (D-89). A group member reacts through its helper pool, anyone else on the main script. | Author's design. The line after the transcript and never above the system prompt is D-87's lesson: a block that walks back over every system message lands above the sheet. **One at a time, both ways** (D-88's rule, widened): a reaction holds `crGroupBusyId` as `rpg:<actor>`, and `onGenerationRequested` now refuses a native Send while one is out **in any chat, not only a group**; a reaction pressed while a Send is writing is refused too, which needed the Send to be seen without a group, so `crGroupNativeSeen` records it and only that Send's own `continuityId` clears it (a side generation ending in between must not). The dice line never reaches the document (D-63): what the story keeps is the Contact's reaction, not the mechanics. Built in engine 0.2.1. |
| D-92 | **Version history, amends D-16.** 0.1.0 was released and rolled back; the last public release renumbered engine 0.0.74 to **0.2.0**. Patches bump the third digit from there, so the next engine patch is 0.2.1. | Recorded from the author. D-16's rule survives in spirit: a minor step is a deliberate release, never reached by a patch. The engine's header comment still reads 0.0.74 and is corrected in the next engine patch. |
| D-91 | **Games gets an RPG dice tool, and it is a table aid, not a prompt changer.** Rulesets (presets, plus the author's own), a sheet of modifier rows per person, resources as pools or enum tracks, and a roll view for the User, the paired Contact and group members. **Nothing reaches context**: no sheet, no numbers, no Game History brain. A reaction is its own press and is handed a narrative outcome (who attempted what, and the band) with no numbers in it. Always available, independent of Include Game Stats. **Built in engine 0.2.1.** | Author's design. **Kernel, K-CONTEXT and HOOKS-MISC are not touched**, so parity is not in play. **A ruleset is five steps**, from a survey of D&D 5e, PF2e, PbtA, Blades, Chronicles of Darkness, Shadowrun, Year Zero, Call of Cthulhu, Fate, Ironsworn and Daggerheart: *pool* (die type including d100 and Fudge; count fixed or taken from the selected rows), *keep* (all, highest N, lowest N; explode on X or more), *read* (sum plus modifiers, highest die, or count of dice at X or more), *compare* (against a per-roll target with a ruleset default, at-least or at-most), *outcome* (ordered bands, fixed or relative to the target, plus natural-die triggers that override or shift a band). A roll is the selected rows plus a situational ±. A band carries an optional meaning line, which is what a reaction is told. First presets: D&D 5e, PF2e, PbtA, Blades, Chronicles, Year Zero, Call of Cthulhu, Fate; Ironsworn and Daggerheart compare against other dice and wait. **Dice are rolled with `api.v1.random.int`** (script-types L2927), not `random.roll` (L2934), whose keep and explode notation is undocumented. **Resources live in plain storage, not `historyStorage`** (author's call: only the User changes them, so there is nothing for undo to rewind). **Not in `gameRecord`**: the kernel's Game History loop reads every key and treats any record that is not `cooperative` as competitive (engine L4086–4104). **The reaction is CR's own generator beside AR's `genGameReaction`**, not a new `GameType` through it: AR's prompt builder reads `gameRecord[gameType][combinedId].kind` unguarded, so an unknown type throws inside its `catch` and returns an empty reaction. It goes through `crSideGenerate` (D-60), one press one generation (D-40), refused during a Send (D-88). Where it lands is D-93; sheets live per story (O-15). |
| D-90 | **Release comment policy: the files hold code, the plan holds reasons.** The engine keeps its frontmatter, AnotherRoom attribution, section banners, a short index (sections, hooks, storage, messages) and one-line notes only where correct code looks wrong. The bridge keeps its userscript header, a short CE-INDEX, part titles, bare `[CR-*]` tags and the same one-line notes; CE's own comments follow the same rule. No history, no decision text, no changelog in either file; the changelog is §10 here. `[KIT-FROM-CE]` stays as a bare tag. | Author's call before release: the index alone was over 10% of the engine and comments over half the bridge. Done mechanically with a TypeScript comment-range pass, proven by printing both files' ASTs without comments and requiring them identical, then parity, mutation check, `tsc`, smoke. Engine 1.45 MB → 1.07 MB, bridge 235 KB → 110 KB. |
| D-89 | **Members are Contacts in the editor.** A `Name:` line names its owner — the paired Contact or a group member — and that run's portrait, gutter indent and bubbles are that Contact's: its own slots, its own bubble override resolved per field over the account default. Members sit on the Contact's side. | Author's call ("treat members as contacts with their own overrides"). Portraits and bubbles had followed origin, and every `ai` paragraph was the paired Contact's (D-75). **The Emotion rule is off while a group is active**: a rule has one style, so it would dress every member in the paired look; Emotion lines are marked by their owner instead, which limits them to the last 60 sections the marker pass reads. A member whose own override turns bubbles off gets none. A member with no slot index yet paints its Avatar, since the emotion cannot be resolved against slots nobody has listed. Built in engine 0.0.70. **Extended at 0.0.71** from the author's live pass: members' names are bolded, `*words*` in a member reply become italic formatting with the asterisks removed (U-25), a photo tag is generated as the member who wrote it, and a portrait no longer sits above its message when its run follows another directly — member replies have no blank paragraph between them, so the portrait anchored on the section holding the run above's wrap-clearing widget. |
| D-88 | **One press, one generation.** A member button while a native Send is writing, and a native Send while a member's reply is out, are refused with a toast — never queued and never run side by side. CR's own background passes are not blocked. | Author's rule. Replaces D-84's guard cost, where a Send during a member reply ran with no CR context at all. The Send is stopped in `onGenerationRequested` (`stopGeneration`, script-types L3974), which sees `scriptInitiated` (L4001), so a helper's own generation passes. A native reading older than three minutes stops counting, so a generation-end that never arrives cannot lock the buttons. Built in engine 0.0.70. |
| D-87 | **Every speaker reads the same transcript from its own side** (supersedes D-85). At every build — the paired Contact in `onContextBuilt`, a member in the assembler — each assistant message is split at `Name:` lines; the speaker's own segments stay assistant, everyone else's become user and fold into the neighbouring user turn. ~~The generation tail of a native Send is never re-roled.~~ **Amended at 0.0.70**: the tail is split too — it stays the continuation when its last segment is the paired Contact's, and when it is anyone else's it becomes user text, an empty assistant turn follows, and `onResponse` starts the reply on a new paragraph. The kernel's style line and near-end block are lifted before the view and put back before the turn being written. The roster block sits under the system prompt for **every** speaker, the paired Contact included, and only while the group has members. | **The first live pass (0.0.68) showed why the tail was the wrong place.** NovelAI folds consecutive model paragraphs into one assistant message, so three replies in a row reached the next native Send as a single turn that the paired Contact read as its own — and it wrote the other two's lines. A tail rule cannot see inside that message. The author asked for "a simple, robust mechanism on context build to wrap other message bodies with user framing"; this is that, and it is not a stored transcript per speaker: it is a pure function of the kernel's list, and a segment's role depends only on who wrote it and who is speaking, so it is identical on every build for that speaker and each script's cache holds. Unnamed text belongs to the speaker above it, or to the paired Contact after a user turn (D-83's nameless greeting). **Parity**: only reachable with a group, which the harness never has; forcing it on fails 16 of 20 fixtures. Built in engine 0.0.69. **Why the amendment**: the second live pass had Harley writing Ivy's lines again, and her logged context showed why — Send was pressed straight after Ivy's reply, so the tail message she was asked to continue ended in Ivy's paragraph. Not sampling settings: the members' prompts ran on the same parameters and stayed in voice because theirs always end on their own name. The same log showed two user turns in a row in a member's prompt, where the kernel's style line had split a user run; lifting it makes the fold identical from build to build. |
| D-86 | **A member's pool is stored ordinals, one helper by default, and it spills only on a refusal.** Pools live in `cr.group` in `storyStorage`, keyed by Contact id; a member is auto-pinned to the least-loaded helper the first time it is added, never to the main script unless no helper has answered, and the author adds spill helpers by tapping them onto the pool. The call goes home first and moves to the next ordinal only on refusal vocabulary (budget, allowance, exceed, limit, a busy helper); a timeout, abort or network failure is thrown and never re-run, and a timed-out helper is dead until Refresh. **One press, one reply**: nothing chains a second speaker (D-40). | Ordinals rather than script ids because a re-imported helper gets a new id and keeps its name-derived number, so an assignment survives a reinstall (reference §3.3). Stored rather than recomputed because a pool that moved between sessions makes the next call cold for no visible reason. **A spill helper is not a shared cache** — the cache is per script (reference F4), so its first serve pays a full cold read and later ones pay the transcript gap since it last served; it pays that from its own input allowance, which is why it still adds headroom. Spill rather than round-robin because round-robin keeps both caches one turn behind and drains both allowances together (reference §3.4). The retry rule is CE's and is about money: a refused call never reached a model, a timed-out one may have. Built in engine 0.0.68. |
| ~~D-85~~ | ~~**Only the last turn is reframed**~~ (author's call; **superseded by D-87** after the first live pass). The kernel's list is used as built except at the tail: when the last spoken turn is not the member's own it becomes a user turn, the kernel's style block moves below it, a chosen plan's `<think>` moves onto the new tail, and the list ends on an assistant turn holding `Name:` for the model to continue. A roster block (`----` Group Chat) sits under the system prompt. | Proposed instead: a stable per-member view in which every other speaker's lines are user turns. The author's objection holds — a change at the tail costs one message of cache, because everything after it is new on that call anyway, and a per-member rewrite of the whole transcript is more machinery for a saving the cache already gives. **What to watch live** is voice bleed: a member continuing a transcript whose earlier assistant turns are other people's. If it shows, the per-member view is the fallback and it is a change inside `crGroupFrame` only. The speaker of a tail is the LAST name line in it, since one assistant message can hold several paragraphs. Built in engine 0.0.68. |
| D-84 | **Group chat is built on persona helper scripts, experimentally, and first as a measuring rig.** The paired Contact answers on native Send as before. Every other member has a toolbar button and a row on a **Group** subtab beside Stage, and answers as a script generation: `buildContext` with `suppressScriptHooks: 'self'`, `crkContextBuilt` with the member as `ctx.char` and a rollover record of its own, the reply sent to a pinned `cr-persona-helper` script and written into the story as paragraphs tagged origin `ai`. Every reply and every native Send writes a probe line. A glm-4-6 "who speaks next" button follows in 0.0.69. | Native Send cannot serve a second persona: it is the user's generation with one Contact's context rewritten into it, and helpers can only lend **script** allowance. The kernel is not touched — `crKernelCtx` reads `crGroupBuildChar` in place of `chatSettings.char` while it is set, and both context hooks and the generation-end tail return while `crGroupGenDepth` is above zero, because a helper's generation fires this script's hooks too (U-02, reference Q3). Neither flag is set by the harness, so parity is unmoved; forcing the depth on fails 18 of 20 fixtures, which proves the harness drives the guard. **The guard's cost**: a native Send pressed while a member's reply is out gets no CR context; the tab says so. Prior art is PERSONA-HELPERS-REFERENCE v0.1 (CE's helper mesh plus the 2026-09-16 cache probe). U-18 to U-22 are what the rig exists to answer. |
| D-83 | **A greeting written straight into the story opens a portrait run with no `Name:` line.** The first non-authored block opens a run at section 0, provisionally: an Emotion line confirms it, the author's turn or the end of the document drops it. | Only CR's own Insert greeting prefixes the name, so a greeting typed or pasted matched nothing. Provisional so a Scenario's opening prose is left bare. Built in engine 0.0.67. |
| D-82 | **One portrait per message.** A `Name:` line opens a new run whether or not one is already open, and a continuation paragraph stays in its message; the test is "not the author's", not "the model's". | Reported as "it only shows if the previous message has more than one paragraph": runs opened only when none was open, so consecutive messages merged and all but the first got no widget, and multi-paragraph replies kept `emotion: ""` and painted the Avatar. "Not the author's" rather than "the model's" because a script-appended greeting carries origin `script`, not `ai` (found at 0.0.66). Built in engine 0.0.65, extended 0.0.66. |
| D-81 | **CR Global has a Report tab**: bridge state, portrait settings, what the last emit did, the last image request, and one line per Contact — copyable or savable, and carrying no card text, names, chat or prompts. | A tester cannot be asked to open a console. `crCcavEmit` returning early, finding no runs, or having its batch refused all look like "no portrait and no error", so the emit record names which path it took. Image fields are measured by string length and never stringified with the card, because D-80's peak would take the script down mid-report. Built in engine 0.0.64. |
| D-80 | **A card's base64 images are taken out by the bridge before the engine parses it.** Bridge 3.0.31 opens the picker, lifts every `data:image/` value into the portrait store in page context, and hands back text; the engine settles the id (`pick` then `commit` or `discard`). No bridge, or an older one, falls back to `api.v1.file.prompt` exactly as 0.0.62 did. `memoryLimit` 8 → 128. | An AnotherRoom card carries `avatarUri` and up to 24 emotions as base64 in one JSON file, and `JSON.parse` held the text, the tree and 25 decoded strings at once — a card of any size killed the script. **The peak is in the parse**, so forwarding the images over a message would still have paid for parsing them first. Two phases because a collision must cancel before anything is overwritten. CR's first message of its own: `AE_CARD_IMPORT` / `_RESULT`. Built in engine 0.0.63 with bridge 3.0.31. |
| D-79 | **An option's label is data, not a verb.** `CrChoice` opts every option out of [CR-ICONS]'s label-to-icon lookup. | `INTIMACY_LIST` contains "close", which rendered as an unlabelled X. Every option rather than that one list, because the next picker holding "delete", "save" or "new" would hit the same wall. Built in engine 0.0.62. |
| D-78 | **Anything reachable from a top-level statement is declared above it, and SECTION TYPES is where it goes.** | `CR_SLOT_AVATAR` / `CR_SLOT_BANNER` sat ~3,600 lines below a top-level initialiser that read them, so the first saved emotion tag put the read in the temporal dead zone and aborted module evaluation — surfacing as whichever unrelated symbol the next hook touched. Built in engine 0.0.62. |
| D-77 | **The Stage's figures are measured against the backdrop, not the window** (author's correction of D-76). A scene box takes the picture's own shape from `--ce-img-ar`, which bridge 3.0.30 writes onto the nearest `data-ce-ar-host` ancestor when an image paints; Fit and Fill size that box. An older bridge gives no property and the scene is the window, as at 0.0.60. | The engine cannot compute the rendered rectangle — the bytes are the bridge's (D-33) and `object-fit` insets a picture inside a box whose size never moves. A custom property rather than a message: it crosses the shadow boundary, adds no protocol name, and a **ratio** cannot go stale on a resize the way a measured height would. Built in engine 0.0.61 with bridge 3.0.30. |
| D-76 | **A Stage figure takes its share of the stage width; the backdrop is `contain` with `pos=bottom` by default, with Fill as a setting.** ~~Figures are sized against the window.~~ (measurement clause superseded by D-77) | "Figure height: 100" did nothing visible because a portrait in a 46%-wide box hit the width first; `cover` cropped a landscape room to a zoomed strip. Built in engine 0.0.60. |
| D-75 | **A bubble is a turn, not a name line.** The rule still matches `^Name:`; every other paragraph of the Contact's turn is found by origin and given the contact style by a marker. A section that is neither `ai` nor authored is left unpainted. | A rule cannot reach a continuation paragraph — nothing in it matches — which is the wall [CR-BUBBLE-MARK] hit on the author's side and gets the same answer. Rule and marker never write the same paragraph. Built in engine 0.0.60. |
| D-74 | **A group of cards takes a heading, not a container.** `CrHeading` is CrSection without the box: a title, a rule, and a folded `?` note. | Posts drew bordered cards inside a bordered `CrSection` — a bubble in a bubble. The note folds rather than going, because a group whose rules are invisible is [CR-EDOPTS]'s failure. Built in engine 0.0.60. |
| D-73 | **Contact and User profiles lose the banner; the Scenario keeps its.** The header becomes one large avatar sharing its horizontal band with Attributes and the Delete/Export pair. | Author's design, from a live pass: neither profile had anything to say with a banner, and the strip pushed the one image that matters down the screen. **The Scenario is the exception and the reason is D-46's** — a place has no face, so its header is banner-led and its single slot IS the banner. What comes out: the `cr-banner` blocks on both profiles, the `Banner` slot tiles on both Photos tabs, and [CR-SCALE]'s overlap derivation, which exists only to hang an avatar off a banner. **One consequence to decide with the patch rather than after it**: `banner?: CrImageRef` sits in both `cr` bags and in every export, so dropping it from the sanitizers silently discards a stored pointer on the next import round trip — the cheap safe answer is to keep the field read and written and only unsurface it, since the bytes themselves live under `<id>_em_Banner` in the bridge store either way. **Built in engine 0.0.59**, and **the field went rather than being unsurfaced** — the author's call, against the cheaper option: a field nothing writes and nothing reads still rides along in every export, and the pointer it holds is recoverable anyway, since a banner is a slot like any other and its bytes stay in the bridge under `<id>_em_Banner`. `CrSimpleImages` split into the User's (avatar only) and the Scenario's `CrSceneImages`, both sanitizers drop an incoming banner, and three new `cr-data-fixture` cases pin the disagreement between the three shapes — which is exactly the kind of thing a later patch tidies back into one interface. The header that replaced it is one shared `CrProfileHead` for both profiles, and **Export and Delete came off the About tab in the same patch**: two doors to one irreversible verb is what D-47 forbids. |
| D-72 | **A bare verb is an icon, decided in the primitive; a post reads as a post; a card row's picture fills its left end; and shape joins colour, type and space as tokens.** Built in engine 0.0.57. CR-STYLE leaves the plan and becomes a generated file. | Author's direction, from a screenshot of the Posts tab: ten labelled buttons in one wrapping row, no post that read like a post, and a style guide that could not be checked. **The mapping lives in `CrButton`** rather than at sixty call sites — every CR control is already one, so a label table converts the script in a single edit and cannot be half-applied ([CR-BTNSQUEEZE]'s rule, one subsystem over). Only the four verbs a reader already knows lose their words; anything with an object keeps them, and a confirm always keeps them, because a confirmation rendered as the same glyph as the thing it confirms is not a confirmation. **Inline SVG and never emoji**: an emoji takes the platform's font, ignores `currentColor` and lands at a different size on every device, which is the opposite of a token scale (`svg`/`path`/`circle` are intrinsic, jsx-typings L1111/L1119/L1121; presentation attributes there are kebab). **The label never leaves** — it becomes `title` and `aria-label`. **The feed**: author line, text, full-bleed photo, comment bar, comments; the body is the open/close control and the remaining eight verbs moved into a sheet behind one overflow handle, where each carries a sentence. **The card row's fade is a mask, not a gradient**, because a gradient must name the colour it fades into and that colour moves with hover, press and theme. **Shape is now tokenised** — border widths, button and control padding, tap size, card and post geometry — on the argument that a theme able to recolour a window but not resize a single box is half a theme (D-30 bounds what a theme can reach; this is what it can reach *with*). **CR-STYLE is generated from the engine** by `cr-style-gen.py`: a token with no description fails the run, which is what stops the document drifting from the code — it already caught `--cr-avatar-row` disappearing with the old card row. |
| D-71 | **AR's six orphaned generators get doors, with AR's names and AR's prompts verbatim; Imitate goes under Voice; Plans get a real surface.** | Author asked whether every AR generator was wired up and named only Games as missing. Measured: **six were not**. Seven of AR's generate call sites live inside `diaryPageRebuild`, one closure that builds its Diaries page out of UIParts — CR replaced that page with the shell and replaced the only buttons that could fire them. Threads were rebuilt in [CR-POSTS]; Reflect, Plan, Process, Imitate and the Reflect/Plan pair AR hangs off an individual **forum thread** were not. **Only the buttons were trapped**: `getMatchInText`, `removeJunk`, `getMostRecentEmotions`, `EMOTION_TO_PHRASING`, `getRandomNameFull` and every record and saver are top level in AR and callable, so the port is prompts and plumbing and the parse and storage stay AR's. **Prompts verbatim and buttons named as AR names them** (author's call, for a user switching between the two scripts), which also renamed CR's "About the chat" back to "Create Forum Thread". **PLANS WERE LIVE AND INVISIBLE** — the find that mattered: `actionPlansRecord` is loaded, saved and **read by the kernel's context build**, so a plan carried over from an AR story had been shaping replies with nothing in CR able to show, stop or delete it. Not a missing feature but state acting through a bricked-up door. Plans get a row rather than a third `CrMemSection`, because an `ActionPlan` RUNS: turns that decrement, an anchor to the message it started at, a flag the kernel reads — and setting the turns STOPS it, which is AR's behaviour and deliberate, since re-timing a running plan without re-anchoring `startedAtCount` leaves one that expires at the wrong time or never. **Imitate under Voice** (author's call): an example chat is what it makes, and AR's Diaries page is where it was written rather than where it belongs. It stages into `continuityCreationRecord` and never writes straight to the card, and the accept goes through `crSetExampleChats` (D-27). |
| D-70 | **The fork surface is 20 modified AR symbols and nothing else, every one now marked, with a FORK MAP in the CR-INDEX as the upstream-merge checklist.** | Author asked for the fork to be auditable rather than assumed, so it was measured: every top-level symbol diffed against the oracle, comments ignored. **AnotherRoom 1.1.5 has no section banners at all** — it is one undivided file, and all 35 of CR's sections are CR's own, so an upstream diff will never line up by section and the map is keyed on SYMBOLS instead. Of AR's 248: **172 byte-identical, 20 modified, 56 absent**; CR adds 620. **Sixteen sections hold only AR-origin symbols and fifteen hold only CR's**; `EDITOR` is the one mixed section and stays mixed on purpose, because its three CR symbols are the state for `updateEmotionRule`, which CR rewrote, and splitting them from it would be worse for a merge than the mixing. `SECTION TYPES` was the other one and was fixed rather than excused — with a banner, not a move: `crSideGenDepth`/`crSideGenBusy`/`crSideGenerate` had to stay that early because AR's own passes in DIARIES and GAMES call the wrapper. **Five of the 20 carried no marker** (the four `AR_`-to-`CR_` renames and the Jots import's repaint) and now do. **The 56 absentees are three groups, not one**: 32 are AR's UIParts card surfaces the jsx shell replaced, 4 were renamed into the kernel and are byte-faithful there (`buildSystemPrompt`, `formatTime`, `EMOTIONAL_MODE_ATTR`, `EMOTIONAL_MODE_LIST`) — an upstream change to any of THOSE is a parity job — and 20 are genuinely gone; AR's module-level `trimmed` and `checkInitialTrim` are not gone but folded into `crRoll` in K-CONTEXT. |
| D-69 | **Comments are CR's own, one press per comment, on chat-scope and kept threads alike.** | Author's design, from a live pass: a thread with nothing under it reads as dead. AR's `genForumReply` could not be called — it is reachable only from AR's Forum page, it indexes `forumThreadsRecord` by combined id so a **kept** post is invisible to it, and it finishes by repainting a UIParts container that is not open when CR's surface is. Written beside it, the third time in this section for D-28's reason. **Separate calls rather than one block** (author's call, and the right one): a single generation asked for four comments writes four voices that sound like one person doing impressions, because they are, and it leaves no way to stop after the good one — one press adds one comment and the next can see it. **Who is talking is decided engine-side, not by the model**, on AR's own distribution (sometimes another card, rarely the author under their own thread once there is something to answer, otherwise a stranger the model names), and AR's `buildForumReplySystemPrompt` is REUSED for the card case. The id is recorded only for a real card, which is what lets a comment carry an avatar; a stranger gets none rather than borrowing one. |
| D-68 | **The two kinds of post measure from different anchors: a chat thread from the last post, a day post from the last time the Contact and the User actually spoke.** | Author's correction of D-66, from a live pass. 0.0.52 measured both post to post, which is a feed's own rhythm and right for a thread about the chat — and wrong for the other one, which exists to cover what they did APART from the User since the two last interacted. The anchor is AR's Time Apart stamp, `trackRealTimeRecord[combinedId]`, already written on the chat's own clock by HOOKS-MISC and the same number the kernel's own Time Apart line reads, so **nothing new is stored and the kernel is not touched**. **That stamp is not always there** — it is written only when Track Real Time is on or the story clock is running — so a day post with no stamp falls back to the last post rather than claiming no time has passed, and **the frame says which anchor it used**, because "three days ago" means two different things depending and a model cannot ask. A day post is additionally told when it last POSTED, not to measure from but so it does not write the same one twice. The tab shows BOTH frames: one line would be right for one button and quietly wrong for the other, which is the 0.0.52 bug one layer down. |
| D-67 | **A post can carry a photo, and it is D-57's pipeline with a different host. The post's text is editable in place, and the description is stored so the picture can be re-asked for rather than only deleted.** | Author's design. The Contact is asked what they would attach, in plain words; `crChatImgBuildPrompt` turns it into a prompt and `crChatImgDispatch` sends it, both REUSED rather than copied; a `kind`-less generation lands gallery-keyed (D-43) and the `ce-gallery` anchor paints it. **Third feature running with no bridge change** — D-59's argument keeps holding because the split is the platform's, not a per-feature choice. **The one structural difference from a chat photo is where the description comes from**: a chat photo's arrives inside the reply because a brain asked for it while the model was writing, and a post is already finished when the author decides it wants a picture, so the question has to be its own generation. **D-58's two clauses carry across intact** (plain words not tags; do not describe your own face or body) and only the FIRST non-empty line is taken, since a model asked for one line sometimes gives three and the architect handed a paragraph composes out of all of it. **Storing the description is what makes regenerate and edit one feature**: re-running costs one generation instead of two, editing it is the same call with an override, and a photo nobody can re-ask for can only be deleted. **The pointer is written only after a successful dispatch** ([CR-CHATIMG]'s rule — a pointer to an image nobody asked for is a permanent spinner), and **removing a photo unpoints it without deleting the bytes**, because the image is a gallery record and the Gallery is where records are deleted. One press, one image (D-07/D-40). |
| D-66 | **A forum post now carries a stamp, and until 0.0.52 nothing did. The stamp is `crClockNow()`, and the generator is handed an absolute-plus-relative time frame. Two kinds of post, two buttons.** | Author's design. **The stamp was urgent rather than merely useful**: `ForumPost` is `{content, emotion, screenName, id?}`, so "time since their last post" was not a read returning a wrong answer, it was a field that did not exist — and every thread written before the field lands is permanently undated. Those render as undated; a backfilled guess would be worse than a blank. **`crClockNow()` and never `Date.now()`** (author's call, and it is what [CR-CLOCK] exists for): in story mode the device clock would date a post while Time Apart, Current Events, the macros and the schedule all read the story clock, making the post the one thing in the chat that disagrees about the day. **Only this chat's threads feed the gap** — a kept post is account-level and may carry another story's clock, and mixing them can produce a NEGATIVE elapsed, which is not a wrong number but a sentence about the future handed to a model. **The frame says the time BOTH ways**, which is the load-bearing part: given only "four hours ago" a model cannot tell breakfast from a night shift, and given only two clock times it does the subtraction itself and gets it wrong often enough to write "earlier today" about last Tuesday. Four clauses, the date added only past a week, and the first-post case SAID rather than omitted, since an absent clause reads as a gap to fill. Elapsed is the largest two units, not AR's hours-only ("89 hours") — **the kernel is not touched**. **Since-then walks calendar days**, because a schedule is keyed by weekday, and is bounded three ways: deduplicated by text, capped at six, skipped past a fortnight; gated events excluded per [CR-STATUS]. **Two kinds, two buttons**: a chat thread has a focus worth PRESERVING, so a post about their own day is a second button rather than a wider prompt — and its instruction is a prohibition as well as a subject, because "post about your day" handed to a model that has just been given the whole chat is read as "post about our day". **The trigger stays a press** (D-40): the surface notices the gap and says so under the buttons; it never generates on its own. |
| D-65 | **Anchor options are COMMA-joined into the payload's third field, and CR had been joining them with `|` since 0.0.8 — so every option after the first has been silently dropped on every CR surface for forty-three builds.** | Found from a screenshot: a Stage figure floated in the middle of its box rather than standing on the floor, and `pos=bottom` was third in its option list. `_ceSurfImgParse` (bridge 3.0.29) splits the payload on `|`, takes **`parts[2]`**, and splits **that** on commas; `"fit=cover|shrink=1"` therefore puts `shrink=1` in `parts[3]`, which nothing reads. **The failure mode is why it survived so long**: an unrecognised token is dropped by construction — the very property that makes a new option additive and an old bridge safe — so a MISPLACED option is dropped exactly as quietly as an unknown one, and there was never an error to find. **What it cost**: `collapse=1` never collapsed an empty anchor anywhere in CR, `shrink=1` never shed the box behind an avatar's initials, the gallery's `thumb=1` worked only because it happened to be written first, and the Stage's `pos=bottom` was dead on arrival. **Fixed at the call sites AND translated in `crImgAnchor`**: this is the second cross-artifact literal CR has got wrong (D-33's attribute name was the first), and the class of bug is one where the next mistake is also invisible. **The check now pins the bridge's own parser**, reimplemented in `ccav-smoke` from `_ceSurfImgParse` rather than paraphrased, and read off a REAL call site rather than a string the test made up — the separator and the call sites are two different bugs and only the second one was ours today. **Bridge unchanged**: the bridge was right and the engine was wrong. |
| D-64 | **Stage needed no bridge change, and the prior art D-56 pointed at no longer exists.** PART 13d `[CHAT-STAGE]` was deleted from the bridge at 3.0.29 by `[CLEANUP-44]` — fifty-seven lines of a VN layer that was declared and referenced nowhere, orphaned when CE's engine half went. What survives, and is live, is the **image anchor opts vocabulary**, two of whose tokens exist for exactly this shape of surface: `pos=bottom` (object-position 50% 100%, so a CONTAINED figure stands on its box's floor instead of floating vertically centred) and `face=left\|right` (mirror an image past the middle of its row). | Found by reading the bridge rather than the plan, which is D-59's lesson one subsystem over — and the second time the plan's note about CE code was **stale in the letter and right in the spirit**: the deleted code's own farewell note says its successor is a jsx surface built from anchor leaves and inline styles, which is what CR's Stage is. **`pos=bottom` is used; `face` is deliberately not.** It decides by counting anchor SIBLINGS, which would constrain the two figures to be siblings of each other for a cosmetic gain, and a CR slot holds a PORTRAIT rather than art drawn facing a direction — mirroring a face is a wrong picture, not a turned one. **Consequence for §6.8b**: the geometry CR needed was already spelled on the wire, so Stage cost the bridge nothing at all. |
| D-63 | **The image id never reaches the model. The adapter rewrites `[Image#<8hex>: desc]` back to `[Image: desc]` on the way into the kernel — ungated, and identity on any text without a tag.** | Found live by the author, and it is the failure mode that would have killed the feature slowly: the resolved tag sits in the document, so it went to the model every turn, and a model shown an eight-hex id enough times writes one of its own. That invented id points at nothing — and the tag it sits in is one the pass will never resolve, because the **resolved** pattern already matches it. The feature poisons itself with its own output, quietly and permanently. **The description is kept and only the id dropped**: stripping the tag outright would cost the Contact the memory of having sent a photo at all, and that continuity is worth more than the three words it takes to keep. CE performed the same rewrite for its own readers. **Not gated on the setting** — a tag already in a story must not reach the model whether or not photos are on today. **Parity is untouched by construction rather than by luck**: the transform hands back the *same array object* unless `[Image#` appears somewhere in it, so every fixture gets the identical input it got before. |
| D-62 | **Posts has two scopes, and keeping a thread MOVES it between them.** AR's threads are per pairing in `storyStorage`; CR adds `cr.keptPosts`, keyed by Contact in account storage, for posts the author wants to outlive the chat that made them. The feed shows both in two labelled groups. | Asked for by the author. **A move and never a copy**: D-48's hazard is two copies of one record, so a kept thread leaves `forumThreadsRecord` entirely and lives in exactly one place. What that costs is real and is stated on the tab rather than hidden — AR's Forum page reads `storyStorage` only, so a kept thread is no longer listed there and AR's comment, Reflect and Plan controls cannot reach it until it is returned. **AR's page stays** (D-49): CR covers reading, writing, keeping and deleting; AR still owns the three verbs CR has not ported, and the panel comes out when CR covers them. **The generator is written beside AR's, not factored out of it** (D-28) — AR's lives inside a UIParts button callback — and it adds two things AR's could not have: `suppressScriptHooks: 'self'` (D-23) and the [CR-SIDEGEN] depth counter, since a forum thread ends a generation and 0.0.45 established that the tail must not read one as a reply. |
| D-61 | **The typings are not the validator. `DecorationCreateNodeWidgetOptions.display` is documented and refused at runtime, and a refusal kills the whole batch.** | Found in the author's console: `optionsList[0] does not match any of the allowed types`, naming the wrap-clearing widget, whose top-level `display: "block"` comes straight from script-types.d.ts L1724-1725. That widget has therefore **never been created since 0.0.39** — 0.0.40's split into its own `createWidgets` call is the only reason the portraits survived it. CE measured the same thing from the other side and wrote it down as [CHARCHAT-IMGWIDGET-FIX]: match the shape the example in the typings uses, not the shape the interface permits. **Consequence for every future widget**: build from the example, add nothing speculatively, and treat a documented optional field as unproven until a live pass has kept it. §8 |
| D-60 | **Every CR-initiated generation goes through one wrapper that holds a depth counter, and onGenerationEnd's CR tail does not run while that depth is above zero.** Found live: 0.0.44's photos never reached the bridge at all. | `api.v1.generate()` fires the script's own hook lifecycle (U-02), and `suppressScriptHooks` is no help — it belongs to `generateWithStory` (SECTION CR-SCAN, 0.0.13). So a pass that runs FROM onGenerationEnd and calls the model re-enters itself: the architect's generation fired the hook, the hook found the same unresolved tag still in the document, and asked the architect again. Measured offline after the fact: **12 architect calls and 12 rewrites of one tag** on 0.0.44, against 1 and 1 on 0.0.45. **It was always wider than the photos.** The architect and enhance passes take the STORY'S model, which on a Xialong chat is `xialong-v1`, so they already cleared the tail's model gate; the cue survived only because its tail-of-document test happened to say no, and the farewell coerces itself to xialong two lines before it generates. A guard resting on another guard's luck is not a guard. **All six utility call sites** route through it now, AR's diaries and games passes included — the wrapper counts the call and has no opinion about it, so AR's four-argument calls and its own `Message[]` arrays pass through untouched (D-28). The counter is restored in a `finally`, so a throw cannot leave the tail switched off for the session. |
| D-59 | **The bridge needed no change for in-chat images, because CE's story-image painter is already running.** CR emits CE's own `ce-storyimg:<8hex>` sentinel rather than reviving `ce-chatimg:`. | Found by reading the bridge rather than the plan: `_ceStoryImgStart()` is called unconditionally at boot (3.0.28 L3238), not behind a handshake, so it is live for CR today — and it already carries the TreeWalker, the bounded climb, the debounced observer, a **pending spinner** while the generation is in flight, and download / edit / delete corners once it lands. Reviving the `ce-chatimg:` painter would have been a second copy of a working thing. One attribute, one painter, two engines — D-33's argument one subsystem over. **The one consequence came with it and is handled**: the bridge's delete corner sends `AE_STORY_IMG_DROP`, which CR did not answer; unanswered, the tag stays and resolves to nothing, which the painter reads as "still generating" and spins on forever. CR now strips the tag from its paragraph on the drop, and the anchor goes with it on the next emit. Supersedes D-57's bridge clause. |
| D-58 | **The photo instruction ships as a BRAIN, not as a context edit** (refines D-57). A button on the Contact's Brains tab writes a named entry, `Photos`, holding CE's clause; the author can reword it or delete it like any other entry, and pressing the button twice rewrites the one entry rather than adding a second. | This is what made the feature affordable. SECTION K's output is pinned byte for byte (§4), so a clause spliced into the context is a kernel change with a parity job attached — for a sentence. A brain reaches the model through **AR's own matcher, inside the kernel**, with nothing in the kernel touched: parity was 20/20 with no fixture moved. Two clauses in the wording are load-bearing and are CE's findings rather than preferences — ask for **plain words, not tags** (the architect writes the prompt), and **do not describe your own face or body** (that already leaves as the character prompt, and sending it twice draws a composite). It is also the honest shape: this text is sent on **every single turn**, so it should sit visibly beside every other always-in-context entry that costs the same. |
| D-57 | **In-chat images are CE's `[Image: …]` pipeline, ported** (author's request). The model is asked, in the prompt, to put `[Image: a plain description]` on its own line when a photo fits; `onGenerationEnd` finds the tag, runs a **chat-scoped** architect pass over the description, dispatches the generation, and rewrites the tag in place to `[Image#<8hex>: …]`; the engine then emits a node widget carrying that short id and the bridge paints the photo into it. | Prior art is complete and read this session in `CE-chat-ref-v3_7_16.txt`: the prompt clause (L3222-3228), `_charchatImageRx` / `_charchatImageResolvedRx` (L3273-3274), `buildCharChatImagePrompt` (L4978), `dispatchCharChatImage`, `_charchatProcessImages` (L5055) and `refreshCharChatImageWidgets` (L2852). **Four things to carry across unchanged, each of which was a bug once**: the pass runs on `onGenerationEnd`, never `onBeforeContextBuild`, because the architect calls `generate()` and NAI rejects a nested call while a generation is in flight; the resolved pattern requires no `:` directly after `Image`, so a rewritten tag can never re-match and the pass is idempotent; the uuid prefix lives IN the document text, so the pointer survives a reload with no side table; and the speaker's own visual record is seeded unconditionally rather than matched by name, because "me grinning" names nobody. **Not CR's `buildArchitectPromptFromStory`** — during a chat the last N sections ARE the transcript, so the story scan would compose a prompt out of chat banter. **Its own patch** (it is a HOOKS-MISC behaviour change, §4) and it carries the two-per-turn cap. Bridge: `_ccimgBuildIndex` / `_ccimgLoad` / `_ccimgInvalidate` and the `ce-chatimg:` constant all survive at 3.0.28; only the TreeWalker-and-paint half was swept, the same shape D-21 dealt with. No `kind` is needed — a `kind`-less GENERATE_IMAGE lands gallery-keyed under its uuid, which is what a chat photo wants. §6.8d |
| D-56 | **Built in engine 0.0.50.** **Stage is a subtab of the Chat screen, at full window width** (author's spec, refines D-52). Background image across the whole window; Contact and User avatars layered over it; one message shown at a time in visual-novel style; step back and forward through the history; the non-speaker shrunk and darkened. | Two consequences. (a) **It is entirely inside the shell**, so it touches no editor decoration and cannot regress the portraits, the bubbles or the gutter — which removes D-52's ordering constraint against the editor work. (b) ~~**The bridge's own stage is prior art for geometry only.** PART 13d `[CHAT-STAGE]` is alive in bridge 3.0.28 — orphaned in place when CE's engine half was deleted — but it paints BEHIND the story editor, which is not what this is. Read it for how the two figures are laid out and scaled; do not adopt its host.~~ **Superseded by D-64**: that code was deleted at bridge 3.0.29 and the prior art that mattered turned out to be the anchor opts, not the painter. Images come through the existing anchors like every other CR image. §6.8b |
| D-55 | **The left gutter is made by the ENGINE indenting the Contact's turns; the bridge only paints into the space that opens** (closes U-17). A node marker per section of each decorated run, carrying `marginLeft` and nothing else, sized at the portrait's own width plus a 12px gap. The widget row is deliberately NOT indented, so it still starts at the column's left edge and the band beside it is empty. | **Only the Contact's turns are indented**, by the author's decision: the author's own turns keep the full width and the asymmetry is what reads as two sides. **`marginLeft`, not `paddingLeft`** (which is what AR's own indent markers use, AR L4753-4763): a bubble is a node RULE writing background, border, radius and padding, so a margin moves the whole bubble right while padding would grow it inward — and margin is the one property the bubble does not set, which is what lets a marker and a rule sit on the same paragraph without either losing. **The indent is derived, never stored**: size + gap, so the size control moves the text with it and the two cannot disagree. Its own `createMarkers` call, after the portraits and only if they bound ([CR-CCAV-TWOCALLS]'s rule): text indented for a portrait that is not there is worse than no gutter. Bridge 3.0.29 paints `position:absolute; left:0` into a zero-height host instead of the negative offset that an ancestor clipped. Built in engine 0.0.43 / bridge 3.0.29. |
| D-54 | **CR writes the User's turn opener into the document after a Contact's reply** — a newline and `{ <User>: `, so the author is cued to type rather than having to remember the format. Asked for by the author; prior art is the old CE editor-chat code, which did the same thing. | The format is AR's own: the kernel reads a user turn as `{ <name>: … }` (AR 1.1.5 L5072–5073, `startsWith("{ ${chatSettings.user.name}:")`). Mechanism is `api.v1.document.appendParagraph` (script-types L2022); `documentEdit` is already in AR's top-level permission request. **Three constraints make it its own patch**: it fires from `onGenerationEnd`, which is HOOKS-MISC and parity-covered, so it is a deliberate behaviour change and lands with a fixture pinning it (§4); it must not fire on a side generation, on an unpaired chat, or when the author has already typed; and it needs a toggle on the Chat screen, because a document write nobody asked for is the one kind of bug an author cannot undo by closing a panel. §6.10 |
| D-51 | **Images do not transfer, and `char.avatar` / `char.emotions` keep no editor** (closes O-14). CR's images live in the bridge's IndexedDB at full resolution (D-33) and are too large for an 8 MB card record, so a CR-written card carries text and prompts and no bytes. AR's Metadata page was their only editor and it came out with the panel (0.0.28); nothing replaced it. | Amends **D-06** and **D-17**: card compatibility with AR/AetherRoom is now TEXT compatibility. An AR card imported into CR still brings its base64 images and CR still reads them — the loss is one-directional and only for cards CR writes. **Consequence to hold**: AR's editor decorations read `char.emotions`, so they are inert for a CR-made Contact until D-21's bridge painter lands, and that painter is now the only planned route to editor portraits. |
| D-50 | **Story time carries the time features by itself; the kernel is not touched to do it.** AR gates Time Apart and Current Events behind Track Real Time. That toggle is a **real-clock guard** — it exists so a chat is not told nine hours passed while its author slept — and a story clock only moves when the author moves it, so the guard protects nothing and would hide the schedule from the one mode built to read it. The adapter therefore passes `trackRealTime` as *the time features are on*: AR's toggle, **or** an active story clock. | Supersedes §6.6's draft, which had Track Real Time stop gating the schedule outright: in **real** mode AR's gate stands exactly as it did, so nothing an AnotherRoom user can reach has changed. The deviation is reachable **only in a mode AnotherRoom does not have**, which is why SECTION K needed no edit, no fixture moved and the oracle did not drift — 20/20 still byte-identical. The alternative (a new `ctx.scheduleActive` field) would have meant a kernel edit and a harness-adapter edit to buy the same behaviour. |
| D-49 | **Refines D-47: the hazard is two COPIES, not two doors. AR's card panels stay until CR covers everything they do, and editing the same record from both is safe.** So the Scenario editor shipped in 0.0.21 with AR's Scenario panel still in place. | D-47 read literally would have meant cutting AR's Scenario modal in the same patch — and with it the only editor for a Scenario's Brains, which CR has no surface for. That is a feature cut, and CR cuts no features. The refinement is evidence-based rather than convenient: AR's modal and CR's About tab mutate **the same `scenarioList` record** and both call `saveScenarioList`, so there is no lost update to have. Contrast D-48 one row up, where the second thing genuinely *was* a copy and the bug was real. What remains is staleness, named **CR-MODALSTALE**: AR's modal reads its values into UIParts at open, so a field edited in CR while that modal is open still shows the old text there and saving from the modal writes it back. One door at a time; the panel comes out per card type, when CR covers Brains. |
| D-48 | **`chatSettings` holds COPIES of the paired cards, not references. CR resolves the pairing by id at read time (`crLiveScenario` / `crLiveContact` / `crLiveUser`); it never re-points the snapshot.** Found live: a scene pair written on a Scenario after it was paired never reached the studio, and the Location section — which only rendered when it had something to show — reported nothing at all. | AR pairs by assignment and then serialises the whole of `chatSettings` into `storyStorage`; the trip through JSON detaches the record, so the pairing carries the card as it was when it was picked, with its own stale `cr` bag. Writing the live record back into `chatSettings` would just make a second copy of the same mistake, so nothing is written — the lookup happens at read. The snapshot stays as the fallback: a pairing to a since-deleted card should still name it. **Only CR's own readers use the helpers.** AR's panels and SECTION K read `chatSettings` directly and are left alone — the kernel's output is pinned byte for byte, and "fixing" what it reads is a behaviour change wearing a bugfix's clothes. Name the class **CR-PAIRSNAP**: anything reading the pairing goes through a live reader. |
| D-47 | **CR edits its own fields as each surface lands; AR's core fields and card creation arrive together, with the retirement of AR's panels (D-25).** Not sooner, and not field by field. | The rule behind it: **never two editors for one field at once.** A name editable both in CR's profile and in AR's card panel is two writers on one record with no agreement about who saved last, and the bug it produces looks like a card silently reverting. CR-only fields have no such conflict — nothing else writes `cr` — which is why the Images and Visuals tabs could ship the moment their data did (0.0.4, 0.0.17, 0.0.19). AR's fields stay read-only on CR's profiles until the patch that takes the old panel away in the same breath. **Creating and deleting cards goes with it**: New and Delete belong on the Cards surface beside the rows, and shipping them while AR's listing panel still has its own pair would mean two doors to the same irreversible verb. Sequenced per card type — Scenario first (three text fields), then User, then Contact (schedules, example chats and brains make it the largest). |
| D-46 | **A Scenario is CR's location record, and a User is a character that cannot emote.** Closes O-13 with (a). A Scenario carries `CrSceneCard` — a scene pair that joins the base prompt of every illustration drawn while it is the chat's Scenario, and a banner pair for drawing the place itself. A User carries the Contact's four prompt pairs and can be picked into an illustration's cast. | `CrSceneCard` rather than `CrImgCard`: a place only ever enters the scene, so "universal" and "illustrator" would be four fields no assembler could read — the sanitizer drops them. A User gets no emotion set for the mirror reason: nothing in CR ever asks a persona for a mood line. The assemblers therefore take `CrCastCard = Character \| User`, while `crSlotTag` still takes a `Character`, because only a Contact has slots to tag. No separate location record family: the Scenario is already the chat's setting, and a second record for the same place is a thing to keep in sync. |
| D-45 | **A downloaded image already carries its generation data. D-44's second half is withdrawn; no tEXt patch is needed.** Confirmed live on bridge 3.0.24 / engine 0.0.16 (2026-09-12): Download from the gallery sheet produces a file with its metadata intact. | The first half of D-44 stands and is what shipped. The residual is a reading, not a task: `_toWebPForStore` re-encodes on save and `_downloadAsPng` redraws through a canvas, and neither of those should preserve a text chunk — the likely reconciliation is that the stored bytes stay PNG here, since `_toWebPForStore` keeps the original whenever WebP encoding is declined and `_downloadAsPng` passes a PNG straight through untouched. **If a downloaded file is ever found bare, that pair is where to look** — and the sheet's own "not in the file yet" note comes out with 0.0.18, since it is now wrong. |
| D-44 | ~~**The gallery surface needs no new bridge message; a PNG that carries its metadata needs a bridge patch.** Listing, thumbnails, delete and download are already in the protocol: `AE_GALLERY_INDEX_REQ` → `_RESP` projects each record to `{uuid, prompt, storyId, createdAt, hasBytes}`, newest first, over a cursor rather than `getAll`; `AE_GALLERY_ACTION` carries `delete` and `download`; and the painter's `thumb=1` anchor opt paints the record's stored thumbnail instead of its bytes. | The gap is metadata, and it sits **upstream of the download**: the bridge re-encodes every stored image to WebP at save time (`_toWebPForStore`), so NovelAI's PNG text chunks are gone before the record exists, and `_downloadAsPng` redraws pixels through a canvas. A file that carries its prompt therefore has to have the chunk **written**, at download time, from what the record already holds — `prompt`, `chars`, `settings`, `ts` — as a `tEXt` chunk the bridge builds. Its own patch, and the first CR change to the bridge since 3.0.24. Storing the original PNG bytes instead is rejected: it multiplies storage for every image to preserve what is already there as fields.~~ **Metadata half superseded by D-45**; the no-new-message half stands. |
| D-43 | **A story image sends no `kind`; a slot image sends `kind: 'charSlot'`.** The bridge branches on it — `'charSlot'` writes a portrait key, the studio path sends none and the result stays gallery-keyed under its uuid. | A scene must never land on an emotion slot: an overwritten slot is not recoverable. The result is displayed through the painter's **second anchor form**, `ce-gallery|<uuid>`, so no new message and no new attribute were needed. A story image also takes the **account** seed, never a Contact's avatar seed — that seed exists to make a set of portraits consistent and would flatten every scene to one composition. |
| D-42 | **The illustration port lands in two patches: the prompt engine, then the surface.** `SECTION CR-SCAN` (engine 0.0.13) is the half with no UI in it — read the document, detect the cast, run the architect pass. The Illustrator surface consumes it next. | Nothing in a surface depends on it yet, so the pass can be run and read from Global before anything is built on it. **The cast is named, not described** (CE's `ARCH-V45`): a Contact's appearance already ships as its own character prompt, so repeating it in the scene prompt sends it twice and the model draws a composite. Detection is whole-word and never fuzzy — a wrong Contact costs a whole extra character prompt. |
| D-41 | **Every CR control shows hover and press, in JavaScript.** A jsx part carries no stylesheet, so there is no `:hover` or `:active` to write and an inline style cannot express a pseudo-class. | `CrButton` holds its own `useState` pair; tabs, rail items and slot tiles wrap in `CrPressable`, which returns the two flags and the pointer handlers. New tokens `--cr-fill-hover`, `--cr-fill-press`, `--cr-motion`. **Pointer events, not mouse** — touch sends them too, and `pointercancel` stops a press that became a scroll from staying visibly held. State is per control; through the store it would repaint the tree on every mouse move. |
| D-40 | **One press, one image. CR never generates unattended.** Unattended, script-driven generation is against NovelAI's terms; the batch "generate every empty slot" control shipped in 0.0.10 was deleted in 0.0.11. | Spacing the calls out did not change what it was, only how noticeable it was. Nothing in CR may loop over slots, retry a generation on its own, or fire one from a hook rather than a control the author has just touched. The Photos button now opens the next empty slot's sheet instead. **Do not re-add it.** |
| D-39 | **CR-STYLE is a token scale plus a primitive set, and it is enforced by grep.** Sizes and gaps were hand-typed literals in every surface, which meant nothing could be tuned once and no two surfaces were alike. | Six type tokens, five space tokens, eleven colour tokens, and no `px` for type or space anywhere in a CR surface (§9.3). Every ad-hoc control folded into a primitive. |
| D-37 | **Four prompt pairs per character, split by which generations they enter.** `base` → the scene prompt of any image they appear in; `universal` → always in the character prompt; `illustrator` → **illustrations only**; `avatar` → **avatar and emotion slots only**. Plus an avatar seed and toggleable outfit chunks. | The `illustrator` pair is why the split exists: "thick thighs" in `universal` drags a bust shot out to full body so the model can obey it. `crAssembleCharacterPrompt(char, purpose)` is the only place that decides which pairs enter. AR's `appearance` is the **fallback** for `universal`, not a peer. All of it in the `cr` bag, so it exports with the card. |
| D-38 | **An emotion tag is account-level; a Contact may override it.** "crying, tears" means the same thing for every Contact, so editing a slot tag writes the account default. | Three layers, most specific first: the Contact's `imgTags`, the account default, then the slot's own name. The last is why an untouched install behaves as it did before the setting existed — every `EMOTION_LIST` name is already an adjective. Editable as a full table in Global or one slot at a time in its sheet. |
| D-34 | **The engine owns the prompt and the settings; the bridge owns the dispatch and the bytes.** Fixed by the platform, not chosen: there is no image generation anywhere in `api.v1` and the sandbox has no network, while the bridge holds the NAI session. | CR sends CE's `GENERATE_IMAGE` payload with `kind: 'charSlot'` — **no bridge change needed**, and a slot generated from a CR surface is indistinguishable in storage from one generated by the Studio. Model default is V4.5 Full, the bridge's own fallback, so a fresh install generates what it would have anyway. |
| D-35 | **Prompt chunks are a list; a slot's tag is card data.** Chunks carry a quality fragment, a negative fragment, a weight and a standing active flag, compiled into the one pair every generation path uses — account level, in Global. A slot's own tag lives in the `cr` bag as `imgTags`. | Weight 1 stays plain text rather than `1::text::`, keeping a compiled prompt readable. The tag is the Contact's, so it exports with the card; the chunks are the author's and apply to every Contact. |
| D-36 | **CR's sheets are jsx, not UIParts.** A modal hosts a `UIPartJSX` like any other part, so a sheet is the same tree the shell is — same tokens, same primitives. | `CrModalBody` subscribes to the store so a sheet repaints on `crTouch`; a slot sheet that stayed stale after its own Generate would be worse than none. |
| D-33 | **Slot images live in the bridge's IndexedDB; the engine handles no bytes and keeps no record of what exists.** 0.0.7's card-base64 path is withdrawn — it pulled in AR's crop tool, which only exists because a card carries its own bytes inside an 8 MB record. | `op:'upload'` makes the bridge pick the file, decode, store `<charId>_em_<slot>`, bump the painter epoch and toast; only charId and slot cross the boundary. Display is a `data-ce-img` anchor the bridge's shadow-root painter fills, with `collapse=1` gating an empty one. **CE's attribute name on purpose** — one attribute, one painter, two engines. Filled-ness comes from the slot probe, never from an engine-side mirror: a mirror's failure is silent, and an image missing from it never paints. |
| D-32 | **CR surfaces write through AR's own save path, and repaint via a rev counter.** A CR control that edits a card calls the same sequence AR's control calls — size check, crop modal, `saveCharList`, `reflectCharChangesInChatSettings`, editor repaint — written as a new function beside AR's, never by factoring AR's panel apart (D-28). | The JSX tree renders from `charList`, which the store cannot observe, so every mutation ends in `crTouch()`. The alternative — mirroring AR's lists into stores — would mean two sources of truth for records AR's panels still edit. Revisit when the AR doors are retired. |
| D-31 | **Two shell layouts, an explicit setting, mobile by default.** The author reads CR on a phone; the first shell was desktop-shaped and a side rail took 44% of a 380px viewport. | Not a media query — a jsx part carries no stylesheet, so there is no `@media` and no container query without the tree measuring its own host. One stored value at `crShellLayoutKey` (account level), picker at the top of Global. Mobile: bottom nav bar, back control on its own row, tighter rows, denser slot grid, scrolling tab strip. Window dimensions are read at open, not on toggle. |
| D-30 | **A .naitheme can only reach CR through `--cr-*` custom properties.** JSX renders in a shadow root, so page CSS cannot select anything in the shell; custom properties inherit across the boundary, which is how NovelAI hands jsx its own `--theme-*`. | CR-STYLE is a token list, not a stylesheet. Every colour in the shell is `crVar(name, fallback)` with a NovelAI theme token as the middle fallback, so an unthemed window matches the site. Classes are still written on every element — free, readable in devtools, live if the shadow root ever goes. |
| D-29 | **CR fields are additive under one `cr?` bag; AR's fields are never reshaped.** §4.5's draft had `avatar` and `emotions` becoming `CrImageRef` — that is a reshape of fields AR's editors, AR's export and SECTION K's snapshot all read, so it is withdrawn. | `Character` gains exactly one line, `cr?: CrContactExtra`, and every future CR field goes inside the bag rather than beside it. CR's reference-based images live at `cr.images` and coexist with AR's base64 strings. Export adds one key AR ignores; a Contact with no CR data emits no `cr` and its card is byte-identical to AR's output. |
| D-28 | **CR stays merge-compatible with upstream AnotherRoom.** If Triplis ships 1.1.6, applying it to CR must be a diff, not a rewrite. | The governing rule for every patch from here (§9.2). AR's records, functions and lines are left alone; CR adds beside them in `[CR-*]`-tagged sections. AR's UI is not amended — it is **replaced wholesale by the JSX shell** in P4, which is a deletion upstream never conflicts with. The kernel is the one accepted divergence: SECTION K replaced AR's context hooks outright, so an upstream change there is a parity job (re-point the harness at the new oracle, re-run, port deliberately), not a merge. |
| D-27 | **Contact scope comes from the portrait key, not from a gallery field.** The portrait store keys images `<contactId>_em_<slot>`, so a slot listing is Contact-scoped and story-independent with no scope field at all. | Closes the half of U-08 that matters for avatars and emotions. The gallery store is separate: its `chars` field is the generation's prompt fragments (`{name, visuals, uc}`), **not** an owner, so gallery ownership needs a real `owner` written at save time — a write-path change that lands with CR's first image generation (P5), never a backfill (a CE gallery record has no CR Contact). |
| D-26 | **One engine at a time is documented, not enforced.** The bridge remembers whichever engine last handshook; CE and CR must not be enabled in the same browser session, and the install notes say so. | No second-engine guard, no lock, no toast on the bridge side. The handshake carries identity both ways (`engine`, `crAware`) so a wrong pairing shows in CR Global's bridge status instead of failing silently. Revisit only if it bites in practice. |

### 1.2 Open

| ID | Question | Options | Leaning |
|---|---|---|---|
| ~~O-10~~ | Closed by D-21. | | |
| D-53 | **Chat bubbles are an account default with a per-Contact override** (the D-22 pattern), answered by the author. So the look record lives account-level in `storage`, and a Contact may carry its own partial override in its `cr` block; the resolver reads Contact-then-account per field, as the emotion tags already do. | Deciding this before building matters because moving a record between account and card storage after the fact is a migration, not an edit. §6.8c |
| D-52 | **Closed by D-56, built in engine 0.0.50.** **Stage mode**: a visual-novel reading of the chat as a jsx surface, not an editor decoration. Background image full-window, Contact and User avatars layered over it, last message in VN style, step back and forward with the non-speaker darkened and scaled down. | Author's design. Prior art is CE's under-developed "stage" mode, **not present in the CR reference extracts** — to be procured when the work starts. Sequenced AFTER the editor surface (6.8), since it reads the same resolved emotion (6.5). §6.8b |
| ~~O-11~~ | Closed by D-22. | | |
| ~~O-13~~ | Closed by D-46 (a), built in engine 0.0.18. Original question: does a Scenario carry image prompt fields — a scene pair — making it CR's location record? | (a) yes: a `cr.img` base pair on the Scenario, folded into any illustration while that Scenario is the chat's; (b) no: locations become their own record family later, and a Scenario stays a text card with a banner | (a), on the grounds that the Scenario is already the chat's setting and a second record for the same place is a thing to keep in sync. Not built in 0.0.17: the sanitizer drops an `img` bag on a Scenario and the fixture pins that, so the field cannot appear half-decided. |
| ~~O-14~~ | Closed by D-51. Original question: once AR's Metadata page goes, what keeps `char.avatar` and `char.emotions` — the **base64 card images** — editable? They are AR's fields, CR's Photos deliberately writes the bridge store instead (D-33), and AR's card modal is their only editor. They are read by AR's editor decorations and written into every exported card (D-06, D-17). | (a) CR writes them again from Photos, which drags AR's crop tool and the 8 MB card limit back in — the exact thing D-33 walked away from; (b) **export synthesises them at export time from the bridge store**, so a card is still portable and the engine still holds no bytes at rest — needs one new bridge message, "give me the bytes under these keys"; (c) CR-written cards stop carrying images, and AR/AetherRoom compatibility goes with them | Answered **(c)** by the author: CR's images are too big for an AR card, images are the one thing that does not transfer, and the panel may die without a replacement door. See D-51. |
| ~~O-15~~ | **Closed at 0.2.1 on the leaning, author's go-ahead: (a), per story.** Where sheets and resource values live (D-91). | (a) per story in `storyStorage`, keyed by ruleset and person: a campaign is a story; (b) on the card's `cr` bag, so a sheet exports and follows the Contact into another story; (c) a default on the card, live values in the story | (a) for resources in every case. For modifier rows (a), because (c) is two copies of one record (D-48's hazard) and (b) carries one campaign's HP into the next. Deciding first matters: moving a record between story and card later is a migration (D-53). |
| ~~O-16~~ | **Closed by D-93.** Where a reaction lands (D-91). | (a) shown in the Games surface only, as AR's reaction is, built from the sheet and the outcome with no transcript; (b) written into the story as the Contact's reply, built with the chat's context, so the next Send continues from it | Asked of the author. A Gamemaster Contact wants (b): a narration the chat cannot read is lost. Under (b) only the reply is written, never the outcome line, per D-63. |
| ~~O-12~~ | Closed by D-23. How CR's side generations assemble context (U-02 finding) | (a) mimic AR: let the chat-context hook rewrite them, side effects included; (b) build the side-gen prompt through the kernel explicitly — character sheet, user, scenario, brains — and call with `suppressScriptHooks: 'self'`, the way CE's own story-context gens do | (b). It keeps what makes AR's side gens work (the AetherRoom sheet) and drops what is accidental (plan aging, `<think>` on the primer, a second style tag). Output should be compared once against (a) before the switch. |
| ~~O-17~~ | **Closed by D-106.** **How a long card list is organised** (author's item 2, 2026-10-24). | (a) search box, sort (name, last paired, newest) and a row/grid toggle — no new data; (b) group by the `tags` a card already carries, one folding `CrHeading` (D-74) per tag; (c) folders the author names, one per card, kept account-level in a `cr.cardFolders` map rather than on the card, so an export does not carry the owner's filing; (d) a pinned row on top | (a) always, plus (c). **Not (b)**: `tags` is a prompt field — the kernel writes it into the sheet (`Tags:`, fixture `tags-merge`) — so filing by it would mean editing what the model reads to tidy a list. Asked of the author. **Widened 0.74**: the Group tab's member picker is the same long list, so one list component answers both. |
| ~~O-18~~ | **Closed by D-107.** **A brain set: several variants, exactly one active** (author's item 3, 2026-10-24) — Scenario locations, outfits. What a variant is, where the choice lives, how it reaches context and images. | A variant = name, brain text, an image prompt pair, optionally its own image slot. **Owner**: any card (a Scenario for places, a Contact or User for outfits). **Choice**: (a) `historyStorage` per story, so undo rewinds a move; (b) `storyStorage`. **Context**: the K-CONTEXT adapter hands the kernel the active variant as one more brain of its owner, so SECTION K is untouched and parity holds for every chat with no sets. **Images**: the active pair joins the prompt the way the Scenario's base pair (D-46) and outfits do; a variant slot `<cardId>_em_<slot>` (bridge-safe name) replaces the Stage backdrop/Banner for a place, the portrait source for an outfit — no bridge change, the surface painter already takes `id\|slot`. **Existing outfits** (`CrImgCard.outfits`, image-only, several on at once): (i) keep them as layers beside sets; (ii) fold them into a set | (a), (i). A move is a story event, so undo should take it back; outfits stay because layering (coat over dress) is what they already do well, and folding them in is a migration (D-20). Model-driven switching waits: a location line written into the story is D-63's hazard. |
| O-19 | **Tamagotchi mode** (author's item 4, concept, 2026-10-24). | §6.12. | Mapped at 0.80 as **Home**, four steps; step 1 (sets chosen by schedule and relationship) stands alone and comes first. |
| ~~O-20~~ | **Closed by D-107.** **A Brains tab on Chat: every brain in play, live state, switch it here** (author's idea, 2026-10-24). One list for the paired Contact, the User, the Scenario and each group member — card brains, conditional brains, floaty brains, O-18's sets — showing which are in the next build and letting the author suppress or restore each for this chat. | **State shown**: plain brains are on unless suppressed; a conditional brain's state is whether it fired, so the list shows the last build's result (recorded in `onBeforeContextBuild`) beside its keys and intimacy gate rather than predicting it; a set shows as one row with its variant picker, which is where O-18 switches. **Where suppression lives**: (a) per story, `storyStorage` `cr.brainsOff` {cardId: names}; (b) `historyStorage`, so undo restores. **How it applies**: the K-CONTEXT adapter filters the owner's brains before the kernel sees them, exactly as O-18 adds a variant — SECTION K untouched, parity unaffected for any chat with nothing suppressed; a fixture pins a suppressed brain's absence. **Floaty brains** already have on/off; the tab writes their existing state rather than a second one. | (a): suppressing is a setting for this chat, not a story event. Build O-18 and O-20 as one patch series — the tab is O-18's switch. A suppressed brain is matched by name within its card, so a renamed brain comes back on; that is the safe failure. |

---

## 2. Unknowns and spikes

| ID | Question | Why it is load-bearing | Probe |
|---|---|---|---|
| ~~U-01~~ | ~~Is `storyStorage` scoped per script inside a story?~~ | Closed, moot: no migration (D-20). | — |
| ~~U-02~~ | Does `generateWithStory` fire AR's own `onContextBuilt`? | **Closed from CE's settled finding**: `api.v1.generate()` fires the full hook lifecycle (CE engine ~L6867, and the note at its `onBeforeContextBuild` guard ~L26644, settled in CE-INDEX); `generateWithStory` is `buildContext` plus generate. So every AR side gen runs AR's own `onBeforeContextBuild` and `onContextBuilt` on xialong-v1. The rewrite is **load-bearing** — AR's side-gen prompts carry only a format line and a primer; the character sheet comes from the rewrite. It also has side effects on the real (non-dry) pass: plan turn bookkeeping and saving, the chat `[ Style: … ]` and extras spliced in before the primer (the primer is the last assistant message), and a chosen plan prepended to the primer as `<think>`. Handling: O-12. | — |
| U-03 | Which fields are voiced (D-11) | Sets each field's model. **Two utility passes are already waiting on the answer**: the architect (0.0.13) and enhance (0.0.15) both take the story's own model, because choosing glm-4-6 for one descriptive pass and not the other would be the split made by accident. Answer it for both at once. | S-03: every generatable field × three cards on both models, read side by side. |
| U-04 | Decoration widget cost with image `src` | AR caps at 50 hard / 25 soft widgets (L3833). Full-resolution portraits through `src` may be heavy. **CR now has a cap of its own** (`CR_CCAV_MAX_RUNS` = 24, engine 0.0.39), taken from the END of the document, because each decorated run costs two widgets once the clearing widget is counted. Whether 24 is the right number is the live question. | Time `updateEditorImages` with 25 thumbnail vs 25 full data URLs; then scroll a long chat with 24 runs decorated and watch for typing lag. |
| U-05 | Floating window + editor at once | D-04 assumes the window does not block typing in the editor. | Open a window, type in the editor, send. |
| U-06 | Canvas in JSX under the window host | AR's crop tool (`ImageCropAndResize`, L2985) draws to canvas refs today inside a modal. | Mount it in the window host. |
| ~~U-07~~ | ~~Transport double-install~~ | Closed: one bridge (D-15). | — |
| U-08 | The shared bridge with a second engine | The bridge remembers one handshaken engine id and stamps gallery records with the active story; CR needs Contact-scoped (cross-story) images. | **Handshake: closed live** (CR 0.0.2 / bridge 3.0.23). **Everything else waits for a door** — the slot probe and the gallery scope are both unexercised until CR can put an image in the store (P5). Design answers recorded: portraits are key-scoped (D-27), the gallery needs an `owner` written at save time. CR sends no `STORY_ID_SYNC` and no `storyId`; the bridge reads empty as "unscoped", which is what CR wants. |
| ~~U-15~~ | **Closed by engine 0.0.34/0.0.35.** AR's `clearEditorImages` sweeps CR's widgets too — CR-PLAN 6.8 requires handle-tracked widgets never swept; AR's `clearEditorImages` calls the global `decorations.clearWidgets()` and is reached from the Contact pairing, the Use Image Decorations toggle and the emoji delete. | Settled the second way AND the first: both paths dispose what they own by handle, which made AR's sweep precise rather than a blunt instrument that happened to work while it was the only caller. `clearWidgets()` survives as the post-reload recovery path. The residual it left is separate and was its own bug — AR's `updateEditorImages` read `info.position.sectionId` off every widget and CR's node widgets have none, so load threw until 0.0.35 skipped them. |
| ~~U-16~~ | **Closed by bridge 3.0.25.** The sentinel did not fit CR-PLAN's opts form: The bridge's `_ccavContainerFor` aborts its climb when the host's trimmed text exceeds **80 characters**. `ce-chatava:` + a 36-char uuid + emotion leaves ~20 chars; CE's positional `\|<sizePx>\|<shape>` fits, `size=40,shape=round,place=gutter` does not. | Settled by raising the guard rather than shortening the opts, so the key=value form stands and stays additive: `[v3.0.25 CCAV-GUARD-RELATIVE]` measures the climb against **the sentinel's own length** rather than a flat 80 characters. Not a flag day in the end — an older engine's shorter sentinel passes the relative test too. |
| ~~U-17~~ | **Closed by engine 0.0.43 / bridge 3.0.29 (D-55).** The original finding stands and is why it took an engine change: **a true left gutter needs the text indented first.** NAI's editor has no space left of the text column: `left:0` paints the portrait onto the text, a negative offset is clipped away by an ancestor and vanishes. The placement was removed in engine 0.0.38 rather than left in as a control that did nothing. | AR already has the mechanism — `markerIndentWidgets` / `createMarkers` indent a section, which is how AR made room for its own decorations. Engine side — and that is what shipped: the engine indents the Contact's paragraphs with node markers and leaves the widget row alone, so the bridge paints at `left: 0` into real space. "Beside" (float) remains the default and the fallback for an older bridge. |
| ~~U-18~~ | **Answered at 0.0.68: no.** Two native Sends read 57344 in / 2048 out before and after, unchanged. ~~Does a native Send draw on the script's own allowance?~~ | Decides whether the paired Contact's turns compete with a member on the main script. Assumed not — Send is the user's generation — and never measured. | The rig's `native Send` line: `getAllowedInput`/`Output` read in `onGenerationRequested` and again in `onGenerationEnd`. Built 0.0.68. |
| ~~U-19~~ | **Answered at 0.0.69: yes, with no interaction.** Helper 1 read 57344 / 2048 again eleven minutes after a call that left it at 56542 / 1996, and Helper 2 after twenty-five idle minutes; back-to-back calls eighteen seconds apart showed no refill between them. ~~Does a UI-less helper's allowance replenish?~~ (reference A5) The typings say allowance refills "as long as the user has interacted with the script recently", and nobody interacts with a helper. | If it does not, a spill helper is a one-time reserve rather than a second stream, and D-86's headroom argument shrinks to one session. **Fallback if it fails**: each helper registers its own toolbar button, so a press counts as interaction with that helper. | Drain a helper's output, leave it idle while chatting on Send, Refresh after ten minutes; the Group tab shows each reading's age. |
| ~~U-20~~ | **Answered at 0.0.68: an `ai`-tagged paragraph comes back as assistant text** — the next native Send's context carried both members' replies inside the assistant message. The tag was kept on every call (`origin ai`). ~~How does `buildContext` role a paragraph a script appended?~~ CR writes member replies tagged origin `ai`; untagged script appends carry `script` (found at 0.0.66). | If `ai` is refused or ignored, a member's own earlier turns may come back as user text and D-85's tail test reads the wrong speaker. | The probe's `origin` field says whether the tag was kept; the `shape` field records the roles of the last four messages the kernel was handed. |
| ~~U-21~~ | **Answered at 0.0.68: yes, and `onContextBuilt` does not** — `hooks before=yes built=no` on every member call. ~~Does this script's `onBeforeContextBuild` run under `buildContext({ suppressScriptHooks: 'self' })`?~~ The typings promise only that `onContextBuilt` is skipped. | It is how a member's brains reach its prompt. If it does not run, the member gets no brains. | The probe's `hooks before=` flag, per call. |
| U-22 | **Cache behaviour at CR's prompt sizes** (0.0.68: both first calls read cold, as expected. **0.0.69**: the same helper serving the same member read warm — 56 of ~915, 191 of ~986, 202 of ~1053 — and partial, 271 of ~1002, eleven minutes after its last call; `countUncachedInputTokens` threw "requires a non-empty model string", U-24): per-script (F4) and multi-prefix (F5) rest on one run each; capacity (F6) and idle lifetime (F7) are unmeasured. | `PH_PERSONAS_PER_SCRIPT` is 1 until F6 is known; a member nobody spoke to for a while may be cold. | The probe's `charged` verdict (warm ≤25% of prompt, cold ≥60%) across a real session, then reference §9's capacity and idle tests. |
| U-23 | **Does a native reply to a re-roled tail land as a new paragraph?** Engine 0.0.70 ends the list on an empty assistant turn while the document still ends in the member's paragraph, and prepends one newline to the reply's first chunk through `onResponse`. | Unmeasured how the editor places a reply that is a new message while the story ends in model text. Too few newlines glues the reply to the member's Emotion line; too many leaves a blank paragraph, which is harmless. | Send straight after a member's reply; check where the paired Contact's line starts. |
| ~~U-24~~ | **Answered at 0.0.70: yes.** Every call returned a number, and it equalled the charged input exactly on all eleven. ~~Does `countUncachedInputTokens` take the model as a second argument?~~ Typed with one (script-types L1919); the runtime threw "requires a non-empty model string". Engine 0.0.70 and helper 0.0.3 pass `xialong-v1` second. | The probe's `pred` is the only way to read cache state before spending a call. | The helper's `pred` in the next log: a number closes it; a new `predErr` says what it wants instead. |
| U-25 | **How does a native reply's `*emphasis*` sit in the document, and what does the model see of it?** Engine 0.0.71 writes a member's pairs as italic formatting without asterisks, matching what the author sees on the paired Contact's replies. | If NovelAI serialises italics back to asterisks at context build, both speakers read the same; if it does not, both lose the emphasis alike. Either way they match; the probe line's `origin` says `ai+italic` when the formatting was kept. | Compare a member's and the paired Contact's italic text in one logged context. |
| U-26 | **Why do some member calls read cold with the same helper and a short gap?** 0.0.70: Helper 2 read cold 2199 of ~2661 two minutes after its previous call; Helper 1 cold after ten idle minutes. | A cold call is a full read of the prompt against that helper's input allowance. | 0.0.71's `diverge` field names the first message that changed since that member's previous prompt, and where in it. |
| U-27 | **Addressed by engine 0.0.73 + bridge 3.0.34, pending live.** **A photo inside a message, and a second reply from the same Contact.** Live 0.0.71: with the paired Contact answering twice and the second reply carrying a photo, the portrait sat above that reply instead of beside it; and photos never take the owner's bubble. | Both are painted by the bridge — the engine only places a sentinel after the tag's paragraph — so neither can be diagnosed without the painter's code, which is not in this project. | **Found with the bridge in hand**: the painter has no clear of its own, so the layout alone does not explain the portrait leaving its reply; the timing does — the photo pass rewrites the tag's paragraph while the generation-end repaint is placing portraits and bubble markers against it, and only the photo anchors were re-placed afterwards. 0.0.73 repaints everything after the rewrite. Photos now copy the computed look of the paragraph above them (bridge). Live: a second reply with a photo keeps its portrait and the photo sits in a bubble; if the portrait still leaves, say whether a reload puts it back. |
| ~~U-09~~ | Decoration widgets as paint targets | Closed: STORYIMG does this live today (D-21). Residual: avatar geometry in a node widget above a turn — the old path left `__ceCcAvDiag` because its positioning was "hypotheses about what NAI renders here". | Run the diag on the first CR build. |
| ~~S-01~~ | Kernel parity harness | **Done** (P1): 20 fixtures, 50 steps, byte-identical; 19/19 mutants killed. | `characterroom-p1/` |

---

## 3. Source inventory — AnotherRoom 1.1.5

### 3.1 File map

| Lines | Region |
|---|---|
| 1–48 | Frontmatter (one config: `diariesAndBrainsSummonedByConfig`), credits, 1.1.5 changelog, TODO (forum user replies) |
| 50–122 | Random-name helpers, forum placeholder avatar, **top-level permission request** (`fileInput`, `fileDownload`, `clipboardWrite`, `documentEdit`, `editorDecorations`) |
| 124–360 | Globals, enums, types: intimacy, style, response length, 24 emotions, cards, brains, schedule, chat settings |
| 361–713 | **Jots** (internal name RememberMe) — per-pairing facts; import/export |
| 714–1318 | **Floaty Brains** — story-level entries, per-pairing active state, manual order; import/export |
| 1319–2984 | **Diaries hub** — five pages: Diary, Plans, Forum, Imitate (ContinuityCreation), Process (EmotionalMemory) |
| 2985–3335 | **Image crop/resize** — the one JSX component in AR; 128×128, progressive downscale; 20 KB limit (L3265) |
| 3336–3755 | **Games** data + reactions (RPS, Number Guess; Blackjack present, hidden) |
| 3756–4098 | **Editor images** — emotion-dimming rule, name bolding, avatar/emotion/emoji widgets |
| 4099–4634 | **Chat settings** — pairing, scenario, tags, intimacy, style, length, greeting insert, Track Real Time |
| 4635–4818 | Macros, **system prompt builder** |
| 4819–5088 | `onGenerationEnd`, `onHistoryNavigated`, **`onBeforeContextBuild`** |
| 5089–5529 | **`onContextBuilt`** — rollover, rebuild, style, time apart, schedule, emotional modes, plans |
| 5530–5570 | Macro sampler UI |
| 5571–6176 | **Scenario cards** |
| 6177–6710 | **User cards** |
| 6711–8376 | **Contact cards** — import/export, schedule editor (6914–7209), example-chat editor (7210–7386), five card pages |
| 8377–8861 | Markdown/bold-speech helpers, message bubbles, response parser |
| 8862–9297 | **Delete with farewell** generation; card listings |
| 9298–10262 | `api.v1.ui.register`: two sidebar panels, two script panels, toolbar/context buttons |
| 10263–10268 | `onScriptsLoaded` (editor images, emotion rule, name styling) |

### 3.2 Hooks

| Hook | Model gate | What it does | Kernel? |
|---|---|---|---|
| `onBeforeContextBuild` | xialong-v1 + char + user | Returns `temporaryLorebookEntries`: floaty brains, Jots as "Facts About {user}", and keyword-matched diaries, Process memories and conditional brains (intimacy-gated) over the last 1000 words, phrase keys up to the longest key. Contains a **dead commented block** that once rewrote `{ … }` lines. | yes |
| `onContextBuilt` | xialong-v1 + char + user | Replaces the message array (§3.7). | yes |
| `onGenerationEnd` | — / xialong for time | Refreshes editor images; stamps real-time record; clears the initial-trim flag. | split |
| `onHistoryNavigated` | — | Refreshes editor images on redo / forward jump. | door |
| `onScriptsLoaded` | — | Editor images, emotion rule, name styling. | door |

### 3.3 Doors (current UI entry points)

| Door | Kind | Opens |
|---|---|---|
| ~~AR Cards~~ | ~~sidebar panel~~ | **Retired in engine 0.0.28.** Cards, the three profiles and every card field are the shell's now |
| AR Global | sidebar panel | Default author, Use Image Decorations, emoji set import/delete, Use Emotional Modes |
| AR Chat Settings | script panel | Pairing, scenario, tags, intimacy, style, response length, Insert Greeting, Track Real Time, injection status |
| AR Games | script panel | RPS, Number Guess, reset stats, include-stats toggle; Blackjack hidden |
| AR Jots | toolbar button | Jots modal |
| AR Brains / AR Diaries | toolbar **or** context menu, by config | Floaty Brains modal / Diaries hub |
| ~~Card modal~~ | ~~modal, paged~~ | **Retired in engine 0.0.28**, with AR's schedule editor and example-chat modal. The base64 card images it edited have no replacement, by decision (D-51) |

### 3.4 Storage keys

`combinedId` = `char.id + user.id`, concatenated with no separator.

| Key | Scope | Shape | Feature |
|---|---|---|---|
| `characterListKey` | account | `Character[]`, **base64 images inside** | Contacts |
| `userListKey` | account | `User[]` | Users |
| `scenarioListKey` | account | `Scenario[]` | Scenarios |
| `defaultAuthorKey` | account | string (bound input) | Card authoring |
| `useImageDecoKey` | account | boolean (bound) | Editor images |
| `useEmotionalModesKey` | account | boolean (bound) | Emotional modes |
| `emojiRefKey` | account | `Record<emotion, dataUrl>` | Emoji set (global) |
| `gameRecordKey` | account | `Record<GameType, Record<combinedId, stats>>` | Games |
| `includeGameStatsKey` | account | boolean (bound) | Games → prompt |
| `chatSettingsKey` | story | `ChatSettings` with **full card snapshots** | Chat |
| `trackRealTimeKey` | story | boolean (bound `story:`) | Real time |
| `trackRealTimeRecordKey` | story | `Record<combinedId, epochMs>` | Time apart |
| `rememberMeKey` | story | `Record<combinedId, {text,id}[]>` | Jots |
| `floatyBrainsKey` | story | `{id, active, entry}[]` | Floaty brains |
| `floatyBrainsStateKey` | story | `Record<combinedId, {id, active}[]>` | Floaty brains |
| `floatyActiveIdsKey` / `floatyInactiveIdsKey` | story | `string[]` (display order) | Floaty brains |
| `diaryBrainsRecordKey` | story | `Record<combinedId, BrainConditional[]>` | Diary |
| `actionPlansRecordKey` | story | `Record<combinedId, ActionPlan[]>` | Plans |
| `forumThreadsRecordKey` | story | `Record<combinedId, ForumThread[]>` | Forum |
| `emotionalMemoryRecordKey` | story | `Record<combinedId, BrainConditional[]>` | Process |
| `continuityCreationRecordKey` | story | `Record<combinedId, BrainEntry[]>` | Imitate |
| `lastCropValuesTempKey` | temp | crop rect | Crop tool |
| game display keys | temp | strings | Games |

| `cr.clockMode` | story | `"real"` or `"story"` | Clock (D-50) |
| `cr.clockStep` | story | number (minutes per reply) | Clock |
| `cr.clock` | **history** | number (epoch ms) | Story clock — undo rewinds it |

AR uses no `historyStorage`: undo does not rewind plans, stats, or the real-time stamp.
**CR's story clock is the first and only history-storage key** (engine 0.0.25), for exactly
that property — the clock rewinds with the turn that spent it.

### 3.5 Generation call sites

All budgeted. Temperature 0.85 / top_p 0.95 / top_k 250 / min_p 0 unless noted.

| Feature | Call | Model | Max tokens | Primer / shape |
|---|---|---|---|---|
| Diary (Reflect) | `generateWithStory` | xialong-v1 | 250 | `Name: Title:` → Title / Content / Activation Keys |
| Plan | `generateWithStory` | xialong-v1 | 300 | `Name: Title:` → Title / Content |
| Forum thread | `generateWithStory` | xialong-v1 | — | `Thread:` → name, `====`, author, body, `  Emotion:` |
| Forum reply | `generate`; `generateWithStory` only when the thread's own Contact replies | xialong-v1 | — | Replier: another Contact (1-in-3), else the OP once a thread has 3+ replies (1-in-4, with story), else a random name |
| Diary from thread | `generateWithStory` | xialong-v1 | 250 | thread text + diary primer |
| Plan from thread | `generateWithStory` | xialong-v1 | 250 | thread text + plan primer |
| Process | `generateWithStory` | xialong-v1 | 250 | emotion-phrased style tag from recent emotions |
| Imitate | `generateWithStory` | xialong-v1 | 1536 | `Title:` → multi-paragraph example chat |
| Game reaction | `generate`, background | story params | 1536 | AetherRoom prompt + game outcome |
| Delete farewell | `generate`, background | story params, glm-4-6 coerced to xialong | 1536 | `[ Style: deletion response ]` |

### 3.6 Feature inventory and disposition

*CR home* is where the feature lives in CR (§6). *Phase* is when its door is built (§5).

| # | Feature | What it does | CR home | Phase | Status |
|---|---|---|---|---|---|
| F-01 | Contact card | Name, alias, description, species, gender, pronouns, persona, appearance, tags, defaults (intimacy, style), CJK, greeting + emotion | Profile › About / Voice | P4 | inventoried |
| F-02 | Avatar | One image, 20 KB cap, crop tool | Profile header / Photos | P5 | inventoried |
| F-03 | Emotion set | 24 images, all-or-nothing use | Profile › Photos | P5 | inventoried |
| F-04 | Emoji set | Global 24 emoji, JSON import | Settings › Display | P5 | inventoried |
| F-05 | Example chats | Named example exchanges with style, user name, per-message emotion | Profile › Voice | P7 | inventoried |
| F-06 | Card brains | Static entries on a card | Profile › Brains | P4 | inventoried |
| F-07 | Conditional brains | Keyed, intimacy-gated | Profile › Brains | P4 | kernel (context only) |
| F-08 | Card brains import/export | Brains-only JSON between cards | Profile › Brains | P4 | inventoried |
| F-09 | Schedule | Per-weekday + daily events, intimacy-gated, **only active with Track Real Time on** | Profile › Schedule (model kept, D-14) | P6 | kernel (context only) |
| F-10 | User card | Persona card, trimmed | User profile | P4 | inventoried |
| F-11 | Scenario card | Environment, scene, tags, brains | Scenarios | P4 | inventoried |
| F-12 | Card import/export | JSON per card; AetherRoom field names. **The only way data enters CR** (D-20) | Cards | P2 | inventoried |
| F-13 | Chat settings | Pairing, scenario, tags, intimacy, style, response length | Chat panel | P4 | inventoried |
| F-14 | Insert Greeting | Appends `Name: greeting` + emotion line to an empty document | Chat panel | P4 | inventoried |
| F-15 | Track Real Time / Time Apart | Hours since last reply injected | Chat panel › Clock | P6 | kernel (context only) |
| F-16 | Emotional modes | 9 modes triggered by recent emotions or time away | Settings / Chat | P6 | kernel (context only) |
| F-17 | Jots | Per-pairing facts → "Facts About {user}" | Profile › Memories | P7 | kernel (context only) |
| F-18 | Floaty brains | Story-level entries, per-pairing on/off, ordering, import/export | Chat › Brains | P7 | kernel (context only) |
| F-19 | Diary | Generated reflection, keyed recall | Profile › Memories | P7 | kernel (context only) |
| F-20 | Plans | AI/User, Limited/Ongoing, turn countdown, `<think>` injection | Profile › Memories (Plans) | P7 | kernel (context only) |
| F-21 | Forum | Threads about the chat, cast/random replies, user comments | Profile › Posts | P7 | inventoried |
| F-22 | Imitate | Example-chat candidates from history → Add to Example Chats | Profile › Voice | P7 | inventoried |
| F-23 | Process | Emotion-focused memories, keyed recall | Profile › Memories | P7 | kernel (context only) |
| F-24 | Editor images | Avatar/emotion/emoji widgets, indent markers, caps | Editor (D-13, D-21) | P5 | inventoried |
| F-25 | Emotion-line dimming, name bolding | Decoration rules | Editor | P5 | inventoried |
| F-26 | Rollover trim | Soft/hard budget, prefix-stable restart, initial trim | Kernel | P1 | kernel |
| F-27 | Macros | `{{char}} {{user}} {{date}} {{time24}} {{time}}`, `$c`/`$contact`, `$u`/`$user`; sampler UI | Kernel + Settings | P1 | kernel |
| F-28 | Games | RPS, Number Guess, stats per pairing, reactions, stats → prompt | Games | P8 | kernel (context only) |
| F-29 | Delete with farewell | Contact reacts before deletion | Cards | P4 | inventoried |
| F-30 | Response parser / bubbles | Splits responses into text + emotion sub-messages | Kit | P4 | inventoried |

### 3.7 Kernel parity contract

P1 is not finished until CR produces **byte-identical** output to AR 1.1.5 on the fixture set.
These are the strings and orderings a refactor is most likely to disturb.

**System prompt** (`buildSystemPrompt`, L4678)
- Opens `AetherRoom\n----\n`. Contact block: name, `Type: contact`, then Gender, Pronouns,
  Species, Personality (persona), Appearance via `formatField`, in that order, each only if
  non-blank.
- `stranger` intimacy writes `Opinion of {user}: Doesn't know {user}.`; any other writes
  `Relationship: {intimacy}`.
- `Categories:` from tags. `Example quotes:` then numbered chats, each line prefixed with
  **U+2002 (en space)**, continuation lines `\u2002    `, contact emotion lines
  `\u2002  Emotion: {e}`.
- `----` User block with `Type: user`, same field order. Then an optional scenario block:
  Environment, Scene, merged de-duplicated Tags.
- Brains appended as `----\n{name}\n{content}` in the order Contact → User → Scenario, then
  a `Game History` brain when stats are included (legacy stats without `kind` read as
  competitive).
- Macros are applied to the finished prompt.

**Message rebuild** (`onContextBuilt`, L5101)
- NAI's own system prompt message is dropped. User turns ending `Write.` or `Continue.` are
  dropped; others get a `{user}: ` prefix and `\n` → `\n    `.
- Assistant turns ending `***\n` are trimmed. `----`-prefixed system messages are brains and
  are excluded from trimming.
- Budget: soft = `maxTokens(model)`, hard = soft + `rolloverTokens(model)`, 2200 reserved.
  Reset to a full rebuild when everything fits under `soft − rollover`. Trim when over
  hard, or over soft on the first build of a session; trim the oldest non-brain turn until
  under soft, advance `startIndex`, store stable ids of the whole array.
- Order: system prompt · `Start of chat.` (only if never trimmed) · history. Then, directly
  **before the last assistant message**: one joined system message of extras (Time Apart,
  Current Events, Mood), then the style message. Both are spliced at the same index, so
  the extras land first. With no assistant message present, neither is inserted.
- Style: `[ Style: {style}` + `, greeting` when no turns exist + `; Response length: {len}`
  when set + `; CJK` + ` ]`.
- Plans: one Ongoing and one Limited, each picked at random among eligible, prepended to
  the last assistant message as `<think>…</think>\n`. Turn bookkeeping only when `!dryRun`.
- Randomness (mode pick, plan pick) goes through `api.v1.random` and must be seedable in
  the harness.

**Brains before context** (`onBeforeContextBuild`, returns `temporaryLorebookEntries`)
- Order: floaty brains (skipping empty name or content; `active` passed through as stored),
  then Jots, then keyed Diary, Process and conditional brains in that order.
- Jots: `----\nFacts About {user}\n{char} knows the following about {user} and feels
  comfortable referencing this information in interactions.\n- fact…`, empty texts skipped.
- Diary adds `Type: diary entry`, Process adds `Type: emotional memory` under the name.
  **Diary and Process content are not macro-processed**; floaty, Jots and conditional are.
- Keys: last 1000 words of story text, each word stripped of leading/trailing
  non-alphanumerics, every n-gram up to the longest key; **case-sensitive**; keys have
  runs of whitespace collapsed.

**Plans**: `<think>` content is raw — no macro processing.

**Session flags**: `checkInitialTrim` clears on the first generation end of the load, on
any model. The rollover reset clears `startIndex` and path ids but **not** `trimmed`.
Plan turn counts use user messages **from the rollover start**, not the whole chat.

**Response format**: `Name: text` then `  Emotion: word` on its own line; 24-word
vocabulary, fallback `neutral`.

### 3.8 Oddities found

- `storyStorage.remove(c.avatar)` and `remove(emotionKeys[i])` at delete (L8953–8956) pass
  image data URLs as keys — a no-op left from an earlier storage scheme.
- The chat settings snapshot copies every image of the active Contact into each story's
  `storyStorage` (fixed by D-18).
- Schedule events only reach context when Track Real Time is on (L5330).
- `hasEmotionImages` demands exactly 24 keys, so a 23-image set silently shows the avatar.
- Jots, floaty brains and plans are story-scoped but not history-scoped: undo does not
  un-learn a Jot or un-advance a plan.
- The editor widget logic scans the whole document on every generation end and redo.
- The `{ … }` user-line rewrite in `onBeforeContextBuild` is commented out, not deleted.
- **With an eligible plan and no assistant message in the array, `onContextBuilt` throws**
  (`finalMsgList[-1].content`). NAI then builds context without AR. Pinned by the
  `plans-no-assistant` fixture; a fix is a deliberate patch.
- Plan turn counting restarts relative to the rollover start, so a plan can run longer
  than its turn count once a chat has rolled over.
- The rebuild loop can in principle exhaust its two attempts and return nothing; no
  reachable input does so today.

---

## 4. Target architecture

### 4.1 Three layers

| Layer | Owns | Rule |
|---|---|---|
| **Kernel** | System prompt, message rebuild, brains/lorebook assembly, rollover, emotion parse, macros, clock reads | Pure functions over a context object. No UI, no storage writes except where §3.7 names them. Node-testable. |
| **Data** | Cards, per-pairing records, chat binding, settings, image refs, migrations | One load/save verb pair per record family, serialized per family (CE's op-chain discipline). |
| **Surfaces** | Shell, profiles, chat panel, settings, editor decorations; bridge painter | Engine ships facts, bridge paints pixels. Nothing inside `.ProseMirror`. |

### 4.2 Engine sections (initial CR-INDEX skeleton)

`HEADER` · `CR-INDEX` · `CONST` · `TYPES` · `STORE` (storage map, migrations, backfills) ·
`CARDS` · `PAIR` (per-pairing records) · `CLOCK` · `SCHED` · `K-PROMPT` · `K-BRAINS` ·
`K-CONTEXT` (the two context hooks) · `GEN` (utility wrappers, budget readout, diagnostics) ·
`MEM` (Jots, Diary, Process, Plans) · `FORUM` · `IMG` (refs, fallback chain, bridge requests) ·
`BRIDGE` (transport) · `EDITOR` (decorations) · `GAMES` · `KIT` · `SHELL` · `SURF-HOME` ·
`SURF-PROFILE` · `SURF-CHAT` · `SURF-SETTINGS` · `SURF-GAMES` · `BOOT`

### 4.3 The shared bridge (D-15)

CE's bridge (v3.0.22 at the time of writing) is extended, not forked. Its four jobs —
image generation, image storage and display, the generation indicator, the transport —
are CR's needs as well. CR work lands in the same file, in the same patch discipline, with
its own bracket tags (`[CR-*]`) so CE's index stays readable.

What CR changes on the bridge side:
- **Engine identity.** ✅ bridge 3.0.23. The handshake records whichever engine last
  handshook; last-handshake-wins stands. No second-engine guard — D-26 made that an install
  note instead, and the identity fields on the handshake make a wrong pairing visible in CR
  Global.
- **Scope.** ✅ portraits, bridge 3.0.24. Portrait keys are already per character and
  story-independent, so the slot listing needs no scope field (D-27). Gallery records are a
  separate problem: `chars` is prompt fragments, not an owner, so a real `owner` field is
  written at save time when CR first generates an image (P5). CR sends no story id at all;
  empty reads as unscoped, which is correct for cross-story Contacts.
- **Editor portraits** (D-21). Rebuild `_ccavPaintOne` on the STORYIMG render pattern, read
  display tokens from the sentinel, keep `_loadCharEmotionImage` as the lookup.
- **Card bundles.** Export inlines a Contact's images into its card JSON; import writes
  them into the portrait store.

### 4.4 Protocol

CR speaks CE's existing names wherever the payload fits. Checked against the bridge's
CE-INDEX this pass:

| Need | Existing name | Notes |
|---|---|---|
| Handshake | `HANDSHAKE_REQUEST` / `HANDSHAKE_ACK` | **Done (bridge 3.0.23).** Request carries `{scriptId, engine:'CR', engineName, engineVersion}`; ACK echoes `{engine, crAware:true}`. An ACK with no `engine` is a bridge older than 3.0.23 (D-26) |
| Generate an image | `GENERATE_IMAGE` | one image per request, one request per press (D-07) |
| Emotion / avatar slot delete, download, upload | `AE_CHAR_IMAGE_ACTION` → `AE_CHAR_IMAGE_UPLOADED` | key `<id>_em_<slot>` |
| Which slots a Contact has filled | `AE_CHAR_IMAGE_ACTION` op `slots` → `AE_CHAR_IMAGE_SLOTS` | **Done (bridge 3.0.24).** Keys only, no bytes. Feeds §6.5's fallback chain |
| Delete a Contact's images | `AE_DELETE_PORTRAIT_CASCADE` | |
| Gallery list / actions | `AE_GALLERY_INDEX_REQ` → `_RESP`, `AE_GALLERY_ACTION` | needs owner scope (U-08) |
| Image metadata, regenerate | `AE_IMG_META_REQ` → `_RESP`, `AE_IMG_REGEN` → `_DONE` | |

**New, only where CR differs** — added as `op` values on an existing name if the payload
shape matches, a new name only if it does not:
- card bundle export/import;
- owner-scoped gallery listing (if the existing request cannot carry the scope).

Two paint channels need no message at all:
- **JSX surfaces**: an engine anchor carries the key; the bridge paints it
  (`_ceSurfImgPaintOne` and its anchor-opt vocabulary).
- **The story editor**: a node widget carries a sentinel; the bridge paints it (D-21).

### 4.5 Data model v2 (superseded in part by D-29)

> **The `CrContact` sketch below is no longer the plan.** It reshapes AR's `avatar` and
> `emotions` into `CrImageRef`, which D-28 forbids. What shipped in engine 0.0.4 is
> additive: AR's `Character` unchanged plus one optional `cr` bag holding
> `{ images?: { avatar?, banner?, emotions? }, profile?, display? }`, all `CrImageRef`-based,
> all sanitized on import. The sketch is kept for the field *inventory* it records —
> which fields CR needs — not for the shape.

```ts
interface CrImageRef { id: string; w?: number; h?: number }   // id = portrait-store key (§4.6); bytes live in IDB only

interface CrContact {                     // superset of AR Character
  cardType: 'contact'; format: 'cr-2'; id: string; author: string;
  name: string; alias?: string; description?: string; species?: string;
  gender?: string; pronouns?: string; persona?: string; appearance?: string;
  greeting?: string; greetingEmotion?: Emotion; defaultIntimacy: Intimacy;
  defaultStyle: Style; cjk?: boolean; tags?: string;
  avatar?: CrImageRef; banner?: CrImageRef;
  emotions: Partial<Record<Emotion, CrImageRef>>;           // partial is normal (D-07)
  exampleChats: ExampleChat[]; brains: BrainEntry[];
  brainsConditional: BrainComplexConditional[];
  schedule?: CrSchedule;                                     // §6.6
  profile?: { status?: string; bio?: string; links?: string[] };   // display only, never in prompt
  display?: Partial<CrAvatarDisplay>;                       // per-Contact override of the account default (D-22)
}

interface CrChat {                        // storyStorage, one per story (D-05)
  contactId?: string; userId?: string; scenarioId?: string;
  snapshot?: { contact?: TextOnly<CrContact>; user?: TextOnly<CrUser> };   // D-18
  tags?: string; intimacy: Intimacy; style: Style; responseLength: ResponseLength;
  clock: { mode: 'real' | 'story' };                         // position lives in historyStorage
}
```

User and Scenario follow the same pattern. Per-pairing records keep AR's
`Record<combinedId, …>` shapes under new keys, so migration is a copy rather than a
reshape.

### 4.6 Storage map (D-24)

| Scope | Keys |
|---|---|
| account | AR's names, unchanged: `characterListKey`, `userListKey`, `scenarioListKey`, `defaultAuthorKey`, `useImageDecoKey`, `useEmotionalModesKey`, `emojiRefKey`, `gameRecordKey`, `includeGameStatsKey`. New: `cr.settings` (shell, display defaults D-22) |
| story | AR's names, unchanged (§3.4 table). New: `cr.chatClock` (mode per chat, D-08) |
| history | New: `cr.clock.now` (story clock — undo rewinds time), later rolls/stats |
| temp | shell route, open drills, crop rect, drafts |
| IDB `nai_roster_db/portraits` (shared) | `{id, dataUrl, ts, source, meta}` — CE's record shape. Keys: `<contactId>_em_Avatar` (the pinned avatar slot, capital A), `<contactId>_em_<emotion>` (lower case). `<id>_portrait` is CE's legacy avatar key, read as a fallback, never written. CE stores as WebP. |
| IDB `nai_illustrator/images` (shared) | gallery, selfies, scenes — needs owner scope (U-08) |

Slots: `Avatar` · the 24 emotions · `banner` (new) · gallery images (`selfie`, `scene`, free). The bridge's `_AE_EMOTION_TAGS` already holds an image-prompt phrase per emotion, which §6.4 reuses.

### 4.7 Getting data in (D-20)

Import only. Accepted files: AR/AetherRoom card JSON for Contacts, Users and Scenarios, and
AR's Jots, Floaty Brains and card-brains files. Data URLs inside a card go to the portrait
store and the card keeps keys. Without the bridge (D-12), images in an imported card are
dropped with a notice, and the card still imports.

---

## 5. Phases

| Phase | Scope | Exit criteria |
|---|---|---|
| **P0 Spec** ✅ | This document | Closed at v0.4 (D-23) |
| **P1 Kernel** ✅ | Extract §3.7 into pure functions over a context object; seedable randomness; clock indirection (real-clock default) | Node harness: AR 1.1.5's functions and CR's produce byte-identical message arrays and lorebook lists on fixtures covering greeting, trim, CJK, plans, schedule, time apart, all nine modes |
| **P2 Data** (in progress) | Schemas v2 ✅ additive per D-29 (Contact 0.0.4; User and Scenario 0.0.17); profiles ✅ (Contact 0.0.6, User and Scenario 0.0.19), storage map, importers ✅ Contact, **smart import ✅ (D-103, engine 1.0.1)**, export ✅ Contact | Import → export → import is identity on fixtures ✅ (`cr-data-fixture.js`, 22 cases); **AR 1.1.5 imports a CR export — still to check live**. No migration step is needed: additive fields move no records |
| **P3 Bridge** (in progress) | Shared-bridge changes (§4.3): engine identity ✅, portrait slot listing ✅, bundles, editor-portrait path | `node --check`; CE still passes its own live checks; **CR handshakes** ✅ live. The listing half of the old exit criterion moved to **P5**: nothing can put an image under a CR Contact id until CR can upload or generate one, so it was never testable here |
| **P4 Shell + profiles** (in progress) | Shell ✅ window + rail + token layer (engine 0.0.5); Cards ✅ three tabs over the real lists; Contact profile ✅ shell with seven tabs; Photos ✅ real slots + the bridge probe's door. Still to do: every surface's **edit** controls, User/Scenario profiles, Chat and Global as real screens, AR doors retired | Every AR card and chat-settings field editable in CR; live pass per surface |
| **P5 Images** (in progress) | In-chat images ✅ (D-57/D-58/D-59, engine 0.0.44). Upload into IDB ✅ (bridge-side, 0.0.8), per-slot generate ✅ (0.0.9, D-07), **story illustration ✅ (0.0.14)**, **enhance ✅ (0.0.15)**; **gallery surface ✅ (0.0.16)**, **Scenario scene pair and Users as cast ✅ (0.0.18)**; **emotion fallback chain ✅ (engine 0.0.32: resolver + neighbour table; the per-Contact filled index it reads is still to build)**, **emoji set ✅ (engine 0.0.30, Global > Editor)**; editor portraits with display options ✅ (D-13, D-21; the gutter completed in 0.0.43, D-55) | A Contact with 3 of 24 emotions renders correctly in editor and profile |
| **P6 Time** (in progress) | Clock per chat ✅ (0.0.25), schedule editor and week view ✅ (0.0.25, D-14), status line ✅ (0.0.26). Still to do: field generation (D-11), which waits on U-03 — everything else in this phase is built and awaiting a live pass | Macros, Time Apart and Current Events agree with the chat clock in both modes |
| **P7 Social + memory** (in progress) | Posts ✅ (0.0.47, D-62), Memories ✅ (0.0.32), **stage ✅ (0.0.50, D-56)**. Still to do: Voice (examples, Imitate), floaty brains and emotional modes as doors, and the Stage's own live pass | Every F-row except F-28 has a door and a live pass |
| **P8 Games** (in progress) | F-28 door; the RPG dice tool (D-91, D-93): rulesets with presets and custom ✅, sheets and resources ✅, roll view ✅, reaction ✅ (engine 0.2.1); dice faces, the tumble, odds ribbons and the band ladder ✅ (D-96, engine 0.2.9); AR's RPS and Number Guess as a Games subtab ✅ (D-97, engine 0.2.10); **AR's CR Games panel retired with the toggle rehoused ✅ (D-99, engine 0.2.11)** — AR has no UI left in CR outside the Brains and Diaries doors. Still to do: the live pass | Stats reach the prompt as in AR; every preset resolves its published examples correctly offline; a live roll and reaction for the User, the paired Contact and a group member |
| **P9 Group chat** (experimental, in progress) | Probe rig ✅ (engine 0.0.68, helper 0.0.1: Group tab, member buttons, pools, spill, probe log; D-84–D-86). Speaker's view ✅ (engine 0.0.69, D-87; tail and lift 0.0.70). One generation at a time ✅ (0.0.70, D-88). Members' portraits and bubbles ✅ (0.0.70, D-89). Members on the Stage ✅ (D-98, engine 0.2.11). Still to do: the glm-4-6 next-speaker button, the cue for members, the clock step and Time Apart for a member's reply | A live three-Contact session whose probe lines answer U-18 to U-21, and replies that stay in their own voice |

P1 and P3 run in parallel. P4 waits on P2's schema.

### 5.1 Builds

**Rows are added newest-first below the two anchors.** The engine no longer carries a
CHANGELOG — it was removed with the rest of the narration in the D-90 sweep — so this table
is the build record. It keeps the first build, the current one, and anything whose
verification is not recoverable from the file itself.

| Build | What changed | Verified |
|---|---|---|
| engine 0.2.13 | **[CR-STAGE-INSIDE] rewritten**: the figure width clamp is gone and the outermost figures are pinned to the ends of the cast row instead, so every figure on the stage is sized by height alone (D-102) | Parity **20/20 byte-identical**; only `CR-STAGE` changed, so the mutation check's subject did not move and it was not re-run (19/19 at 0.2.11). `tsc` **0**. `ccav-smoke` 224/0, `cr-data-fixture` 46/46, `cr-group-smoke` 48/48, `cr-bubble-smoke` 23/23, `cr-rpg-smoke` 199/199 — all unchanged. Placement arithmetic checked for one to six figures: 1 centred; 2 pinned to both ends; 3+ pinned ends with the middles evenly spaced. No `maxWidth` left anywhere in the section. LF pure; frontmatter parses. **Test files unchanged. Bridge unchanged** |
| engine 0.2.12 | **[CR-STAGE-FILL] [CR-STAGE-INSIDE]** Fill is the window, the backdrop can sit top/middle/bottom, and a figure cannot be cut by the stage edge; **Presets and Tags moved to Illustrate**; **a Scenario paints its Banner** wherever an avatar goes; **Photos and Visuals to the end of the card tab row** (D-101) | Parity **20/20 byte-identical**; section hashes show only `CR-STAGE`, `CR-ILLUS` and `CR-UI` changed — `K`, `K-CONTEXT` and `HOOKS-MISC` are byte-identical to 0.2.11 and this patch is surfaces only, so the mutation check's subject did not move and it was not re-run (19/19 at 0.2.11). `tsc` **0**, unchanged. `ccav-smoke` **224/0** (+2, pinning the backdrop-position fallback), `cr-data-fixture` 46/46, `cr-group-smoke` 48/48, `cr-bubble-smoke` 23/23, `cr-rpg-smoke` 199/199. Declared-vs-used clean: 0 references to `CrGlobalImagesTab`, `CrGlobalTagsTab` or either retired Global tab id; sections 38; LF pure; frontmatter parses. **`ccav-smoke.js` changed — re-upload it with the engine.** **Bridge unchanged** |
| engine 0.2.11 | **[CR-STAGE-AR] [CR-STAGE-BEATS] [CR-STAGE-CAST]** the Stage's three faults and group members on it (D-98); **[CR-RETIRE-GAMES]** AnotherRoom's `CR Games` script panel retired with Include Game Stats rehoused on the Games tab (D-99); **`ccav-smoke.js` repaired** (D-100) | Parity **20/20 byte-identical**, and section hashes say why it could not move: `K`, `K-CONTEXT` and `HOOKS-MISC` are byte-identical to 0.2.10 and only `GAMES`, `CR-PLAY`, `CR-STAGE` and `STARTUP` changed, so the mutation check's subject did not move (0.0.43 / 0.0.50 / 0.2.1 precedent) — it was run anyway, GAMES being state the kernel reads, and killed every mutant. **`tsc` histogram 1 → 0**, the standing TS2345 having been AR's Number Guess `onSubmit`. **`ccav-smoke` 222/0**, up from 196/10 — 16 new cases and the ten standing failures resolved as test drift, not engine drift (D-100): the repinned portrait cases pass on **0.2.10 as well**, which is the proof, while the new Stage cases fail there, which is the point of a behaviour-change fixture. `cr-data-fixture` 46/46, `cr-group-smoke` 48/48, `cr-bubble-smoke` 23/23, `cr-rpg-smoke` 199/199, all unchanged. Style grep unchanged at 5, every hit an editor decoration or the avatar's `calc`; declared-vs-used clean on 8 new symbols and 0 references to any of the 10 removed names; sections 38; LF pure; frontmatter parses. **`ccav-smoke.js` changed — re-upload it with the engine.** **Bridge unchanged** |
| engine 0.2.8 | **[CR-THINK] removed** (D-95). `SECTION CR-THINK` deleted whole; the kernel prefill, `crUiBase` and the group's toolbar re-register reverted to their pre-feature form; account keys `cr.think.on` / `cr.think.seed` and history keys `cr.think` / `cr.think.at` retired; CR-INDEX and the Report trimmed to match | Kernel prefill byte-compared against AnotherRoom and identical; parity 20/20, 50 steps; mutation 19/19; group smoke 48/48; bubble smoke 23/23; `tsc` histogram unchanged at the one TS2345; residue scan for every removed symbol clean; comment scan for stale references clean. **Pre-existing and unrelated**: `ccav-smoke` reports 195/11 on this build, on 0.2.7, and on 0.2.4 alike |
| engine 0.2.3 – 0.2.7 | **[CR-THINK]**, built and then withdrawn (D-95). The arc: the feature arrived in the 0.2.3/0.2.4 builds; 0.2.5 replaced a runtime-supplied trim anchor with CR's own mark taken in `onContextBuilt`; 0.2.6 made it an opt-in Global setting, off by default; 0.2.7 made the block's seed an editable account setting after the kernel's built-in `"1."` was found to be what produced the enumerated reasoning trace | Parity and mutation held at every step. Detail for 0.2.3 and 0.2.4 is not recoverable from this session and is not reconstructed here; the code no longer exists |
| engine 0.2.2 + bridge 3.0.36 | **[CR-SEGMENT] [CR-BUBBLE-SHAPE] [CR-CCAV-HOSTCLEAR]** (D-94): the shared message segmenter, shaped bubble markers with a flat fallback and a 120-section window, bubble rules retired, the clear skipped inside a message when the bridge clears on the portrait box; Report shows both. Bridge: `ccavClear` on HANDSHAKE_ACK and `clear: both` on a beside-the-text portrait's box | Parity 20/20 byte-identical; only CR-BUBBLE, CR-UI and BRIDGE changed by hash, so the mutation check was not re-run; `tsc` unchanged at the one TS2345; **new `cr-bubble-smoke.js` 23/23** (throws on 0.2.1); `ccav-smoke` five `marks:` cases repinned to D-94, and its failures are the same set on 0.2.1 and 0.2.2 (10 in this sandbox run); `cr-group-smoke` 48/48, `cr-rpg-smoke` 94/94, `cr-data-fixture` 46/46; style greps 4 / 0; bridge `node --check` clean, CRLF uniform. **`ccav-smoke.js` changed — re-upload it** |
| engine 0.2.1 | **[CR-RPG] the Games tab** (D-91, D-93). `SECTION CR-RPG`: eight presets and the author's own systems in account storage, a five-step roller, per-story sheets and resources, the Table and Systems tabs with a full system editor, and reactions. CR-UI: the placeholder surface replaced, `minus` and `dice` icons, `CrNumField` takes an optional draft key. CR-GROUP: `crGroupAssemble` takes a dry-run flag; `onGenerationRequested` refuses a Send during a reaction and records a Send without a group (`crGroupNativeSeen`). Header comment now reads the real version | Parity 20/20 byte-identical, and section hashes say why it could not move: only CR-UI, CR-GROUP, CR-RPG and STARTUP changed, so K, K-CONTEXT and HOOKS-MISC are untouched and the mutation check was not re-run; `tsc` histogram unchanged at the one TS2345; `cr-group-smoke` 48/48 (project copy); `ccav-smoke` 204/7, the same 7 as 0.2.0; `cr-data-fixture` 46/46; **new `cr-rpg-smoke.js` 94/94** — every preset against its published rules with scripted dice, the sanitizers, the outcome line and its place in the prompt, the paired Contact's reaction on the main script and a member's through its helper, Send writing only the reply, the Send refused both ways, and every surface state rendered offline; it throws on 0.2.0, the symbols being new; style greps 4 / 0; declared-vs-used clean; LF pure; frontmatter parses. **Bridge unchanged** |
| engine 0.2.0 | **Public release**, renumbered from 0.0.74 after 0.1.0 was rolled back (D-92) | Recorded from the author; the header comment still reads 0.0.74 |
| engine 0.0.74 + bridge 3.0.35 + helper 0.0.4 | **Comment cleanup (D-90)**, no code change in any file | AST without comments identical for all four files; parity 20/20; mutation check 19/19; `tsc` unchanged at the one TS2345; `cr-group-smoke` 81/81 against both helpers; `node --check` clean; bridge CRLF uniform; frontmatter parses |
| engine 0.0.73 + bridge 3.0.34 | **[CR-CHATIMG-REPAINT]** the photo pass repaints portraits, bubbles and photos after rewriting a tag; **[CR-SERIAL]** covers the photo anchors. Bridge **[CR-STORYIMG-BUBBLE]**: a photo host copies the fill, border, radius, shadow and padding of the paragraph above it, from computed style; no message or protocol change, and CE's unstyled story paragraphs copy nothing | Parity 20/20; `tsc` unchanged; `cr-group-smoke` 81/81; bridge `node --check` clean, CRLF uniform |
| engine 0.0.72 | **[CR-GRID-MIN]** a Group-tab description, a profile's status line or schedule ran off screen: a single-column grid's `auto` track is floored at its widest unbreakable child, so an ellipsised line widened it past its card. 70 stacked grids in CR sections now carry `CR_GRID_COL` = `minmax(0, 1fr)` | Parity 20/20; `tsc` unchanged at the one TS2345; `cr-group-smoke` 81/81; LF pure. Visual only, checked live |
| engine 0.0.71 | **[CR-CCAV-ADJ]** a portrait above its message when its run directly follows another; **[CR-SERIAL]** portrait and bubble passes never overlap (startup and the group's repaint did on every load); members' names bolded, `*words*` as italics, photo tags as the member (D-89 extended); probe `diverge` (U-26). U-24 answered | Parity 20/20; only CR-SIDEGEN, EDITOR, CR-BUBBLE, CR-UI, CR-CHATIMG and CR-GROUP changed by hash, so K, K-CONTEXT and HOOKS-MISC did not move and the mutation check was not re-run; `tsc` unchanged at the one TS2345; `cr-group-smoke.js` 81/81 (6 new: the italics parser, the italic write, the bold member rule, the adjacent clear, three overlapping emits as two, divergence); style grep unchanged; LF pure. The photo sender has no offline case: the pass stops at the bridge gate in the smoke |
| engine 0.0.70 + helper 0.0.3 | **[CR-GROUP-TAIL]** a native Send after a member's reply no longer continues that member's message (D-87 amended). **[CR-GROUP-LIFT]** style line and near-end block lifted before the view. **[CR-GROUP-ONE]** one generation at a time, refused not queued (D-88). **[CR-GROUP-DECO]** members' own portraits, gutter and bubbles (D-89). `countUncachedInputTokens` asked with the model named (U-24). **Live results from 0.0.69 recorded**: U-19 answered, U-22 warm reads | Parity 20/20 byte-identical (SECTION K untouched; K-CONTEXT only passes the continuity id); mutation check 19/19; `tsc` unchanged at the one TS2345; helper `tsc` clean; **`cr-group-smoke.js` 75/75** (23 new: the logged Harley and Ivy shapes replayed, the newline armed on the real pass only and fired once, both refusals, member portraits and bubbles; the new block throws on 0.0.69, its symbols being new); `cr-data-fixture` project copy 38/2 on both 0.0.69 and 0.0.70 (stale copy, CR-DATA unchanged); style grep unchanged; LF pure; frontmatter parses. `ccav-smoke` not in the project and not run |
| engine 0.0.69 + helper 0.0.2 | **[CR-GROUP-VIEW] every speaker reads the transcript from its own side** (D-87), on Send as well as for members; the roster under the system prompt for everyone. Fixes two 0.0.68 bugs from the live pass: the member prompt opened with the roster and a reframed turn, then the system prompt (the style-block move walked back over every system message), and **[CR-GROUP-BTN]** the member buttons replaced the CharacterRoom button (a later `ui.register` replaces the script's extensions — STARTUP's list is now `crStartupExtensions` and goes in with them). Helper 0.0.2 returns `predErr`. **Live results from 0.0.68 recorded**: U-18, U-20, U-21 answered | Parity 20/20; guard and view sensitivity both shown (depth forced on: 18 fail; view forced on: 16 fail); mutation check 19/19; `tsc` unchanged at the one TS2345; helper `tsc` clean; `cr-data-fixture` 46/46; `ccav-smoke` unchanged 204/7; style greps 4 / 0; `cr-group-smoke.js` 52/52, including the live 0.0.68 context shapes replayed through the view |
| engine 0.0.68 + helper 0.0.1 | **[CR-GROUP] group chat on persona helpers, as a probe rig** (D-84–D-86). `SECTION CR-GROUP`: the `cr.group` record, the helper router on `cr-persona-helper`, one assembler, the last-turn frame, toolbar buttons per member, the probe log (also in Report) and the Group subtab beside Stage. `onGenerationRequested` added for the native-Send reading. `crKernelCtx` gains the member override and K-CONTEXT / HOOKS-MISC an early return on `crGroupGenDepth`. New companion script `cr-persona-helper-v0_0_1.naiscript`. **No bridge change** | Parity **20/20 byte-identical**; guard sensitivity shown by forcing the depth on (18 of 20 fixtures fail); mutation check 19/19; `tsc` histogram unchanged at the standing one TS2345; helper `tsc` clean; `cr-data-fixture` 46/46; `ccav-smoke` **unchanged at 204 passing / 7 failing — the 7 fail identically on 0.0.67** (§11.3 item 6); style greps 4 / 0; **new `cr-group-smoke.js` 48/48** including the real helper's replies. **Harness runs must not overlap**: `cr-parity-harness.js` extracts the kernel to one shared `/tmp/cr-kernel-extracted.ts`, so a parity run started during the mutation check read a mutant and reported 11/20 — the clean rerun alone was 20/20 |
| engine 0.0.67 | [CR-CCAV-OPENING] a greeting written straight into the story gets a portrait (D-83) | Recorded from the engine's CHANGELOG at plan v0.57 |
| engine 0.0.66 | [CR-BUBBLE-RUNON] a greeting's later paragraphs get bubbles — a script-appended greeting carries origin `script`; the Stage's Backdrop picker stops offering Avatar | Recorded from the engine's CHANGELOG at plan v0.57 |
| engine 0.0.65 | [CR-CCAV-PERMSG] one portrait per message (D-82); the Report gains the last generation request | Recorded from the engine's CHANGELOG at plan v0.57 |
| engine 0.0.64 | [CR-REPORT] the Report tab (D-81) | Recorded from the engine's CHANGELOG at plan v0.57 |
| engine 0.0.63 + bridge 3.0.31 | [CR-CARDIMPORT] card import through the bridge (D-80); `memoryLimit` 128. **Needs bridge 3.0.31** | Recorded from the engine's CHANGELOG at plan v0.57 |
| engine 0.0.62 | [CR-SLOTEARLY] the TDZ load crash (D-78); [CR-CHOICEICON] options keep their words (D-79) | Recorded from the engine's CHANGELOG at plan v0.57 |
| engine 0.0.61 + bridge 3.0.30 | [CR-STAGE-SCENE] figures measured against the backdrop (D-77). **Needs bridge 3.0.30** | Recorded from the engine's CHANGELOG at plan v0.57 |
| engine 0.0.60 | [CR-STAGE-FIT] (D-76), [CR-BUBBLE-RUNON] (D-75), [CR-HEADNOTE] (D-74) | Recorded from the engine's CHANGELOG at plan v0.57 |
| engine 0.0.59 | **[CR-NOBANNER] the banner is gone from the Contact and the User, field and all** (D-73). `CrContactImages` loses it; `CrSimpleImages` splits into the User's (avatar only) and the Scenario's `CrSceneImages`, which keeps its banner because a place has no face (D-46); both sanitizers drop an incoming one; the Banner tiles come off both Photos tabs. The header is one shared **`CrProfileHead`** — a large avatar sharing its band with the name, the handle, the attributes as pills, the status line and the card's **Export and Delete**, which came off the About tab in the same patch. The back control is its own row in both layouts now, since there is no banner left to overlay on desktop | Parity **20/20 byte-identical** and only `CR-DATA` and `CR-UI` changed by hash — the kernel's subject did not move and the mutation check was not re-run; `tsc` histogram unchanged at the standing one TS2345; **`cr-data-fixture` 46 cases** (6 new: a Contact's banner dropped, dropped without taking the avatar with it, a User's dropped, a User's avatar kept, and the Scenario keeping banner and avatar both) — **3 of them fail on 0.0.58**, which is the point of a behaviour-change fixture; `ccav-smoke` 211/211 unchanged. Style grep 4; `px solid` grep 0; declared-vs-used clean, `CR_SLOT_BANNER` down to 8 references, all Scenario, generator or Stage. Sections 36; LF pure; frontmatter parses. **`cr-data-fixture.js` changed — re-upload it with the engine.** Bridge unchanged |
| engine 0.0.58 | **[CR-POSTTIME-PUNCT] the time frame stopped double-punctuating** — found by the author reading what the two buttons actually send: `Since then: Walks around the kitchen.; Sits in the toaster to warm up..`. A schedule entry is a sentence the author typed and usually ends in a stop; the frame joined with `"; "` and closed with a stop of its own. Each item now loses a trailing `. , ; :` run and the clause is closed once, and not at all when it already ends in `!`, `?` or an ellipsis. **Not cosmetic**: this text is an example of how the Contact writes, handed to the model that writes the next post | Parity **20/20 byte-identical** and only `SECTION CR-POSTS` changed by hash, so the kernel's subject did not move and the mutation check was not re-run; `tsc` histogram unchanged at the standing one TS2345; `cr-data-fixture` 40/40; **`ccav-smoke` 211 cases** (8 new, and they read the CLAUSE rather than the list because the bug was in the join and the close — the doubled stop, the `.;` seam, the unpunctuated entry still getting its one stop, `!` keeping its tone, an ellipsis left alone, an empty entry dropped, and the whole frame carrying neither `..` nor `.;`). **None of the eight can run on 0.0.57**, the symbol being new. LF pure; frontmatter parses. **`ccav-smoke.js` changed — re-upload it with the engine.** Bridge unchanged |
| engine 0.0.57 | **[CR-ICONS] a bare verb is an icon, script-wide** (D-72): `CrIcon`, `CrIconButton` and `CrMenuRow` added, and the label-to-icon table lives in `CrButton` so one edit converts every CR control. **[CR-POSTFEED]** the Posts card reads as a feed post — author line, text, full-bleed photo, comment bar, comments — the body is the open/close control, and the eight verbs that were a wrapping row are a sheet behind one overflow handle. **[CR-CARDMEDIA]** a Cards row's picture fills the left end of the card, masked to fade into it. **[CR-STYLE]** shape tokenised: border widths, button and control padding, tap size, card and post geometry; 47 literal `1px solid` borders swept onto `CR_LINE_W` | Parity **20/20 byte-identical**, and section hashes say why it could not move: `K`, `K-CONTEXT` and `HOOKS-MISC` are byte-identical to 0.0.56, so the mutation check's subject did not move and it was not re-run (0.0.43 / 0.0.50 precedent). `tsc` histogram unchanged at the standing one TS2345; `ccav-smoke` **203/203** and `cr-data-fixture` **40/40**, both unchanged — a patch that changes no behaviour must move no number (D-70's rule). Style grep unchanged at 4, all four editor sentinels; **the new `px solid` grep returns 0**; declared-vs-used clean on 18 new symbols, and it caught `--cr-icon-sm`, which was deleted rather than left as a token nothing reads. LF pure; frontmatter parses. **Bridge unchanged**. Live checks are in §11.4 |
| engine 0.0.56 | **[CR-ARGEN] the six generators the shell had no door for** (D-71): Reflect and Process on Memories, Plan with its own rows beside them, Reflect and Plan on a thread's row, Imitate under Voice. `SECTION CR-ARGEN` is prompts and plumbing only | Parity 20/20 byte-identical — the port calls AR's parsers and savers and rewrites none of them; `tsc` histogram unchanged at the standing one TS2345; `cr-data-fixture` 40/40; **`ccav-smoke` 203 cases** (19 new). The ones worth naming pin FIDELITY rather than behaviour: each prompt matching 1.1.5 word for word, each generator writing to the record AR writes to and not a neighbouring one, the thread text keeping AR's `====` separators and two-space Emotion lines, the key cleanup dropping the Contact's and User's names (a key always present is an entry always active), a new plan starting stopped and unanchored, and Imitate STAGING rather than writing onto the card. None run on 0.0.55; sections 35 → 36; style grep 7; LF pure. **Bridge unchanged** |
| engine 0.0.55 | **[CR-FORKMAP] the fork audit** (D-70). No behaviour change: every top-level symbol diffed against the oracle, the five unmarked AR modifications marked, `SECTION CR-SIDEGEN` bannered over three symbols that did not move so TYPES stops holding CR code, and a FORK MAP block added to the CR-INDEX as the merge checklist — if a symbol is not named there, AR's version can be taken whole | Parity 20/20 byte-identical and `ccav-smoke` 184 / `cr-data-fixture` 40 unchanged, which is the point: a patch that changes no behaviour must move no number. `tsc` histogram unchanged at the standing one TS2345; re-audit shows **0 unmarked modifications** (was 5) and **1 mixed-authorship section** (was 2), the survivor deliberate; sections 34 → 35; style grep 7; LF pure. **Bridge unchanged** |
| engine 0.0.54 | **[CR-POSTTIME-ANCHOR]** the day post now measures from the last interaction rather than the last post (D-68), falls back when AR's Time Apart stamp was never written, and names its anchor in the frame; the tab shows a frame per button. **[CR-POSTCOMM]** comments (D-69): one press, one comment, its own generation, on chat-scope and kept threads, with an avatar when the commenter is a card and per-comment removal | Parity 20/20 byte-identical — the Time Apart stamp is READ and never written here, so HOOKS-MISC and the kernel are untouched; `tsc` histogram unchanged at the standing one TS2345; `cr-data-fixture` 40/40; **`ccav-smoke` 184 cases** (18 new, two old ones rewritten against the new anchor contract). The ones worth naming: the day frame reading 3 days while the chat frame reads 2 hours off the same records, the fallback when no stamp exists, a future stamp discarded, and — on the comment side — that a KEPT thread gets comments at all, that a primed name the model repeats is not left in the body, and that a known name does not eat the first line, which is how a comment loses its opening sentence. Six anchor cases fail on 0.0.53 and the comment cases cannot run there; style grep unchanged at 7; sections 34; LF pure; frontmatter parses. **Bridge unchanged** |
| engine 0.0.53 | **[CR-POSTIMG] photos on posts, and [CR-POSTEDIT] editing one** (D-67). The Contact is asked in their own voice what they would attach; the architect turns it into a prompt; the generation lands gallery-keyed and the card shows it. New photo re-runs from the stored description for one generation rather than two, Edit photo opens it for rewriting, Remove unpoints without deleting the record, and a post's title and body are editable in place | Parity 20/20 byte-identical; `tsc` histogram unchanged at the standing one TS2345; `cr-data-fixture` 40/40; **`ccav-smoke` 166 cases** (13 new, and the ones that could not be read off the record are the ORDER — an empty answer leaves the post unpointed — the regenerate costing ONE generation rather than two, and the dispatch carrying NO `kind` (D-43), which needed the messaging stub to start recording broadcasts, since an absent key is invisible in every record this side). None run on 0.0.52; style grep unchanged at 7; sections 34; LF pure; frontmatter parses. **Bridge unchanged** |
| engine 0.0.52 | **[CR-POSTTIME] posts are stamped and the generator knows what time it is** (D-66). A `cr` bag on AR's `ForumPost` (D-29's shape) carries the stamp and the kind; a four-clause time frame — now, last post with both the clock time and the elapsed, what the schedule says filled the gap, and what they are doing this minute — goes into both kinds of generation; the Posts tab shows that frame under the buttons before anything is generated. **About the chat** keeps the focus it always had and **About their day** is the post from outside the conversation | Parity 20/20 byte-identical — the kernel's own Time Apart is untouched, and the two-unit phrasing lives beside it rather than in it; `tsc` histogram unchanged at the standing one TS2345; `cr-data-fixture` 40/40; **`ccav-smoke` 153 cases** (22 new, and the ones worth naming are the Daily event across three days counting ONCE, a gated event excluded, the fortnight skip, the midnight wrap read the kernel's way, a future stamp discarded rather than phrased, and the day post being told what it is NOT about). None can run on 0.0.51, the symbols being new; style grep unchanged at 7; sections 34; LF pure; frontmatter parses. **Bridge unchanged** |
| engine 0.0.51 | **[CR-IMGOPTS] the anchor option separator** (D-65) — every option after the first dropped since 0.0.8, which is what made a Stage figure float and had quietly disabled `collapse=1` and `shrink=1` across every CR surface. **[CR-STAGE-Z]** the Stage's dialogue box, speaker name and scrim were invisible because the bridge paints `.ce-surf-img` at **z-index 1** and everything 0.0.50 drew over a picture was left at `auto` — later in the DOM is not later in paint order once a z-index is in play. The cast row and the box declare their own layer now. **[CR-BTNSQUEEZE]** a CrButton no longer shrinks or wraps in a flex row, which is what squeezed "Open" into a column of single letters beside a two-line blurb — fixed on the primitive, since every CR row that puts a control beside growing text has that shape. **[CR-ROWTAP]** and the Cards row has no Open button at all: the row is the control, as a CrPressable with D-41's states | Parity 20/20 byte-identical; `tsc` histogram unchanged at the standing one TS2345; `cr-data-fixture` 40/40 (repaired copy); **`ccav-smoke` 131 cases** (8 new, and the load-bearing one reads a REAL surface's anchor — CrAvatar's — through a local reimplementation of the bridge's `_ceSurfImgParse`, because a test that builds its own payload proves the separator and not the call sites). Three of the eight **fail on 0.0.50** and the rowtap pair throws there, the symbols being new; style grep unchanged at 7; sections 34; LF pure; frontmatter parses. **Bridge unchanged — it was right and the engine was wrong** |
| engine 0.0.50 | **[CR-STAGE] Stage mode built** (D-56, §6.8b). `SECTION CR-STAGE`: the document read into **beats** — one per paragraph, the Emotion line retro-assigned to its run and carried past the author's turns — the paired Scenario's slot as the backdrop, the two figures with the non-speaker shrunk and darkened, step back and forward, and the look settings on the surface itself. **The bridge needed no change and that is a finding (D-64)**: its own `[CHAT-STAGE]` painter was deleted at 3.0.29, and what survived is the anchor opts vocabulary, whose `pos=bottom` exists to stand a contained figure on its box's floor | Parity **20/20 byte-identical**, and **section hashes prove why it could not move**: `K`, `K-CONTEXT` and `HOOKS-MISC` are byte-identical to 0.0.49 and only `CR-UI`, `BRIDGE` and the new `CR-STAGE` changed — so the mutation check's subject did not move and it was not re-run (0.0.43's precedent). `tsc` histogram unchanged at the standing one TS2345; **`ccav-smoke` 123 cases** (12 new, and the load-bearing ones are the run-is-two-beats split, the retro-assigned emotion, the carry-forward past a user turn, a stray Emotion line not relabelling a closed run, the cap taken from the END, stepping onto the last beat returning to FOLLOW, and an unknown backdrop slot being KEPT); style grep **unchanged at 7** — the Stage added none, every hit is still a sentinel widget's or AR's own UIParts; declared-vs-used clean on 25 new symbols; sections 33 → 34; LF pure; frontmatter parses. **`cr-data-fixture` 40/40 on a locally repaired copy** — the project's copy is stale twice over (§11 header): its end anchor is still `SECTION CR-UI`, so it now slices across CR-BUBBLE's top-level `await` and will not even parse, and it holds 40 cases rather than the current 51. **Bridge unchanged** |
| engine 0.0.49 | **[CR-POSTS-OPTS]** New thread threw `generate: params has unexpected keys: suppressScriptHooks`. The flag is `generateWithStory`'s **third argument**, not a generation param — `params` is forwarded to generate, which rejects any key it does not know. **The typings had it right at L2550-2557 and 0.0.47 read them wrong**, which is worth keeping distinct from D-61: there the runtime refuses what the interface permits, here we did not finish reading the interface. Different remedies — distrust the typings there, read them here | Parity 20/20; `tsc` unchanged; fixture 51/51; **`ccav-smoke` 103 cases**, and the smoke's `generateWithStory` stub now **records params and options separately and throws on an unknown param key exactly as the runtime does** — a stub that merged the two arguments could never have caught this. The two new cases fail on 0.0.48. **Bridge unchanged** |
| engine 0.0.48 | **[CR-CHATIMG-HIDE]** the resolved tag is hidden with `display: "none"`, not the 1px transparent font 0.0.44 used — that trick is for a **sentinel**, a widget of CR's own alone in its box, and over a run of the author's prose it left the text holding its line and reading as a gap. CE hid its own always-present prefix this way. The rule is now re-asserted from `crChatImgEmit`, so the one call that already runs whenever the document changed refreshes both halves. **[CR-CHATIMG-CONTEXT]** the id is taken out of context (D-63), in both hooks — the message list for the kernel and the story text for the brain matcher | Parity 20/20 byte-identical, **and the reason it cannot move is in the code**: the strip returns the same array unless a tag is present; `tsc` unchanged at the standing one TS2345; `cr-data-fixture` 51/51; **`ccav-smoke` 99 cases** (9 new — the rule's style and that it matches the resolved form only, the id gone, the description surviving, the untouched message being the *same object*, the input array unmutated, and the identity case that is the parity argument). The hide case **fails on 0.0.47**; style grep 7 → 6, the removed hit being the tag rule's own `fontSize`; LF pure; sections 33. **Bridge unchanged** |
| engine 0.0.47 | **[CR-POSTS] the Posts tab is real** (D-62), and it was the last mockup in the shell — and the only surface that lied, since AR's forum had been writing threads the whole time behind the Diaries door. `SECTION CR-POSTS`: the feed over AR's own `ForumThread` records in two scopes, a New thread generation written beside AR's, reading a thread's replies, a per-card delete confirm, and **Keep on the profile** moving a thread into a new account-level record keyed by Contact | Parity 20/20; `tsc` histogram unchanged at the standing one TS2345; `cr-data-fixture` 51/51; **`ccav-smoke` 90 cases** (10 new, and the load-bearing one counts BOTH lists before and after a keep so a copy could never pass as a move; plus the replies surviving the move, a return with no pairing dropping nothing, delete hitting only the named list, and the `====` body parse); style grep unchanged at 7; **one `gap: "2px"` literal caught by the §9.3 grep and folded onto `CR_S_1`**; declared-vs-used clean on 17 new symbols; sections 32 → 33; LF pure. **Bridge unchanged** |
| engine 0.0.46 | **[CR-CCAV-CLEAR-SHAPE]** the wrap-clearing widget's top-level `display: "block"` removed (D-61) — it had been refused by the editor every turn since 0.0.39 and was saying so in the console. A refusal now **retries once** with the inner style pared back to the fields the portrait sentinel proves are accepted, and logs which attempt stood, so "was it the top-level field or the content style?" is answered in the same pass rather than the next session. **[CR-CHATIMG-DIAG]** the photo pass and the cue log one line per generation naming what they saw — setting state, paragraphs read, whether a tag matched, and **the text of the last paragraph**, which is the fact that distinguishes a pattern that failed to match from a `document.scan()` that lags the editor at generation end. The Chat screen also warns the likelier way round: the brain is present and the switch is off | Parity 20/20; `tsc` back to the standing one TS2345 after the retry array was typed; fixture 51/51; **`ccav-smoke` 80 cases**, and the new clear-shape case **fails on 0.0.45**; style grep 6 → 7, the new hit being the retry widget's own `fontSize: "1px"` — an editor decoration in the same class as the six already there; LF pure; sections 32. **Bridge unchanged** |
| engine 0.0.45 | **[CR-SIDEGEN] why 0.0.44's photos did nothing** (D-60), plus the two sweep bugs the photo anchors exposed. `crSideGenerate` wraps all six utility generate call sites and holds a depth counter; onGenerationEnd's CR tail returns while it is above zero. [CR-CHATIMG-SWEEP] the photo anchors are disposed by handle in `clearEditorImages` beside the portraits and the bubble markers — U-15's bug one subsystem over, and 0.0.44 left them to the global sweep while still holding their handles. [CR-CHATIMG-CAP] AR's 50-widget cap counted CR's node widgets, which between three families can reach it unaided and trip a sweep on an unrelated generation end; it counts only widgets carrying a `position` now, which is the same test the filter below it has used since 0.0.35 | Parity 20/20; `tsc` histogram back to the standing one TS2345 after the wrapper was made **variadic** — narrowing it to `(messages, options)` broke AR's own four-argument calls, and rewriting those to fit CR's idea of the call is what D-28 forbids; `cr-data-fixture` 51/51; **`ccav-smoke` 79 cases**, and the five new ones **fail on 0.0.44** — the stub's `generate` now re-fires `onGenerationEnd` the way the platform does, which is the thing no offline check modelled before; style grep unchanged at 6; declared-vs-used clean; sections 32, LF pure. **Bridge unchanged** |
| engine 0.0.44 | **[CR-CHATIMG] photos the Contact sends mid-chat** (D-57, built as D-58/D-59). `SECTION CR-CHATIMG`: the two tag patterns, the brain and its button, a chat-scoped architect pass, the dispatch, the document rewrite, the anchors, the tag-hiding rule and the drop handler. Toggle on the Chat screen beside the cue, off by default; the instruction is a brain written from the Contact's Brains tab | Parity 20/20 byte-identical **with no fixture moved** — which is the point of D-58: a brain reaches the model through AR's own matcher, so the kernel was not touched; `tsc` histogram unchanged at the standing one TS2345; `cr-data-fixture` 51/51; **`ccav-smoke` 74 cases** (21 new: both patterns including the one that proves idempotence, the short id, the four load-bearing clauses in the brain text, the whole pass end to end, a second pass over the rewritten turn generating nothing, an empty architect answer leaving the tag alone, the bridge-down and no-tag and feature-off exits costing no generation, the two-per-pass cap, and the drop stripping only the tag); **style grep 4 → 6**, and both new hits are the sentinel widget's own `fontSize: "1px"` and the tag rule's — editor decorations in the same class as the hits already there, not CR surfaces (0.0.39's precedent); declared-vs-used clean on 24 new symbols; sections 31 → 32; LF pure; frontmatter parses. **Bridge unchanged, and that is a finding rather than luck (D-59)** |
| engine 0.0.43 + bridge 3.0.29 | **[CR-CCAV-GUTTER] the left gutter, and U-17 closed** (D-55). The engine emits one node marker per section of each decorated run carrying `marginLeft` = portrait size + 12px, on the Contact's turns only; the widget row is left un-indented, so the band it opens is exactly where the bridge paints. Bridge 3.0.29's gutter branch is `position:absolute; left:0` in a zero-height `position:relative` host, replacing the negative offset an ancestor clipped. Only `inline` floats now, so only `inline` emits the wrap-clearing widget and shows its switch. A refused indent is reported in the Placement hint | Parity 20/20 byte-identical (see the flake note below); `tsc` histogram unchanged at the standing one TS2345; `cr-data-fixture` 51/51; **`ccav-smoke` 53 cases** (10 new: one marker per section including the emotion line, the lane derived from the size, `marginLeft` as the ONLY property so a bubble rule keeps everything it sets, the author's turn NOT indented, the widget row not indented, no clearing widget under gutter, and no indent under any other placement); style grep unchanged at its 4 pre-existing editor-decoration hits; declared-vs-used clean on 2 new symbols; LF pure; frontmatter parses. **Section hashes prove SECTION K, K-CONTEXT and HOOKS-MISC are byte-identical to 0.0.42 — only CR-UI changed — so the mutation check's subject did not move and it was not re-run.** **Bridge changed: upload to BOTH projects** |
| engine 0.0.42 | **Two live findings, one shared root cause.** [CR-BUBBLE-MARK] the author's turns never got a bubble: 0.0.41 matched them with a rule on `{ <User>: `, and **the document never holds that string** — AR's rewrite of brace lines is commented out in the source, and the live kernel prefixes the User's name at context-build time instead. Their turns are found by **section origin** now (`origin[].data`, script-types L393/L406-414) and painted with node **markers** (`createMarkers`, L2351-2359), disposed by handle beside the portraits because `clearMarkers()` is as global as `clearWidgets()`. [CR-CUE] the same wrong reading, same fix: the opener is `{ ` and nothing else, since a document line carrying the name would have been sent as `Sam: { Sam: … }`. The cue also asks for `documentEdit` the way the greeting does, and reports what the last generation did about it | Parity 20/20; `tsc` unchanged; fixture 51/51; **`ccav-smoke` 43 cases** (5 for the markers — origin, an edited generated line staying the Contact's, the name guard, off, and the 60-section cap; 1 for a refused permission); style grep unchanged; declared-vs-used clean; LF pure. **Bridge unchanged** |
| engine 0.0.41 | [CR-BUBBLE] chat bubbles (D-53) built: `SECTION CR-BUBBLE` holds the record, the per-field resolver, the style builder and the editor, while the **types and the whitelist stayed in CR-DATA** with the other card data. Mechanism is `registerRules` with `type: "node"` — a rule styles a whole paragraph, so a bubble costs no widget, survives editing and reflows with the text. Fill (solid/gradient), colour, opacity, text colour, border, corner, padding and glow, per side; account default with a per-Contact partial override; `CrColour` is a hex field plus our own swatches, because a jsx part has no usable native colour input; the preview is drawn from the same style builder the rules use. Global gains a Bubbles tab, the Contact's Visuals tab gains the override | Parity 20/20; `tsc` histogram unchanged at the standing one; `cr-data-fixture` **51 cases** (11 new, including a non-hex colour dropped rather than guessed at, an EMPTY colour KEPT because blank means inherit, and every number clamped rather than rejected); style grep unchanged; declared-vs-used clean on 37 new symbols; LF pure; sections 30 → 31. **The fixture's end anchor moved** from `SECTION CR-UI` to `SECTION CR-BUBBLE` — the bubble record's top-level `await` cannot run inside the `Function` the fixture builds, which is the second reason the sanitizer stayed in CR-DATA. **Bridge unchanged** |
| engine 0.0.40 | [CR-CCAV-TWOCALLS] the 0.0.39 regression: "Beside the text" lost its avatars, because the sentinels and the clearing widgets went to `createWidgets` in ONE batch and a batch is all-or-nothing — whatever the editor disliked about the clear took the portraits with it. Two calls now, portraits first and returned on their own; the clear's text is a zero-width space rather than `" "` (a widget whose content trims to nothing is one the editor may refuse); a refusal is reported in Global > Editor, which also carries an OFF switch reproducing 0.0.38's emission. [CR-CUE] D-54 built | Parity 20/20; `tsc` unchanged; `ccav-smoke` extended to **36 cases** — three for the two-call split and the off switch, ten for the cue. **Bridge unchanged** |
| engine 0.0.39 | [CR-CCAV-FIRST] a greeting's portrait painted at the END of the message: the first run in the document has no section above it to anchor on and fell back to its own, and a node widget inserts AFTER the section it names. `sectionId: 0` is the documented "before the first section" anchor (`script-types.d.ts`, `DecorationCreateNodeWidgetOptions.sectionId` L1719). [CR-CCAV-CLEAR] the User's turn no longer starts wrapped beside a tall portrait — a float is only cleared by content after it and the bridge has none down there, so the engine emits a zero-height `clear: both` block on each run's last section. [CR-CCAV-CAP] 24 runs, taken from the end, now that each costs two widgets (U-04). [CR-SLOTIDX] the filled-slot index is asked for on the first handshake ACK and on a new pairing, not only by a visit to a Photos tab | Parity 20/20 byte-identical; `tsc` histogram unchanged at the standing one; `cr-data-fixture` 40/40 (the stale copy — see §11); style grep +1, and it is the clearing widget's own `fontSize: "1px"`, which is an editor decoration in the same class as the sentinel beside it rather than a CR surface; LF pure; frontmatter parses. New **`ccav-smoke.js`, 21 cases**, which covers what no parity fixture can: crCcavEmit writes no storage and returns nothing, so the harness sees it as a no-op — the smoke captures the widget list itself (anchor at 0 vs the section above, one clear per run on the run's LAST section, the cap taken from the end, a stray Emotion line not relabelling a closed run, the fallback chain on the emitted value, avatar/off modes, unpaired, and handle disposal on re-emit). **Bridge unchanged** |
| engine 0.0.29 – 0.0.38, bridge 3.0.25 – 3.0.28 | AR's last three UI doors retired and rebuilt as shell screens (Chat 0.0.29, Global 0.0.30, Jots 0.0.31); the Memories tab and the emotion fallback chain (0.0.32); the filled-slot index and D-13's display options (0.0.33); **editor portraits, both halves** — the engine's handle-tracked sentinel widget (0.0.34, with the load crash it caused fixed in 0.0.35) and the bridge's restored painter (3.0.25 `CCAV-PAINT-RESTORE`, 3.0.26 `CCAV-WRAP`, 3.0.27 `CCAV-PLACE`); the emotion-line and speaker-name options made to do something (0.0.36); number fields committing on blur (0.0.37); the unreachable gutter placement removed on both sides (0.0.38 / 3.0.28) | Per-build verification is in the engine's CHANGELOG and the bridge's CE-INDEX, which are maintained in the same patch as the code. Live-confirmed by the author: portraits paint, the sentinel resolves a real host, the fallback chain reacts. §6.8a holds what that live pass found |
| engine 0.0.1 | AR 1.1.5 + SECTION K + K-CONTEXT adapters; UI names AR → CR; section markers; CR-INDEX; new script id | Three-way parity (AR vs kernel vs built engine) on 20 fixtures / 50 steps; mutation check on SECTION K; `tsc` histogram identical to AR 1.1.5's (6 pre-existing errors, all in AR's JSX schedule editor and one argument type); full load through the harness runtime. **Live: imported, chat held.** |
| engine 0.0.28 | [CR-RETIRE] AR's Cards panel retired — the `cardListingPanel` registration, three listings with their `update*ListingUi` and `confirmDelete*` companions, three card modals with their page builders and page-turn helpers, AR's UIParts schedule editor, its example-chat modal and the macro sampler: 32 top-level blocks and the 160-line panel, about 2,800 lines. Two doors rebuilt in the same patch so nothing was cut with them — the **brains file** (F-08) as buttons on CR's Brains tab, and the **macro sampler** as `CrMacroReference` in CR Global, which shows what each macro expands to right now. D-51 answered O-14 | Parity 20/20; fixture 40/40; smoke 41/41; **`tsc` histogram SHRANK from six to one** — four `defaultValue` errors and one `useState` error were AR's card modals and schedule editor, and they left with them; style grep clean; zero-reference scan on all 36 removed names; orphan sweep found four, three of them upstream's crop tool (kept on purpose, D-51) and one pre-existing. **Bridge unchanged** |
| engine 0.0.27 | [CR-FAREWELL] AR's delete-with-farewell ported into CR's own delete: the sheet generates the Contact's last message while the author decides, arms Delete after two seconds whether or not the generation lands, and coerces glm-4-6 to xialong-v1 as AR did. The two-press confirm on the profile is replaced by it. **This is a precondition of retiring AR's Cards panel**, not a feature in its own right: the generation lived inside `confirmDeleteCharacter`, which comes out with the panel | Parity 20/20; `tsc` the standing six; fixture 40/40; smoke 41/41; style grep clean; `crContactConfirmId` confirmed gone (0 references) and 9 new symbols all used. **Bridge unchanged** |
| engine 0.0.26 | [CR-STATUS] The status line — what the Contact is doing at the chat clock's current time, on the profile header, the Chat screen and the Schedule tab. One read (`crStatusRead`) shared with nothing else, so it cannot drift from Current Events; the intimacy gate is reported rather than applied silently; a "not sent" pill only on the paired Contact, only when neither story time nor Track Real Time is carrying the schedule | Parity 20/20; `tsc` the standing six; fixture 40/40; style grep clean; declared-vs-used on 3 new symbols; smoke suite extended to **41** cases, 11 of them the status line (unpaired vs paired, the withheld count, Daily plus weekday feeding one line, and the clock moving the answer). **Bridge unchanged** |
| engine 0.0.25 | [CR-CLOCK] `SECTION CR-CLOCK`: one clock read for every consumer, real or story per chat, the story clock in `historyStorage` so undo rewinds it, move-by controls and an optional per-reply step. Story time carries Time Apart and Current Events without AR's toggle (D-50), **without touching the kernel**. [CR-SCHED] the Contact's Schedule tab — a week of strips, a day view with lanes, a now-line, and an event sheet. [CR-PAIRSNAP] `crCommitCard` now reflects the edited record into `chatSettings`: AR's editors always did, CR's did not, and the schedule is the first CR surface whose writes **the kernel reads** | Parity 20/20 byte-identical; `tsc` histogram the standing six; style grep clean; declared-vs-used on 47 new symbols; sections 29 → 30; LF pure; frontmatter parses. New `clock-smoke.js` (30 cases) covers what no fixture can: mode fallbacks, the history-storage rewind, midnight wrapping, lane packing, the live and gated tests. **Bridge unchanged** |
| engine 0.0.24 | [CR-BRAINS] One Brains editor on all three card types — static entries, and conditionals with their keys and required intimacy. Written once rather than per type, because `brains` and `brainsConditional` are the same two fields with the same meaning on all three; the kind only ever decides which list `crCommitCard` saves. Keys are a comma-separated field and an array in the record, blanks dropped and **nothing else touched** — AR's matcher decides what a key means, and normalising them here would change which entries fire without saying so | Parity 20/20; fixture 58/58; `tsc` the standing six; style grep clean; declared-vs-used on 5 new symbols; the three "edited in the old panel" notes are gone (0 left). **Bridge unchanged** |
| engine 0.0.23 | [CR-CARDEDIT] The Contact editor, bundled: About (name, handle, description, persona, appearance, the four attributes, and intimacy/style/CJK as choices) **plus** a real Voice tab — greeting, greeting emotion, and an example-chat editor with add/remove, per-example name, user name and style, and per-line speaker, emotion and text. New, Import, Export and Delete on Contacts. New kit primitive **CrChoice**: one-of-N as chips, because AR's `<select>` idiom needs `defaultValue`, which the typings reject and which is four of the six standing errors — CR does not inherit that. The 26-item emotion list is the one choice too long for chips, so it opens the jsx modal instead | Parity 20/20; fixture 58/58; `tsc` histogram **unchanged at six** — the point of CrChoice; style grep clean; declared-vs-used on 11 new symbols. **Bridge unchanged** |
| engine 0.0.22 | [CR-CARDEDIT] The User editor on the Scenario's shape: name, description, persona, appearance, species, gender, pronouns and tags on About; New and Import above the rows; Export and a two-press Delete that unpairs first. The save-refresh-repaint tail is now one function (`crCommitCard`) told which list, rather than a second copy — with the save and the refresh caught **separately**, because a refresh that throws is a panel that was not open and reporting that as a failed save sends the next reader to the wrong place | Parity 20/20; fixture 58/58; `tsc` the standing six; style grep clean; declared-vs-used on 7 new symbols; the two old inline tails are gone (0 left). **Bridge unchanged** |
| engine 0.0.21 | [CR-CARDEDIT] The Scenario editor, and the first of AR's own fields CR writes: name, description, environment, scene and tags on the About tab; New and Import above the rows on Cards; Export and a two-press Delete on the profile, which unpairs the chat first as AR's own delete does. One setter, capped and nothing else — no trim, no default, because a field being cleared is not a field to put a default back into (CR-OUTFITBUG, one record type over). AR's listing is refreshed after every write so the two views agree | Parity 20/20; fixture 58/58; `tsc` the standing six; style grep clean; declared-vs-used on 5 new symbols. Delete confirm is keyed by id, not a boolean, so an armed confirm on one Scenario is not still armed on the next. **Bridge unchanged** |
| engine 0.0.20 | [CR-PAIRSNAP] Two live findings fixed. **Banners were never painted**: the Contact header had no anchor at all and neither card had a door, so a banner could not be stored in the first place — both now have a `Banner` slot on Photos (16:9, framed wide) and an anchor in the header, with `crSlotTag` returning nothing for Banner as it already did for Avatar, since "Banner" is a word a model will try to draw. **The studio showed no location**: `chatSettings.scenario` is a detached copy (D-48), so a scene pair written after pairing was invisible; the Location section now reads the live record and states which Scenario is paired in every case, including the empty ones | Parity 20/20; fixture 58/58; `tsc` the standing six; style grep clean; 120 direct `chatSettings.char` reads left untouched, all of them AR's or the kernel's. **Bridge unchanged** |
| engine 0.0.19 | [CR-CARDKIND] User and Scenario profiles, opened from their Cards rows. Router is `openContactId` + `openKind` — one id, one kind, never three id fields. `crIsUserCard` routes save and sanitizer by id, so the shared image-card setters serve both; `crSlotTag`, `crGenerateSlot` and `CrVisualsTab` widened to `CrCastCard`. New `CrOneImage` (a grid of one is just a box) backs the User's avatar and the Scenario's banner; `crGenerateBanner` sends an empty cast, because a banner with a character prompt is a portrait with extra steps | Parity 20/20; fixture 58/58; `tsc` histogram the standing six; style grep clean; declared-vs-used on 10 new symbols. **Bridge unchanged** — `<id>_em_Banner` needs nothing new, the slot name is a key fragment there and the bridge validates no list |
| engine 0.0.18 | [CR-SCENE] O-13 answered and built: `CrSceneCard` on the Scenario (scene pair + banner pair + banner seed), folded into the base prompt of every illustration ahead of anyone's own base tags. The Illustrator's cast picker gains a Users row, two rows rather than one list because a User and a Contact can share a name. Assemblers widened to `CrCastCard`. The gallery sheet's "not in the file yet" line is gone (D-45) | Parity 20/20; fixture **58** cases (3 new scene-card rows, including the dropped character fields and a zero seed); `tsc` histogram back to the standing six after widening `crIllusVisualsFor` — the three `User`-not-assignable errors it first threw were the real check working; style grep clean; declared-vs-used on 5 new symbols. **Bridge unchanged** |
| engine 0.0.17 | [CR-DATA] `cr` bags for User and Scenario: `CrUserExtra` (avatar/banner refs, profile, the four image prompt pairs) and `CrScenarioExtra` (avatar/banner refs, profile). Sanitized on import beside the Contact's; **export needed no change** — AR writes both records whole, so the bag rides out with them. A Scenario's `img` bag is dropped, pinning O-13 rather than half-answering it | Parity 20/20; `cr-data-fixture` **55** cases (15 new, including the dropped Scenario `img` and a User's dropped emotion map); `tsc` histogram unchanged; style grep clean; declared-vs-used on 6 new symbols. No surface reads either bag yet — the profiles are the next patch, exactly as 0.0.4 was for the Contact |
| engine 0.0.16 | [CR-GALLERY] `SECTION CR-GALLERY` and the Gallery tab on the Illustrator: thumbnail grid over the bridge's index, per-image sheet with prompt, model, size, steps, guidance, seed and the record's character prompts, plus Download, Use as prompt and Delete behind a confirm. Delete never splices the local list — the bridge re-sends the index. Two tabs rather than a seventh rail item: the mobile bar is already six across | Parity 20/20; fixture 40/40; `tsc` histogram unchanged; style grep clean; declared-vs-used on 23 new symbols; LF pure; frontmatter parses; section markers 27 → 28. **Bridge unchanged** — every message it speaks shipped at 3.0.24 for CE |
| engine 0.0.15 | [CR-ENHANCE] port of CE's `enhanceDirectorPrompt`: an Enhance button beside Scan that rewrites the composer's own text and returns per-Contact visuals in a separate field. The refinements are **the composer's**, held as one-off overrides keyed by Contact id and never written back to a card (D-37); dropping a Contact from the cast drops its override, and a Revert control clears them all. `crExtractJSON` reads a balanced object rather than a greedy brace match | Parity 20/20; fixture 40/40; `tsc` histogram unchanged (the standing six); style grep clean over SECTION CR-DATA → SECTION MACRO-UI; declared-vs-used on 7 new symbols; brace delta +2, both accounted for (`indexOf("{")` and a `{` in a comment). **Bridge unchanged** |
| engine 0.0.14 | [CR-ILLUS] The Illustrator surface — sixth rail destination: scene composer (editable, module-level state so a half-typed prompt survives a repaint), Scan, cast picker capped at four, readouts of the assembled character prompts and active chunks, Generate, and the last image through the gallery anchor. Every picked Contact assembled with purpose `"illustrate"`, so the `illustrator` pair enters and `avatar` does not (D-37) | Parity 20/20; fixture 40/40; `tsc` histogram unchanged; style grep clean; declared-vs-used on 8 new symbols; rail confirmed at 6 items. **Bridge unchanged — no new message, no new op, no new storage key** |
| engine 0.0.13 | [CR-SCAN] port of CE's `buildArchitectPromptFromStory`: reads the last N chat turns from the current history node, whole-word cast detection over `charList` (name and alias), architect generation with cast-scaled token budget and temperature 0.7, and a stripper for reasoning wrappers / fences / labels. Instruction and read depth are account settings in Global with a Scan button showing cast and prompt | Parity 20/20; fixture 40/40; `tsc` histogram unchanged; style grep clean; declared-vs-used on 12 new symbols. **`api.v1.generate` takes no `suppressScriptHooks`** — that belongs to `generateWithStory` (L2556), so D-23 does not apply to this call |
| engine 0.0.12 | [CR-FEEDBACK] hover/press on buttons, tabs, rail items and slot tiles, focus ring on text fields (D-41). Fixed: clearing an outfit name put "Outfit" back on the next keystroke | Parity 20/20; `cr-data-fixture` **40** cases — the outfit case had to be repinned **a second time**, and the style-guide grep was found to be too narrow and was widened |
| engine 0.0.11 | [CR-TOS] batch generation removed (D-40). Profile tab **Images → Visuals** — too close to Photos. `CrAvatar` gained `charId` and paints the **stored** avatar through a `shrink=1` anchor, with AR's base64 as the fallback, across card rows, the profile header and the chat card. Fixed: "Add an outfit" did nothing, because `crSanitizeOutfits` dropped a row with no prompt yet | Parity 20/20; `cr-data-fixture` **38** cases — the outfit case had been **pinning the bug** and was replaced with two that pin the fix; `tsc` histogram unchanged; no duplicate declarations; `grep 'fontSize: "'` in the CR sections still returns nothing |
| engine 0.0.10 | [CR-IMGCARD] Images tab per Contact — four prompt pairs, avatar seed, outfit chunks, and a live readout of the assembled character prompt for both purposes (D-37). [CR-EMOTAGS] account-level emotion tags with per-Contact overrides, as a table in Global and in each slot sheet (D-38). [CR-STYLE] type and space scales, `CrField`/`CrTextInput`/`CrPromptPair`, every hand-typed size in the CR sections swept onto tokens (D-39) | Parity 20/20; `cr-data-fixture` **37** cases (10 new for the image card, incl. seed 0 dropped as indistinguishable from absent, and a missing `active` reading as off rather than on); two false expectations in the fixture corrected rather than the code; `tsc` histogram unchanged; declared-vs-used clean on 33 new symbols; `grep 'fontSize: "'` in the CR sections returns nothing |
| engine 0.0.9 | [CR-IMG] Slot generation per D-34/D-35: model, size, guidance, steps, seed and a prompt-chunk list in Global; per-slot tags on the card; a jsx slot sheet (Generate / Upload / Download / Delete) replacing the UIParts modal (D-36); sequential batch generate for empty slots | Parity 20/20; `cr-data-fixture` now **27** cases (5 new for `imgTags`) and its comparison made key-order insensitive — the old one was a false failure waiting to happen; `tsc` histogram unchanged; declared-vs-used clean on 29 new symbols; section-order error in the CR-INDEX map caught and fixed |
| engine 0.0.8 | [CR-IMGSTORE] Photos rebuilt on the portrait store per D-33: tile → bridge upload, `data-ce-img` anchors for display, Avatar slot, per-Contact probe on mount, `AE_CHAR_IMAGE_UPLOADED` handled, Stored-images modal with delete and download. AR's `char.emotions` untouched | Parity 20/20; `cr-data-fixture` 22/22; `tsc` histogram unchanged; declared-vs-used clean, and the four 0.0.7 card-write functions confirmed gone rather than orphaned. **This closes U-08's last blocker** — an upload is now the door that puts an image under a CR Contact id |
| engine 0.0.7 | [CR-WIRE] Photos is live — a slot tile is its own file picker, plus Set avatar image and a Clear-a-slot modal, all through AR's save path (D-32). [CR-SCALE] desktop avatars scale with the window via `clamp()` in `--cr-*` tokens; mobile keeps fixed pixels | Parity 20/20; `cr-data-fixture` 22/22; `tsc` histogram unchanged; declared-vs-used on 7 new symbols. **Writes and scaling are live-only checks** |
| engine 0.0.6 | [CR-MOBILE] Mobile and desktop layouts per D-31, mobile default; `CrRail` became `CrNav` and renders as a bottom bar or a side rail from one item list | Parity 20/20; `cr-data-fixture` 22/22; `tsc` histogram unchanged; frontmatter parses; declared-vs-used on the renamed nav and the new layout symbols. **Layout is a live-only check** — nothing offline renders it |
| engine 0.0.5 | SECTION CR-UI: toolbar button → `api.v1.ui.window.open` with one jsx part. Rail (Chat, Cards, Jots, Global, Games), Cards split three ways over the real lists, Contact profile with banner/handle/pills and seven tabs, Photos showing all 25 slots from the card plus the bridge probe's first door. [CR-STYLE] token layer per D-30 | Parity 20/20 after the harness gained the preact globals — **the load failure this caught is the point**: `createStore` at module level takes the whole script down, not just the UI. `cr-data-fixture` 22/22 (end anchor repointed to CR-UI). `tsc` histogram back to the standing six after two real type errors were fixed (`User` has no `alias`/`avatar`) |
| engine 0.0.4 | SECTION CR-DATA: `cr?: CrContactExtra` on the Contact record (images/profile/display), whitelist sanitizer, round-tripped through Contact export/import | `cr-data-fixture.js` — 22 cases green, extracted from the shipped source rather than a stub: collapse-to-undefined, whitelist rejection, caps, floor/reject on numbers, two-pass round-trip stability, and a card laundered through AR losing `cr` cleanly. Parity 20/20; `tsc` histogram unchanged; declared-vs-used on 17 new symbols |
| engine 0.0.3 + bridge 3.0.24 | Contact slot probe: `AE_CHAR_IMAGE_ACTION` gains op `slots`, answered on the new `AE_CHAR_IMAGE_SLOTS`; bridge reads the portraits store's keys only (`getAllKeys`, no records); guard moved per-op as [GAL-BULK] did. CR Global gains a per-Contact readout with a 4 s timeout for older bridges | Parity 20/20 byte-identical; `tsc` histogram unchanged; frontmatter parses; LF/CRLF pure; `node --check`; declared-vs-used on 7 new engine symbols and 2 bridge ones |
| engine 0.0.2 + bridge 3.0.23 | SECTION BRIDGE (transport only): handshake retry loop, connection state, status readout and Reconnect in CR Global; bridge echoes `{engine, crAware}` on the ACK (D-26) | Parity re-run byte-identical (20/20); `tsc` histogram unchanged; frontmatter parses; LF/CRLF pure; `node --check` on the bridge; declared-vs-used on 19 new engine symbols. **The transport itself is unexercised offline** — the harness stubs `api.v1.messaging` and never fires `onScriptsLoaded`; live pass is the only proof |

---

## 6. Surfaces and subsystems

### 6.1 NAI-side doors

Two in total: a toolbar button **CharacterRoom** that opens the shell, and one compact
script panel showing the story's pairing, injection status and Open Profile. Everything
AR hung off the sidebar, toolbar and context menu moves inside the shell.

### 6.2 Shell screen map

- **Home**: Contacts as profile cards (avatar, name, status line), Users, Scenarios;
  New, Import.
- **Chat**: this story's pairing, scenario, tags, intimacy, style, length, clock,
  Insert Greeting, floaty brains, injection status.
- **Profile** (Contact), **Profile** (User, trimmed), **Scenario**.
- **Settings**: default author, editor display (images, emoji set), emotional modes,
  macro reference, bridge status, budget readout.
- **Games** (door in P8).

### 6.3 Contact profile

- **Header** (D-73, built 0.0.59, `CrProfileHead`): one large portrait sharing its band with
  the name and handle, the attributes as pills, the status line and the card's Export and
  Delete — portrait falls back per §6.5, name and alias,
  status line from the schedule, intimacy shown as the relationship with the active User.
- **Posts**: forum threads and selfies as one feed, newest first.
- **About**: attributes, each with generate and reroll (§6.7).
- **Photos**: avatar, banner, the 24 emotion slots (filled / empty, each with its own
  Generate), gallery. The image-generation launchpad.
- **Schedule**: a week view built for one Contact (D-14) — seven day columns plus Daily,
  events as blocks with overlaps side by side, a now-line in the chat clock's time, and
  intimacy-gated events marked. Today's active events echo in the header status line.
- **Memories**: Jots, Diary, Process, Plans.
- **Voice**: greeting, example chats, Imitate candidates.
- **Brains**: static and conditional, import/export. Collapsed by default.

Profile-only fields (`profile.*`) are display only and never reach the prompt.

### 6.4 Image pipeline

- **One press, one image** `[CR-IMG-ONE]`. No loops, no queues, no "fill remaining slots".
- Prompt compiled from appearance (plus the emotion or scene) with CE's architect pattern
  and model table; the author can edit it before pressing.
- Result lands as a preview: Keep (writes the slot) or Discard. Kept images carry
  `meta.prompt` and `meta.model`.
- Gallery images can be assigned to any slot ("Use as avatar", "Use as sad").
- Upload path keeps AR's crop tool; the 20 KB limit goes away with IDB.

### 6.5 Emotion fallback chain

Requested emotion → nearest filled neighbour → `neutral` → avatar → initials placeholder.
The neighbour map is a data table, for example `laughing → happy`,
`irritated → angry`, `worried → nervous`, `tired → bored`. It is authored once and
shown on the Photos tab, so the author can see which image stands in for an empty slot.

**The engine resolves; the bridge paints.** The engine keeps an index of which slots each
Contact has filled (updated on upload, generate, delete) and writes the *resolved* emotion
into the sentinel. The bridge's own exact-emotion → Avatar fallback stays as the safety
net for an index that lags a moment behind IDB.

### 6.6 Clock and schedules

- **One clock read**, `crClockNow()` — **built, engine 0.0.25**. Real mode returns the
  device time. Story mode reads `cr.clock` from `historyStorage`, so undo rewinds time.
  Advanced by explicit controls (±30 min, ±1 h, +8 h, ±1 day, next morning, set to 08:00,
  match device) **and, optionally, by a per-reply step** (off / 5 / 15 / 30 / 60 min),
  which fires only on a xialong reply so a utility generation never moves it.
  The value is cached in module state because `onBeforeContextBuild` is synchronous and its
  macros need the time; every place it can change refreshes the cache — `onScriptsLoaded`,
  `onGenerationEnd`, `onHistoryNavigated` (undo included) and the shell's open.
- Every time consumer reads it: macros, Time Apart, Current Events, emotional-mode time
  away, schedule matching, status line.
- **Schedule model is AR's** (D-14): `Record<'Daily' | weekday, ScheduleEvent[]>`,
  events `{id, startTime, endTime, text, requiredIntimacy}` in minutes, 30-minute steps,
  overlaps allowed, ranges may wrap midnight. Card import copies it unchanged.
- ~~**Track Real Time stops gating the schedule**; it becomes the real-clock mode's Time
  Apart toggle.~~ **Superseded by D-50, and shipped in 0.0.25 in the safer form**: in real
  mode AR's gate stands untouched; story mode carries Time Apart and Current Events itself.
  No kernel edit, no fixture change, parity still byte-identical.
- Current Events keeps AR's wording.
- **The status line is built (0.0.26)** and reads the schedule through one function,
  `crStatusRead`, so it cannot disagree with Current Events. It **reports and does not
  send**: nothing about it reaches the model, because Current Events already carries it.
  An event held back by the intimacy gate is counted and named as withheld rather than
  dropped. It sits under the pills on the Contact profile, in the Chat screen's own card,
  and above the week on the Schedule tab.
- The editor is new, and **shipped in 0.0.25**: a week of eight mini strips (Daily +
  weekdays) over a day view with **lanes** for overlapping events, a wrapped event drawn as
  two pieces, a now-line on the chat clock, and a jsx sheet per event (text, start, end in
  30-minute steps that wrap past midnight, day, required intimacy, delete behind a confirm).
  The geometry **is** borrowed from CE's `ceDayStrip`/`ceDayNow` and tagged `[KIT-FROM-CE]`
  — the bordered band, the now rule with a flag, the four-hour ruler. What is not borrowed
  is CE's flex layout: its segments are contiguous and cannot overlap, so they can be
  `flex: <minutes>`; AR's can overlap, so CR's are absolutely positioned into lanes.

### 6.7a Side generations (D-23)

Diary, Plan, Forum, Process, Imitate and the delete farewell get their context from a
kernel function, not from the chat hook: the AetherRoom sheet (Contact, User, Scenario,
brains), the story history, then the feature's own format line, style tag and primer.
No action-plan bookkeeping, no `<think>`, no chat style tag. Called with
`suppressScriptHooks: 'self'` so CR's own hooks stay out of it. Before shipping, each
feature gets one read side by side against AR's current output for the same chat.

### 6.7 Field generation

- One field per press, direct generate (D-03), model by field kind (D-11): voiced → xialong-v1, descriptive → glm-4-6.
- Input: the card's other fields, plus recent chat when the field asks for it.
- Output lands in a draft beside the field; Accept writes. Drafts use the scratchpad
  pattern (CLICK-BEFORE-BLUR).
- Budget readout next to every generate control. Nothing blocks on
  `waitForAllowedOutput`.

### 6.8 Editor avatars and decorations (D-13)

Display options, account default with per-Contact override (D-22):

| Option | Values (first pass) |
|---|---|
| Source | emotion portrait (fallback chain §6.5) / avatar only / off |
| Placement | left gutter (AR's, with indent) / inline before the name / above the message |
| Size | S / M / L, in `em` so it tracks the editor font |
| Shape | circle / rounded / square |
| Emoji | on / off, beside the emotion line |
| Emotion line | dimmed (AR's rule) / hidden / plain |
| Name | bold (AR's rule) / plain |

**Mechanism** (D-21). The engine authors the widget, so the engine chooses what the
bridge draws: display settings ride **in the sentinel**, and the bridge paints exactly what
it is told (engine is source, bridge is renderer — the old CE rule, `[CCAV-ENGINE]`).

- Sentinel: `ce-chatava:<contactId>|<emotion>|<opts>`, opts as comma-joined `key=value`
  tokens in the anchor-opt style (`size=40,shape=round,place=gutter`). The bridge drops
  tokens it does not know, so a new option is additive. Payload stays to ids, words and
  `=,|` — nothing a text part would template, so `noTemplate` is not needed.
- A Contact turn gets one node widget anchored above it; User turns get none.
- **Changing an option re-emits the widgets.** Sentinels already mounted carry the old
  values and would not change until the next turn.
- Widgets are **handle-tracked** (`createWidgets` returns handles with `dispose()`), never
  swept with `clearWidgets()` except as the recovery path after a script reload — the
  STORYIMG rule, so editor portraits and any later widget feature cannot wipe each other.
- Emotion-line dimming and name bolding stay **decoration rules**; changing their style
  is `decorations.updateRules` with `style` only and no `scope`, which touches no
  document content.
- The scan becomes incremental (new sections since the last pass) rather than
  whole-document on every generation end.

**Bubbles, later.** The old CE chat (Section 33, pasted) styled messages through six
decoration rules restyled in place: frame, corner, fill, edge, depth, typeface, voice,
palette, accent, lane (inset beside the portrait / full row), width, and hex overrides,
with seeds that set a whole look and clear the hex fields. It was deleted with its target
surface, not for failing. For CR's social-media chat look it is the obvious starting
point, as a P7 option set. Hex is typed, because this shell has no usable colour input.

### 6.8a Handoff — where the portraits actually stand

**Working, live-confirmed.** The engine emits well-formed sentinels (`__ceCcAvDiag` showed 4
on screen, valid contactId, opts parsed); the bridge's TreeWalk and bounded climb resolve a
real host (`hostWidth` 348, a genuine ProseMirror widget span); the image lookup resolves and
an avatar paints. Engine 0.0.38 / bridge 3.0.28.

**Bugs found and fixed in the doing, worth not re-learning:**
- AR's `updateEditorImages` read `info.position.sectionId` off EVERY widget; CR's node widgets
  have no `position`, so it threw on load. Widgets without a position are skipped now (0.0.35).
- The painter emptied its host with `while (host.firstChild) host.removeChild(...)`. THE HOST
  IS NAI'S and the sentinel is one of its children — this crashed the page with
  "The node to be removed is not a child of this node" and destroyed the sentinel on the way,
  so nothing repainted. CE never did this: `_ceStoryImgRender` removes only its own element
  via a WeakMap. `_ccavClearWrap` now does the same (3.0.27).
- The emotion-line rule was gated on Use Image Decorations AND exactly 24 emoji, because for
  AR it existed to clear space under an emoji image. An author with no emoji set could never
  dim the line. Decoupled (0.0.36).
- Number fields committed on every keystroke, so clearing a box sent 0 and clamped (0.0.37).

**Fixed in 0.0.39, from the author's live read:**
- **A greeting's portrait painted at the end of the message.** A run anchors on the section
  ABOVE it, because a node widget inserts after the section it names — and the first run in a
  document has nothing above it, so it fell back to its own section. `sectionId: 0` is the
  documented anchor for "before the first section".
- **The User's turn started wrapped beside the portrait.** `place=inline` floats the image
  left; a portrait taller than the Contact's message goes on wrapping into whatever follows.
  A float is only cleared by content after it, and the bridge has nothing of its own below the
  run — it paints inside a host NAI owns — so the ENGINE emits a zero-height `clear: both`
  block on each run's last section.
- **The filled-slot index was only ever written by a visit to a Photos tab.** It is asked for
  on the first handshake ACK and on a new pairing now, and an answer for the paired Contact
  re-emits the sentinels. Note what this means for what was seen live: the fallback chain
  reacting (confused → nervous) proves the index was ALREADY populated for that Contact, since
  the bridge's own chain is exact-slot → Avatar → legacy and has no neighbour table. A Contact
  whose Photos tab had never been opened was the broken case.

**Fixed in 0.0.40, from the second live read:** the clearing widget 0.0.39 added took the
portraits down with it under "Beside the text". Both went to `createWidgets` in one batch, and
a batch is all-or-nothing. They are two calls now, portraits first, so a refused clear costs
the wrap and nothing else — plus an off switch, which is also the live diagnostic: if a
portrait ever vanishes again, turning the wrap-clear off is one press and says which half.

**Next, in order:**
1. U-17 if a real gutter is wanted. The float reads as one; the gutter is the nicer version.
2. Stage (D-52, §6.8b), which needs CE's stage code procured first.

### 6.8b Stage mode (D-52, specified by D-56, corrected by D-98) — **built 0.0.50, corrected 0.2.11**

**A subtab of the Chat screen, at full window width** (D-56). Not a rail destination — the
mobile bar is already six across — and not an editor decoration. The editor decorations (6.8)
stay what they are: portraits in the gutter of a document you are still typing into. Stage is
the other reading — the window becomes the scene.

**What shipped**, in `SECTION CR-STAGE`:

- The paired **Scenario's** image fills the window. ~~Stored as a slot name, with a picker.~~
  **Superseded by D-98 at 0.2.11**: a Scenario has one image worth standing in front of and it
  is the Banner (D-46), so the picker had one option in it and the `bg` field left the record
  with it. The Scenario is already the chat's location, so a separate per-chat background would
  be a second record for one place.
- The cast stands over it, bottom-aligned, the non-speakers **shrunk and darkened** — the whole
  grammar of the form. Each figure's slot comes from the same resolved emotion chain the
  portraits use (6.5), settled since 0.0.32. **Since 0.2.11 the cast is the User, the paired
  Contact and the group's members** (D-98), capped at five characters, the speaker always on it
  and lit; three or more overlap rather than shrinking to fit.
- **Each figure is its own `[data-ce-ar-host]`** (D-98). This is the load-bearing line of the
  whole surface and it is easy to undo by accident: the bridge writes `--ce-img-ar` onto the
  **nearest** host ancestor, so any second picture added under the stage's own host will take
  the backdrop's ratio away from it and the figures will be measured against a face again.
  **One host per picture.**
- **One beat at a time**, with back and forward through the history. `Latest` returns to
  following the end, which is also where stepping onto the last beat lands: a reader who has
  scrolled back must not silently miss the next reply.
- Settings on the surface itself rather than in Global, which is [CR-ARCH-PROMPT]'s rule
  (read depth moved to the button that used it): backdrop slot, figure height, panel height,
  text size, and the two non-speaker treatments, each a number the author drags rather than
  three named rungs ([CR-EDOPTS]'s rule). Account record at `cr.stage`.

**A beat is a paragraph, not a run**, and that is the one place this parts company with
`crCcavEmit`. A portrait is per RUN because it stands beside a whole reply; a visual novel
steps one message at a time. **Since 0.2.11 the beats are built from `crChatSegment`** (D-98) —
the same reading the portraits and the bubbles take, so ownership cannot drift between them and
a member's line stands under the member. Before that the builder looked for a `Name:` prefix
itself and a reply carries one **once**, so every continuation paragraph was dropped rather
than merged. The Emotion line reaches every paragraph of the message it describes — the model
writes it after the reply — and it **carries forward past everyone else's turns**, because a
Contact does not go blank-faced while somebody else is talking. The author's side is found by
**origin**, the same test the bubble markers use (D-42's finding): the document never holds
`{ <User>: `.

**Two deliberate departures from the form, both recorded rather than buried.**

1. **The controls sit above the picture, not over it.** A `CrButton` over a photographic scrim
   inherits `CR_TEXT`, which a **light** theme resolves to dark text on a dark gradient. That
   fails only for authors who themed their window, which is the worst way for a control to
   fail. The strip keeps every control on a surface CR's tokens govern, and the scrim then
   needs one light-text token (`--cr-stage-text`) rather than a parallel palette for every
   control that might sit on it. Three new tokens in all — `stage-bg`, `stage-text`,
   `stage-scrim` — declared with the rest at the top of `SECTION CR-UI`, since D-30's rule is
   that the `--cr-*` list **is** the themeable surface.
2. **No `face=` mirroring**, per D-64.

**It cost the bridge nothing** (D-64), and it cost the kernel nothing: it emits no widget, no
marker and no rule, registers no hook and writes nothing SECTION K reads. Section hashes prove
it — `K`, `K-CONTEXT` and `HOOKS-MISC` are byte-identical to 0.0.49.

**What the first live pass found** (0.0.50 → 0.0.51, and all three were general rather than
Stage-specific): the option separator (D-65), which is why the figure floated rather than
standing; the **z-order**, since the bridge paints its `<img>` at z-index 1 and the dialogue
box was left at `auto`, so the backdrop covered the text entirely; and the button squeeze,
which the Cards surface showed more clearly than the Stage did.

**Still open.** Refresh is a press, not a subscription: the beats are read on mount and on the
Refresh control, and a reply that lands while the Stage is open does not appear until one of
those happens. Wiring it to `onGenerationEnd` would be a HOOKS-MISC change and therefore a
parity job with a fixture (§4) — worth doing, worth doing on its own, and not worth folding
into the patch that built the surface.

**Also to procure**: ~~the old CE editor-chat code~~ — done; its one convenience, the `{`
opener after a reply, shipped as D-54 in engine 0.0.40.

### 6.8c Chat bubbles (D-53)

**Default plus per-Contact override** (D-53). Account record in `storage`; a Contact may carry
a partial override in its `cr` block. Resolve per field, Contact first, exactly as the emotion
tags already resolve.

**The option set**, from the author, with CE's own vocabulary as the starting point
(`CE_CB_FRAME / CORNER / FILL / EDGE / DEPTH / TYPE / VOICE` in `CE-chat-ref-v3_7_16.txt`):

| Option | Notes |
|---|---|
| Fill | solid / gradient / none |
| Colour | **CR's own picker, not the OS one** — the shell has no usable native colour input, so hex is typed and the swatches are ours. This is CE's rule and it still holds |
| Transparency | separate from colour, so a palette survives an opacity change |
| Border | width, colour, style |
| Corner | square through pill |
| Glow / shadow | CE's `DEPTH`, plus an outer glow |
| Separation | bubbles are one answer; rules, bands and indents are others. Not settled |

**Mechanism.** Decoration rules restyled in place, not widgets — `decorations.updateRules`
with `style` only and no `scope`, which touches no document content. Same family as the
emotion-line and speaker-name rules already wired in 0.0.36.

**Built in engine 0.0.41, corrected in 0.0.42.** The ordering worry above turned out not to apply: bubbles do
NOT use `crCcavEmit`'s scan. A decoration rule matches paragraphs by pattern, so the engine
never has to work out which sections are whose — it registers three rules and the editor finds
them. That is also why the emotion line is its own option: it is its own paragraph, so it is
its own rule, and a reply the model split in two is two bubbles.

**THE TWO SIDES ARE MATCHED DIFFERENTLY, and this is the thing to know before touching it.**
0.0.41 assumed both sides carried a prefix and gave each a rule; the author's side painted
nothing, because a user turn in the document is **plain prose**. AR's `{ … }` rewrite is
commented out in the source and the kernel adds the User's name on the way to the model, so
there is no text to match on. What the document does carry is `origin[].data` per span, so the
author's sections are found by **where the text came from** and painted with node **markers**;
the Contact keeps a rule, because `Name:` is really there and a rule needs no rescan. Anything
built on top of this — separation, stage — should read the origin, not the text.

**What shipped**, against the table above: Fill, Colour (with Transparency as a separate
field), Border (width, colour, style), Corner, Glow — plus a text colour and padding, which
the table did not name and the preview made obviously necessary. **Separation is still not
settled** and nothing was guessed at: rules, bands and indents are all still open, and the
per-paragraph shape of a rule is the constraint any answer has to live inside.

### 6.8d In-chat images (D-57)

A photo the Contact decides to send, in the middle of the chat. **The model writes a
description, not tags** — the architect turns it into a prompt, which is the same division of
labour every other CR image generation uses.

The pipeline, in the order it runs:

1. **A prompt clause**, only while the feature is on, asking for `[Image: a clear description]`
   on its own line after the message text, at most one per message, and telling the Contact not
   to describe their own face or body — that comes from their character prompt and describing
   it twice draws a composite.
2. **`onGenerationEnd` scans the turns** for an unresolved tag, capped at two per pass. Not
   `onBeforeContextBuild`: the architect calls `generate()` and NAI rejects a nested call while
   a generation is in flight.
3. **A chat-scoped architect pass** over the description — deliberately not CR's own story scan
   (`SECTION CR-SCAN`), because during a chat the last N sections are the transcript and it
   would compose a prompt out of banter. The speaker's visual record is seeded
   **unconditionally**; anyone else the description names is matched normally and capped.
4. **Dispatch, then rewrite the tag in place** to `[Image#<8hex>: …]`, and only after a
   successful dispatch — a resolved tag pointing at nothing renders as a permanent spinner that
   the next pass refuses to retry. The 8 hex are the front of the uuid, and they live in the
   DOCUMENT because the document is the durable record; the resolved pattern cannot re-match
   the unresolved one, which is what makes the pass idempotent.
5. **A node widget carrying `ce-storyimg:<8hex>`** (D-59), painted by the bridge, plus an inline
   decoration rule collapsing the tag text — the tag stays in the document, it is just not for
   reading.

**Built in engine 0.0.44, and the bridge did not change** (D-59). The instruction is a brain
(D-58), the sentinel is CE's own, and the painter it reaches was already running. **No new
message, no new `kind`, no new storage on the bridge side**: a `kind`-less `GENERATE_IMAGE`
lands gallery-keyed under its uuid, which is what a chat photo wants and what the gallery
surface already lists. The one message CR gained is inbound — `AE_STORY_IMG_DROP`, which CE has
sent since v2.106 and CR now answers by stripping the tag.

**Where it can do nothing, and it says which on the Chat screen**: the feature is off, no
Contact is paired, the document is empty, the reply carried no tag, the bridge is down, the
`documentEdit` permission was refused, or the architect returned nothing. A quiet hook with six
silent exits is untestable otherwise — the cue (D-54) learned this first.

**Two failure shapes are deliberate.** A tag whose architect pass returned nothing is **left
unresolved**, because a resolved tag pointing at an image nobody asked for is a spinner that
never clears and that the next pass can no longer match. A tag whose rewrite failed after a
successful dispatch reports that the photo **is** generating but will not appear inline — the
image exists, only the anchor was lost.

### 6.9 Gallery

Every image the bridge holds, in one grid — reached from the Illustrator first, and from a
Contact's Photos tab once owner filtering exists. **No new bridge message** (D-44).

- **Thumbnails, not bytes.** A cell is a `ce-gallery|<uuid>` anchor carrying `thumb=1`, so
  the painter reads the record's stored thumb; a record made before thumbs existed falls
  back to the full image on the bridge's own rule, and the surface does not know the
  difference.
- **Per image**: open at full size, delete (`AE_GALLERY_ACTION` op `delete`), download
  (op `download`). Delete is the only destructive verb on the surface and asks first.
  **Use as prompt** is the one purely local action — the text is already in the index, so it
  seeds the composer with no round trip.
- **A tab on the Illustrator, not a rail item**: the mobile bar is already six destinations
  across at 380px, and generating a picture and then looking at the pictures is one errand.
  The same grid mounts on a Contact's Photos tab once it can be filtered.
- **Download must carry the prompt**, and today it does not: the stored bytes are WebP and
  the download re-encodes pixels only (D-44). Until the bridge writes the chunk, the surface
  shows the metadata it has from the index and says plainly that the file will not carry it.
- **Metadata readout** per image: prompt, model, size, steps, scale, seed, character
  prompts — `AE_IMG_META_REQ` → `_RESP` for the fields the index does not project.
- **Scope**: the index answers with every record it holds and no filter at all, so CR can
  list today. Filtering by owner is U-08's open half and waits for an `owner` written at
  save time (D-27, D-33) — a CE record has none to backfill.

### 6.10 The user-turn cue (D-54)

After a Contact's reply lands, CR appends a paragraph holding `{ <User name>: ` so the author
types into the format rather than reconstructing it. Small, and the author has asked for it
twice; what it costs is care, because it is the first thing CR writes into the document
unasked.

- **Where.** `onGenerationEnd`, which AR already uses to stamp real time and clear the
  initial-trim flag. That hook is HOOKS-MISC and the parity harness covers it, so this is a
  deliberate behaviour change per §4: its own patch, its own fixture, recorded here.
- **What it must not do.** Fire on a side generation (the farewell, the architect, enhance —
  every one of which ends a generation), fire in an unpaired chat, fire on a non-xialong
  model, or append a second opener when one is already sitting there unfilled. A duplicate
  opener is worse than none: it reads as the script fighting the author.
- **Toggle.** On the Chat screen beside Insert Greeting, which is the other control that
  writes to the document. Default off until it has had a live pass.
- **Not the greeting path.** Insert Greeting writes its own `Name: text` + Emotion shape and
  is unchanged; the cue is only ever appended after a generated reply.

**Built in engine 0.0.40, corrected in 0.0.42**: the opener is `{ ` and nothing else. 0.0.40
wrote `{ <User>: ` from AR L5072-5073 without noticing that block is commented out — the live
kernel prefixes the name itself, so the document line would have been sent as
`Sam: { Sam: … }`. The cue now also asks for `documentEdit` as the greeting does (the top-level
request at load is a request, not a guarantee) and reports its reason on the Chat screen, which
is what makes a hook that stays quiet testable at all.

**The guard landed as the document rather than a busy flag, which is
better than the plan drafted: it needs no bookkeeping at six call sites, and it is idempotent
by construction — once the cue is appended the tail IS the cue, so nothing can append a second
one. Ten cases in `ccav-smoke.js` pin it, including a side generation after a cued turn.

---

### 6.11 Group chat (D-84–D-89) — **probe rig built, engine 0.0.68; view 0.0.69; tail, one-at-a-time and member decorations 0.0.70**

**Who answers how.** The paired Contact on native Send. Each member from its own toolbar button,
or **Send as** on the Group tab, as a script generation served by the helper it is pinned to.
Up to six members. The paired Contact is never a member.

**The speaker's view (D-87, engine 0.0.69).** Every build, for whoever is speaking: each assistant
message split at `Name:` lines, the speaker's own segments assistant, everyone else's user and
folded into the neighbouring user turn; a `----` Group Chat block under the system prompt. The
paired Contact gets it in `onContextBuilt`, a member in
the assembler. Example, three replies then the author, from Harley's side:
`[sheet] [Group Chat] [Start of chat.] A: "Harley: …" U: "Ivy: …\n\nBarbara: …\n\nJoker: …" [Style] A: ""`.

**One member reply, in order.** Drop the cue's empty `{` if it is the last paragraph →
`buildContext` (`suppressScriptHooks: 'self'`, `forGeneration: true`) with `crGroupBuildChar` set,
so `onBeforeContextBuild` matches the member's brains → `crkContextBuilt` with the member as the
Contact and its own `CrkRoll` → the view → the empty primer dropped, the style line moved down to
sit before the reply (with the near-end block, lifted before the view since 0.0.70), `Name:` appended → the pool, home
first, spilling on refusals only → the reply trimmed where another speaker or the author's turn
begins → appended as paragraphs tagged origin `ai`.

**A native Send straight after a member's reply (0.0.70).** The tail is split like every other
message: if its last segment is the paired Contact's it stays the continuation; otherwise it is user
text, an empty assistant turn follows, and `onResponse` puts a newline before the reply's first
chunk so it opens its own paragraph (U-23).

**One generation at a time (D-88).** A member button during a native Send, or a Send during a
member's reply, is refused with a toast.

**The probe line.** `member(8) via <script> ok|FAILED prompt~N charged N (warm|partial|cold)
pred N in A>B out A>B (spent) gen/all ms shape <roles> [reframed] hooks before= built= origin
tried err`. A native Send writes `native Send in A>B out A>B`. Lines carry ids, never names.

**Members in the editor (D-89).** Portraits, gutter, bubbles, the bold name, italics and photo tags follow each `Name:` line to its
owner's slots and bubble override; with a group the Emotion rule is off and Emotion lines are marked
by owner.

**Not yet.** The cue reads only the paired Contact; the Stage shows two figures; a member's reply
moves no story clock and stamps no Time Apart; no next-speaker picker.

### 6.12 Tamagotchi mode — concept (O-19), not scheduled

**The author's idea**: an aerial view of the Contact's room as a backdrop, the Contact a figure that moves between
spots in it, and the card narrating what they did while you were away — Posts, but simulated. Group members can share
the room and interact. The author sets needs (hunger, energy, mood…) and rules for keeping them up.

**What the platform decides before any design does.**
- **Nothing runs while you are away.** The script lives only while a story is open, so "while away" is computed on
  return from elapsed clock time — Time Apart's arithmetic (§6.6) — with a seeded generator (D-96's xorshift), so the
  same gap always replays to the same past and a repaint never rewrites it.
- **One press, one generation** (D-40, D-88). The away-narration is one generation for the whole gap, on a Catch up
  press, not one per event; group members' doings are folded into that same call rather than a helper call each.
  A budget readout sits beside the button (D-03).
- **It never writes the story** (D-63). Its log is its own surface, like Posts (D-62); an entry reaches the chat only
  when the author sends it.

**What already exists to build it from.** Schedules (D-14) already say where a Contact is at a given time — those are
the spots. Resources (D-91: pools, tracks, `CrMeter`, the tone ramp) are the needs. The Stage (§6.8b) is the
precedent for a full-window jsx scene whose figures the bridge paints with no bridge change, and D-96's tumble is the
precedent for moving one with inline transforms. O-18's location variants are the rooms, each with its own backdrop
slot — an aerial prompt per place (from above, isometric room).

**The map (CR-PLAN 0.80, after the author's second pass).** Not a mode but a **Home** surface beside Stage and Posts.
The chat goes on as before and Home reads and writes the same state, so dropping in for a chat never leaves
anything behind. It is built in four steps, and the first is worth having with no Home at all.

#### Step 1 — sets that choose themselves (useful to the chat on its own) — **built, engine 1.0.10 (D-119)**

A set's version in use stops being only a manual pick. It is resolved, in this order:

1. **Pinned** — the author picked it on Chat > Brains (today's behaviour, `cr.setActive`). Shown as *pinned* with an
   **Auto** button that unpins. A pick made from Home (step 3) pins only **until the schedule moves on**.
2. **By schedule** — the Contact's current schedule event names a version: *Cooking dinner* → Location **Kitchen**,
   Outfit **Apron**. Read from the same matcher as Current Events and the status line (`crStatusRead`), so the three
   cannot disagree, on the chat clock (D-08), so story-clock undo rewinds it too.
3. **By relationship** — a version lists the relationship levels it is for (romantic / close / acquaintance /
   stranger, `INTIMACY_LIST`): Outfit **Lingerie** at romantic, **Uniform** at stranger.
4. **Default** — the set's first version.

Chat > Brains says which rule chose each set ("by schedule: Cooking dinner"). **Where the links live**: on the card's
`cr` bag (`cr.scheduleLinks`, keyed by schedule event id; `intimacy` on the variant), never inside AnotherRoom's
`ScheduleEvent`, so the schedule itself stays AR's for parity and for export to AR. A link names a set and version by
id; a link to a Scenario's set applies only while that Scenario is paired. The schedule editor's event sheet gains
**While this is on** (one choice per set); the set editor's version row gains **Use at** (relationship levels).
**Parity**: the kernel is untouched, but `crBrainView` feeds it the resolved version, so this is state the kernel
reads — the harness runs, and a fixture pins one schedule-chosen and one relationship-chosen version.

#### Step 2 — Home's room and its figures — **built, engine 1.0.11 (D-120)**

- **A room is a version of the Scenario's Location set** with its own Home picture (slot `h-<variantId>`, separate
  from the variant's Stage picture). **Any shape** (D-117): the room's box takes the picture's own ratio from the
  bridge's `--ce-img-ar`, as the Stage backdrop already does, so a wide hall and a tall stairwell both work.
- **Coordinates are fractions of the picture** — x of its width, y of its height (0–1) — and a figure's size is a
  fraction of the room's width, all applied as CSS percentages inside that box. A figure lands on the same spot at
  any window size and any picture shape; nothing is measured, which matters because the script cannot measure the
  page (no layout in the worker). Replacing a room's picture keeps every anchor where it was in fractions, so a new
  picture with a different layout may want them moved.
- **Activities belong to a Contact** (a User too, later): *Sleeping*, *Cooking*, *Reading*… each one a picture slot
  (`a-<id>`), a room, an anchor point (x, y — the picture's **centre** sits there), a **scale** (the picture's width
  as a fraction of the room's), and an optional generation prompt. A schedule event links to an activity (step 1's
  link gains `activity`); the activity's room then also picks the Location set, so one link does both.
  With no event on, the Contact's **Idle** activity for the room they are in is used.
- **Arrange mode** lays a 20×20 grid over the room (cells stretch with the picture's shape; drawn only while
  arranging). Three ways to place, all writing the same fractions: **tap the figure, then a cell** (works on a phone,
  where a finger drag cannot cross elements); **drag with a mouse** — press on the figure and the cells it passes
  update it live (`onPointerDown` / `onPointerEnter` / `onPointerUp`, jsx-typings L101–107); and **X, Y and Scale
  sliders** for fine placement (`<input type="range">` with `min`/`max`/`step`, jsx-typings L113; CR's first range
  input, so its look is a live check).
- **Painting** follows the Stage's rules (§6.8b): every picture is its own `data-ce-ar-host`, so the bridge reports
  each one's ratio and the figure keeps its shape; no bridge change is expected.
- **Activity pictures**: uploads keep transparency (the bridge stores a PNG with alpha as is). A generated one has a
  background; NovelAI's background-removal tool would fix that — **unknown** whether the API offers it and at what
  cost (U-new, a bridge probe). Until then a plain or simple background is the honest default, and one press makes
  one picture (D-40).
- **Who is shown**: the paired Contact and the group's members, each in the room their activity puts them in.
- **The camera** (D-117) follows the paired Contact: Home shows the room they are in and moves when the schedule
  moves them. A strip of the rooms, with who is in each, lets the author **look** at another room (view only; the
  camera returns to the Contact on the next schedule move or on **Follow**) or **drop in**: the User goes there, the
  chat's Location set is pinned to that room — so the chat's brains and pictures say where the conversation is — and
  the camera stays with the User until **Follow** sends it back and unpins.

#### Step 3 — needs and actions

- **Needs** are Games resources (D-91) the author defines per Contact: a meter, a decay per hour, and floors that
  change the emotion portrait used for their figure (hungry, tired). Decay is arithmetic on elapsed time when the
  story opens or the clock moves — nothing runs while away.
- **Actions** (feed, rest, play, talk, change clothes, go to a room) are buttons with author-set effects on needs and,
  optionally, a set version or activity they switch to (pinned until the schedule moves on). No generation; an
  optional one-line reaction uses the Games React path (one press, one generation, never the story).

#### Step 4 — while you were away

- On open, the gap replays deterministically (seeded, D-96's generator) into a short list: schedule moves between
  rooms, needs crossing floors, activities done. **Catch up** narrates the list in one generation in the Contact's
  voice, as a log on Home, members folded into the same call. **Send to chat** drops one entry into the story;
  **Snapshot** pictures the moment through Illustrate with the current room, outfits and poses.
- Optionally, one system line of state into the chat ("Mira is tired and in the kitchen"), the D-93 dice-line
  precedent — off by default.

#### Where things are kept

| What | Where | Why |
|---|---|---|
| Rooms, their Home pictures | the Scenario (sets, `h-` slots) | travel with the Scenario's export |
| Activities, anchors, scale, schedule links, relationship rules | the Contact's `cr` bag | travel with the card |
| Pins, needs, the away log, last-seen time | the story (`storyStorage`; pins in `historyStorage` as now) | a chat's own state, like the version in use |

**Each speaker knows only their own room** (D-118). When a reply is built, the Scenario's Location set resolves to
**the speaker's** room, not the chat's, and one line names who else is in it ("In the kitchen with you: Sam, Kat") —
the User counted where the camera put them (with the Contact, or where they dropped in). A Contact in another room is
therefore told neither the User's room nor who is there. **Who replies stays the author's choice**: the member
buttons (D-85) and native Send work as now, whoever is in whichever room. Built with step 2: it changes what the
kernel is fed per speaker (the group path already assembles each speaker's context separately, `crGroupAssemble`),
so it lands with a parity fixture.

**Clock**: the chat's own (D-119) — real or story, one setting rules the chat, the schedule, the sets and Home.
**Open**: what a catch-up costs with a group. Whether
the first open of a story may run one catch-up unasked (D-40 says no unattended generation; the replay is free, the
narration is a press).

## 7. CE reuse map

| CE piece | CR use |
|---|---|
| Shell host (window / full modal), `ceJsxPart` | §6.2 shell, D-04 |
| CE kit: `ceBtn` `ceTap` `ceToggle` `ceField` `ceSelect` `cePickerRow` `ceAccordion` `ceExpandRow` `ceExpandCard` `ceSegBar` `ceReadField` `ceEditSlot` | Starting point, copied and adapted (D-10) |
| STORYIMG (engine widget + bridge `_ceStoryImgFind` / `_ceStoryImgRender` / observer) | The live template for editor painting (D-21) |
| Bridge `_ccav*` survivors, `_loadCharEmotionImage`, `__ceCcAvDiag` | Avatar sentinel parse, host climb, lookup, geometry diag |
| Old CE Section 33 chat surface: avatar size/shape as engine settings, re-emit on change, bubble axes via `updateRules` | Prior art for §6.8 display options and P7 bubbles |
| `ceDayStrip` | Reference only for the week view (D-14) |
| `ceChatDock` | Forum threads, example-chat editor, Imitate review |
| Per-field seed/reroll (`ceSeedReroll` with `only`, `ceIconRefresh`) | §6.7 |
| `aeBudgetReport`, generation diagnostics ring buffer | GEN section |
| Portrait store, gallery multi-select, `dbDeleteMany` | Shared bridge as-is; Photos tab |
| Anchor painter and opts (`collapse` `shrink` `fit` `pos` `face` `thumb`) | Shared bridge as-is |
| Architect prompts, `CE_IMG_MODELS`, `ceVisSuggest` | §6.4 |
| Harness and audit tooling (`auditlib.py`, `replace_once`, Node harnesses) | All phases |

---

## 8. Platform facts carried in from CE

These are measured behaviour of NovelAI's script runtime, not style rules, so D-10's
"drift is fine" does not apply to them.

- **STORE-BEFORE-HOOK**: every store is in the surface's init list or the surface renders blank.
- **TABBODY-RECYCLE / CESURF-RECYCLE**: key tab bodies; image anchors are siblings in a
  wrapper, never children of a node the bridge also appends into.
- **CLICK-BEFORE-BLUR**: clicks deliver before the blur they cause; fields feeding a
  generate button use the scratchpad.
- **FIELD-RESYNC / FIELD-SCRATCH**: `defaultValue` may not populate; `onType` writes module
  variables only.
- **SELECT-DIRTY**: a touched `<select>` ignores a new `selected`; remount on value.
- **Keyed arrays**: every mapped list keyed on a stable id (CE-STYLE's H-01 family).
- **No programmatic scroll**: `column-reverse`, newest first in the DOM.
- **No `setInterval`**: self-rescheduling `api.v1.timers.setTimeout` chains cancelled
  by a generation counter.
- **KIND-BACKFILL**: `setIfAbsent` never backfills new fields onto existing records;
  write explicit backfills.
- **HELP-SEND-VOID**: `api.v1.messaging.send` may return `undefined`; never `.catch()` it.
- **`countUncachedInputTokens` returns a Promise** despite its typing; use
  `api.v1.maxTokens(model)` for limits.
- **DESTRUCTIVE-NEVER-IN-PLACE**: copy, verify, then retire.
- **Frontmatter**: no colons or parser-breaking symbols inside header values.
- **Nothing inside `.ProseMirror`**: it is document content and NAI serialises it.
  Node widgets are the sanctioned way to put a paint target in the editor.
- **`api.v1.generate()` fires the full hook lifecycle**, so a script's own utility
  generations run through its own context hooks unless `suppressScriptHooks: 'self'` is
  passed (where the call accepts it) or a guard flag is set.
- **`onContextBuilt` fires twice for an editor generation**: a `dryRun` pass and the real
  one, with different `continuityId`s. Side effects belong on the real pass only.
- **Generation-critical async work goes in `onBeforeContextBuild`**, whose work demonstrably
  lands before context is assembled.
- **A second `api.v1.ui.register` replaces the script's extensions** (live, engine 0.0.68): a
  toolbar button registered later took the CharacterRoom button with it. Register everything
  together (`crStartupExtensions`). The typings do not say so.
- **Consecutive model paragraphs reach the context as ONE assistant message** (live, 0.0.68),
  including paragraphs a script appended with origin `ai`. Anything that needs to know who wrote
  a line has to split inside the message (D-87).
- **`countUncachedInputTokens(messages, model)` predicts the charge exactly** (live 0.0.70:
  eleven of eleven equal to the allowance drop).
- **A helper's allowance refills with nobody touching it** (U-19, live 0.0.69): back to
  57344 / 2048 after 11 and 25 idle minutes.
- **`countUncachedInputTokens(messages)` throws "requires a non-empty model string"** (live
  0.0.69) although it is typed with one argument. 0.0.70 passes the model second (U-24).
- **A native Send pressed after a script's `ai` paragraphs continues them** (live 0.0.69): the
  tail assistant message is the doc's last model run, whoever wrote it.
- **A native Send does not draw on the script's allowance** (U-18, live 0.0.68). A fresh
  session read **57344 input / 2048 output** on the engine and on each helper.
- **No usable colour input**: `type='color'` is ruled out and `type='range'` is
  untrustworthy in this shell; colours are typed hex.

---

## 9. Conventions

- Tags `[CR-*]`; a **CR-INDEX** in both artifacts from the first build, updated in the same
  patch as any SECTION, storage key, message or subsystem change.
- Storage keys: AR's names stay; new families use `cr.*` (D-24). Bridge messages, channel and IDB stores are shared with CE (D-15); CR-specific bridge code carries `[CR-*]` tags.
- Versions 0.0.x until the first public release; patch bumps only (D-16).
- Patch discipline as CE: `str_replace` / `replace_once` with count assertions,
  balance-delta checks, LF engine / CRLF bridge, `node --check` on the bridge, `tsc`
  histogram diff, declared-vs-used and zero-reference scans, live pass per surface.
- Every `api.v1.*` symbol verified against `script-types_d.txt` with its line number
  before first use.
- **CR-STYLE** is a short, living note, not a copy of CE-STYLE: the social-media direction
  (feed, profile header, photo grid, status line, bubbles), the tokens CR actually uses,
  and any primitive CR invents. CE-STYLE stays the reference to borrow from.

- **Harness**: `cr-parity-harness.js` (single file) and `cr-mutation-check.py`, run by
  Claude in its sandbox; the author does not run tooling. Engine mode cuts SECTION K out of
  the engine and also drives the whole engine through its own hooks.

### 9.3 CR-STYLE — the style guide (D-30, D-39, D-72)

**CR-STYLE lives in `CR-STYLE-vX_Y.md`, not here.** It is generated from the engine's own
token layer by `cr-style-gen.py`, so it cannot drift: every `--cr-*` token is read out of the
file, every one must carry a description in the generator, and a token with no description
fails the run rather than shipping a half-true table. Regenerate it in the patch that adds a
token. What the plan keeps is the short version:

- **Nothing in a CR surface types a colour or a length.** Colour, type, space and — since
  0.0.57 — shape are all tokens with a NovelAI-theme fallback and then a literal.
- **A bare verb is an icon** (D-72), decided inside `CrButton` from the label. Inline SVG,
  never emoji; the label survives as `title` and `aria-label`.
- **More than about five controls in a row is a menu**, not a row.
- **Primitives are the other half**: `CrButton`, `CrIcon`, `CrIconButton`, `CrMenuRow`,
  `CrSection`, `CrTabs`, `CrAvatar`, `CrPill`, `CrEmpty`, `CrField`, `CrTextInput`,
  `CrTextArea`, `CrNumField`, `CrChoice`, `CrColour`, `CrPromptPair`, `crImgAnchor`,
  `CrPressable`. A surface needing a control not on that list gets one added there.
- **Interaction belongs to the primitives** (D-41). No control renders its own pointer handling.
- **Patch checks**, both scoped to `SECTION CR-DATA` .. `SECTION MACRO-UI` — run unscoped
  they return AR's own code, which stays exactly as it is (D-28):
  - `grep -nE 'fontSize:[^,}]*"[0-9]'` must return **4**, and the four are the 1px sentinel
    widgets in the editor, which is light DOM and not a CR surface. The narrower
    `fontSize: "` form was the check until 0.0.12 and **missed a ternary of two literals**.
  - `grep -n '"[0-9.]*px solid '` must return **0** (added 0.0.57). Every edge is
    `CR_LINE_W`; the deliberately heavier ones say `calc(CR_LINE_W * 2)`.

### 9.2 Upstream merge discipline (D-28)

Every patch is written so an AnotherRoom update stays a diff:

- **Add beside, never edit in place.** A new function next to AR's beats a changed line
  inside it. Where an AR line must change, it is one line, and it is noted.
- **Records are AR's** (D-24, D-17). CR fields are optional, written only by CR, and
  invisible to AR's own read sites. AR's `Character`, `User`, `Scenario`, `ChatSettings`
  and every per-pairing record keep their shape and their key names.
- **CR code lives in its own SECTIONs.** A section that AR does not have is a section
  upstream can never conflict with.
- **AR's UI is replaced, not amended** (D-25, P4). Doors come out whole; nothing inside
  them is refactored on the way.
- **Standing merge costs**, to be repaid or accepted deliberately:
  - the AR → CR display-name renames in 0.0.1 — mechanical, but one conflict per renamed
    string on every upstream diff;
  - SECTION K and K-CONTEXT, which replaced AR's two context hooks. The parity harness is
    the tool for this: re-point `CR_AR_FILE` at the new oracle and every intended
    behaviour change shows up as a failing fixture.

### 9.1 Project files (CharacterRoom Claude project)

| File | Role |
|---|---|
| `characterroom-vX_Y_Z.naiscript` | Canonical engine |
| `ce-bridge-vX_Y_Z_user.js` | Canonical shared bridge — re-upload to both projects after any patch |
| `AnotherRoom_v1_1_5.naiscript` | Parity oracle. Never edited |
| `CR-PLAN-vX_Y.md` | This document |
| `cr-parity-harness.js`, `cr-mutation-check.py` | Kernel parity and sensitivity checks |
| `script-types_d.txt`, `script-types-experimental_d.txt`, `jsx-typings_d.txt`, `__NovelAI_Documentation.txt` | API grounding |
| `ce-ref-core-for-cr.txt` | CE kit, shell host, image slots/prompts, story-image widgets, messaging, colour picker, icons, chat dock |
| `ce-ref-surfaces-for-cr.txt` | CE profile, gallery, image-edit surfaces. **Two of its three sections are spent** — CR's profiles (0.0.6 / 0.0.19) and gallery (0.0.16) are its own shape now and drifting per D-10. What is unmined is `SECTION UI-IMGEDIT`: re-prompting an image by uuid through `AE_IMG_META_REQ`/`_RESP` and `AE_IMG_REGEN`, editing the compiled `fp`/`fu` rather than `prompt`. Keep the file until that door lands, then drop it for a cut-down extract |
| `CR-STYLE-vX_Y.md` | The style guide and the theme surface. **Generated** — never hand-edited (D-72) |
| `cr-style-gen.py` | Generates it from the engine's token layer. Run in the patch that adds a token |
| `CE-STYLE-v2_7.md`, `CE-STYLE-chat-entry-v0_2.md` | Style reference (not binding) |
| `cr-persona-helper-vX_Y_Z.naiscript` | Group chat's companion script (D-84). Ships in step with SECTION CR-GROUP; the author imports copies numbered 1, 2, … |
| `cr-group-smoke.js` | Offline check for SECTION CR-GROUP with simulated helpers; `CR_HELPER_FILE` also drives the real helper |
| `PERSONA-HELPERS-REFERENCE-v0_1.md` | Prior art for D-84: CE's helper mesh and the cache findings, with status markers |
| `ce-generation-helper-v1_1_2.naiscript` | CE's production helper the reference was adapted from |

Project instructions: `CR-PROJECT-INSTRUCTIONS.md`.

---

## 10. Changelog

- **0.85** — engine 1.0.12, bridge 3.0.39: D-121 (Home sliders fixed; zoom; room layers; animated GIF/APNG kept).

- **0.84** — engine 1.0.11: D-120 (Home step 2: Chat > Home, rooms, activities, Arrange, look / drop in / follow, per-speaker room with Home on). `cr-home-smoke.js` 25.

- **0.83** — engine 1.0.10: D-119 (Home step 1: a set's version resolves pinned > schedule > relationship > first; the chat clock rules all). `cr-brains-smoke.js` 45.

- **0.82** — plan only: D-118 (each speaker knows only their room and who is in it; the author picks who replies).

- **0.81** — plan only: D-117 (Home rooms any shape, fractional positions with sliders, camera follows the paired Contact; look or drop in).

- **0.80** — plan only: §6.12 Home mapped in four steps (sets chosen by schedule and relationship; square rooms with fractional anchors, activities, tap-tap and mouse placement; needs and actions; catch-up), with where each piece is kept. O-19 stays open.

- **0.79** — engine 1.0.9: D-114 (outfits become Clothes sets), D-115 (Illustrate streamlined; per-picture set swap), D-116 (plan changes go straight to main). Tamagotchi proposal added to §6.12. `cr-imgv5-smoke.js` 54.

- **0.78** — engine 1.0.8 and bridge 3.0.38: D-112 (chunk positions: Start / After scene / End), D-113 (an image's people are the chat's; `@` lines resolve by species or kind). `cr-imgv5-smoke.js` 44, bridge check 7.

- **0.77** — engine 1.0.7 and bridge 3.0.37: D-109 (image prompts v1.2: GLM-4.6 writer, `@` lines, scene builder, handles, photos), D-110 (standard chunks per model, merged once; family tuning), D-111 (compact phone rows on Chat > Brains). §11.3 item 00 done but for its live checks. `cr-imgv5-smoke.js` added (35, including the review's 67 + 26 as two); parity 20/20; group 48/48.

- **0.76** — engine 1.0.6: D-108 (conditional entries Auto/Always/Off per chat; per-modal part ids fix the New-folder-from-picker crash).

- **0.75** — engine 1.0.4: D-106 (folders, search, sort, grid; O-17 closed). Engine 1.0.5: D-107 (brain sets and Chat > Brains; O-18 and O-20 closed). `cr-folders-smoke.js` (15) and `cr-brains-smoke.js` (21) added; parity 20/20, mutation 19/19, group smoke 48/48 on 1.0.5.

- **0.74** — engine 1.0.3 on GitHub's 1.0.2: D-105 (the repo is the engine's source of truth), D-103 rebased, D-104 (Chat > Chat opens cards, lists the group; Group tab puts Replies first). O-20 opened (Chat > Brains), O-17 widened to the group picker. `cr-chatnav-smoke.js` added (6 cases). The 1.0.1 delivered earlier the same day was built on a stale copy and is withdrawn.

- **0.73** — engine 1.0.1: D-103 (smart import: every Import button files a card by what it is). O-17 (card list organisation), O-18 (brain sets with one active variant), O-19 and §6.12 (Tamagotchi mode concept) opened from the author's list. Image prompts for the V5 review extracted to `CR-IMAGE-PROMPTS-v1_0_0.md` (§11.3). `cr-import-smoke.js` added (30 cases). The engine file in the project carried frontmatter 1.0.0 while this plan still said 0.2.13; patches continue from 1.0.1.

- **0.72** — engine 0.2.13: D-102 (height alone sizes a Stage figure; the outermost two are pinned to the ends of the row, correcting D-101(c), whose width clamp made outer figures smaller than middle ones).

- **0.71** — engine 0.2.12: D-101 (Fill is the window; backdrop position; figures cannot be cut by the stage edge; Presets and Tags to Illustrate; a Scenario paints its Banner wherever an avatar goes; Photos and Visuals last on a card). `ccav-smoke` 224 cases. `cr-clock-smoke.js` is uploaded but missing its `harness-lib.js`.

- **0.70** — engine 0.2.11: D-98 (the Stage's aspect-host collision, beats through the segmenter, the backdrop picker retired, group members on the stage), D-99 (AR's CR Games panel retired, Include Game Stats rehoused), D-100 (`ccav-smoke`'s ten standing failures diagnosed as two drifts from D-94 and fixed — the engine was right throughout). `tsc` histogram reaches zero. P8 and P9 rows updated; §6.8b corrected; §11's test-file note rewritten and a standing rule added about ignored failures.

- **0.66** — engine 0.2.2 + bridge 3.0.36: D-94 (one segmenter, shaped bubbles, no clear inside a message), from the gap screenshots. `cr-bubble-smoke.js` added; `ccav-smoke.js` marks cases repinned.
- **0.69** — engine 0.2.10: D-97 (AR's table games as a Games subtab, resource meters, the primitive pass). CR-STYLE regenerated at v0.4 with a Games group. `cr-rpg-smoke.js` grows to 242 cases.
- **0.68** — engine 0.2.9: D-96 (dice faces, the tumble, odds ribbons and the band ladder). `cr-rpg-smoke.js` rebuilt and back in the project at 199 cases. P8 note updated.
- **0.65** — engine 0.2.1: the Games tab built. D-93 (reactions) closes O-16; O-15 closed as (a); D-91 marked built and its GM line removed (an example, not the plan); P8 in progress; `cr-rpg-smoke.js` joins the checks.
- **0.64** — engine 0.2.0 recorded (D-92, amends D-16). D-91: the RPG dice tool in Games, feedback and reactions only, no prompt change. O-15 (sheet storage) and O-16 (where a reaction lands) opened; P8 rescoped.
- **0.63** — engine 0.0.74, bridge 3.0.35, helper 0.0.4: D-90, comments cut to the release minimum. From here the file changelogs live only in this section.
- **0.62** — engine 0.0.73 + bridge 3.0.34: U-27 addressed (photo repaint timing, photos in bubbles).
- **0.61** — engine 0.0.72: [CR-GRID-MIN]. U-27 opened (photo-in-message layout and photo bubbles, waiting on the bridge source).
- **0.60** — engine 0.0.71: D-89 extended (bold names, italics, photo tags, the adjacent-run portrait); U-24 answered; U-25 and U-26 opened; one §8 fact.
- **0.59** — engine 0.0.70 and helper 0.0.3: D-88 (one generation at a time), D-89 (members are Contacts in the editor), D-87 amended (the native tail is re-roled after a member's reply; style line lifted). U-19 answered, U-22 gains warm reads, U-23 and U-24 opened; three §8 facts.
- **0.58** — engine 0.0.69 and helper 0.0.2: D-87 (every speaker reads the transcript from its own side) supersedes D-85 after the first live pass; U-18, U-20, U-21 answered from that pass; three new §8 facts (`ui.register` replaces, consecutive model paragraphs are one message, Send does not draw script allowance); §6.11 rewritten around the view; §11.3/§11.4 updated, member portraits noted as expected and lower priority.
- **0.57** — engine 0.0.68 and CR Persona Helper 0.0.1: **group chat, experimental** (D-84 on helper scripts, D-85 the last-turn reframe by the author's call, D-86 pools and spill), §6.11, P9, U-18–U-22. **Backfill**: D-74–D-83 and the builds 0.0.60–0.0.67 were in the engine and never in the plan; recorded from the CR-INDEX. §11's current-build line corrected, and the project's `ccav-smoke.js` noted as 7 failing on 0.0.67.
- **0.56** — engine 0.0.59: D-73 built, and built as a removal rather than an unsurfacing (author's call). §6.3's header line is now what the header is; the fixture pins the three image shapes apart.
- **0.55** — engine 0.0.58: the time frame's two list clauses stopped double-punctuating, from the author's read of what the buttons send. No decision: it is a defect in [CR-POSTTIME]'s framing, pinned by eight new `ccav-smoke` cases.
- **0.54** — engine 0.0.57: D-72 (icons in the primitive, the post feed, the card row's picture, shape as tokens) and D-73 (banners come off the Contact and User profiles; the Scenario keeps its — not built). §9.3 is now a pointer: CR-STYLE is generated from the engine into its own file, and §9.1 records the generator and the disposition of `ce-ref-surfaces-for-cr`.
- **0.53** — engine 0.0.56: D-71, the six orphaned AR generators wired up with AR's own names and prompts. The headline is that Plans were live and invisible. §6 records the new Memories layout and Imitate's home under Voice.
- **0.52** — engine 0.0.55: D-70, the fork audit. The headline for the plan is that AR 1.1.5 has no sections of its own, so the fork boundary is a symbol list and now lives in the CR-INDEX as one.
- **0.51** — engine 0.0.54, from the author's live pass on posts: D-68 corrects D-66's anchor for the day post, D-69 gives CR its own comment generation. §6.3 records both.
- **0.50** — engine 0.0.53: D-67, photos on posts plus in-place editing and regeneration. §11.3 item 9 closes; what remains of the thread design is a live pass.
- **0.49** — engine 0.0.52: D-66, posts carry a stamp on the chat's own clock and the generator is handed a time frame; two kinds of post, two buttons. §6.3 gains what the Posts tab now does; §11.3 records what is left of the author's thread design (images on posts, editing, and regenerating an image).
- **0.48** — engine 0.0.51, from the author's first live pass on the Stage. D-65 (anchor options are comma-joined and CR had used `|` since 0.0.8, so every option after the first was being dropped on every surface). Build row records the three other corrections: the Stage's z-order against the bridge's painted image, the button squeeze, and the Cards row becoming its own control. §6.8b gains what the live pass settled and what it left open.
- **0.47** — engine 0.0.50: **Stage built** (D-56). D-64 records that the bridge prior art §6.8b sent us to no longer exists and that what replaced it — the `pos=bottom` and `face=` anchor opts — is better suited than the deleted painter was. §6.8b rewritten as built, with the two deliberate departures from the form (controls above the picture, no mirroring) and the one thing it leaves open (refresh is a press, not a subscription). P7 is in progress rather than untouched. §11.3 records that the stale `cr-data-fixture` copy now fails to parse outright.
- **0.46** — engine 0.0.49: `suppressScriptHooks` moved into generateWithStory's options
  argument. §5.1 records the distinction from D-61 — a misread interface is not a lying one.
- **0.45** — D-63 (the image id never reaches the model; the adapter rewrites the resolved tag
  back to its unresolved form, keeping the description and dropping the id). Build row for
  engine 0.0.48, which also fixes the tag being visible. §11 gains the general lesson: anything
  CR writes into the document is an example the model will learn from.
- **0.44** — D-62 (Posts has two scopes and keeping moves a thread between them, never copies
  it). Build row for engine 0.0.47. §11.1 updated: nothing in the shell is a mockup any more.
- **0.43** — D-61 (the typings are not the validator: a documented `display` field on a node
  widget is refused at runtime and takes the batch with it, which is why the wrap-clearing
  widget has not existed since 0.0.39). Build row for engine 0.0.46, which also adds the console
  diagnostics that will settle whether `document.scan()` lags the editor at generation end.
- **0.42** — D-60 (the side-generation depth guard, after 0.0.44's photos were found to do
  nothing live: every CR generation re-fires onGenerationEnd, so the pass re-entered itself).
  Build row for engine 0.0.45 with the two sweep bugs the photo anchors exposed. §11 gains the
  stub lesson that made the bug invisible offline, and a retest item.
- **0.41** — D-58 (the photo instruction ships as a brain, which is what kept the kernel and
  the parity harness out of it) and D-59 (the bridge needed no change: CE's story-image painter
  is started at boot and CR emits its sentinel, with `AE_STORY_IMG_DROP` answered so a deleted
  photo leaves no spinner). §6.8d rewritten to what shipped; build row for engine 0.0.44;
  §11.3 item 8 closed and the two things it opens up recorded in its place.
- **0.40** — D-55 (the left gutter: the engine indents, the bridge paints; U-17 closed),
  D-56 (stage specified by the author as a full-width Chat subtab; the bridge's orphaned
  `[CHAT-STAGE]` painter found and recorded as geometry-only prior art), D-57 (in-chat images:
  CE's `[Image: …]` pipeline read in full and specified as §6.8d). Build row for engine 0.0.43
  / bridge 3.0.29. §11's test-file staleness note corrected — two of the three were already
  current — and the parity harness's back-to-back flake recorded so it is not mistaken for a
  regression.

- 0.39 — Engine 0.0.42, from a live pass: the author's turns had no bubble and the cue wrote
  nothing. **One root cause** — both were built on AR L5072-5073, a block that is COMMENTED OUT
  in the source, so neither the `{ <User>: ` prefix nor anything else marks a user turn in the
  document. §6.8c and §6.10 record the correction and the rule it leaves behind: the author's
  side is matched by SECTION ORIGIN, never by text. Nothing new is open; nothing was cut.
- 0.38 — Engine 0.0.40 fixes the regression 0.0.39 introduced (one widget batch, all-or-nothing)
  and builds **D-54**, the user-turn cue. Engine 0.0.41 builds **D-53**, chat bubbles, as
  decoration rules rather than widgets — which retired §6.8c's ordering worry rather than
  satisfying it: a rule matches by pattern, so bubbles never needed the portrait scan.
  §6.8c and §6.10 record what shipped and what is still open in each (separation, in §6.8c).
- 0.37 — Engine 0.0.39 fixes the three things the author's live read of the portraits found
  (greeting anchor, the float wrapping the User's turn, the slot index only ever written by a
  Photos visit) and caps the decorated runs. **D-54** records the user-turn cue as a scheduled
  patch with the three constraints that make it one, and §6.10 holds the design. **U-15 and
  U-16 are struck** — both were closed in code (0.0.34/0.0.35 and bridge 3.0.25) and were
  still standing open here. §5.1 and §11 had fallen ten engine builds and four bridge builds
  behind and are brought forward; §5.1 gains a note that CR-INDEX is the per-build record from
  0.0.29 on, which is what §3's own ledger rule already implied.
- 0.1 — Initial inventory of AnotherRoom 1.1.5; decisions D-01…D-09 recorded; open
  decisions, unknowns, target architecture and phases drafted.
- 0.2 — D-10…D-20 recorded (kit as starting point, split field models, optional bridge,
  editor display options, AR schedule model, shared bridge, no migration). U-01 and U-07
  closed; O-10, O-11, U-08, U-09 opened. Bridge and protocol sections rewritten around the
  shared bridge; migration section replaced by import-only.
- 0.3 — D-21 (bridge-painted editor portraits on the STORYIMG channel) and D-22
  (display options: account default, per-Contact override). U-02 closed from CE's settled
  hook findings; O-12 opened for side-generation context. U-09 closed. Avatar key corrected
  to `<id>_em_Avatar`. Old CE chat surface recorded as prior art for display options and
  bubbles. Platform facts extended.
- 0.4 — D-23 (side generations through the kernel). P0 closed. **P1 done**: kernel
  ported, parity harness byte-identical against AR 1.1.5 on 20 fixtures / 50 steps,
  19/19 mutants killed. Parity contract extended with brains, plans, session-flag rules;
  three more oddities recorded.
- 0.33 — **Engine 0.0.28 retires AR's Cards panel** (D-25, D-49 discharged). **D-51** closes
  O-14: images do not transfer and the base64 card images keep no editor. §3.3's door table
  and §3.6's dispositions are updated; the standing `tsc` error count drops from six to one.
- 0.32 — Engine 0.0.27 ports the delete-with-farewell out of AR's Cards panel, which is the
  first of two things blocking that panel's retirement. **O-14 opened** for the second: the
  base64 card images, whose only editor is the panel's Metadata page. The retirement is now
  a checklist in §11.3 rather than a one-line "next".
- 0.31 — Engine 0.0.26 ships the status line, which closes everything in P6 except field
  generation (blocked on U-03). No new decisions: it is a read of what 0.0.25 already stores.
- 0.30 — Engine 0.0.25 ships the clock and the schedule as one module. **D-50** (story time
  carries the time features; the kernel is not touched). §6.6's Track-Real-Time clause is
  struck and replaced by it; the schedule visualisation clause is closed as built.
  §3.4 gains the three `cr.*` clock keys and records that CR now uses `historyStorage`.
  P6 is in progress. **AR's Cards panel now edits nothing CR cannot** — retiring it is next.
- 0.29 — Engine 0.0.24 ships the shared Brains editor. §11 rewritten for handoff: 11.1 had
  accumulated four "not yet ported" headers across as many sessions and no longer read as a
  status. **The Contact's Schedule is now the only thing AR's Cards panel edits alone.**
- 0.28 — Engine 0.0.23 ships the Contact editor and its Voice tab. All three card types are
  now writable from CR except Brains and the Contact's Schedule.
- 0.27 — Engine 0.0.22 ships the User editor. No new decisions; the Scenario's shape held
  for a second card type, which is the evidence D-47's sequencing wanted.
- 0.26 — **D-49**, refining D-47: two copies are the hazard, two doors onto one object are
  not, so AR's panels stay until CR covers Brains. Engine 0.0.21 ships the Scenario editor
  with New, Import, Export and Delete.
- 0.25 — **D-48 / CR-PAIRSNAP**, from two live findings: the pairing in `chatSettings` is a
  copy, and a section that hides when empty turns a stale read into a silent one. Engine
  0.0.20 fixes both, and gives Contacts and Users a banner that can actually be stored.
- 0.24 — **D-47**: when field editing and card creation land, and the rule that decides it —
  never two editors for one field. Engine 0.0.19 ships the User and Scenario profiles, which
  closes §11.3's first item.
- 0.23 — **D-46**, closing O-13: the Scenario is CR's location record and the User is a
  character without emotions. Engine 0.0.18 builds both and drops the gallery's now-false
  download note. §11.3's "location records" item collapses into the Scenario.
- 0.22 — **D-45**: the downloaded PNG already carries its metadata, so D-44's second half is
  withdrawn and the bridge needs no patch after all. Engine 0.0.17 gives User and Scenario
  their `cr` bags. **O-13 opened**: whether a Scenario carries a scene prompt pair.
- 0.21 — Engine 0.0.16 ships the gallery surface. D-44's first half held: **no bridge change
  at all**, because listing, thumbnails, delete, download and per-record metadata were all
  already in the protocol. What is left of D-44 is the tEXt chunk, and it is now the next
  patch.
- 0.20 — **D-44 (the gallery surface, and what a PNG with metadata actually costs)**. Engine
  0.0.15 ships Enhance, closing §11.1's first item. Two process corrections: §9.3's grep had
  no range written down and returns ten false hits in AR's own code when run over the whole
  file, and §11's header had been left a build behind.
- 0.19 — **D-43 (no `kind` for a story image)**. Engine 0.0.14 ships the Illustrator surface,
  closing D-42's two-patch port. §11 handoff updated for what is left.
- 0.18 — **D-42 (illustration in two patches)**. Engine 0.0.13 ships the prompt engine half.
  Next session starts from the handoff note in §11.
- 0.17 — **D-41 (hover/press in JS)** and the outfit label fix. Two process notes: the
  style-guide grep was too narrow to catch a ternary of literals, and the outfit fixture has
  now been repinned twice — a sign the empty-state rule was worth writing down properly.
- 0.16 — **D-40 (one press, one image)** and four fixes from a live pass. The outfit bug is
  worth remembering as a class: a sanitizer that treats empty as absent cannot govern a
  record the author builds up field by field, and it fails silently in both directions.
- 0.15 — **D-37, D-38, D-39** and **§9.3, CR-STYLE written down at last** — §9 had promised it
  since 0.1 and it did not exist. Engine 0.0.10.
- 0.14 — **D-34, D-35, D-36**: generation split, prompt chunks, jsx sheets. Engine 0.0.9.
  Still to port from CE: the Image Studio (illustrate a story), and the message-scanning /
  prompt-enhancing path that assembles a scene prompt from recent chat.
- 0.13 — **D-33 (slot images live in the bridge's IndexedDB)**, withdrawing 0.0.7's
  card-base64 path. Engine 0.0.8 rebuilds Photos on the portrait store and gives U-08 the
  door it was waiting for. Generation remains unbuilt and is its own patch.
- 0.12 — **D-32 (CR writes through AR's save path; `crTouch` repaints)**. Engine 0.0.7 makes
  Photos the first surface that edits anything, and desktop avatars scale with the window.
- 0.11 — **D-31 (two layouts, mobile by default)**, from a live read on a phone: the rail
  ate nearly half the viewport and four of seven profile tabs were off-screen. Engine 0.0.6.
- 0.10 — **D-30 (themes reach CR only through `--cr-*` tokens)**. Engine 0.0.5 opens the
  shell: window, rail, Cards over the real lists, Contact profile, Photos. Harness gained the
  preact globals; both fixtures green. P4 started.
- 0.9 — **D-29 (additive `cr` bag)**, and §4.5's reshape sketch withdrawn. Engine 0.0.4
  ships it for the Contact card with a 22-case fixture. P2 needs no migration step: nothing
  moves, so the phase is schema plus round trip only.
- 0.8 — **D-28 (merge-compatible with upstream AnotherRoom)** and §9.2, the patch discipline
  it implies. P3's exit criteria corrected: the image-listing half was never testable before
  a door exists and moves to P5. U-08 reopened accordingly.
- 0.7 — Handshake confirmed live. D-27 (Contact scope comes from the portrait key): engine
  0.0.3 and bridge 3.0.24 add the slot probe. U-08 narrowed to the gallery's missing owner
  field, deferred to P5 with the write path that would fill it.
- 0.6 — P1 live-passed (0.0.1 imported, chat held). **P3 started**: engine 0.0.2 gains
  SECTION BRIDGE (transport only) and bridge 3.0.23 answers the handshake with engine
  identity. D-26 (one engine at a time is documented, not enforced). Protocol table and
  §4.3 updated for the handshake; builds table extended.
- 0.5 — Engine 0.0.1 built and verified (§5.1). D-24 (keep AR storage key names), D-25
  (0.0.x ships AR's UI under CR names). Storage map rewritten. Harness bundled as one file
  with engine mode; project file list and instructions added (§9.1).

---

## 11. Handoff — next session

**Start here.** Read the engine's frontmatter through CR-INDEX, the bridge's CE-INDEX, and
§1.1/§5/§9 of this document. Current builds: **engine 1.0.12** (GitHub `Tulivu89/CharacterRoom`, the source of truth, D-105), **bridge 3.0.39** (project files of both CR and CE), **CR Persona Helper 0.0.4** (the repo carries helper scripts 0.2.0).
**Corrected at v0.57**: this line had said engine 0.0.49 since v0.46, and the plan itself stopped at
D-73 while the engine reached D-83; D-74–D-83 were backfilled from the CR-INDEX in this revision.
Smart import adds `cr-import-smoke.js`, Chat navigation adds `cr-chatnav-smoke.js`, folders add `cr-folders-smoke.js`, brain sets add `cr-brains-smoke.js`, Home adds `cr-home-smoke.js`, image v1.2 adds `cr-imgv5-smoke.js` (it runs the review's `cr-scene-v2.test.ts` and `cr-img-chunks.test.ts` inside the engine), group chat adds `cr-group-smoke.js` to the checks run before returning an engine patch, the Games tab adds `cr-rpg-smoke.js`, and bubbles add `cr-bubble-smoke.js`.
Test files: `cr-parity-harness.js`, `cr-data-fixture.js`, `clock-smoke.js` and
**`ccav-smoke.js`** (new at 0.0.39, 43 cases at 0.0.42 — it covers the cue and the bubble
markers as well as the portraits now, and is the only offline check either has) — all must be run from the sandbox before returning an
engine patch, because the author cannot run Node.
**Test-file state, re-checked at v0.70.** `ccav-smoke.js` was replaced at engine 0.2.11 and is
current at **222 cases**; take the copy from that patch and not an older one. `cr-data-fixture`
(46), `cr-group-smoke` (48), `cr-bubble-smoke` (23) and `cr-rpg-smoke` (199) are all green
against 0.2.11. The harness is in the project under its own name again. **`cr-clock-smoke.js` is now uploaded
but cannot run**: it requires a `./harness-lib.js` that is not in the project, so the clock and
the schedule still have no working offline check. Upload that companion file and the gap closes.

**A STANDING FAILURE COUNT IS A BUG WITH A WAITING ROOM** (D-100). `ccav-smoke` reported ten or
eleven failures on every build from 0.2.2 to 0.2.10, and three separate sessions recorded "the
same failures on the previous build" as grounds for moving on. It was never evidence of
anything except that nobody had looked: both causes were in the test file, one of them a helper
that predated D-42 by twelve builds. **Green or diagnosed — there is no third state**, and a
check whose failures are known-and-ignored is worse than no check, because it launders the next
real regression into the same noise. If a suite cannot be got green in the patch that finds it,
the failures go in §11.3 by name with a cause, not in a build row as a count.

**ANYTHING CR WRITES INTO THE DOCUMENT IS SOMETHING THE MODEL WILL LEARN TO WRITE** (D-63).
The photo tag carried an id for four builds before anyone asked what the model made of seeing
it every turn — and the answer is that it would start inventing them, producing tags the pass
can never resolve. **Before writing anything into the story, ask what it looks like as an
example.** The cue's opener passes that test (it is the format the author types anyway); an
opaque id does not.

**THE TYPINGS ARE NOT THE VALIDATOR** (D-61). A field the interface permits can be refused by
the runtime, and the refusal takes the whole `createWidgets` batch with it. Build a widget from
the **example** in script-types.d.ts and add nothing speculatively; a documented optional field
is unproven until a live pass has kept it. This cost 0.0.39 through 0.0.45 — seven builds in
which the wrap-clearing widget was never once created.

**THE OFFLINE STUBS ARE NOT THE PLATFORM, AND 0.0.44 IS WHAT THAT COSTS.** `ccav-smoke`'s
`generate` returned a value and fired nothing, so a pass that called the model from inside
`onGenerationEnd` looked fine in 74 green cases and did nothing at all live. The stub re-fires
the hook now (D-60). **The lesson generalises**: when a stub stands in for something with a
side effect, the side effect is the part worth modelling — a stub that only returns is a stub
that can only catch the easy half.

**THE PARITY HARNESS FLAKES UNDER BACK-TO-BACK RUNS, and it is not the engine.** Chained in a
tight loop it will occasionally report a handful of fixtures failing and a short step count
(8/20 at worst); run in isolation it is 20/20 every time. **Reproduced on the shipped 0.0.42
as well as on 0.0.43**, so it is environmental — resource pressure inside the sandbox, not a
kernel difference. Re-run a failure on its own before believing it, and do not chase a
"regression" that will not reproduce singly.

### 11.1 What exists, as of engine 0.0.42

**Illustration is complete end to end.** `SECTION CR-SCAN` (0.0.13) reads the story, detects
the cast whole-word and runs the architect pass; `SECTION CR-ILLUS` (0.0.14) is the composer,
with a cast picker capped at four, readouts, Generate and the result painted through
`ce-gallery|<uuid>`; Enhance (0.0.15) rewrites the composer's text and returns per-card
visuals as one-off overrides that never touch a card; the Gallery tab (0.0.16) lists
everything the bridge holds, with thumbnails, a metadata sheet, delete and download. **None
of it needed a bridge change** — CE's `GENERATE_IMAGE`, gallery and metadata messages already
carried every path CR uses (D-43, D-44, D-45).

**All three card types are CR's now.** Each has a profile (Contact 0.0.6, User and Scenario
0.0.19), a `cr` bag with image prompt fields (0.0.4, 0.0.17), and a full editor for AR's own
fields: Scenario 0.0.21, User 0.0.22, Contact plus its Voice tab 0.0.23, and Brains across
all three in 0.0.24. New, Import, Export and Delete sit on each card type's list and profile.
A Scenario is also CR's location record (D-46): its scene pair joins the base prompt of every
illustration drawn while it is the chat's, and a User can be picked into an illustration's
cast.

**AR's UI is gone except for Games and the Brains / Diaries doors.** The Cards panel went in
0.0.28, Chat Settings in 0.0.29, Global in 0.0.30 and the Jots modal in 0.0.31 — each retired
in the same patch as its replacement, which is 0.0.28's rule and has now held four times.

**The chat has a clock** (0.0.25). Real or story per chat, the story clock in
`historyStorage` so undo rewinds it, and one read — `crClockNow()` — behind macros, Time
Apart, Current Events and the schedule's now-line. Story time turns the time features on by
itself (D-50) without a kernel edit.

**Editor portraits work, both halves.** The engine emits a handle-tracked node widget above
each run of Contact turns carrying the resolved emotion and the display options (0.0.34); the
bridge paints it (3.0.25–3.0.28). 0.0.39 fixed what the author's live read found — §6.8a has
the list, and it is worth reading before touching the emission, because two of the three were
mechanism bugs rather than typos. The filled-slot index now has three writers, so a portrait
reacts without the author having opened Photos first.

**Memories, the fallback chain and the emoji set are built** (0.0.30–0.0.32). **Posts is real
as of 0.0.47** (D-62) and nothing in the shell is a mockup any more. What Posts does not yet
have is the three verbs still owned by AR's Forum page — comments, Reflect and Plan — and
selfies, which wait on a live pass of the chat-photo pipeline they would reuse.

**The one thing 0.0.42 taught, and it will bite again.** AR 1.1.5 contains a **commented-out
block** (its L5446-5460 in CR's copy) that rewrites `{ … }` lines into `{ <User>: … }`. Two
features in two consecutive patches were built on it as though it ran. It does not: the live
kernel prefixes the User's name at context-build time and the document holds plain prose. Before
building anything on a line of AR, check it is not inside a `/* */` — §3.2 has said the block is
dead since v0.1 and it still cost two patches.

### 11.2 Standing rules that have already been learned the hard way

- **D-40: one press, one image.** No loops over slots, no self-retrying generation, nothing
  fired from a hook. Batch generation was shipped once and removed.
- **D-28/§9.2: add beside, never edit in place.** AR's lines, records and panels are
  upstream's. CR code lives in `[CR-*]` sections.
- **Empty is not absent in an editable row.** A sanitizer that drops or defaults the empty
  case cannot govern a record the author builds up field by field — this caused two silent
  bugs in two consecutive patches (the outfit row, then its label).
- **§9.3 + D-41:** no colour, font size or gap literals in a CR surface; no control renders
  its own pointer handling. Patch check:
  `grep -nE 'fontSize:[^,}]*"[0-9]'` over the CR sections returns nothing.
- **D-30:** a `.naitheme` reaches CR only through `--cr-*` custom properties; JSX is in a
  shadow root and classes do not cross it.
- **Read AR before quoting AR.** The `{ … }` rewrite at CR L5446-5460 is commented out, and two
  features were built on it anyway. A line number in this document is a pointer, not a promise
  that the code runs.
- **Fixtures pin behaviour, not bugs.** `cr-data-fixture.js` has twice had to be repinned
  after it was found asserting the wrong thing. When a fixture fails, decide which side is
  wrong before changing either.

### 11.3 Open, in rough order

00. ~~**Image prompts for V5**~~ — **built, engine 1.0.7 / bridge 3.0.37 (D-109, D-110); live checks closed by the author 2026-10-24**. Was open for the live checks in §11.4 and review §9 (GLM-4.6 on three saved stories; one CR-made V5 image's metadata against the site's fields; an A/B on a locked seed). Original note: (author's item 5, 2026-10-24). `CR-IMAGE-PROMPTS-v1_0_0.md` carries the Architect and Enhance prompts verbatim, their feeders, the assembly and the request body, for the author's prompt project. When reworked prompts come back, the swap is the strings in CR-SCAN (and Enhance's JSON keys in `crEnhanceScene` if they change); nothing else moves. Found while extracting, and live in 1.0.1: the Scan cast block says *name them* and the reminder under it says *do not name them* — the renderer never receives a name, so the reminder is the right one; and Enhance asks for tags only, so Scan → Enhance always discards the prose the Architect writes for V5. **Unverified**: whether V5 wants a different payload from the V4.5 body the bridge sends for every model id (`v4_prompt`, `params_version: 3`, `k_euler_ancestral` / `karras`).

0. **Three things measured this session and not yet acted on.** (a) The contact importer does
   not validate `relationship` against `INTIMACY_LIST` (engine ~L19204), so a card carrying
   `relationship: "narrator"` pins `chatSettings.intimacy` to a value nothing equals — every
   gated conditional brain and every gated schedule event is then permanently off, with no
   error. `style` is unvalidated too and that one is harmless, arguably useful, since it is a
   prompt string rather than a gate: leave it. (b) `with` on a `rowsAs: "target"` system SUMS
   the selected rows, so picking Spot Hidden 50 and Listen 20 in Call of Cthulhu gives a target
   of 70; either hide `with` for that mode or make it pick-one. (c) A die-row with `n: 0` prints
   `+0d6 Sneak []` into `detail` — cosmetic. Found by rebuilding `cr-rpg-smoke.js`, which also
   confirmed all eight presets correct against their published rules, floor-division CoC bands,
   the CofD chance die and the shared-units bonus die included.

1. ~~Retire AR's Cards panel~~ — **done, 0.0.28**, and the other three doors with it
   (0.0.29–0.0.31). What is left of AR's own UI is the Games script panel and the Brains /
   Diaries doors; those are P7's and P8's.
2. ~~Chat, Jots and Global as real surfaces~~ — **done, 0.0.29–0.0.31.** Posts is the one
   mockup left.
3. ~~The `{` cue (D-54)~~ — **done, 0.0.40**, off by default until a live pass. ~~Bubbles
   (D-53)~~ — **done, 0.0.41**; what is left of §6.8c is **separation** (rules, bands, indents),
   which is not settled and was not guessed at.
4. **U-03** — which fields are voiced (D-11). Two utility passes already guess at it, and
   field generation is the last thing in P6 waiting on the answer. It is a reading spike,
   not a build: every generatable field × three cards on both models, side by side.
5. U-08's gallery half: an `owner` written at save time (D-33), so the grid can be filtered
   to one Contact and mounted on Photos.
6. **`clock-smoke.js` has never been uploaded** — write or replace it before the next patch
   that touches the clock or the schedule. ~~The other two stale test files~~ — `cr-data-fixture`
   was replaced and `ccav-smoke` was repaired and re-uploaded at 0.2.11 (D-100).
   *(Original note, kept for the shape of the problem:)* **Replace the two stale test files** (§11 header) before the next patch that touches the
   card schema or the clock. This got worse at 0.0.50 rather than staying still: the project's
   `cr-data-fixture.js` no longer **parses** against the current engine, because its end anchor
   is still `SECTION CR-UI` and the slice therefore runs across CR-BUBBLE's top-level `await`
   (the anchor moved at 0.0.41 and this copy never followed). Repaired locally to run it;
   the copy in the project is the one to replace.
7. ~~U-17 (a real gutter)~~ — **done, 0.0.43** (D-55). ~~Stage (D-52/D-56)~~ — **done,
   0.0.50**, and it cost the bridge nothing (D-64). What is left of the editor look is
   **bubble separation** (§6.8c: rules, bands, indents — still not settled). What Stage leaves
   open is its **refresh**: the beats are read on mount and on a press, so a reply landing
   while the Stage is open is not shown until one of those. Wiring it to `onGenerationEnd` is
   a HOOKS-MISC change and therefore a parity job with a fixture — its own patch. **Still open
   after 0.2.11** (D-98 fixed what the Stage shows, not when it looks), and it is now the last
   thing standing between the Stage and a live pass.
8. ~~In-chat images (D-57, §6.8d)~~ — **done, 0.0.44**, off by default until a live pass. The
   bridge needed no change (D-59). What it opens up rather than closes: a photo the **author**
   sends (the same tag on a user turn, which needs the User's own visual record and a decision
   about whether a persona has one), and filtering the gallery to a Contact, which is U-08's
   open half and would let chat photos be found again after the fact.
9. ~~Posts, the half 0.0.52 did not build~~ — **done, 0.0.53** (D-67), and the first live
   pass on it produced D-68 (the day post's anchor was wrong) and D-69 (no comments at all),
   both built in 0.0.54. Photos themselves were reported fine. Still unconfirmed from that
   pass: whether a photo generated from a post appears in the Gallery, where the author would
   expect to be able to delete it — if it does not, U-08's open half gets more urgent.
10. **`ccav-smoke.js` in the project has 7 failing cases against engine 0.0.67**, unchanged at
   0.0.68: mid-document anchoring, a stray emotion, two fallback cases, the refused clear and two
   gutter cases. They look like cases pinning behaviour 0.0.65–0.0.67 changed (D-82, D-83) rather
   than regressions, but that is a reading, not a check — reconcile them before the next patch
   that touches portraits.
11. **Group chat (P9)**: a live pass on the speaker's view (§11.4), then the next-speaker button,
   then **member portraits** — the first pass painted only the paired Contact's, which is
   expected (`crCcavEmit` resolves one Contact) and the author's lower priority. U-19's answer
   decides whether spill helpers are worth keeping; with 2048 output a script, it matters more
   than the reference assumed. If the paired Contact still writes others' lines on Send once
   the view is in, the fallback is a tail pass that cuts the native reply at another speaker's
   name — a document write in the generation-end tail, so its own patch.
11b. **AR's CR Games panel is now retirable** (D-97). CR's Games subtab covers both games, their
   reactions and their resets; what the panel still owns alone is the **Include Game Stats**
   checkbox. Give that a home on the Games tab or in Global and the panel comes out in its own
   patch — which is the last piece of AnotherRoom's own UI still standing (D-25).

12. **Games is now the only AR feature without a door**, confirmed by the D-71 audit — which
   was prompted by the author naming Games as the only gap and found six others. AR's
   `genGameReaction` is reachable only from its Games page; CR has the placeholder. Last by
   the author's own call. **The RPG dice tool is built** (D-91, D-93, engine 0.2.1); AR's RPS and
   Number Guess still open only from the CR Games panel.

### 11.4 Live-test items the author has not yet been able to confirm

- **Home layers, zoom, sliders** (1.0.12 + bridge 3.0.39): in Arrange, drag a slider and let go — it should stay where it was left, and − / + step it. Zoom to 2× and swipe or scroll around the room. Add a layer, upload a transparent animated WebP (and a GIF), set it over the people with screen blend and lower opacity; it should flicker over both the room and the figures. Upload an animated activity picture; it should move in place.

- **Home** (1.0.11): on the Scenario's Brains tab, give a set a version per room, turn **Home rooms** on and upload or generate a Home picture per room (try one wide, one tall). Chat > Home: the box should take each picture's shape. **Arrange**, add an activity for the Contact, upload or generate its picture, place it by tapping a square, by dragging (mouse) and with the sliders; leave and come back — it stays. On the Contact's schedule, give an event that activity; the Contact should appear there while it is on. **Look** at another room (nothing changes in the chat), **Drop in** (the Location on Chat > Brains reads pinned to that room), **Follow** (back). Turn Home on and, in a group, check (Report or a context viewer) that a member in another room is told only their room and who is in it. Check how the sliders look — they are CR's first.

- **Sets by schedule and relationship** (1.0.10): open a Contact's schedule event and, under While this is on, pick an Outfit version and the paired Scenario's Location version. On Chat > Brains, set both sets to Auto: while the event is on (chat clock) they should read "by schedule: <event>" and the next reply should know them; move the clock past the event and they fall back. Mark an outfit version Use at your relationship level and confirm it is chosen when no event links one. Pick a version by hand — "pinned in this story" — and confirm it beats the schedule until Auto.

- **Outfits as sets and Illustrate** (1.0.9): a Contact that had outfits should now have an Outfit set on its Brains tab (Clothes on), led by the outfit(s) that were worn, and its pictures should look as before. Compose: pick two people; each one's sets appear under the picker; pick another outfit, Generate, and confirm the picture wears it while Chat > Brains still shows the chat's. What gets sent is closed until tapped, and holds the location, the whole prompt and the negative.

- **Chunk positions and chat people** (1.0.8 + bridge 3.0.38): Global > Report should say "bridge chunk spots: yes". On Presets set an artist chunk to Start and a style chunk to After scene; Order sent should read start → scene → after scene → location and card base → end, and a V4.5 image's metadata should show the same order. In a group chat, Compose's Who is in it should list only the Contact, the members and the User; Scan should pick the ones in view even when the text never names them, and `@woman` / `@wolf-man` style lines should land on the right people.

- **Image prompts v1.2** (1.0.7 + bridge 3.0.37 — upload the bridge to both projects first). Illustrate > Compose: Scan a two-person scene; the box should end with one `@Name (left/right):` line per person in view, the picked cast should be just them, and What gets sent should show `1girl, 1boy, …` with each pose in its own caption. Scan a solo scene and one where a third person is only mentioned (they should not be picked). Watch for names outside `@`, looks in the first block, quoted dialogue, or an empty Scan ("The scan returned nothing" means GLM-4.6 or its thinking switch misbehaved — tell me). Type a rough idea and Enhance. Generate on V5 Full: no white outline, quality tags at the end of the prompt in the image's metadata; send me that PNG so its metadata can be checked against the site's fields. Chat photos: ask for a selfie (sender only, no tavern behind), a POV of food (nobody drawn), and a photo with the User in it. Re-add the Photos brain on the Contact so it carries the new wording. Presets: an existing install should show the V5 or V4.5 chunks for the current model with your old Base quality switched off (if untouched); switch model V4.5 → V5 and confirm guidance 4.5 / 23 steps. Generate an emotion slot and the Avatar. Set a Handle on a card and confirm Scan uses it.
- **Chat > Brains on a phone** (1.0.7): each brain is one line; tap a name for its text, a set's versions or a conditional's Auto / Always / Off.

- **Always and the folder crash** (1.0.6): in Organise, tap a card and choose New folder… — the name sheet should open and the card land in the new folder. On Chat > Brains set a Contact's conditional entry to Always, send something with none of its keys, and confirm it is in context; set a User's conditional entry to Always and confirm the same.
- **Folders and grid** (1.0.4): on Contacts, New folder, then Organise and tap two cards into it; Done organising and confirm a tap opens the card again. Rename and Remove the folder from its heading. Switch to Grid and confirm faces and names only; the Group tab's picker and the Contact picker on Chat follow the same layout. Close and reopen CharacterRoom and confirm folders, sort and layout are kept.
- **Brain sets and Chat > Brains** (1.0.5): on a Contact's Brains tab, Add a set (Outfit) with two variants, brain text and an image prompt each. On Chat > Brains, switch between them and send — the reply should know the outfit in use; undo past the switch and confirm the previous one is back in the picker after the next send. Suppress a card brain and a conditional entry, send, and confirm they are gone (CR's Report or a context viewer); Restore them. Give a Scenario a Location set marked Stage backdrop, upload a picture per place, and confirm the Stage changes with the place. Generate an outfit picture and confirm it wears that outfit, not the one in use. Make an illustration and confirm the outfit in use is in it.
- **Chat > Chat** (1.0.3): tap the Contact, the User and the Scenario in Pairing — each opens its profile; Change still opens the picker. With a group, the Group row shows each member; tapping one opens its card, and Edit goes to the Group tab, where Replies and Helpers now sit above the member list.
- **Smart import** (1.0.3): on the Users tab, import a Contact card — it should land on Contacts, the tab should switch, and the toast should say "as a Contact"; its portraits should be there (bridge path). Import an AnotherRoom or AetherRoom card from the Scenarios tab — Contact. Import a User card from Contacts — Users, with its avatar if it carried one. Import a brains export from any Cards tab — refused, nothing added. Import the same card twice — the second is refused as a duplicate.
- **Bubbles and gaps** (0.2.2 + bridge 3.0.36): with the group from the screenshots, confirm each reply is one bubble
  with its Emotion line attached, including a member reply followed directly by another member's, and that gaps
  appear only between speakers. Check Global > Report: "bridge clears portraits: yes" and "shaped bubbles refused: no".
  If refused says yes, bubbles fall back to one per paragraph and the log line names the batch. Scroll well back
  and confirm older history is unbubbled rather than half-bubbled.

- **The Games tab** (0.2.1): pick D&D 5e, start sheets for the User and the Contact, roll a row with
  advantage and confirm two d20s show with the higher kept; tap with on Proficiency and confirm it joins
  the next roll only. Press React, confirm the reply appears on the tab and **nothing is added to the
  story**, then Send to the story and confirm it arrives as the Contact's message with portrait and
  bubble. Press native Send while a reaction is writing and confirm the toast and no generation.
  Close and reopen the story and confirm sheets, the last roll and the reaction are still there. With a
  group member, confirm its reaction runs through its helper (the helper's allowance moves). Copy a
  preset, edit a band, and confirm the Table uses the change.

- **Group chat, engine 0.0.69 + helper 0.0.2** — re-import both helpers at 0.0.2 (Helper 2 keeps
  its own id and name). First, the two 0.0.68 failures: **the CharacterRoom toolbar button is
  still there** after the member buttons appear; and a member's logged prompt **opens with its
  own `AetherRoom` sheet**, then the Group Chat block, then `Start of chat.`. Then the view: let
  all three answer, type a turn and Send — the paired Contact's logged context should show only
  its own line as `<|assistant|>` and the other two inside the `<|user|>` turn with yours, and the
  reply should not write the others' lines. Then the rig items:
  (a) each member has a toolbar button, and pressing one writes `Name: …` at the end of the
  story in that member's voice without continuing the previous speaker's message;
  (b) press each member twice in a row with a short exchange between, and read the probe: the
  second call on the same helper should read **warm**; the first should read cold;
  (c) one plain Send produces a `native Send` line — its input and output deltas answer U-18;
  (d) `hooks before=yes built=no` and `origin ai` on every line (U-21, U-20);
  (e) tap a second helper onto one member's pool; once the home helper refuses or reports less
  output than a reply needs, that member's line should read `via Helper 2` and name Helper 1
  under `tried`;
  (f) Refresh after ten idle minutes and compare a drained helper's output (U-19);
  (g) do not press Send while a member is writing — the context would go out bare.

- **The profile header, 0.0.59** — open a Contact and a User. The avatar should be large and in
  its own band with the pills beside it, with no strip above either. Then the two that would
  show a wrong assumption: **Export** from the header should still write the same card file
  (open it and check the avatar and emotion images are in it), and **Delete** should still open
  the farewell sheet on a Contact and arm-then-confirm inline on a User. Also open a Scenario
  and confirm its banner is untouched — header, Photos tab and Generate.
- **The time frame, 0.0.58** — open a Contact's Posts tab with a schedule whose events end in
  full stops and read the two summary lines under the buttons. Neither should contain `..` or
  `.;`. That is the same string the generator is handed, so the tab is the check.
- **Icons and the feed, 0.0.57** — the checks that would show a wrong assumption rather than a
  taste: (a) **do the icons draw at all**, on a Contact's Photos tab and in the Cards toolbar —
  an SVG that the jsx renderer refuses is a blank square, not an error; (b) **the Cards row's
  picture** — it should fill the left end and fade into the row, and the fade should still look
  right while the row is hovered and while it is held, since the mask is what makes that
  independent of the background; a Contact with no stored portrait should show initials in the
  same panel rather than an empty block; (c) **the post menu** — open a post, press the overflow
  handle, and confirm Edit and Edit-the-photo-description close the sheet and open on the card
  rather than behind it; (d) **Delete still asks twice**, now inside the sheet, and arming one
  post does not leave the next one armed; (e) tap the post's **body** and confirm it opens and
  closes without the header's or the bar's controls firing with it.

**Confirmed working by the author, 0.0.14 through 0.0.21**: illustrate end to end, Enhance,
the gallery (including that a download carries its metadata, D-45), the User and Scenario
profiles, banners once they had a door, the Location section reading the live Scenario, and
the Scenario editor. Anything below is still owed.

- **The 0.0.39 regression, 0.0.40** — set Placement to **Beside the text** and confirm the
  portraits are back. Then check the wrap fix it was meant to deliver: a portrait taller than a
  short reply should not leave your turn beside it. If a portrait vanishes again, turn **Stop
  the wrap after a reply** off in Global > Editor — that is one press and it says which half is
  at fault, which is the whole reason the switch exists.
- **The cue, 0.0.40** — switch **Cue my turn after a reply** on from the Chat screen and send.
  One `{ Name: ` should appear after the reply, once. Then generate a diary or run Enhance and
  confirm nothing is appended by either, and that a second reply does not stack a second
  opener under the first.
- **Bubbles, 0.0.41 / 0.0.42** — the Contact's side was confirmed live at 0.0.41; **the
  author's side is the new half and is the check that matters**. Type a turn and confirm it
  gets its bubble, then edit one of the Contact's replies and confirm it does NOT become yours
  (a paragraph with any generated span in it stays theirs). Then the rest: an **Emotion line**
  with the option on and off; a reply the model split into **two paragraphs**, which is two
  bubbles by design and is the moment to say whether that reads acceptably; and a **per-Contact
  override** — change one field on a Contact's Visuals tab, confirm the other fields still
  follow the account, then press *Follow the account default again* and confirm they all do.
  Also export that Contact and re-import it, and confirm the override came back.
- **The cue, 0.0.42** — it should write `{ ` on its own line, nothing more. If it stays quiet,
  **the Chat screen now says why** under the toggle: read that line before reporting it, since
  it distinguishes a refused permission from a tail that was not a reply from a generation on
  another model.
- **Editor portraits, 0.0.39** — this patch's own checks, and the first three are the fixes:
  open a chat whose FIRST message is the Contact's greeting and confirm the portrait is beside
  it rather than after it; let a portrait be taller than a short Contact reply and confirm the
  User's next turn starts below it rather than beside it; pair a Contact whose Photos tab has
  never been opened in this browser and confirm the portraits still react to the emotion line
  rather than all showing the avatar. Then scroll a long chat and confirm only the recent runs
  are decorated and typing has not become laggy (U-04's cap, set at 24).
- **The gutter, 0.0.43** — set Placement to **In the gutter** with bridge 3.0.29 installed.
  The Contact's turns should step right and the portrait should stand in the space, beside the
  first line rather than on it. Then the three that would show a wrong assumption: your own
  turns should NOT step right; a **two-paragraph reply** should have both paragraphs indented,
  not just the first; and with **bubbles on**, the Contact's bubble should move right as a whole
  rather than growing — if the bubble loses its fill or border instead, a marker and a rule are
  not composing on one paragraph and the indent has to move into the bubble rule. Also try a
  large portrait size and confirm the text keeps clear of it.
- **In-chat images, 0.0.44** — on the Contact's Brains tab press **Add the photo instruction**,
  then switch **Let <Contact> send photos** on from the Chat screen, and ask them for a picture
  of something. Expect: the tag appears in their reply and then collapses out of sight, a
  spinner sits under the message, and the photo replaces it when it lands. Then the things that
  would show a wrong assumption: send another message and confirm **no second copy** of the
  first photo is generated (the pass re-reads the whole document every turn, and idempotence is
  the only thing stopping it); **delete the photo** from its corner control and confirm the tag
  goes from the text rather than leaving a permanent spinner; generate a **diary or an Enhance**
  and confirm neither is read for tags; and turn the bridge off, ask for a photo, and confirm
  the tag is still sitting there unresolved afterwards rather than stamped with a dead id.
  Finally, **reload the page** with a photo in the story and confirm it paints again from the
  tag alone — that is the claim the id-in-the-document design rests on.
- **0.0.48** — confirm the tag is now **invisible** in the editor rather than a gap where the
  text should be, and that the photo still paints under it. Then the one that matters more and
  is slower to show: play a few turns and confirm the Contact **never writes an `[Image#...]`
  tag of its own**. If one appears, the strip is not reaching that path — and the giveaway is
  that the photo for it never generates, because the pass cannot match a tag that is already
  resolved.
- **Posts, 0.0.47** — open a paired Contact's Posts tab and press **New thread**; it should
  appear under "This chat". Then press **Keep on the profile** and confirm it moves: gone from
  the first group, present in the second, replies intact, and — the check that matters —
  **gone from AR's Forum page too**, because a kept thread is no longer in this story's list.
  Return it and confirm AR's page has it back. Then unpair the chat and confirm the kept post
  is still on the profile, which is the whole point of the second scope.
- **0.0.46, and this is the one that answers the open question** — with photos on, send a
  message and read the console. `[CR:chatimg]` prints one line per generation. If it says **no
  tag found** and the **last paragraph it names is your own previous turn rather than the reply
  that just landed**, then `document.scan()` at generation end is behind the editor and both
  this and the cue are reading the wrong turn — which is a platform fact for §8 and a different
  fix entirely. If it names the reply and still finds no tag, the pattern is wrong. Those are
  the only two possibilities and the line tells them apart.
- **0.0.45's fix** — this is the retest of the above, and the thing to watch is that the tag is
  rewritten **once**: on 0.0.44 the pass re-entered itself and rewrote one tag twelve times
  before giving up, so a tag that ends up with a doubled or mangled `[Image#...]` means the
  guard is not holding. Also confirm the **cue fires now**: it was covered by the same flaw,
  and the Chat screen's reason line is what to read if it stays quiet.
- A rollover in a long chat (the kernel's riskiest live surface, P1). **Oldest open item.**
- **The clock** (0.0.25): switch a chat to story time, move it, and confirm `{{time}}` in a
  greeting or a diary agrees with the panel. Then **undo a turn and confirm the clock goes
  back with it** — that is the one claim only a live story can test, and the whole reason
  the value is in `historyStorage`. Set the per-reply step and confirm a reply moves it once,
  not twice, and that a side generation does not move it at all.
- **The schedule** (0.0.25): add an event on a weekday and one on Daily, set the chat clock
  inside both, and confirm Current Events names them **without** Track Real Time while the
  chat is on story time — and that in real time the old gate still applies. Add an
  overnight event (22:00–06:00) and confirm it draws as two pieces and fires on both sides
  of midnight. Give one an intimacy the chat does not have and confirm it is dimmed here and
  absent from the prompt.
- **The reflect fix** (0.0.25): edit the paired Contact's name or schedule in CR and confirm
  the change reaches the next generation without re-picking the pairing.
- **The retirement** (0.0.28), and this is the session's riskiest live check: open a story
  and confirm the CR Cards sidebar panel is gone, the shell still lists and opens all three
  card types, import and export still work per type, the brains file round-trips from the
  Brains tab, and CR Global's macro list shows the paired names and the chat clock. Then
  confirm Chat Settings, Games, Jots, Brains and Diaries still open — nothing in that patch
  should have touched them.
- **The farewell** (0.0.27): delete a Contact and confirm the last message appears, that
  Delete becomes pressable after about two seconds even with the bridge or the model quiet,
  and that closing the sheet and opening another Contact's does not paint the first one's
  reply into the second.
- **The status line** (0.0.26): with an event live, confirm the same words appear on the
  profile, the Chat screen and the Schedule tab, and that they match what Current Events
  puts in the prompt. Move the clock out of the event and confirm all three go quiet.
- A CR card export imported into AnotherRoom 1.1.5 (the D-17 claim).
- The slot probe and stored images across two stories (U-08).
- **Brains** (0.0.24): add a conditional entry on any card type, give it keys and an
  intimacy, and confirm it fires in a chat when a key comes up and **not** below the intimacy
  it asks for. Then export and re-import the card and confirm the keys survived as a list.
- **The Contact editor and Voice tab** (0.0.23): New drops you into the card, a rename shows
  in AR's panel listing, a cleared field stays cleared — plus the example-chat editor
  specifically: add an example, add lines, flip a line's speaker, set a line's emotion from
  the sheet, then **export the card and re-import it** and confirm the examples came back
  whole. That round trip is the one thing a surface test alone cannot prove.
- **The User editor** (0.0.22): the same three checks, plus one of its own — write only an
  **Appearance** on a User with no CR image fields, generate its avatar, and confirm the
  appearance is what got drawn.
