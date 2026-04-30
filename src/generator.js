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

  const recipesHtml = recipes.map((r, i) => {
    // Each recipe gets its own tip from GPT-4o (per-recipe Action→Reason→Benefit)
    const recipeTip = r.tip || '';
    const recipeWhy = r.why_this_recipe || '';
    return `
    <div class="page recipe-page">
      <div class="recipe-number">\u05DE\u05EA\u05DB\u05D5\u05DF ${['\u05D0', '\u05D1', '\u05D2'][i] || i + 1}</div>

      ${r.image ? `<img class="recipe-image" src="${r.image}" alt="${r.hebrew_title}" />` : ''}

      <h2 class="recipe-title">${r.hebrew_title || ''}</h2>
      <p class="recipe-desc">${r.hebrew_description || ''}</p>

      ${recipeTip ? `
        <div class="editorial-tip-box">
          <div class="editorial-tip-label">\u05DC\u05DE\u05D4 \u05D6\u05D4 \u05D8\u05D5\u05D1 \u05DC\u05DA?</div>
          <div class="editorial-tip-text">${recipeTip}</div>
          ${recipeWhy ? `<div class="editorial-why">${recipeWhy}</div>` : ''}
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

      ${(r.hebrew_ingredients && r.hebrew_ingredients.length > 0) ? `
        <div class="ingredients-section">
          <h3 class="ingredients-title">\u05DE\u05E8\u05DB\u05D9\u05D1\u05D9\u05DD</h3>
          <ul class="ingredients-list">
            ${r.hebrew_ingredients.map(ing => `
              <li class="ingredient-item">
                <span class="ingredient-amount">${ing.amount || ''}</span>
                <span class="ingredient-name">${ing.name || ''}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      ${(r.hebrew_steps && r.hebrew_steps.length > 0) ? `
        <div class="steps-section">
          <h3 class="steps-title">\u05D0\u05D5\u05E4\u05DF \u05D4\u05DB\u05E0\u05D4</h3>
          <ol class="steps-list">
            ${r.hebrew_steps.map(step => `
              <li class="step-item">${step}</li>
            `).join('')}
          </ol>
        </div>
      ` : ''}
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

    .ingredients-section, .steps-section {
      margin-top: 5mm;
      padding-top: 4mm;
      border-top: 1px solid #e8e8e8;
    }

    .ingredients-title, .steps-title {
      font-size: 13pt;
      font-weight: 700;
      color: #1B4332;
      margin-bottom: 3mm;
    }

    .ingredients-list {
      list-style: none;
      padding: 0;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2mm 6mm;
    }

    .ingredient-item {
      font-size: 9.5pt;
      color: #333;
      padding: 1.5mm 0;
      border-bottom: 1px dotted #e0e0e0;
      direction: rtl;
    }

    .ingredient-amount {
      font-weight: 600;
      color: #2D6A4F;
      margin-left: 2mm;
    }

    .ingredient-name {
      font-weight: 400;
    }

    .steps-list {
      padding-right: 5mm;
      padding-left: 0;
      counter-reset: step-counter;
      list-style: none;
    }

    .step-item {
      font-size: 9.5pt;
      color: #333;
      line-height: 1.6;
      padding: 2mm 0;
      padding-right: 8mm;
      position: relative;
      border-bottom: 1px dotted #f0f0f0;
      counter-increment: step-counter;
    }

    .step-item::before {
      content: counter(step-counter);
      position: absolute;
      right: 0;
      top: 2mm;
      background: #2D6A4F;
      color: white;
      width: 5.5mm;
      height: 5.5mm;
      border-radius: 50%;
      font-size: 8pt;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
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

    .supplement-bestseller {
      font-size: 9pt;
      color: #B7570A;
      font-weight: 600;
      margin-bottom: 2mm;
    }

    .supplement-connection {
      font-size: 9pt;
      color: #52B788;
      margin-top: 2mm;
      font-style: italic;
      font-weight: 400;
    }

    .supplement-where-to-buy {
      font-size: 9pt;
      color: #444;
      margin-top: 2mm;
      font-weight: 400;
    }

    .supplement-link {
      margin-top: 2mm;
    }

    .supplement-link a {
      color: #2D6A4F;
      text-decoration: none;
      font-size: 9pt;
      font-weight: 500;
    }

    .supplement-disclaimer {
      font-size: 7.5pt;
      color: #999;
      margin-top: 3mm;
      padding-top: 2mm;
      border-top: 1px solid #eee;
      font-weight: 300;
      line-height: 1.4;
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
      unicode-bidi: bidi-override;
      direction: rtl;
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
      unicode-bidi: bidi-override;
      direction: rtl;
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

  <!-- Unified Tips Page (YouTube/podcast + sleep + movement + golden tip) -->
  ${(() => {
    const tp = editorial.tips_page || {};
    // youtube_tips: array of { title, text } objects (new) or strings (legacy fallback)
    const ytTipsRaw = (tp.youtube_tips && tp.youtube_tips.length > 0)
      ? tp.youtube_tips
      : youtube_tips.filter(t => t.tip && t.tip.length > 10).slice(0, 3).map(t => ({
          title: `\u05D8\u05D9\u05E4 \u05DE\u05D4\u05E2\u05E8\u05D5\u05E5 ${t.title || 'Huberman Lab'}`,
          text: t.tip
        }));
    const ytTips = ytTipsRaw.map(t => typeof t === 'string'
      ? { title: '\u05D8\u05D9\u05E4 \u05DE\u05D4\u05D9\u05D5\u05D8\u05D9\u05D5\u05D1 / \u05D4\u05E4\u05D5\u05D3\u05E7\u05D0\u05E1\u05D8', text: t }
      : t
    );
    const hasTips = tp.sleep || tp.movement || tp.golden_tip || ytTips.length > 0;
    if (!hasTips) return '';
    return `
  <div class="page insights-page">
    <div class="insights-header">
      <div class="insights-label">\u05D2\u05D9\u05DC\u05D9\u05D5\u05DF \u05D6\u05D4 \u00B7 \u05D8\u05D9\u05E4\u05D9\u05DD \u05E9\u05DC \u05D4\u05D2\u05D9\u05DC\u05D9\u05D5\u05DF</div>
      <h2 class="insights-title">\u05D4\u05D8\u05D9\u05E4\u05D9\u05DD \u05E9\u05DC\u05E0\u05D5</h2>
    </div>

    ${ytTips.map(tip => `
    <div class="insight-card">
      <div class="insight-icon">&#x25B6;</div>
      <div class="insight-content">
        <div class="insight-section-title">${tip.title}</div>
        <div class="insight-text">${tip.text}</div>
      </div>
    </div>`).join('')}

    ${tp.sleep ? `
    <div class="insight-card">
      <div class="insight-icon">&#x1F319;</div>
      <div class="insight-content">
        <div class="insight-section-title">\u05E9\u05D9\u05E0\u05D4 \u05D8\u05D5\u05D1\u05D4</div>
        <div class="insight-text">${tp.sleep}</div>
      </div>
    </div>` : ''}

    ${tp.movement ? `
    <div class="insight-card">
      <div class="insight-icon">&#x1F3C3;</div>
      <div class="insight-content">
        <div class="insight-section-title">\u05EA\u05E0\u05D5\u05E2\u05D4</div>
        <div class="insight-text">${tp.movement}</div>
      </div>
    </div>` : ''}

    ${tp.golden_tip ? `
    <div class="golden-tip-box">
      <div class="golden-tip-label">&#x2728; \u05D4\u05D8\u05D9\u05E4 \u05D4\u05D6\u05D4\u05D1 \u05E9\u05DC \u05D4\u05D2\u05D9\u05DC\u05D9\u05D5\u05DF</div>
      <div class="golden-tip-text">${tp.golden_tip}</div>
    </div>` : ''}
  </div>`;
  })()}

  <!-- Supplements Page -->
  ${supplements.length > 0 ? `
  <div class="page supplements-page">
    <div class="section-label">\u05EA\u05D5\u05E1\u05E4\u05D9 \u05EA\u05D6\u05D5\u05E0\u05D4</div>
    <h2>\u05D4\u05DE\u05D5\u05DE\u05DC\u05E6\u05D9\u05DD \u05D4\u05E9\u05D1\u05D5\u05E2</h2>
    ${supplements.map((s) => {
      const suppTip = s.hebrew_description || s.description || '';
      const absorptionNote = s.absorption_note || '';
      const connectionToRecipes = s.connection_to_recipes || '';
      const bestseller = s.bestseller_note || '';
      const whereToBuy = s.where_to_buy || '';
      const disclaimer = s.disclaimer || '';
      return `
      <div class="supplement-card">
        ${s.image ? `<img class="supplement-image" src="${s.image}" alt="${s.name}" />` : ''}
        <div class="supplement-info">
          <div class="supplement-name">${s.name || ''}</div>
          ${bestseller ? `<div class="supplement-bestseller">&#x2B50; ${bestseller}</div>` : ''}
          <div class="supplement-desc">${suppTip}</div>
          ${absorptionNote ? `<div class="absorption-note">${absorptionNote}</div>` : ''}
          ${connectionToRecipes ? `<div class="supplement-connection">${connectionToRecipes}</div>` : ''}
          ${whereToBuy ? `<div class="supplement-where-to-buy">\u05D0\u05D9\u05E4\u05D4 \u05DC\u05E7\u05E0\u05D5\u05EA: ${whereToBuy}</div>` : ''}
          ${s.url ? `<div class="supplement-link"><a href="${s.url}">\u05DC\u05DE\u05D5\u05E6\u05E8 \u2190</a></div>` : ''}
          ${s.price ? `<div class="supplement-price">${s.price}</div>` : ''}
          ${disclaimer ? `<div class="supplement-disclaimer">${disclaimer}</div>` : ''}
        </div>
      </div>
    `;}).join('')}
  </div>
  ` : ''}

</body>
</html>`;
}

module.exports = { generatePdf };
