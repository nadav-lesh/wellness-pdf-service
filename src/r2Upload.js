const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

async function uploadToR2(buffer, filename) {
  const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
  const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
  const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
  const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'wellness-magazine';
  const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

  console.log('[R2] account:', R2_ACCOUNT_ID, 'bucket:', R2_BUCKET_NAME, 'keyId:', R2_ACCESS_KEY_ID?.slice(0, 8));

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: filename,
    Body: buffer,
    ContentType: 'application/pdf',
  });

  await client.send(command);

  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL.replace(/\/$/, '')}/${filename}`;
  }

  const getCommand = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: filename,
  });

  const signedUrl = await getSignedUrl(client, getCommand, { expiresIn: 604800 });
  return signedUrl;
}

module.exports = { uploadToR2 };
