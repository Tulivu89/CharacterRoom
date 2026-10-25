// Runs the bridge's [CR-ZOOM] handler in Chromium on a plain page and drives it with real events.
const { chromium } = require('playwright');
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8').replace(/\r\n/g, '\n');
const i = src.indexOf('var CE_ZOOM_ATTR'); const j = src.indexOf('function _ceSurfImgScan');
const code = src.slice(i, j);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent('<div id="box" data-ce-zoom="pan" style="width:400px;height:400px;overflow:hidden;position:relative;touch-action:none"><div id="w" data-ce-zoom-world="1" style="width:400px;height:400px;background:#888"><div id="cell" style="width:40px;height:40px"></div><div id="fig" data-ce-zoom-nopan="1" style="position:absolute;left:300px;top:300px;width:40px;height:40px"></div></div></div>');
  await p.addScriptTag({ content: code + '; _crZoomAttach(document.getElementById("box")); window.clicks=0; document.getElementById("cell").addEventListener("click",()=>window.clicks++);' });
  const tf = () => p.$eval('#w', (e) => e.style.transform);
  let pass = 0, fail = 0; const ok = (n, c, g) => { if (c) { pass++; console.log('ok   ' + n); } else { fail++; console.log('FAIL ' + n, g); } };
  await p.mouse.move(200, 200); await p.mouse.wheel(0, -400); await p.waitForTimeout(100);
  let t = await tf(); ok('wheel zooms in about the pointer', /scale\(1\.[5-9]/.test(t) && /translate\(-/.test(t), t);
  await p.mouse.move(100, 100); await p.mouse.down(); await p.mouse.move(160, 150, { steps: 4 }); await p.mouse.up();
  const t2 = await tf(); ok('drag pans', t2 !== t, t2);
  await p.mouse.move(20, 20); await p.mouse.down(); await p.mouse.move(120, 120, { steps: 4 }); await p.mouse.up();
  ok('a drag that panned is not a click', (await p.evaluate(() => window.clicks)) === 0);
  await p.click('#cell', { force: true });
  ok('a plain tap still clicks', (await p.evaluate(() => window.clicks)) === 1);
  const before = await tf(); const fb = await p.$eval('#fig', (e) => e.getBoundingClientRect());
  await p.mouse.move(fb.x + 5, fb.y + 5); await p.mouse.down(); await p.mouse.move(fb.x + 60, fb.y + 60, { steps: 4 }); await p.mouse.up();
  ok('no pan from inside a no-pan element', (await tf()) === before);
  await p.mouse.move(200, 200); await p.mouse.wheel(0, 5000); await p.waitForTimeout(100); t = await tf();
  ok('zoom out stops at 1 and the picture stays in the box', /scale\(1\)/.test(t) && /translate\(0px, ?0px\)/.test(t), t);
  await p.mouse.wheel(0, -600); await p.mouse.dblclick(200, 200);
  ok('double-click resets', /scale\(1\)/.test(await tf()));
  console.log(pass + ' passing, ' + fail + ' failing'); await b.close(); process.exit(fail ? 1 : 0);
})();
