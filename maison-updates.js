/*
 * UTAMA - project updates van The Maison: luchtfoto's van de bouwplaats, per datum.
 *
 * Eén bron voor drie plekken: de projectpagina van The Maison (onder het bouwstatus-blok) en de camerapagina
 * (/the-maison/camera/#updates) op invest.utamabali.com, openbaar, en het agentenportaal (Projecten, The Maison,
 * tabje Project Updates, de kaart in het overzicht en het dashboard). De sleutel hieronder is de projectnaam.
 *
 * Stuurt Steven nieuwe foto's? Zet BOVENAAN een blok met de datum van die dag (de dag waarop hij ze
 * stuurt, Steven 11 november 2026: "Noem de datum erbij iedere keer als nieuwe foto's toestuur") en
 * zet de bestanden in packages/web-shared/updates/maison/: <id>.webp (1400 px breed) en <id>-s.webp
 * (640 px, voor het dashboard). Daarna: npm run sync:shared, npm run check:shared, en zet beide sites
 * live (invest via de oude repo, het portaal met de CLI). Geen metadata in de beelden (geen EXIF/GPS).
 *
 * De beelden staan op /updates/maison/<id>.webp. Bewerk dit bestand hier, nooit de kopie in een app.
 */
window.UTAMA_UPDATES = {
  maison: [
    {
      datum: '2026-11-11',
      tekst: { nl: "Luchtfoto's van de bouwplaats.", en: 'Aerial photos of the building site.' },
      fotos: [
        'maison-2026-11-11-1', 'maison-2026-11-11-2', 'maison-2026-11-11-3', 'maison-2026-11-11-4',
        'maison-2026-11-11-5', 'maison-2026-11-11-6', 'maison-2026-11-11-7'
      ]
    }
  ]
};
