export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const SB_KEY = process.env.SUPABASE_KEY;

  if (!SB_URL || !SB_KEY) {
    return res.status(500).json({
      error: 'Supabase credentials not configured',
      has_url: !!SB_URL,
      has_key: !!SB_KEY,
      url_preview: SB_URL ? SB_URL.substring(0, 30) + '...' : null,
    });
  }

  const baseUrl = SB_URL.includes('/rest/v1') ? SB_URL : `${SB_URL}/rest/v1`;

  const headers = {
    'apikey': SB_KEY,
    'Authorization': `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json',
  };

  const errors = [];

  async function query(table, params = '') {
    const url = `${baseUrl}/${table}?${params}`;
    try {
      const r = await fetch(url, { headers });
      if (!r.ok) {
        const body = await r.text();
        errors.push({ table, status: r.status, body: body.substring(0, 200) });
        return [];
      }
      return r.json();
    } catch (err) {
      errors.push({ table, error: err.message });
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
    return res.status(200).json({
      clientes,
      perguntas,
      pins,
      chats_count: chats.length,
      _debug: errors.length > 0 ? { errors, base_url: baseUrl } : undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch data', detail: err.message });
  }
}
