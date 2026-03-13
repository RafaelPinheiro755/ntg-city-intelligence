export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_KEY;

  if (!SB_URL || !SB_KEY) {
    return res.status(500).json({ error: 'Supabase credentials not configured' });
  }

  const headers = {
    'apikey': SB_KEY,
    'Authorization': `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json',
  };

  async function query(table, params = '') {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, { headers });
      if (!r.ok) return [];
      return r.json();
    } catch {
      return [];
    }
  }

  try {
    const [clientes, perguntas, pins, chats] = await Promise.all([
      query('clientes_teresa', 'select=session_id,nome,idioma,companhia,area_estadia,dados,created_at&order=created_at.desc'),
      query('ntg_perguntas', 'select=*&order=created_at.desc'),
      query('pins_coimbra', 'select=id,nome,tipo,categoria,localizacao,faixa_preco&order=id'),
      query('chats_teresa', 'select=id&limit=1'),
    ]);

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return res.status(200).json({ clientes, perguntas, pins, chats_count: chats.length });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch data', detail: err.message });
  }
}
