#!/usr/bin/env node
/*
 * Genereert UTAMA-The-Maison-Investeerdersbrochure.pdf uit pdf-source.html.
 *
 * Waarom een apart bronbestand (pdf-source.html) i.p.v. de live index.html
 * met een @media print-stylesheet printen:
 *
 * De digitale brochure (index.html) is een responsive, scrollende webapp -
 * kaarten, grids en tabellen hebben geen vaste hoogte en reflowen op basis
 * van hun inhoud. Chromium's print-fragmentatie (CSS break-inside/break-after)
 * is voor dat soort dynamische content notoir onbetrouwbaar: grids en losse
 * cards die niet toevallig op de resterende paginaruimte passen worden of
 * halverwege afgesneden, of springen in hun geheel naar een nieuwe pagina
 * en laten een groot leeg wit vlak achter. Dat gaf herhaaldelijk een
 * rommelige, "schots en scheef" ogende PDF, ongeacht hoeveel print-CSS er
 * overheen werd gelegd.
 *
 * pdf-source.html lost dit structureel op door dezelfde aanpak te gebruiken
 * als UTAMA's eigen generieke brochure-template (zie het Claude Project,
 * brochures/template/build.py): elke pagina is een vast blok van 794x1123px
 * (A4 @ 96dpi) met overflow:hidden, en de inhoud is met de hand ingedeeld om
 * precies op die ene pagina te passen - net als slides in een presentatie.
 * Er is dus niets om te fragmenteren: elke pagina eindigt exact waar hij
 * hoort te eindigen, nooit halverwege een kaart, tabel of foto.
 *
 * Bijwerken van de PDF-inhoud: bewerk de secties in pdf-source.html direct
 * (elke <section class="pdfpage"> is één pagina), en run dit script opnieuw.
 * Gebruik: node render-pdf.js
 * (verwacht dat de site lokaal wordt geserveerd op localhost:8899, vanuit de
 * repo-root: `python3 -m http.server 8899` vanuit utama-investor-portal/)
 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
  await page.goto('http://localhost:8899/the-maison/brochure/pdf-source.html', { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    const pending = Array.from(document.images).filter(img => !img.complete);
    await Promise.all(pending.map(img => new Promise(res => { img.onload = img.onerror = res; })));
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  });
  await page.waitForTimeout(400);
  const out = path.join(__dirname, 'UTAMA-The-Maison-Investeerdersbrochure.pdf');
  await page.pdf({ path: out, printBackground: true, preferCSSPageSize: true });
  await browser.close();
  console.log('geschreven:', out);
})();
