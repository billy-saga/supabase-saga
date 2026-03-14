import { callSupabaseRpc } from '../../lib/serverSupabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const ADMIN_EMAILS = (process.env.MC_ADMIN_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean);
  const { email } = req.body || {};

  if (!email || !ADMIN_EMAILS.includes(email)) {
    return res.status(403).json({ error: 'forbidden' });
  }

  try {
    const batch_size = 1000;
    const retention_days = Number(process.env.MC_RETENTION_DAYS || 90);
    
    const result = await callSupabaseRpc(
      process.env.NEXT_PUBLIC_SUPABASE_URL, 
      process.env.SUPABASE_SERVICE_ROLE_KEY, 
      'clean_old_log_excerpts', 
      { batch_size, retention_days }
    );
    
    return res.status(200).json({ result });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
