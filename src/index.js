const express = require('express');
const path = require('path');
const fs = require('fs');
const { generatePdf } = require('./generator');

const app = express();
app.use(express.json({ limit: '10mb' }));

const API_KEY = process.env.PDF_SERVICE_API_KEY;
const PDF_DIR = '/tmp/pdfs';

// Ensure PDF directory exists
if (!fs.existsSync(PDF_DIR)) {
  fs.mkdirSync(PDF_DIR, { recursive: true });
}

function auth(req, res, next) {
  const token = req.headers['x-api-key'];
  if (token !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.get('/pdfs/:filename', (req, res) => {
  const filename = path.basename(req.params.filename); // prevent path traversal
  const filepath = path.join(PDF_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'PDF not found' });
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.sendFile(filepath);
});

app.post('/generate', auth, async (req, res) => {
  try {
    const content = req.body;

    if (!content.recipes || content.recipes.length === 0) {
      return res.status(400).json({ error: 'No recipes in content object' });
    }

    const pdfBuffer = await generatePdf(content);

    const date = new Date().toISOString().slice(0, 10);
    const filename = `magazine-${date}.pdf`;
    const filepath = path.join(PDF_DIR, filename);

    fs.writeFileSync(filepath, pdfBuffer);

    const baseUrl = process.env.SERVICE_URL || `https://wellness-pdf-service-production.up.railway.app`;
    const url = `${baseUrl}/pdfs/${filename}`;

    console.log(`[PDF Service] Generated: ${url} (${Math.round(pdfBuffer.length / 1024)}KB)`);

    res.json({ url, filename, size_bytes: pdfBuffer.length });
  } catch (err) {
    console.error('[PDF Service]', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`PDF service running on port ${PORT}`));
