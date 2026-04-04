const path = require('path');
const fs = require('fs');

const PDF_DIR = '/tmp/pdfs';

async function uploadToR2(buffer, filename) {
  if (!fs.existsSync(PDF_DIR)) {
    fs.mkdirSync(PDF_DIR, { recursive: true });
  }

  const filepath = path.join(PDF_DIR, filename);
  fs.writeFileSync(filepath, buffer);

  const baseUrl = process.env.SERVICE_URL || 'https://wellness-pdf-service-production.up.railway.app';
  const url = `${baseUrl}/pdfs/${filename}`;

  console.log(`[R2] Saved locally: ${url}`);
  return url;
}

module.exports = { uploadToR2 };
