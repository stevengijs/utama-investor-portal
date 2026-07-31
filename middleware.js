// Routing Middleware (Vercel Edge): detects visitors physically located in
// the Netherlands via Vercel's IP-geolocation, and sets a lightweight cookie
// the client-side language logic reads. This is independent of - and lets us
// override - the visitor's browser language setting.
//
// Only sets a cookie when the visitor is in NL; everyone else falls through
// untouched and the page's existing browser-language / saved-preference
// logic (see _pickInitialLang() in each page) decides the language as before.
import { geolocation, next } from '@vercel/functions';

// Skip static assets (images, css, js, pdfs, etc.) - only run on page routes.
export const config = {
  matcher: [
    '/((?!.*\\.(?:svg|png|jpe?g|gif|webp|css|js|mjs|ico|txt|xml|pdf|json|woff2?)$).*)',
  ],
};

export default function middleware(request) {
  const { country } = geolocation(request);

  if (country === 'NL') {
    return next({
      headers: {
        'Set-Cookie': 'utama_geo=NL; Path=/; Max-Age=31536000; SameSite=Lax',
      },
    });
  }

  return next();
}
