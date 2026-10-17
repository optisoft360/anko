import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import companion from '@uppy/companion';

const app = express();
const port = process.env.PORT || 3020;

// Backend used to verify the caller's token (GET {API}/auth/me/).
const API_BASE = (process.env.ANKO_API_BASE || process.env.VITE_API_BASE || 'http://127.0.0.1:8000/api').replace(/\/$/, '');

// Must match UPLOAD_ALLOWED_EXTENSIONS in the backend (api/services/file_validation.py).
const ALLOWED_EXTENSIONS = new Set(
    (process.env.UPLOAD_ALLOWED_EXTENSIONS || 'pdf,docx,xlsx,pptx,txt,md,markdown')
        .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
);

// Short cache so every multipart part request doesn't hit the backend.
const TOKEN_CACHE_MS = 60 * 1000;
const tokenCache = new Map();

async function resolveUserId(authHeader) {
    const cached = tokenCache.get(authHeader);
    if (cached && cached.expires > Date.now()) return cached.userId;

    const res = await fetch(`${API_BASE}/auth/me/`, { headers: { Authorization: authHeader, Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const userId = data && Number.isInteger(data.id) ? data.id : null;
    if (userId) tokenCache.set(authHeader, { userId, expires: Date.now() + TOKEN_CACHE_MS });
    return userId;
}

// Every Companion call must come from a logged-in Ankard user.
async function requireAnkardUser(req, res, next) {
    if (req.method === 'OPTIONS') return next(); // CORS preflight
    const auth = req.get('authorization') || '';
    if (!/^Token [A-Za-z0-9]+$/.test(auth)) return res.status(401).json({ error: 'Authentication required' });
    try {
        const userId = await resolveUserId(auth);
        if (!userId) return res.status(401).json({ error: 'Invalid token' });
        req.ankardUserId = userId;
        return next();
    } catch (err) {
        console.error('[Companion] token check failed:', err.message);
        return res.status(503).json({ error: 'Authentication service unavailable' });
    }
}

function fileExtension(filename) {
    const parts = String(filename || '').toLowerCase().split('.');
    return parts.length > 1 ? parts.pop() : '';
}

const options = {
    s3: {
        endpoint: process.env.SUPABASE_S3_ENDPOINT,
        region: process.env.SUPABASE_S3_REGION,
        bucket: process.env.SUPABASE_S3_BUCKET,
        key: process.env.SUPABASE_S3_ACCESS_KEY,
        secret: process.env.SUPABASE_S3_SECRET_KEY,
        forcePathStyle: true,
        // Uploads land in quarantine: the backend validates the object on /documents/register/
        // and deletes it if rejected. The key never uses the client's file name or user id.
        getKey: (req, filename, metadata) => {
            const ext = fileExtension(filename);
            if (!ALLOWED_EXTENSIONS.has(ext)) throw new Error('File type not supported');
            const userId = req.ankardUserId;
            const rawProject = String((metadata || {}).project_id || '');
            const projectId = /^\d+$/.test(rawProject) ? rawProject : 'unknown';
            const key = `documents/${userId}/${projectId}/${crypto.randomUUID().replace(/-/g, '')}.${ext}`;
            console.log(`[Companion] S3 Key: ${key}`);
            return key;
        }
    },
    server: {
        host: process.env.COMPANION_DOMAIN || ('localhost:' + port),
        protocol: process.env.COMPANION_PROTOCOL || 'http',
    },
    corsOrigins: process.env.COMPANION_CORS_ORIGINS ? process.env.COMPANION_CORS_ORIGINS.split(',') : true,
    uploadUrls: ['http://localhost:' + port],
    filePath: process.env.VERCEL ? '/tmp' : 'uploads',
    secret: process.env.COMPANION_SECRET || crypto.randomBytes(32).toString('hex'),
    debug: process.env.COMPANION_DEBUG === 'true'
};

const { app: companionApp } = companion.app(options);
app.use('/companion', requireAnkardUser, companionApp);

// Error Handler
app.use((err, req, res, next) => {
    console.error('[Companion Global Error]:', err);
    if (!res.headersSent) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Companion is alive' });
});

// Export app for Vercel
export default app;

// Only listen if run directly (not imported as a module)
if (import.meta.url === `file://${process.argv[1]}`) {
    const server = app.listen(port, '127.0.0.1', () => {
        console.log(`Uppy Companion integrated running on http://127.0.0.1:${port}`);
    });

    companion.socket(server);
}
