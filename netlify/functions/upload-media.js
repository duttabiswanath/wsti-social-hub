/**
 * Netlify Function: upload-media
 * Uploads a media file to Google Drive using a Service Account.
 *
 * Required env vars (set in Netlify → Site settings → Environment variables):
 *   GOOGLE_SERVICE_ACCOUNT_JSON  — full contents of the service account key JSON
 *   GOOGLE_DRIVE_FOLDER_ID       — Google Drive folder ID to upload into
 *
 * Setup steps:
 *   1. Create a Service Account in Google Cloud Console
 *   2. Download its JSON key file
 *   3. Paste the entire JSON content into GOOGLE_SERVICE_ACCOUNT_JSON
 *   4. Share your Google Drive folder with the service account email (Editor access)
 */

const { google } = require('googleapis');
const Busboy = require('busboy');
const { Readable } = require('stream');

function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return reject(new Error('Expected multipart/form-data'));
    }

    const busboy = Busboy({ headers: { 'content-type': contentType } });
    let fileBuffer = null;
    let fileName = 'upload';
    let mimeType = 'application/octet-stream';

    busboy.on('file', (_field, fileStream, info) => {
      fileName = info.filename || 'upload';
      mimeType = info.mimeType || 'application/octet-stream';
      const chunks = [];
      fileStream.on('data', (c) => chunks.push(c));
      fileStream.on('end', () => { fileBuffer = Buffer.concat(chunks); });
    });

    busboy.on('finish', () => resolve({ fileBuffer, fileName, mimeType }));
    busboy.on('error', reject);

    const body = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body || '');

    busboy.write(body);
    busboy.end();
  });
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // ── Check service account is configured ──────────────────────────────────
  const serviceAccountRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountRaw) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: 'Google Drive is not configured for this deployment.',
        hint: 'Add GOOGLE_SERVICE_ACCOUNT_JSON to Netlify → Site settings → Environment variables, then share your Drive folder with the service account email.',
      }),
    };
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountRaw);
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || null;

    // ── Parse the uploaded file ───────────────────────────────────────────
    const { fileBuffer, fileName, mimeType } = await parseMultipart(event);
    if (!fileBuffer || fileBuffer.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No file received.' }) };
    }

    // ── Authenticate with service account ────────────────────────────────
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
    const drive = google.drive({ version: 'v3', auth });

    // ── Upload to Drive ───────────────────────────────────────────────────
    const uploadRes = await drive.files.create({
      requestBody: {
        name: fileName,
        ...(folderId ? { parents: [folderId] } : {}),
      },
      media: { mimeType, body: Readable.from(fileBuffer) },
      fields: 'id,name,mimeType',
    });

    const fileId = uploadRes.data.id;
    const fileMime = uploadRes.data.mimeType || mimeType;

    // Make the file publicly readable so Blotato can fetch it
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    // Return the right URL format based on file type
    const isImage = fileMime.startsWith('image/');
    const url = isImage
      ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`
      : `https://drive.google.com/uc?id=${fileId}&export=download`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, url, fileId, fileName }),
    };
  } catch (err) {
    console.error('[upload-media]', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Upload failed.' }),
    };
  }
};
