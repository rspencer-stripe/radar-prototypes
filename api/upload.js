const { put } = require('@vercel/blob');
const crypto = require('crypto');
const { withErrorHandling } = require('../lib/handler');

const EXT_BY_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

module.exports = withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const { dataUrl } = req.body || {};
  const match = /^data:(image\/[a-z]+);base64,(.+)$/i.exec(dataUrl || '');
  if (!match) {
    res.status(400).json({ error: 'dataUrl must be a base64 image data URL' });
    return;
  }

  const [, contentType, base64] = match;
  const ext = EXT_BY_TYPE[contentType.toLowerCase()] || 'jpg';
  const buffer = Buffer.from(base64, 'base64');

  // Base64 inflates payload size ~33%; keep the decoded cap well under
  // Vercel's ~4.5MB request body limit so our error beats the platform's.
  const MAX_BYTES = 3 * 1024 * 1024;
  if (buffer.length > MAX_BYTES) {
    res.status(413).json({ error: 'image must be smaller than 3MB' });
    return;
  }

  const pathname = `images/${crypto.randomUUID()}.${ext}`;

  const { url } = await put(pathname, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
  });

  res.status(200).json({ url });
});
