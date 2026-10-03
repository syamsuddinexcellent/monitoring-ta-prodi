import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cgqbjtnrcfqvjtzzxffm.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNncWJqdG5yY2Zxdmp0enp4ZmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NDM3NjksImV4cCI6MjEwNjMxOTc2OX0._BuHkM2zFF2Y07iQeVFrsUu-mB23SJhi330Iw7NFfn0'
);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { dosen_name, subscription } = req.body;
    if (!dosen_name || !subscription) {
      return res.status(400).json({ error: 'Missing dosen_name or subscription' });
    }
    const endpoint = subscription.endpoint;
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({ dosen_name, endpoint, subscription }, { onConflict: 'endpoint' });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
