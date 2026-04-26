const puppeteer = require('puppeteer-core');

async function generatePdf(content) {
  const html = buildHtml(content);

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_BIN || '/usr/bin/chromium',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return pdf;
  } finally {
    await browser.close();
  }
}

function buildHtml(content) {
  const { issue_theme, theme_intro = '', cover_image_url, recipes = [], supplements = [], youtube_tips = [], editorial = {}, processed_at } = content;

  const issueDate = new Date(processed_at || Date.now()).toLocaleDateString('he-IL', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // Build YouTube tips: prefer editorial.youtube_tips (strings), fall back to raw youtube_tips (objects with .tip)
  const ytTips = (editorial.youtube_tips && editorial.youtube_tips.length > 0)
    ? editorial.youtube_tips
    : youtube_tips.filter(t => t.tip && t.tip.length > 10).slice(0, 3).map(t => t.tip);

  const recipesHtml = recipes.map((r, i) => {
    const isFirst = i === 0;
    // Recipe 1: use the Action→Reason→Benefit editorial tip
    // Recipes 2+: use their hebrew_description in the same styled box
    const editorialTip = isFirst && editorial.recipe_tip ? editorial.recipe_tip : (r.hebrew_description || '');
    const editorialWhy = isFirst && editorial.recipe_why ? editorial.recipe_why : '';
    const editorialLabel = isFirst ? '\u05DC\u05DE\u05D4 \u05D6\u05D4 \u05D8\u05D5\u05D1 \u05DC\u05DA?' : '\u05DC\u05DE\u05D4 \u05DC\u05D0\u05DB\u05D5\u05DC \u05D0\u05EA \u05D6\u05D4?';
    return `
    <div class="page recipe-page">
      <div class="recipe-number">\u05DE\u05EA\u05DB\u05D5\u05DF ${['\u05D0', '\u05D1', '\u05D2'][i] || i + 1}</div>

      ${r.image ? `<img class="recipe-image" src="${r.image}" alt="${r.hebrew_title}" />` : ''}

      <h2 class="recipe-title">${r.hebrew_title || ''}</h2>
      ${isFirst ? '' : `<p class="recipe-desc">${r.hebrew_description || ''}</p>`}

      ${editorialTip ? `
        <div class="editorial-tip-box">
          <div class="editorial-tip-label">${editorialLabel}</div>
          <div class="editorial-tip-text">${editorialTip}</div>
          ${editorialWhy ? `<div class="editorial-why">${editorialWhy}</div>` : ''}
        </div>
      ` : ''}

      ${r.macros ? `
        <div class="macros-grid">
          <div class="macro-item">
            <span class="macro-value">${r.macros.calories?.amount || '\u2014'}</span>
            <span class="macro-label">\u05E7\u05DC\u05D5\u05E8\u05D9\u05D5\u05EA</span>
          </div>
          <div class="macro-item">
            <span class="macro-value">${r.macros.protein?.amount || '\u2014'}g</span>
            <span class="macro-label">\u05D7\u05DC\u05D1\u05D5\u05DF</span>
          </div>
          <div class="macro-item">
            <span class="macro-value">${r.macros.carbs?.amount || '\u2014'}g</span>
            <span class="macro-label">\u05E4\u05D7\u05DE\u05D9\u05DE\u05D5\u05EA</span>
          </div>
          <div class="macro-item">
            <span class="macro-value">${r.macros.fat?.amount || '\u2014'}g</span>
            <span class="macro-label">\u05E9\u05D5\u05DE\u05DF</span>
          </div>
        </div>
      ` : ''}

      <div class="recipe-meta">
        &#x23F1; ${r.ready_in_minutes || '\u2014'} \u05D3\u05E7\u05D5\u05EA &nbsp;|&nbsp; &#x1F37D; ${r.servings || '\u2014'} \u05DE\u05E0\u05D5\u05EA
        ${r.source_url ? `&nbsp;|&nbsp; <a href="${r.source_url}">\u05DC\u05DE\u05EA\u05DB\u05D5\u05DF \u05D4\u05DE\u05DC\u05D0 \u2190</a>` : ''}
      </div>
    </div>
  `;
  }).join('');

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Heebo', sans-serif;
      direction: rtl;
      background: #fff;
      color: #1a1a1a;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      page-break-after: always;
      position: relative;
      overflow: hidden;
    }

    /* -- Cover Page -- */
    .cover-page {
      background: #1a2e1a;
      display: flex;
      flex-direction: column;
    }

    .cover-image {
      width: 100%;
      height: 180mm;
      object-fit: cover;
      display: block;
    }

    .cover-image-placeholder {
      width: 100%;
      height: 180mm;
      background: linear-gradient(135deg, #2D6A4F, #52B788);
    }

    .cover-content {
      flex: 1;
      padding: 12mm 14mm;
      background: #1a2e1a;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    /* letter-spacing breaks Puppeteer RTL — bidi-override fixes it */
    .magazine-name {
      font-size: 13pt;
      font-weight: 300;
      color: #95D5B2;
      letter-spacing: 3px;
      margin-bottom: 6mm;
      text-transform: uppercase;
      unicode-bidi: bidi-override;
      direction: rtl;
    }

    .cover-theme {
      font-size: 28pt;
      font-weight: 900;
      color: #ffffff;
      line-height: 1.2;
      margin-bottom: 6mm;
    }

    .cover-date {
      font-size: 10pt;
      color: #74C69D;
      font-weight: 300;
    }

    .cover-divider {
      width: 20mm;
      height: 1px;
      background: #52B788;
      margin: 5mm 0;
    }

    .cover-tagline {
      font-size: 11pt;
      color: #B7E4C7;
      font-weight: 300;
    }

    .cover-intro {
      font-size: 10pt;
      color: #B7E4C7;
      font-weight: 300;
      line-height: 1.6;
      margin-top: 5mm;
      border-top: 1px solid rgba(82,183,136,0.3);
      padding-top: 4mm;
    }

    /* -- Recipe Pages -- */
    .recipe-page {
      padding: 14mm;
      background: #fafafa;
    }

    /* letter-spacing — needs bidi-override */
    .recipe-number {
      font-size: 9pt;
      font-weight: 500;
      color: #52B788;
      letter-spacing: 2px;
      margin-bottom: 4mm;
      unicode-bidi: bidi-override;
      direction: rtl;
    }

    .recipe-image {
      width: 100%;
      height: 65mm;
      object-fit: cover;
      border-radius: 4mm;
      margin-bottom: 6mm;
      display: block;
    }

    .recipe-title {
      font-size: 22pt;
      font-weight: 900;
      color: #1a2e1a;
      line-height: 1.2;
      margin-bottom: 4mm;
    }

    .recipe-desc {
      font-size: 11pt;
      color: #4a4a4a;
      line-height: 1.7;
      margin-bottom: 6mm;
      font-weight: 300;
    }

    .benefits-box {
      background: #F0FAF4;
      border-right: 4px solid #52B788;
      border-radius: 2mm;
      padding: 5mm 6mm;
      margin-bottom: 6mm;
    }

    /* letter-spacing — needs bidi-override */
    .benefits-title {
      font-size: 9pt;
      font-weight: 700;
      color: #2D6A4F;
      margin-bottom: 3mm;
      letter-spacing: 1px;
      unicode-bidi: bidi-override;
      direction: rtl;
    }

    .benefits-list {
      list-style: none;
      padding: 0;
    }

    .benefits-list li {
      font-size: 10pt;
      color: #2D6A4F;
      padding: 1.5mm 0;
      font-weight: 400;
    }

    .benefits-list li::before {
      content: '\u2713 ';
      font-weight: 700;
    }

    .macros-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 3mm;
      margin-bottom: 6mm;
      background: #1a2e1a;
      border-radius: 3mm;
      padding: 5mm;
    }

    .macro-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1mm;
    }

    .macro-value {
      font-size: 14pt;
      font-weight: 700;
      color: #95D5B2;
    }

    .macro-label {
      font-size: 8pt;
      color: #74C69D;
      font-weight: 300;
    }

    .recipe-meta {
      font-size: 9pt;
      color: #888;
      font-weight: 300;
      border-top: 1px solid #e8e8e8;
      padding-top: 4mm;
    }

    .recipe-meta a {
      color: #2D6A4F;
      text-decoration: none;
      font-weight: 500;
    }

    .editorial-tip-box {
      background: #F0FAF4;
      border-right: 4px solid #52B788;
      border-radius: 2mm;
      padding: 5mm 6mm;
      margin-bottom: 6mm;
    }

    .editorial-tip-label {
      font-size: 9pt;
      font-weight: 700;
      color: #2D6A4F;
      margin-bottom: 3mm;
      unicode-bidi: bidi-override;
      direction: rtl;
    }

    .editorial-tip-text {
      font-size: 10.5pt;
      color: #1a2e1a;
      line-height: 1.7;
      font-weight: 400;
    }

    .editorial-why {
      font-size: 9pt;
      color: #52B788;
      margin-top: 3mm;
      font-weight: 400;
      font-style: italic;
    }

    /* -- Insights Page -- */
    .insights-page {
      padding: 14mm;
      background: #fafafa;
    }

    .insights-header {
      margin-bottom: 8mm;
    }

    .insights-label {
      font-size: 9pt;
      font-weight: 500;
      color: #52B788;
      margin-bottom: 3mm;
    }

    .insights-title {
      font-size: 24pt;
      font-weight: 900;
      color: #1a2e1a;
      line-height: 1.2;
    }

    .insight-card {
      display: flex;
      gap: 4mm;
      background: #ffffff;
      border-radius: 3mm;
      padding: 5mm 6mm;
      margin-bottom: 5mm;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      align-items: flex-start;
    }

    .insight-icon {
      font-size: 18pt;
      flex-shrink: 0;
    }

    .insight-content { flex: 1; }

    .insight-section-title {
      font-size: 11pt;
      font-weight: 700;
      color: #1a2e1a;
      margin-bottom: 2mm;
    }

    .insight-text {
      font-size: 10pt;
      color: #444;
      line-height: 1.65;
      font-weight: 400;
    }

    .golden-tip-box {
      background: #1a2e1a;
      border-radius: 3mm;
      padding: 6mm 8mm;
      margin-top: 6mm;
    }

    .golden-tip-label {
      font-size: 9pt;
      font-weight: 700;
      color: #95D5B2;
      margin-bottom: 3mm;
    }

    .golden-tip-text {
      font-size: 11pt;
      color: #ffffff;
      line-height: 1.7;
      font-weight: 400;
    }

    .absorption-note {
      font-size: 9pt;
      color: #2D6A4F;
      background: #F0FAF4;
      border-radius: 1mm;
      padding: 2mm 3mm;
      margin-top: 2mm;
      margin-bottom: 2mm;
      font-weight: 500;
    }

    /* -- YouTube Tips Page -- */
    .tips-page {
      padding: 14mm;
      background: #0d1b2a;
      color: #ffffff;
    }

    /* letter-spacing — needs bidi-override */
    .tips-page .section-label {
      font-size: 9pt;
      font-weight: 500;
      color: #74C69D;
      letter-spacing: 3px;
      margin-bottom: 6mm;
      unicode-bidi: bidi-override;
      direction: rtl;
    }

    .tips-page h2 {
      font-size: 24pt;
      font-weight: 900;
      color: #ffffff;
      margin-bottom: 8mm;
      line-height: 1.2;
    }

    .tip-card {
      background: rgba(255,255,255,0.07);
      border-right: 4px solid #52B788;
      border-radius: 3mm;
      padding: 5mm 6mm;
      margin-bottom: 5mm;
    }

    .tip-source {
      font-size: 8pt;
      color: #74C69D;
      margin-bottom: 2mm;
      font-weight: 300;
    }

    .tip-text {
      font-size: 11pt;
      color: #e8e8e8;
      line-height: 1.6;
      font-weight: 400;
    }

    /* -- Supplements Page -- */
    .supplements-page {
      padding: 14mm;
      background: #fafafa;
    }

    /* letter-spacing — needs bidi-override */
    .supplements-page .section-label {
      font-size: 9pt;
      font-weight: 500;
      color: #52B788;
      letter-spacing: 3px;
      margin-bottom: 6mm;
      unicode-bidi: bidi-override;
      direction: rtl;
    }

    .supplements-page h2 {
      font-size: 24pt;
      font-weight: 900;
      color: #1a2e1a;
      margin-bottom: 8mm;
    }

    .supplement-card {
      display: flex;
      gap: 5mm;
      background: #ffffff;
      border-radius: 3mm;
      padding: 5mm;
      margin-bottom: 5mm;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    }

    .supplement-image {
      width: 22mm;
      height: 22mm;
      object-fit: cover;
      border-radius: 2mm;
      flex-shrink: 0;
    }

    .supplement-info { flex: 1; }

    .supplement-name {
      font-size: 13pt;
      font-weight: 700;
      color: #1a2e1a;
      margin-bottom: 2mm;
    }

    .supplement-desc {
      font-size: 9pt;
      color: #555;
      line-height: 1.5;
      margin-bottom: 2mm;
    }

    .supplement-price {
      font-size: 10pt;
      font-weight: 700;
      color: #2D6A4F;
    }

    @media print {
      .page { page-break-after: always; }
    }
  </style>
</head>
<body>

  <!-- Cover Page -->
  <div class="page cover-page">
    ${cover_image_url
      ? `<img class="cover-image" src="${cover_image_url}" alt="cover" />`
      : `<div class="cover-image-placeholder"></div>`
    }
    <div class="cover-content">
      <div class="magazine-name">\u05DE\u05D2\u05D6\u05D9\u05DF \u05D4\u05D1\u05E8\u05D9\u05D0\u05D5\u05EA \u05E9\u05DC\u05DA</div>
      <div class="cover-divider"></div>
      <div class="cover-theme">${issue_theme || '\u05D2\u05D9\u05DC\u05D9\u05D5\u05DF \u05D7\u05D3\u05E9'}</div>
      <div class="cover-date">${issueDate}</div>
      <div class="cover-divider"></div>
      <div class="cover-tagline">\u05D8\u05D9\u05E4\u05D9\u05DD \u05E4\u05E9\u05D5\u05D8\u05D9\u05DD. \u05E9\u05D9\u05E0\u05D5\u05D9 \u05D0\u05DE\u05D9\u05EA\u05D9.</div>
      ${theme_intro ? `<div class="cover-intro">${theme_intro}</div>` : ''}
    </div>
  </div>

  <!-- Recipe Pages -->
  ${recipesHtml}

  <!-- Editorial Insights Page (YouTube tips + sleep + movement + golden tip) -->
  ${(editorial.sleep_tip || editorial.movement_tip || editorial.golden_tip || ytTips.length > 0) ? `
  <div class="page insights-page">
    <div class="insights-header">
      <div class="insights-label">\u05D2\u05D9\u05DC\u05D9\u05D5\u05DF \u05D6\u05D4 \u00B7 \u05EA\u05D5\u05DB\u05DF \u05E2\u05E8\u05DB\u05EA\u05D9</div>
      <h2 class="insights-title">\u05D4\u05D8\u05D9\u05E4\u05D9\u05DD \u05E9\u05DC\u05E0\u05D5</h2>
    </div>

    ${ytTips.map(tip => `
    <div class="insight-card">
      <div class="insight-icon">&#x25B6;</div>
      <div class="insight-content">
        <div class="insight-section-title">\u05D8\u05D9\u05E4 \u05DE\u05D4\u05D9\u05D5\u05D8\u05D9\u05D5\u05D1</div>
        <div class="insight-text">${tip}</div>
      </div>
    </div>`).join('')}

    ${editorial.sleep_tip ? `
    <div class="insight-card">
      <div class="insight-icon">&#x1F319;</div>
      <div class="insight-content">
        <div class="insight-section-title">\u05E9\u05D9\u05E0\u05D4 \u05D8\u05D5\u05D1\u05D4</div>
        <div class="insight-text">${editorial.sleep_tip}</div>
      </div>
    </div>` : ''}

    ${editorial.movement_tip ? `
    <div class="insight-card">
      <div class="insight-icon">&#x1F3C3;</div>
      <div class="insight-content">
        <div class="insight-section-title">\u05EA\u05E0\u05D5\u05E2\u05D4</div>
        <div class="insight-text">${editorial.movement_tip}</div>
      </div>
    </div>` : ''}

    ${editorial.golden_tip ? `
    <div class="golden-tip-box">
      <div class="golden-tip-label">&#x2728; \u05D4\u05D8\u05D9\u05E4 \u05D4\u05D6\u05D4\u05D1 \u05E9\u05DC \u05D4\u05D2\u05D9\u05DC\u05D9\u05D5\u05DF</div>
      <div class="golden-tip-text">${editorial.golden_tip}</div>
    </div>` : ''}
  </div>
  ` : ''}

  <!-- Supplements Page -->
  ${supplements.length > 0 ? `
  <div class="page supplements-page">
    <div class="section-label">\u05EA\u05D5\u05E1\u05E4\u05D9 \u05EA\u05D6\u05D5\u05E0\u05D4</div>
    <h2>\u05D4\u05DE\u05D5\u05DE\u05DC\u05E6\u05D9\u05DD \u05D4\u05E9\u05D1\u05D5\u05E2</h2>
    ${supplements.map((s, si) => {
      const suppTip = si === 0 && editorial.supplement_tip ? editorial.supplement_tip : (s.hebrew_description || s.description || '');
      const absorptionNote = si === 0 && editorial.supplement_absorption_note ? editorial.supplement_absorption_note : '';
      return `
      <div class="supplement-card">
        ${s.image ? `<img class="supplement-image" src="${s.image}" alt="${s.name}" />` : ''}
        <div class="supplement-info">
          <div class="supplement-name">${s.name || ''}</div>
          <div class="supplement-desc">${suppTip}</div>
          ${absorptionNote ? `<div class="absorption-note">${absorptionNote}</div>` : ''}
          ${s.price ? `<div class="supplement-price">${s.price}</div>` : ''}
        </div>
      </div>
    `;}).join('')}
  </div>
  ` : ''}

</body>
</html>`;
}

module.exports = { generatePdf };
