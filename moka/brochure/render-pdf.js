#!/usr/bin/env node
/*
 * Genereert UTAMA-MOKA-Investeerdersbrochure.pdf uit pdf-source.html.
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
  await page.goto('http://localhost:8899/moka/brochure/pdf-source.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    const pending = Array.from(document.images).filter(img => !img.complete);
    await Promise.all(pending.map(img => new Promise(res => { img.onload = img.onerror = res; })));
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  });
  await page.waitForTimeout(800);
  const out = path.join(__dirname, 'UTAMA-MOKA-Investeerdersbrochure.pdf');
  await page.pdf({ path: out, printBackground: true, preferCSSPageSize: true });
  await browser.close();
  console.log('geschreven:', out);
})();
