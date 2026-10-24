// Tests for cr-scene-v2.ts. Run: cat stubs + cr-scene-v2.ts + this file into one .ts and
// execute with `node --experimental-strip-types`. The stubs stand in for engine symbols.
// [CR] Vendored from the image-prompt review (v1.2). 1.0.9: the cards' outfits are written as a Clothes set,
// which is what engine 1.0.9 turns them into (D-114); the expectations are unchanged. cr-imgv5-smoke.js runs it against the whole engine.

let pass = 0, fail = 0;
function eq(name: string, got: any, want: any)
{
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w){ pass++; }
  else { fail++; console.log("FAIL " + name + "\n  got:  " + g + "\n  want: " + w); }
}
function has(name: string, hay: string, needle: string, yes: boolean = true)
{
  const ok = hay.indexOf(needle) >= 0;
  if (ok === yes){ pass++; }
  else { fail++; console.log("FAIL " + name + "\n  " + (yes ? "missing " : "unexpected ") + JSON.stringify(needle) + " in " + JSON.stringify(hay)); }
}

const sunny: any = { id: "c1", name: "Sunny", alias: "Sun", gender: "female", species: "cat girl",
  cr: { img: { universalPrompt: "girl, cat girl, tabby cat ears, orange hair, green eyes",
    universalUC: "extra ears" },
    sets: [ { id: "sOutfits", name: "Outfit", wear: true, variants: [ { id: "o1", name: "casual", content: "", prompt: "white tank top, denim shorts, sneakers", uc: "skirt" } ] } ] } };
const marco: any = { id: "c2", name: "Marco", gender: "Male", species: "",
  cr: { img: { universalPrompt: "boy, short hair, black hair, stubble", handle: "man in apron" },
    sets: [ { id: "sOutfits", name: "Outfit", wear: true, variants: [ { id: "o2", name: "chef", content: "", prompt: "white apron, black shirt" } ] } ] } };
const mira: any = { id: "c3", name: "Mira Vale", gender: "woman", species: "elf",
  cr: { img: { universalPrompt: "girl, elf, pointy ears, silver hair" } } };
const cast = [sunny, marco];

// --- kind and handle
eq("kind female", crKind(sunny), "girl");
eq("kind Male", crKind(marco), "boy");
eq("kind fallback universal", crKind({ id: "x", name: "X", cr: { img: { universalPrompt: "boy, horns" } } } as any), "boy");
eq("kind other", crKind({ id: "y", name: "Y", gender: "non-binary" } as any), "other");
eq("handle species", crHandle(sunny), "cat girl");
eq("handle set", crHandle(marco), "man in apron");
eq("handle species+noun", crHandle(mira), "elf girl");
eq("cast lines", crCastLines([sunny, mira], "c3"),
  "- Sunny: girl. Handle: cat girl.\n- Mira Vale: girl. Handle: elf girl. Took the photo.");

// --- two people, positions, interaction
const t1 = [
  "SCENE: cowboy shot, from side, indoors, kitchen, night, ceiling light, detailed background. Cat girl leans on counter at left, laughing. Man in apron at right holds out spoon toward cat girl. Steam rises from pot between them.",
  "@Sunny (left): standing, leaning on counter, laughing, closed eyes, target#feeding",
  "@Marco (right): standing, smile, looking at another, source#feeding",
  "RATING: general"
].join("\n");
const p1 = crParseScene(t1, cast);
eq("p1 people", p1.people.map((p) => [p.card.id, p.pos]), [["c1", "left"], ["c2", "right"]]);
eq("p1 rating", p1.rating, "general");
const b1 = crBuildScene(p1, cast);
has("b1 count first", b1.prompt, "1girl, 1boy, cowboy shot");
has("b1 no solo", b1.prompt, "solo", false);
has("b1 prose kept", b1.prompt, "Cat girl leans on counter at left, laughing.");
has("b1 rating tail", b1.prompt, "between them. rating:general");
eq("b1 nsfw guard", b1.extraUC, ["nsfw"]);
eq("b1 centers", b1.characters.map((c) => c.center), [{ x: 0.3, y: 0.5 }, { x: 0.7, y: 0.5 }]);
eq("b1 sunny caption: state before outfit, cowboy shot drops sneakers, closed eyes drop eye colour", b1.characters[0].visuals,
  "girl, cat girl, tabby cat ears, orange hair, standing, leaning on counter, laughing, closed eyes, target#feeding, white tank top, denim shorts");
eq("b1 marco caption keeps everything", b1.characters[1].visuals,
  "boy, short hair, black hair, stubble, standing, smile, looking at another, source#feeding, white apron, black shirt");
eq("b1 sunny uc", b1.characters[0].uc, "extra ears, skirt");
eq("b1 names never sent", b1.characters.map((c) => c.visuals).join(" ").indexOf("Sunny"), -1);

// --- solo: state moves to base, caption keeps looks only; hides and wears
const t2 = [
  "upper body, from above, indoors, bedroom, morning, sunlight, blurry background. Cat girl holds phone at arm's length above face. Window light falls across left side of face.",
  "@Sunny: lying, on back, smile, looking at viewer, selfie",
  "@Sunny wears: oversized white t-shirt",
  "@Sunny hides: sneakers, denim shorts",
  "RATING: general"
].join("\n");
const b2 = crBuildScene(crParseScene(t2, cast), cast);
has("b2 solo", b2.prompt, "1girl, solo, upper body");
has("b2 state in base", b2.prompt, "blurry background, lying, on back, smile, looking at viewer, selfie. Cat girl");
eq("b2 caption: wears replaces outfit, no state", b2.characters[0].visuals,
  "girl, cat girl, tabby cat ears, orange hair, green eyes, oversized white t-shirt");
eq("b2 outfit uc dropped with outfit", b2.characters[0].uc, "extra ears");
eq("b2 no centers solo", b2.characters[0].center, undefined);

// --- hides without wears
const b2b = crBuildScene(crParseScene("upper body. Cat girl waves.\n@Sunny: standing, waving\n@Sunny hides: sneakers", cast), cast);
eq("b2b hides drops sneakers only", b2b.characters[0].visuals,
  "girl, cat girl, tabby cat ears, orange hair, green eyes, white tank top, denim shorts");

// --- only visible people get captions; mentioned-but-absent Marco is dropped
const t3 = "SCENE: full body, outdoors, beach, sunset, backlighting. Cat girl walks along waterline.\n@Sunny: walking, looking down\nRATING: general";
const b3 = crBuildScene(crParseScene(t3, cast), cast);
eq("b3 visible", b3.visibleIds, ["c1"]);

// --- no humans
const t4 = "SCENE: no humans, scenery, close-up, indoors, table, plate, pancakes, sunlight.\nRATING: general";
const b4 = crBuildScene(crParseScene(t4, cast), cast);
eq("b4 no characters", b4.characters.length, 0);
has("b4 prompt", b4.prompt, "no humans, scenery, close-up");
has("b4 no count", b4.prompt, "1girl", false);

// --- scrubbing: names, weights, pipes, card-tag bleed, stray count tags
const t5 = [
  "SCENE: 2girls, 1.3::dutch angle::, {night}, orange hair, rain | wet. Sunny grabs Marco's wrist. Sun is soaked.",
  "@Sunny (left): standing, wet, angry",
  "@Marco (right): standing, surprised",
  "RATING: sensitive"
].join("\n");
const b5 = crBuildScene(crParseScene(t5, cast), cast);
has("b5 counts replaced", b5.prompt, "1girl, 1boy, dutch angle");
has("b5 stray 2girls gone", b5.prompt, "2girls", false);
has("b5 weight gone", b5.prompt, "::", false);
has("b5 braces gone", b5.prompt, "{", false);
has("b5 pipe gone", b5.prompt, "|", false);
has("b5 bleed tag gone", b5.prompt, "orange hair", false);
has("b5 names to handles", b5.prompt, "Cat girl grabs man in apron's wrist. Cat girl is soaked.");
has("b5 pipe became comma", b5.prompt, "rain, wet. Cat girl");
has("b5 sensitive", b5.prompt, "rating:sensitive");
eq("b5 nsfw guard sensitive", b5.extraUC, ["nsfw"]);

// --- explicit: no nsfw guard
const b6 = crBuildScene(crParseScene("SCENE: on bed. Cat girl.\n@Sunny (left): lying\n@Marco (right): kneeling\nRATING: explicit", cast), cast);
eq("b6 no guard", b6.extraUC, []);

// --- tight shot: no positions
const b7 = crBuildScene(crParseScene("SCENE: close-up, kiss. Cat girl kisses man in apron.\n@Sunny (left): source#kiss\n@Marco (right): target#kiss\nRATING: general", cast), cast);
eq("b7 no centers on close-up", b7.characters.map((c) => c.center), [undefined, undefined]);

// --- partial positions: none used
const b8 = crBuildScene(crParseScene("SCENE: wide shot.\n@Sunny (left): standing\n@Marco: sitting", cast), cast);
eq("b8 no centers partial", b8.characters.map((c) => c.center), [undefined, undefined]);

// --- legacy text (engine 1.0.0 output) is untouched apart from scrubbing; everyone drawn
const legacy = "2girls, from below, night, neon lights. Two figures argue under a flickering sign.";
const b9 = crBuildScene(crParseScene(legacy, cast), cast);
eq("b9 legacy prompt", b9.prompt, legacy);
eq("b9 legacy everyone", b9.visibleIds, ["c1", "c2"]);
eq("b9 legacy no guard", b9.extraUC, []);

// --- inline rating in legacy text moves to the tail
const b10 = crBuildScene(crParseScene("1girl, solo, rating:general, sitting. Cat girl reads.", [sunny]), [sunny]);
has("b10 inline rating moved", b10.prompt, "Cat girl reads. rating:general");
eq("b10 inline rating once", b10.prompt.split("rating:").length, 2);

// --- @ line by handle, unknown names reported
const p11 = crParseScene("SCENE: wide shot.\n@cat girl (center): sitting\n@waiter: standing", cast);
eq("p11 by handle", p11.people.map((p) => p.card.id), ["c1"]);
eq("p11 unknown", p11.unknown, ["waiter"]);

// --- no cast at all: model's own counts and looks kept
const b12 = crBuildScene(crParseScene("SCENE: 1girl, solo, red coat, street, snowing. Woman in red coat waits at bus stop.\nRATING: general", []), []);
has("b12 no-cast keeps model count", b12.prompt, "1girl, solo, red coat");

// --- tags and sentences on separate lines, no period between them
const b13 = crBuildScene(crParseScene("SCENE: wide shot, outdoors, street, night, neon lights\nCat girl runs at left, man in apron chases at right.\n@Sunny (left): running\n@Marco (right): running\nRATING: general", cast), cast);
has("b13 split across lines", b13.prompt, "1girl, 1boy, wide shot, outdoors, street, night, neon lights. Cat girl runs at left");

// --- framing hides on a real-world caption: underscores, newlines, weights
const punk: any = { id: "c4", name: "Vex", gender: "female", species: "",
  cr: { img: { universalPrompt: "girl, punk, Goth_fashion,\nvery_long_hair, blonde_hair, green_eyes,\n0.7::large_breasts::, slender," },
    sets: [ { id: "sOutfits", name: "Outfit", wear: true, variants: [ { id: "o4", name: "punk", content: "", prompt: "ripped_jeans, combat_boots, belt, chains, band_t-shirt, 1.2::black thighhighs, white boots::" } ] } ] } };
const b14 = crBuildScene(crParseScene("upper body, from below, indoors, bedroom, night. Woman leans back on desk, grinning.\n@Vex: sitting, evil grin, looking at viewer\nrating:general", [punk]), [punk]);
has("b14 combat boots dropped", b14.characters[0].visuals, "combat_boots", false);
has("b14 jeans kept at upper body", b14.characters[0].visuals, "ripped_jeans");
has("b14 weighted group untouched", b14.characters[0].visuals, "1.2::black thighhighs, white boots::");
has("b14 weight kept", b14.characters[0].visuals, "0.7::large_breasts::");
has("b14 solo state in base", b14.prompt, "1girl, solo, upper body, from below, indoors, bedroom, night, sitting, evil grin, looking at viewer. Woman leans");
const b15 = crBuildScene(crParseScene("portrait, sleeping. Woman dozes.\n@Vex: lying, closed eyes", [punk]), [punk]);
has("b15 portrait drops jeans and belt", b15.characters[0].visuals, "ripped_jeans", false);
has("b15 portrait drops belt", b15.characters[0].visuals, ", belt,", false);
has("b15 closed eyes drop green_eyes", b15.characters[0].visuals, "green_eyes", false);
has("b15 keeps hair", b15.characters[0].visuals, "blonde_hair");

// --- solo: tag the model repeated in the block and the @ line appears once
const b16 = crBuildScene(crParseScene("1girl, solo, full body, sitting, smile, park, day. Cat girl sits on bench.\n@Sunny: sitting, smile, looking at viewer\nrating:general", cast), cast);
eq("b16 dedupe", b16.prompt.split("sitting,").length, 2);
has("b16 counts from @ lines", b16.prompt, "1girl, solo, full body");

// --- the model writes counts for two but only one @ line: script trusts the @ lines
const b17 = crBuildScene(crParseScene("1girl, 1boy, cowboy shot, kitchen. Cat girl laughs.\n@Sunny: laughing", cast), cast);
has("b17 count from @ lines", b17.prompt, "1girl, solo, cowboy shot");
eq("b17 visible", b17.visibleIds, ["c1"]);

// --- prose-only scene (no tag run)
const sp = crSplitTagsProse("Cat girl sits on windowsill and watches rain.");
eq("prose-only split", sp, { tags: [], prose: "Cat girl sits on windowsill and watches rain." });

// --- counts
eq("counts", crCountTags(["girl", "girl", "boy", "other"]), ["2girls", "1boy", "1other"]);

console.log(pass + " passed, " + fail + " failed");
if (fail){ process.exit(1); }
