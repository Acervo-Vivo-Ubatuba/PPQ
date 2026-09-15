import fs from 'node:fs';
import path from 'node:path';

const config = {
  workshopToken: process.env.WORKSHOP_TOKEN || 'oficina2026',
  attributionText: '#acervovivoubatuba',
  licenseText: 'CC-BY 4.0',
  title: 'Acervo Vivo — Oficina de Criação',
  subtitle: 'Paz Para Quem? — Registros Fotográficos'
};

const DATA_FILE = path.join('/tmp', 'annotations.json');

// Initialize with repo data if available
function getAnnotations() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '[]');
    }
  } catch (e) {}
  return [];
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-workshop-token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (pathname.endsWith('/config')) {
    return res.status(200).json({
      title: config.title,
      subtitle: config.subtitle,
      attributionText: config.attributionText,
      licenseText: config.licenseText
    });
  }

  if (pathname.endsWith('/verify-token')) {
    const token = req.headers['x-workshop-token'] || url.searchParams.get('token');
    return res.status(200).json({ valid: token === config.workshopToken });
  }

  if (pathname.endsWith('/images')) {
    // Return the list of 31 workshop images
    const imagesDir = path.join(process.cwd(), 'public', 'images');
    let images = [];
    if (fs.existsSync(imagesDir)) {
      images = fs.readdirSync(imagesDir)
        .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
        .sort()
        .map(filename => ({
          id: filename.replace(/\.[^.]+$/, ''),
          filename,
          url: `/images/${filename}`
        }));
    }
    return res.status(200).json({ images });
  }

  if (pathname.endsWith('/annotations') && req.method === 'GET') {
    const annotations = getAnnotations();
    const imageId = url.searchParams.get('imageId');
    if (imageId) {
      return res.status(200).json({
        annotations: annotations.filter(a => a.imageId === imageId)
      });
    }
    return res.status(200).json({ annotations });
  }

  if (pathname.endsWith('/annotations') && req.method === 'POST') {
    const token = req.headers['x-workshop-token'] || url.searchParams.get('token');
    if (token !== config.workshopToken) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const payload = req.body;
    const annotations = getAnnotations();
    const newEntry = {
      id: payload.id || `ann_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      imageId: payload.imageId,
      author: (payload.author || 'Participante').trim(),
      balloons: payload.balloons || [],
      updatedAt: new Date().toISOString()
    };

    const existingIdx = annotations.findIndex(a => a.id === newEntry.id);
    if (existingIdx >= 0) {
      annotations[existingIdx] = newEntry;
    } else {
      annotations.push(newEntry);
    }

    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(annotations, null, 2), 'utf8');
    } catch (e) {}

    return res.status(200).json({ success: true, annotation: newEntry });
  }

  if (pathname.endsWith('/registros.md')) {
    const annotations = getAnnotations();
    const nowStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    let md = `# 📜 Acervo Vivo — Registro de Falas e Intervenções dos Participantes\n\n`;
    md += `> **Projeto:** Acervo Vivo Ubatuba (#acervovivoubatuba)\n`;
    md += `> **Última Atualização:** ${nowStr} (Horário de Brasília)\n\n---\n\n`;
    md += `## 💬 Tabela de Textos Inseridos por Participantes\n\n`;
    md += `| Data / Hora | Participante | Fotografia | Tipo | Texto Inserido |\n`;
    md += `| :--- | :--- | :--- | :---: | :--- |\n`;
    annotations.forEach(ann => {
      const dt = ann.updatedAt ? new Date(ann.updatedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '';
      if (Array.isArray(ann.balloons)) {
        ann.balloons.forEach(b => {
          const type = b.type === 'thought' ? '💭 Pensamento' : '💬 Fala';
          const txt = (b.text || '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
          md += `| ${dt} | **${ann.author}** | \`${ann.imageId}.jpg\` | ${type} | "${txt}" |\n`;
        });
      }
    });
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    return res.status(200).send(md);
  }

  return res.status(404).json({ error: 'Endpoint não encontrado' });
}
