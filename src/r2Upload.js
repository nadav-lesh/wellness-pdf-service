const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'wellness-magazine';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // e.g. https://pub-xxx.r2.dev

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function uploadToR2(buffer, filename) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: filename,
    Body: buffer,
    ContentType: 'application/pdf',
  });

  await client.send(command);

  // If a public R2.dev URL is configured, use it directly
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL.replace(/\/$/, '')}/${filename}`;
  }

  // Otherwise generate a 7-day pre-signed URL
  const getCommand = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: filename,
  });

  const signedUrl = await getSignedUrl(client, getCommand, { expiresIn: 604800 });
  return signedUrl;
}

module.exports = { uploadToR2 };
