const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distPath, 'index.html');

if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');

  const seoTags = `
    <!-- SEO & Social Meta Tags -->
    <meta name="keywords" content="control de flujo de caja, registro de ingresos y gastos, finanzas personales, gestión multicuentas, AyeFinance">
    <link rel="canonical" href="https://finance.ayeapps.com">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://finance.ayeapps.com">
    <meta property="og:title" content="AyeFinance — Control de Gastos y Flujo de Caja">
    <meta property="og:description" content="Lleva el control de tus ingresos, gastos y cuentas bancarias en un solo lugar. Simple y pensado para el día a día.">
    <meta property="og:site_name" content="AyeApps">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="AyeFinance — Control de Gastos y Flujo de Caja">
    <meta name="twitter:description" content="Lleva el control de tus ingresos, gastos y cuentas bancarias en un solo lugar.">
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "AyeFinance",
      "operatingSystem": "Web, iOS, Android",
      "applicationCategory": "FinanceApplication",
      "description": "Lleva el control de tus ingresos, gastos y cuentas bancarias en un solo lugar. Simple y pensado para el día a día.",
      "url": "https://finance.ayeapps.com",
      "author": {
        "@type": "Organization",
        "name": "AyeApps",
        "url": "https://ayeapps.com"
      }
    }
    </script>
    <!-- Cloudflare Turnstile (Bot Protection) -->
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>

    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-XBM6DZGE5B"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'G-XBM6DZGE5B');
    </script>
  </head>`;

  html = html.replace('</head>', seoTags);
  html = html.replace('<html lang="en">', '<html lang="es">');
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('✓ AyeFinance SEO injected into dist/index.html');

  // Create sitemap.xml
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://finance.ayeapps.com</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
  fs.writeFileSync(path.join(distPath, 'sitemap.xml'), sitemap, 'utf8');
  console.log('✓ AyeFinance sitemap.xml generated');

  // Create robots.txt
  const robots = `User-Agent: *
Allow: /

Host: https://finance.ayeapps.com
Sitemap: https://finance.ayeapps.com/sitemap.xml
`;
  fs.writeFileSync(path.join(distPath, 'robots.txt'), robots, 'utf8');
  console.log('✓ AyeFinance robots.txt generated');
}
