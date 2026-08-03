#!/usr/bin/env node
/*
 * Genereert UTAMA-The-Dune-Investeerdersbrochure.pdf uit pdf-source.html.
 * Zie the-maison/brochure/render-pdf.js voor de volledige toelichting op deze
 * aanpak (vaste-layout paginas i.p.v. de live, responsive brochure printen).
 * Gebruik: node render-pdf.js
 * (verwacht dat de site lokaal wordt geserveerd op localhost:8899, vanuit de
 * repo-root: `python3 -m http.server 8899` vanuit utama-investor-portal/)
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
  await page.goto('http://localhost:8899/the-dune/brochure/pdf-source.html', { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    const pending = Array.from(document.images).filter(img => !img.complete);
    await Promise.all(pending.map(img => new Promise(res => { img.onload = img.onerror = res; })));
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  });
  await page.waitForTimeout(400);
  const out = path.join(__dirname, 'UTAMA-The-Dune-Investeerdersbrochure.pdf');
  await page.pdf({ path: out, printBackground: true, preferCSSPageSize: true });
  await browser.close();
  console.log('geschreven:', out);
})();
