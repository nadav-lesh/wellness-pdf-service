const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

async function uploadToR2(buffer, filename) {
  // Read env vars at call time — avoids module-load timing issues on Railway
  const accountId = (process.env.R2_ACCOUNT_ID || '').trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucket = (process.env.R2_BUCKET_NAME || 'wellness-magazine').trim();
  const publicUrl = process.env.R2_PUBLIC_URL;

  console.log(`[R2] accountId=${accountId ? `set(len=${accountId.length})` : 'MISSING'} accessKeyId=${accessKeyId ? `set(len=${accessKeyId.length})` : 'MISSING'} secretAccessKey=${secretAccessKey ? `set(len=${secretAccessKey.length})` : 'MISSING'}`);

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(`Missing R2 credentials: accountId=${!!accountId} accessKeyId=${!!accessKeyId} secretAccessKey=${!!secretAccessKey}`);
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: async () => ({ accessKeyId, secretAccessKey }),
  });

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: filename,
    Body: buffer,
    ContentType: 'application/pdf',
  });

  await client.send(command);

  if (publicUrl) {
    return `${publicUrl.replace(/\/$/, '')}/${filename}`;
  }

  const getCommand = new PutObjectCommand({ Bucket: bucket, Key: filename });
  const signedUrl = await getSignedUrl(client, getCommand, { expiresIn: 604800 });
  return signedUrl;
}

module.exports = { uploadToR2 };
