/*
  scripts/supabase_cleanup.js
  Uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (GitHub Secrets)
*/
import fetch from 'node-fetch';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RETENTION_DAYS = process.env.RETENTION_DAYS ? parseInt(process.env.RETENTION_DAYS, 10) : 90;
const BATCH_SIZE = process.env.BATCH_SIZE ? parseInt(process.env.BATCH_SIZE, 10) : 1000;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
  process.exit(1);
}

const headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

async function callRpc(name, payload) {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/${name}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`RPC ${name} failed: ${res.status} ${text}`);
  }
  try { return JSON.parse(text); } catch (e) { return text; }
}

(async () => {
  try {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    console.log(`Ensuring partition for ${year}-${String(month).padStart(2,'0')}`);
    const part = await callRpc('create_month_partition', { p_year: year, p_month: month });
    console.log('Partition result:', part);

    console.log('Calling clean_old_log_excerpts RPC...');
    const result = await callRpc('clean_old_log_excerpts', { batch_size: BATCH_SIZE, retention_days: RETENTION_DAYS });
    console.log('Clean result:', result);
    console.log('Done.');
  } catch (err) {
    console.error('Error:', err);
    process.exit(2);
  }
})();
