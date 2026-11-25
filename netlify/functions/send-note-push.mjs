import webPush from 'web-push';
import { checkedSubscription, pushDatabase, vapid } from '../lib/push.mjs';

export const config = { schedule: '* * * * *' };

export default async function handler() {
  const db = pushDatabase();
  if (!db) return new Response(null, { status: 204 });
  const { data, error } = await db.rpc('hamyad_pending_pushes');
  if (error) throw new Error('Could not load pending note notifications');

  const deliver = async ({ id, subscription, revision, unread }) => {
    const devices = db.from('hamyad_push_devices');
    const valid = checkedSubscription(subscription);
    if (!valid) return;
    let fields;
    try {
      await webPush.sendNotification(valid, JSON.stringify({ id, unread }), {
        vapidDetails: vapid, TTL: 3600, topic: 'hamyad-notes', timeout: 5000,
      });
      fields = { delivered_revision: revision };
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        const removed = await devices.delete().eq('id', id);
        if (removed.error) throw new Error('Could not remove expired push subscription');
        return;
      }
      fields = { retry_at: new Date(Date.now() + 15 * 60_000).toISOString() };
    }
    const updated = await devices.update(fields).eq('id', id).eq('revision', revision);
    if (updated.error) throw new Error('Could not update push delivery state');
  };
  for (let i = 0; i < data.length; i += 20) await Promise.all(data.slice(i, i + 20).map(deliver));
  return new Response(null, { status: 204 });
}
