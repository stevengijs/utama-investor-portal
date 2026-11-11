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
 * Bij elke update hoort een korte tekst, `tekst: { nl, en }` (Steven, 11 november 2026: "Voeg ook met enkele zinnen een
 * persoonlijke tone of voice geschreven wat er op de bouw gebeurd aan de hand van de foto's, zo heeft de lead een idee"):
 * drie tot vijf korte zinnen in de tone of voice van het brein (je en we, kort, concreet, geen lang streepje), over wat
 * de foto's laten zien. Alleen wat op de foto's te zien is of in het brein staat; geen voortgang, data of beloftes verzinnen.
 * Noem aan Steven wat je hebt geschreven, zodat hij het kan controleren.
 *
 * De beelden staan op /updates/maison/<id>.webp. Bewerk dit bestand hier, nooit de kopie in een app.
 */
window.UTAMA_UPDATES = {
  maison: [
    {
      datum: '2026-11-11',
      tekst: {
        nl: "Zo staat de bouw ervoor. Je ziet de zes villa's naast elkaar. Twee villa's zijn het verst: daar staat de betonconstructie en ligt de betonplaat erop. Bij de andere villa's leggen we het wapeningsstaal en de bekisting klaar voor de volgende betonvloer. Op de bekisting zie je de bouwploeg aan het werk.",
        en: 'Here is how the build stands. You can see the six villas side by side. Two villas are furthest along: the concrete structure is up and the concrete slab is on top. On the other villas we are laying out the rebar and the formwork for the next concrete floor. On the formwork you can see the crew at work.'
      },
      fotos: [
        'maison-2026-11-11-1', 'maison-2026-11-11-2', 'maison-2026-11-11-3', 'maison-2026-11-11-4',
        'maison-2026-11-11-5', 'maison-2026-11-11-6', 'maison-2026-11-11-7'
      ]
    }
  ]
};
