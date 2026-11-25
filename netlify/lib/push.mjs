import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export const vapid = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
  subject: process.env.VAPID_SUBJECT,
};

export function pushDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !vapid.publicKey || !vapid.privateKey || !vapid.subject) {
    const missing = [
      !url && 'NEXT_PUBLIC_SUPABASE_URL',
      !key && 'SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)',
      !vapid.publicKey && 'VAPID_PUBLIC_KEY',
      !vapid.privateKey && 'VAPID_PRIVATE_KEY',
      !vapid.subject && 'VAPID_SUBJECT',
    ].filter(Boolean);
    console.warn('Web Push: missing runtime environment variables:', missing.join(', '));
    return null;
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function keyOfSize(value, size) {
  if (typeof value !== 'string' || value.length > 90 || !/^[\w-]+$/.test(value)) return false;
  const bytes = Buffer.from(value, 'base64url');
  return bytes.length === size && bytes.toString('base64url') === value;
}

export function checkedSubscription(input) {
  if (typeof input?.endpoint !== 'string' || input.endpoint.length > 2500) return null;
  const { auth, p256dh } = input.keys ?? {};
  if (!keyOfSize(auth, 16) || !keyOfSize(p256dh, 65)) return null;
  let url;
  try { url = new URL(input.endpoint); } catch { return null; }
  if (url.protocol !== 'https:' || url.port || url.username || url.password || url.hash) return null;
  // Only send to known browser push services, never to user-chosen hosts.
  const host = url.hostname;
  if (!['fcm.googleapis.com', 'updates.push.services.mozilla.com'].includes(host)
    && !/^[a-z0-9-]+\.(push\.apple\.com|notify\.windows\.com|wns\.windows\.com)$/.test(host)) return null;
  return { endpoint: url.href, keys: { auth, p256dh } };
}

export function subscriptionId(subscription) {
  return createHash('sha256').update(JSON.stringify(subscription)).digest('hex');
}
