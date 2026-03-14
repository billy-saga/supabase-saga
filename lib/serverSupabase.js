export async function callSupabaseRpc(supabaseUrl, serviceKey, rpcName, payload) {
  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/${rpcName}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload || {})
  });
  
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`RPC ${rpcName} failed: ${res.status} ${text}`);
  }
  
  try { 
    return JSON.parse(text); 
  } catch (err) { 
    return text; 
  }
}
