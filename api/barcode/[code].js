export default async function handler(req, res) {
  // Configurar CORS para permitir requisições do frontend
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder OPTIONS para CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { code } = req.query;
  const COSMOS_TOKEN = 'vezJrJ3VNkeIEu4D9K8LZw';

  if (!code) {
    return res.status(400).json({ error: 'Código de barras não fornecido' });
  }

  try {
    // Consulta à API Cosmos
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
        error: 'Produto não encontrado na base Cosmos',
        code: code 
      });
    }

    const data = await response.json();

    // Detecta se é embalagem múltipla/caixa
    const isBox = data.gtin_type === 'DUN-14' || 
                  data.gtin_type === 'GTIN-14' || 
                  data.description?.toLowerCase().includes('caixa') ||
                  data.description?.toLowerCase().includes('cx ') ||
                  data.description?.toLowerCase().includes('fardo') ||
                  data.description?.toLowerCase().includes('display') ||
                  (data.gtins && data.gtins.length > 0);

    // Monta o resultado
    const result = {
      gtin: data.gtin || data.ean || code,
      description: data.description || 'Sem descrição',
      brand: data.brand?.name || data.brand || 'Não informado',
      ncm: data.ncm?.code || data.ncm?.full_description || data.ncm,
      cest: data.cest?.code || data.cest,
      avg_price: data.avg_price,
      width: data.width,
      height: data.height,
      length: data.length,
      net_weight: data.net_weight,
      gross_weight: data.gross_weight,
      type: isBox ? 'box' : 'unit',
      gtin_type: data.gtin_type || 'EAN-13',
      source: 'Cosmos (Bluesoft)'
    };

    // Se for caixa, tenta encontrar o código interno
    if (isBox) {
      if (data.gtins && data.gtins.length > 0) {
        result.innerBarcode = data.gtins[0];
        result.quantity = data.quantity || 'Consultar embalagem';
      } else if (data.gtin_unit) {
        result.innerBarcode = data.gtin_unit;
        result.quantity = data.quantity || 'Consultar embalagem';
      } else if (data.contents && data.contents.length > 0) {
        result.innerBarcode = data.contents[0].gtin;
        result.quantity = data.contents[0].quantity || 'Consultar embalagem';
      }
    }

    res.status(200).json(result);

  } catch (error) {
    console.error('Erro ao consultar API Cosmos:', error);
    res.status(500).json({ 
      error: 'Erro ao consultar API',
      message: error.message 
    });
  }
}
