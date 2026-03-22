/**
 * Netlify Function: drive-upload
 * Uploads a file to Google Drive using a Service Account.
 *
 * Authentication: GOOGLE_SERVICE_ACCOUNT_JSON env var (paste full JSON key content)
 * Folder:         GOOGLE_DRIVE_FOLDER_ID env var
 *
 * The service account email must be shared on the target Drive folder
 * with at least "Editor" access.
 */

const { google } = require('googleapis');
const Busboy = require('busboy');
const { Readable } = require('stream');

// ── Multipart parser ─────────────────────────────────────────────────────────
function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return reject(new Error('Expected multipart/form-data'));
    }

    const busboy = Busboy({ headers: { 'content-type': contentType } });
    const fields = {};
    let fileBuffer = null;
    let fileName = 'upload';
    let mimeType = 'application/octet-stream';

    busboy.on('file', (fieldName, fileStream, info) => {
      fileName = info.filename || fieldName;
      mimeType = info.mimeType || 'application/octet-stream';
      const chunks = [];
      fileStream.on('data', (chunk) => chunks.push(chunk));
      fileStream.on('end', () => { fileBuffer = Buffer.concat(chunks); });
    });

    busboy.on('field', (name, value) => { fields[name] = value; });
    busboy.on('finish', () => resolve({ fields, fileBuffer, fileName, mimeType }));
    busboy.on('error', (err) => reject(err));

    const body = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body || '');

    busboy.write(body);
    busboy.end();
  });
}

// ── Handler ──────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    // ── Validate service account env var ──────────────────────────────────
    const serviceAccountRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountRaw) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Google Drive not configured.',
          hint: 'Add GOOGLE_SERVICE_ACCOUNT_JSON to Netlify → Site settings → Environment variables.',
        }),
      };
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountRaw);
    } catch {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.' }),
      };
    }

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || null;

    // ── Parse uploaded file ───────────────────────────────────────────────
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
    const fileStream = Readable.from(fileBuffer);

    const driveResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        ...(folderId ? { parents: [folderId] } : {}),
      },
      media: {
        mimeType,
        body: fileStream,
      },
      fields: 'id, name, webViewLink, webContentLink',
    });

    const file = driveResponse.data;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        fileId: file.id,
        fileName: file.name,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
      }),
    };
  } catch (err) {
    console.error('[drive-upload]', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Upload failed' }),
    };
  }
};
