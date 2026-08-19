# utama-investor-portal

invest.utamabali.com, de investeerdersfunnel van UTAMA. Overgezet vanuit de Cowork-sessie "UTAMA - website + invest".

## Stack

Statische HTML/CSS/JS zonder buildstap, gedeelde `styles.css`. Vercel deployt automatisch bij push naar `main`. Dependencies: `@vercel/functions` voor de edge middleware, Playwright als devDependency (screenshots/checks).

## Structuur

- `index.html` — homepage van de funnel, met de "hoe het werkt"-kaarten en het projectoverzicht.
- `portal/` — `index.html` (login/entree) en `dashboard.html` met eigen `portal.css`.
- `the-dune/`, `the-maison/`, `moka/` — projectpagina's. `moka/brochure/` bevat de brochure. Galerij en omslagfoto per project komen uit de admin, niet uit hardcoded HTML.
- `lp/the-maison-1/` — losse landingspagina.
- `referral/` — referralpagina, gekoppeld aan `referral_visits` en `referrals` in Supabase.
- `calc-shared.js` — gedeelde rekenlogica voor de ROI-/scenariocalculator.
- `supabase-client.js` — clientkant van de Supabase-koppeling.
- `t.js`, `meta-pixel.js` — tracking en Meta Pixel.
- `middleware.js` — Vercel Edge Middleware, zet een `utama_geo=NL` cookie voor bezoekers in Nederland; de taalkeuze per pagina (`_pickInitialLang()`) leest die cookie en overrulet de browsertaal.
- `vercel.json` — zet `Cache-Control: max-age=0, must-revalidate` op HTML en PDF's, zodat updates direct zichtbaar zijn.
- `UTAMA-tone-of-voice.md` — schrijfrichtlijn. Lees dit voor je copy aanpast.

## Backend

Supabase-project `gcpachivrwalsneuvlsa`. Schema en edge functions staan in `services/portal-db/`, zie de `CLAUDE.md` daar.

## Let op

`t.js` is een kopie. De bron is `packages/web-shared/t.js`, bewerk die en draai `npm run sync:shared`.

De admin die de content van deze site vult, zit in `apps/homepage/admin.html`. Wijzig je hier de datastructuur van projecten of galerijen, check dan of de admin meebeweegt. Dat is nu één commit, geen twee PR's.

## Werkwijze

Geen build, geen tests. Serveer de map statisch om lokaal te kijken; `file://` breekt de Supabase-calls en de middleware.
