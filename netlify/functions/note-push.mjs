import { checkedSubscription, pushDatabase, subscriptionId, vapid } from '../lib/push.mjs';

const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export default async function handler(request) {
  const db = pushDatabase();
  if (!db) return json({ error: 'unavailable' }, 503);
  if (request.method === 'GET') return json({ publicKey: vapid.publicKey });
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'content_type' }, 415);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'origin' }, 403);
  const text = await request.text();
  if (text.length > 4096) return json({ error: 'too_large' }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return json({ error: 'invalid_json' }, 400); }
  const devices = db.from('hamyad_push_devices');
  if (body?.action === 'count') {
    if (typeof body.id !== 'string' || !/^[a-f0-9]{64}$/.test(body.id)) return json({ error: 'id' }, 400);
    const { data, error } = await devices.select('unread').eq('id', body.id).maybeSingle();
    return error ? json({ error: 'database' }, 503) : json({ unread: data?.unread ?? 0 });
  }
  const subscription = checkedSubscription(body?.subscription);
  if (!subscription) return json({ error: 'subscription' }, 400);
  const id = subscriptionId(subscription);
  let result;
  switch (body.action) {
    case 'subscribe':
      result = await devices.upsert({ id, subscription }, { onConflict: 'id', ignoreDuplicates: true, defaultToNull: false });
      break;
    case 'unsubscribe':
      result = await devices.delete().eq('id', id);
      break;
    case 'read':
      result = await devices.update({ unread: 0 }).eq('id', id).gt('unread', 0);
      break;
    default:
      return json({ error: 'action' }, 400);
  }
  return result.error ? json({ error: 'database' }, 503) : json({ ok: true });
}
