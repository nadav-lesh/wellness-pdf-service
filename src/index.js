const express = require('express');
const { generatePdf } = require('./generator');
const { uploadToR2 } = require('./r2Upload');

const app = express();
app.use(express.json({ limit: '10mb' }));

function auth(req, res, next) {
  const API_KEY = process.env.PDF_SERVICE_API_KEY;
  const token = req.headers['x-api-key'];
  if (!API_KEY) return res.status(500).json({ error: 'PDF_SERVICE_API_KEY not set in environment' });
  if (token !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.post('/generate', auth, async (req, res) => {
  try {
    const content = req.body;

    if (!content.recipes || content.recipes.length === 0) {
      return res.status(400).json({ error: 'No recipes in content object' });
    }

    const pdfBuffer = await generatePdf(content);

    const date = new Date().toISOString().slice(0, 10);
    const filename = `magazine-${date}.pdf`;
    const url = await uploadToR2(pdfBuffer, filename);

    console.log(`[PDF Service] Uploaded: ${url} (${Math.round(pdfBuffer.length / 1024)}KB)`);

    res.json({ url, filename, size_bytes: pdfBuffer.length });
  } catch (err) {
    console.error('[PDF Service]', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`PDF service running on port ${PORT}`);
  console.log(`[env] PDF_SERVICE_API_KEY set: ${!!process.env.PDF_SERVICE_API_KEY}`);
  console.log(`[env] R2_ACCOUNT_ID set: ${!!process.env.R2_ACCOUNT_ID}`);
});
