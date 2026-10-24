// Tests for cr-img-chunks.ts. Concatenate stubs + cr-img-chunks.ts + this file and run with
// `node --experimental-strip-types`.
// [CR] Vendored from the image-prompt review (v1.2). cr-imgv5-smoke.js runs it against the whole engine.

let pass = 0, fail = 0;
function eq(name: string, got: any, want: any)
{
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w){ pass++; }
  else { fail++; console.log("FAIL " + name + "\n  got:  " + g + "\n  want: " + w); }
}

// --- one quality and one UC chunk active per model
const models = ["nai-diffusion-5-full", "nai-diffusion-5-curated", "nai-diffusion-4-5-full", "nai-diffusion-4-5-curated"];
models.forEach((m) => {
  const on = CR_IMG_FIELDS_STANDARD.filter((f) => f.active && crChunkFits(f, m));
  eq("one quality chunk for " + m, on.filter((f) => !!f.basePrompt).length, 1);
  eq("one UC chunk for " + m, on.filter((f) => !!f.uc).length, 1);
});
eq("ids unique", new Set(CR_IMG_FIELDS_STANDARD.map((f) => f.id)).size, CR_IMG_FIELDS_STANDARD.length);
eq("fits under the 24 cap", CR_IMG_FIELDS_STANDARD.length <= 24, true);

// --- compile per model
crImgFields = crSanitizeImgFields(undefined);
// [CR] 1.0.8 adds start/mid spots to the result; compare the two fields this test pins.
const pick2 = (c: any) => ({ quality: c.quality, negative: c.negative });
eq("V5 compile", pick2(crCompileImgFields("nai-diffusion-5-full")), {
  quality: "very aesthetic, masterpiece, no text",
  negative: "lowres, bad hands, bad anatomy, artistic error, sepia, white haze, worst quality, very displeasing, jpeg artifacts, 0::ai-generated::"
});
eq("V5 curated compile = full", crCompileImgFields("nai-diffusion-5-curated"), crCompileImgFields("nai-diffusion-5-full"));
eq("V4.5 Full compile", crCompileImgFields("nai-diffusion-4-5-full").quality, "location, very aesthetic, masterpiece, no text");
eq("V4.5 Curated compile", crCompileImgFields("nai-diffusion-4-5-curated").quality, "location, masterpiece, no text, -0.8::feet::, rating:general");
crImgSettings.model = "nai-diffusion-4-5-full";
eq("default arg uses settings model", crCompileImgFields().quality, "location, very aesthetic, masterpiece, no text");

// --- digit bug
crImgFields = [{ id: "y", label: "y", basePrompt: "year 2026", uc: "", weight: 0.8, active: true }];
eq("space before closing ::", crCompileImgFields("nai-diffusion-5-full").quality, "0.8::year 2026 ::");

// --- chunks with no models apply everywhere (1.0.0 chunks keep working)
crImgFields = [{ id: "mine", label: "mine", basePrompt: "toon (style)", uc: "", weight: 1, active: true }];
eq("unfiltered chunk on V4.5", crCompileImgFields("nai-diffusion-4-5-full").quality, "toon (style)");

// --- sanitizer keeps known model ids only
const san = crSanitizeImgFields([{ id: "a", label: "A", basePrompt: "x", uc: "", weight: 1, active: true,
  models: ["nai-diffusion-5-full", "bogus", 7] }]);
eq("sanitize models", san[0].models, ["nai-diffusion-5-full"]);
const san2 = crSanitizeImgFields([{ id: "b", label: "B", basePrompt: "x", uc: "", weight: 1, active: true, models: ["bogus"] }]);
eq("sanitize drops empty models", san2[0].models, undefined);

// --- merge for existing installs
const old = [
  { id: "cr-base", label: "Base quality", basePrompt: "best quality, very aesthetic, absurdres",
    uc: "lowres, worst quality, bad anatomy, bad hands, jpeg artifacts, watermark, signature", weight: 1, active: true },
  { id: "style", label: "My style", basePrompt: "toon (style)", uc: "", weight: 1, active: true },
  { id: "std-v5-qt", label: "V5 quality tags", basePrompt: "edited by me", uc: "", weight: 1, active: false, models: ["nai-diffusion-5-full"] }
];
const merged = crImgFieldsAddStandard(old);
eq("legacy default switched off", merged[0].active, false);
eq("user chunk untouched", merged[1], old[1]);
eq("existing std chunk kept as edited", merged[2].basePrompt, "edited by me");
eq("merged count", merged.length, 3 + CR_IMG_FIELDS_STANDARD.length - 1);
const edited = crImgFieldsAddStandard([{ id: "cr-base", label: "Base quality", basePrompt: "my own tags", uc: "", weight: 1, active: true }]);
eq("edited legacy chunk left on", edited[0].active, true);
eq("cap respected", crImgFieldsAddStandard(old, 5).length, 5);
eq("merge does not mutate input", old[0].active, true);

console.log(pass + " passed, " + fail + " failed");
if (fail){ process.exit(1); }
