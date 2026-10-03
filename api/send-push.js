import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BOp27UIBW58VaFiys4g6ZRriVYdTncjzYRUgst5kIAh-o54ufVQ1M_HjZj8vgzhgqvfdu9WgEc-eaSNl-g-Sm30';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '58RnWMOhFFIwefG2OfppeUbl25ShN5yiUmU0TRFVAk4';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'syamsuddin.wisnubroto@sd.itera.ac.id';

webpush.setVapidDetails(`mailto:${VAPID_EMAIL}`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(
  'https://cgqbjtnrcfqvjtzzxffm.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNncWJqdG5yY2Zxdmp0enp4ZmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NDM3NjksImV4cCI6MjEwNjMxOTc2OX0._BuHkM2zFF2Y07iQeVFrsUu-mB23SJhi330Iw7NFfn0'
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { dosen_name, title, body } = req.body;
  if (!dosen_name) return res.status(400).json({ error: 'Missing dosen_name' });

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('subscription, endpoint')
    .eq('dosen_name', dosen_name);

  if (error) return res.status(500).json({ error: error.message });
  if (!subs || subs.length === 0) return res.status(200).json({ sent: 0 });

  const payload = JSON.stringify({
    title: title || 'Laporan Masuk',
    body: body || 'Ada laporan bimbingan baru yang masuk.',
    tag: 'laporan-masuk',
    url: '/',
  });

  let sent = 0;
  const expired = [];
  for (const row of subs) {
    try {
      await webpush.sendNotification(row.subscription, payload);
      sent++;
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        expired.push(row.endpoint);
      }
    }
  }

  if (expired.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expired);
  }

  return res.status(200).json({ sent });
}
