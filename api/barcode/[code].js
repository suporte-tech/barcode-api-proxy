export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { code } = req.query;
  const COSMOS_TOKEN = 'vezJrJ3VNkeIEu4D9K8LZw';

  if (!code) {
    return res.status(400).json({ error: 'Código não fornecido' });
  }

  try {
    const response = await fetch(
      `https://api.cosmos.bluesoft.com.br/gtins/${code}.json`,
      {
        headers: {
          'X-Cosmos-Token': COSMOS_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      return res.status(404).json({ 
        error: 'Produto não encontrado',
        code: code 
      });
    }

    const data = await response.json();

    const isBox = data.gtin_type === 'DUN-14' || 
                  data.gtin_type === 'GTIN-14' || 
                  data.description?.toLowerCase().includes('caixa') ||
                  data.description?.toLowerCase().includes('cx ') ||
                  (data.gtins && data.gtins.length > 0);

    const result = {
      gtin: data.gtin || data.ean || code,
      description: data.description || 'Sem descrição',
      brand: data.brand?.name || data.brand || 'Não informado',
      ncm: data.ncm?.code || data.ncm,
      cest: data.cest?.code || data.cest,
      avg_price: data.avg_price,
      width: data.width,
      height: data.height,
      length: data.length,
      net_weight: data.net_weight,
      type: isBox ? 'box' : 'unit',
      gtin_type: data.gtin_type,
      source: 'Cosmos'
    };

    if (isBox) {
      result.innerBarcode = data.gtins?.[0] || data.gtin_unit;
      result.quantity = data.quantity;
    }

    res.status(200).json(result);

  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao consultar API',
      message: error.message 
    });
  }
}
