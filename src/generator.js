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
  const { issue_theme, cover_image_url, recipes = [], processed_at } = content;

  const issueDate = new Date(processed_at || Date.now()).toLocaleDateString('he-IL', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const recipesHtml = recipes.map((r, i) => `
    <div class="page recipe-page">
      <div class="recipe-number">מתכון ${['א', 'ב', 'ג'][i] || i + 1}</div>

      ${r.image ? `<img class="recipe-image" src="${r.image}" alt="${r.hebrew_title}" />` : ''}

      <h2 class="recipe-title">${r.hebrew_title || ''}</h2>
      <p class="recipe-desc">${r.hebrew_description || ''}</p>

      ${r.hebrew_benefits && r.hebrew_benefits.length > 0 ? `
        <div class="benefits-box">
          <div class="benefits-title">למה זה טוב לך?</div>
          <ul class="benefits-list">
            ${r.hebrew_benefits.map(b => `<li>${b}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${r.macros ? `
        <div class="macros-grid">
          <div class="macro-item">
            <span class="macro-value">${r.macros.calories?.amount || '—'}</span>
            <span class="macro-label">קלוריות</span>
          </div>
          <div class="macro-item">
            <span class="macro-value">${r.macros.protein?.amount || '—'}g</span>
            <span class="macro-label">חלבון</span>
          </div>
          <div class="macro-item">
            <span class="macro-value">${r.macros.carbs?.amount || '—'}g</span>
            <span class="macro-label">פחמימות</span>
          </div>
          <div class="macro-item">
            <span class="macro-value">${r.macros.fat?.amount || '—'}g</span>
            <span class="macro-label">שומן</span>
          </div>
        </div>
      ` : ''}

      <div class="recipe-meta">
        ⏱ ${r.ready_in_minutes || '—'} דקות &nbsp;|&nbsp; 🍽 ${r.servings || '—'} מנות
        ${r.source_url ? `&nbsp;|&nbsp; <a href="${r.source_url}">למתכון המלא ←</a>` : ''}
      </div>
    </div>
  `).join('');

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

    /* ── Cover Page ── */
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

    .magazine-name {
      font-size: 13pt;
      font-weight: 300;
      color: #95D5B2;
      letter-spacing: 3px;
      margin-bottom: 6mm;
      text-transform: uppercase;
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

    /* ── Recipe Pages ── */
    .recipe-page {
      padding: 14mm;
      background: #fafafa;
    }

    .recipe-number {
      font-size: 9pt;
      font-weight: 500;
      color: #52B788;
      letter-spacing: 2px;
      margin-bottom: 4mm;
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

    .benefits-title {
      font-size: 9pt;
      font-weight: 700;
      color: #2D6A4F;
      margin-bottom: 3mm;
      letter-spacing: 1px;
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
      content: '✓ ';
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
      <div class="magazine-name">מגזין הבריאות שלך</div>
      <div class="cover-divider"></div>
      <div class="cover-theme">${issue_theme || 'גיליון חדש'}</div>
      <div class="cover-date">${issueDate}</div>
      <div class="cover-divider"></div>
      <div class="cover-tagline">טיפים פשוטים. שינוי אמיתי.</div>
    </div>
  </div>

  <!-- Recipe Pages -->
  ${recipesHtml}

</body>
</html>`;
}

module.exports = { generatePdf };
