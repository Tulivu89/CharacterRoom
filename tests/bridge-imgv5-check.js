// Pulls the [CR-IMGV5] functions out of the bridge and runs them with a fake API.
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8').replace(/\r\n/g, '\n');
function grab(name) {
  const i = src.indexOf((name.startsWith('async') ? '' : 'function ') + name);
  const start = src.lastIndexOf('\n', i) + 1;
  let depth = 0, j = src.indexOf('{', i);
  for (; j < src.length; j++) { if (src[j] === '{') depth++; else if (src[j] === '}') { depth--; if (depth === 0) break; } }
  return src.slice(start, j + 1);
}
const code = [grab('_crImgCenter('), grab('buildRequestBody('), grab('async function _crGenerateWithFallback'.replace('async ', 'async ')), grab('async function generateCommentImage'.replace('async ', 'async '))].join('\n');
let calls = [], failFirst = false;
const env = { callGenerateAPI: async (b) => { calls.push(b); if (failFirst) { failFirst = false; throw new Error('NAI API 400'); } return 'data:x'; },
  dbSave: async () => {}, imgCache: new Map(), console: { warn: () => {} } };
const f = new Function(...Object.keys(env), code + '\nreturn { buildRequestBody, generateCommentImage };')(...Object.values(env));
let pass = 0, fail = 0; const ok = (n, c, g) => { if (c) { pass++; console.log('ok   ' + n); } else { fail++; console.log('FAIL ' + n, JSON.stringify(g).slice(0, 400)); } };
(async () => {
  const S = { model: 'nai-diffusion-5-full', width: 832, height: 1216, scale: 4.5, steps: 23, seed: 1, quality: 'very aesthetic', negative: 'lowres' };
  await f.generateCommentImage({ uuid: 'u', prompt: '1girl, solo', extraBaseVisuals: 'port', characters: [{ visuals: 'girl', uc: '' }], settings: S });
  let b = calls.pop();
  ok('CE path: quality first, no site fields, centers 0.5', b.input === 'very aesthetic, port, 1girl, solo' && b.parameters.cfg_rescale === undefined && b.parameters.v4_prompt.use_coords === false && b.parameters.v4_negative_prompt.use_order === true, b);
  const CR = Object.assign({}, S, { qualityLast: true, siteParams: true });
  await f.generateCommentImage({ uuid: 'u', prompt: '1girl, 1boy', extraBaseVisuals: 'port', characters: [{ visuals: 'girl', center: { x: 0.3, y: 0.5 } }, { visuals: 'boy', center: { x: 0.7, y: 0.5 } }], settings: CR });
  b = calls.pop();
  ok('CR path: subject first, quality last', b.input === '1girl, 1boy, port, very aesthetic', b.input);
  ok('CR path: centers and use_coords', b.parameters.v4_prompt.use_coords === true && b.parameters.v4_prompt.caption.char_captions[1].centers[0].x === 0.7 && b.parameters.v4_negative_prompt.caption.char_captions[0].centers[0].x === 0.3, b.parameters.v4_prompt);
  ok('CR path: site fields', b.parameters.cfg_rescale === 0 && b.parameters.prefer_brownian === true && b.parameters.cfg_sched_eligibility === 'enable_for_post_summer_samplers' && b.parameters.v4_negative_prompt.use_order === false && b.parameters.v4_prompt.legacy_uc === false && b.parameters.skip_cfg_above_sigma === null, b.parameters);
  await f.generateCommentImage({ uuid: 'u', prompt: '1girl', extraBaseVisuals: 'port', characters: [], settings: Object.assign({}, CR, { qualityStart: 'artist:x', qualityMid: 'flat color' }) });
  b = calls.pop();
  ok('spots: start, scene, after-scene, base, end', b.input === 'artist:x, 1girl, flat color, port, very aesthetic', b.input);
  failFirst = true; calls = [];
  await f.generateCommentImage({ uuid: 'u', prompt: 'x', extraBaseVisuals: '', characters: [], settings: CR });
  ok('CR path: a 400 retries once without the site fields', calls.length === 2 && calls[0].parameters.cfg_rescale === 0 && calls[1].parameters.cfg_rescale === undefined, calls.map((c) => c.parameters.cfg_rescale));
  const bad = f.buildRequestBody('a', 'b', [{ visuals: 'g', center: { x: 7, y: 0.5 } }], CR);
  ok('a center outside 0..1 falls back to 0.5 and no coords', bad.parameters.v4_prompt.use_coords === false && bad.parameters.v4_prompt.caption.char_captions[0].centers[0].x === 0.5);
  console.log(pass + ' passing, ' + fail + ' failing');
})();
