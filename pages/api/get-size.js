import { callSupabaseRpc } from '../../lib/serverSupabase'

export default async function handler(req, res) {
  try {
    // A secure approach as recommended by the plan: rely on an RPC `get_log_excerpts_size` instead of raw SQL via REST
    // We will create this RPC via the dashboard or setup scripts.
    const result = await callSupabaseRpc(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      'get_log_excerpts_size',
      {}
    );
    
    // Result should be the size string.
    return res.status(200).json({ total_size: result });
  } catch (e) {
    console.error(e);
    // Return fallback error or "Unknown"
    return res.status(500).json({ error: String(e), total_size: 'Unknown' });
  }
}
