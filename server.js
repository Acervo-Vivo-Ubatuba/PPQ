import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Config
const configPath = path.join(__dirname, 'config.json');
let config = {
  workshopToken: 'oficina2026',
  attributionText: '#acervovivoubatuba',
  licenseText: 'CC-BY 4.0',
  title: 'Acervo Vivo — Oficina de Criação',
  subtitle: 'Paz Para Quem? — Registros Fotográficos'
};

if (fs.existsSync(configPath)) {
  try {
    config = { ...config, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
  } catch (e) {
    console.error('Error reading config.json:', e);
  }
}

// Override token from environment if provided
const WORKSHOP_TOKEN = process.env.WORKSHOP_TOKEN || config.workshopToken;
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, 'data', 'annotations.json');
const MARKDOWN_LOG_FILE = path.join(__dirname, 'data', 'registros_participantes.md');
const ROOT_MARKDOWN_FILE = path.join(__dirname, 'REGISTRO_FALAS.md');
const HISTORY_LOG_FILE = path.join(__dirname, 'data', 'historico_envios.md');
const BACKUP_PB_DIR = '/home/felipe/Google Drive/projetos/ubatuba/Paz sem Voz/Paz Para Quem? Registros/F/2026-09-14/PB';
const BACKUP_PB_FILE = path.join(BACKUP_PB_DIR, 'REGISTRO_FALAS.md');
const PUBLIC_DIR = path.join(__dirname, 'public');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'images');

// Ensure data folder and file exist
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function readAnnotations() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const content = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error('Error reading annotations:', err);
    return [];
  }
}

function writeAnnotations(data) {
  const tmpFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpFile, DATA_FILE);
}

function formatDateTime(isoString) {
  try {
    const d = new Date(isoString || Date.now());
    return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return new Date().toLocaleString('pt-BR');
  }
}

function generateMarkdownContent(annotations) {
  const nowStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  // Compute statistics
  const totalEntries = annotations.length;
  let totalBalloons = 0;
  const authorsSet = new Set();
  const imagesSet = new Set();

  annotations.forEach(ann => {
    if (ann.author) authorsSet.add(ann.author);
    if (ann.imageId) imagesSet.add(ann.imageId);
    if (Array.isArray(ann.balloons)) {
      totalBalloons += ann.balloons.length;
    }
  });

  const authorsList = Array.from(authorsSet).join(', ') || 'Nenhum participante ainda';

  let md = `# 📜 Acervo Vivo — Registro de Falas e Intervenções dos Participantes\n\n`;
  md += `> **Projeto:** Acervo Vivo Ubatuba (#acervovivoubatuba)\n`;
  md += `> **Última Atualização:** ${nowStr} (Horário de Brasília)\n`;
  md += `> **Total de Intervenções:** ${totalEntries} | **Total de Balões e Textos:** ${totalBalloons}\n\n`;
  md += `---\n\n`;

  md += `## 📊 Resumo da Oficina\n\n`;
  md += `- **Participantes Ativos (${authorsSet.size}):** ${authorsList}\n`;
  md += `- **Fotografias com Intervenção:** ${imagesSet.size}\n`;
  md += `- **Média de Balões por Intervenção:** ${(totalEntries ? (totalBalloons / totalEntries).toFixed(1) : 0)}\n\n`;
  md += `---\n\n`;

  md += `## 💬 Tabela de Textos Inseridos por Participantes\n\n`;
  md += `| Data / Hora | Participante | Fotografia | Tipo | Texto Inserido | Posição na Imagem |\n`;
  md += `| :--- | :--- | :--- | :---: | :--- | :--- |\n`;

  const allBalloons = [];
  annotations.forEach(ann => {
    const dt = formatDateTime(ann.updatedAt);
    if (Array.isArray(ann.balloons)) {
      ann.balloons.forEach((b, idx) => {
        allBalloons.push({
          date: dt,
          rawDate: ann.updatedAt || '',
          author: ann.author || 'Participante',
          imageId: ann.imageId,
          type: b.type === 'thought' ? '💭 Pensamento' : '💬 Fala',
          text: (b.text || '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|'),
          position: `x: ${b.x}%, y: ${b.y}%`,
          tail: b.tailDirection || 'bottom-left',
          num: idx + 1
        });
      });
    }
  });

  // Sort chronologically descending (newest first)
  allBalloons.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));

  if (allBalloons.length === 0) {
    md += `| - | - | - | - | *Nenhum texto inserido ainda* | - |\n\n`;
  } else {
    allBalloons.forEach(item => {
      md += `| ${item.date} | **${item.author}** | \`${item.imageId}.jpg\` | ${item.type} | "${item.text}" | \`${item.position}\` (ponta: ${item.tail}) |\n`;
    });
    md += `\n`;
  }

  md += `---\n\n`;
  md += `## 🖼️ Diálogos Detalhados por Fotografia\n\n`;

  const byImage = {};
  annotations.forEach(ann => {
    if (!byImage[ann.imageId]) byImage[ann.imageId] = [];
    byImage[ann.imageId].push(ann);
  });

  const sortedImageIds = Object.keys(byImage).sort();

  if (sortedImageIds.length === 0) {
    md += `*Nenhuma imagem possui intervenções registradas ainda.*\n\n`;
  } else {
    sortedImageIds.forEach(imgId => {
      md += `### 📸 Fotografia: \`${imgId}.jpg\`\n\n`;
      const imgAnns = byImage[imgId];
      imgAnns.forEach((ann, idx) => {
        const dt = formatDateTime(ann.updatedAt);
        md += `#### Contribuição #${idx + 1} — **${ann.author}** (*${dt}*)\n`;
        if (!ann.balloons || ann.balloons.length === 0) {
          md += `*(Sem balões adicionados)*\n\n`;
        } else {
          ann.balloons.forEach((b, bIdx) => {
            const icon = b.type === 'thought' ? '💭 Pensamento' : '💬 Fala';
            md += `- **${icon} #${bIdx + 1}:**\n`;
            md += `  > "${b.text || '(vazio)'}"\n`;
            md += `  - *Posição:* \`x: ${b.x}%, y: ${b.y}%\` • *Ponta:* \`${b.tailDirection || 'bottom-left'}\`\n`;
          });
          md += `\n`;
        }
      });
      md += `---\n\n`;
    });
  }

  return md;
}

function writeMarkdownRecords(annotations, latestEntry = null) {
  try {
    const mdContent = generateMarkdownContent(annotations);

    // 1. Write to data/registros_participantes.md
    fs.writeFileSync(MARKDOWN_LOG_FILE, mdContent, 'utf8');

    // 2. Write to REGISTRO_FALAS.md at project root
    fs.writeFileSync(ROOT_MARKDOWN_FILE, mdContent, 'utf8');

    // 3. Append to cumulative history log
    if (latestEntry && Array.isArray(latestEntry.balloons) && latestEntry.balloons.length > 0) {
      const dt = formatDateTime(latestEntry.updatedAt);
      let eventLog = `\n### 📝 Envio em ${dt}\n`;
      eventLog += `- **Participante:** **${latestEntry.author}**\n`;
      eventLog += `- **Fotografia:** \`${latestEntry.imageId}.jpg\`\n`;
      eventLog += `- **ID da Intervenção:** \`${latestEntry.id}\`\n`;
      eventLog += `- **Balões Inseridos (${latestEntry.balloons.length}):**\n`;
      latestEntry.balloons.forEach((b, i) => {
        const icon = b.type === 'thought' ? '💭 Pensamento' : '💬 Fala';
        eventLog += `  ${i + 1}. **[${icon}]** "${b.text || '(sem texto)'}" *(x: ${b.x}%, y: ${b.y}%, ponta: ${b.tailDirection})*\n`;
      });

      if (!fs.existsSync(HISTORY_LOG_FILE)) {
        const initHeader = `# 📜 Histórico Cumulativo de Envios — Acervo Vivo\n> Log em tempo real de cada envio individual realizado por participantes.\n\n---\n`;
        fs.writeFileSync(HISTORY_LOG_FILE, initHeader + eventLog, 'utf8');
      } else {
        fs.appendFileSync(HISTORY_LOG_FILE, eventLog, 'utf8');
      }
    }

    // 4. Mirror to archive folder in Google Drive if it exists
    if (fs.existsSync(BACKUP_PB_DIR)) {
      fs.writeFileSync(BACKUP_PB_FILE, mdContent, 'utf8');
    }
  } catch (err) {
    console.error('Error generating markdown log:', err);
  }
}

// --- GITHUB CLOUD PERSISTENCE SYNC ---
const GITHUB_REPO = process.env.GITHUB_REPO || 'Acervo-Vivo-Ubatuba/PPQ';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

async function syncFileToGitHub(filePathInRepo, contentUtf8, commitMessage) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return false;

  try {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePathInRepo}`;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'AcervoVivo-App',
      'X-GitHub-Api-Version': '2022-11-28'
    };

    let sha = null;
    try {
      const getRes = await fetch(url, { headers });
      if (getRes.ok) {
        const getData = await getRes.json();
        sha = getData.sha;
      }
    } catch (e) {}

    const base64Content = Buffer.from(contentUtf8, 'utf8').toString('base64');
    const body = {
      message: `${commitMessage} [skip render] [skip ci]`,
      content: base64Content,
      branch: GITHUB_BRANCH
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (putRes.ok) {
      console.log(`✓ Sincronizado com GitHub: ${filePathInRepo}`);
      return true;
    } else {
      const errText = await putRes.text();
      console.warn(`Aviso ao enviar ${filePathInRepo} para o GitHub (${putRes.status}):`, errText);
      return false;
    }
  } catch (err) {
    console.warn('Erro ao conectar com API do GitHub:', err.message);
    return false;
  }
}

let isSyncing = false;
let syncQueue = [];

function queueGitHubSync(author, imageId) {
  if (!process.env.GITHUB_TOKEN) return;
  syncQueue.push({ author, imageId });
  processSyncQueue();
}

async function processSyncQueue() {
  if (isSyncing || syncQueue.length === 0) return;
  isSyncing = true;

  try {
    const last = syncQueue[syncQueue.length - 1];
    syncQueue = []; // Coalesce pending updates

    const annotations = readAnnotations();
    const annotationsStr = JSON.stringify(annotations, null, 2);
    const mdStr = fs.existsSync(ROOT_MARKDOWN_FILE) ? fs.readFileSync(ROOT_MARKDOWN_FILE, 'utf8') : '';

    const msg = `Falas de ${last.author || 'Participante'} em ${last.imageId || 'oficina'}`;
    await syncFileToGitHub('data/annotations.json', annotationsStr, msg);
    if (mdStr) {
      await syncFileToGitHub('REGISTRO_FALAS.md', mdStr, msg);
    }
  } catch (err) {
    console.error('Erro na sincronização em background com GitHub:', err);
  } finally {
    isSyncing = false;
    if (syncQueue.length > 0) {
      setTimeout(processSyncQueue, 1500);
    }
  }
}

async function syncFromGitHubOnStartup() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return;

  try {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/data/annotations.json?ref=${GITHUB_BRANCH}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'AcervoVivo-App'
      }
    });

    if (res.ok) {
      const data = await res.json();
      const content = Buffer.from(data.content, 'base64').toString('utf8');
      const remoteAnnotations = JSON.parse(content || '[]');
      if (remoteAnnotations.length > 0) {
        console.log(`✓ Sincronizado do GitHub na inicialização: ${remoteAnnotations.length} intervenções carregadas.`);
        writeAnnotations(remoteAnnotations);
        writeMarkdownRecords(remoteAnnotations);
      }
    }
  } catch (err) {
    console.warn('Aviso: Não foi possível sincronizar do GitHub na inicialização:', err.message);
  }
}

function getImagesList() {
  if (!fs.existsSync(IMAGES_DIR)) return [];
  const files = fs.readdirSync(IMAGES_DIR);
  return files
    .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
    .sort()
    .map(filename => ({
      id: filename.replace(/\.[^.]+$/, ''),
      filename: filename,
      url: `/images/${filename}`
    }));
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-workshop-token, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });
  res.end(JSON.stringify(payload));
}

function serveStaticFile(req, res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;
  const searchParams = parsedUrl.searchParams;

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, x-workshop-token, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    });
    return res.end();
  }

  // --- API ROUTES ---
  if (pathname === '/api/config' && req.method === 'GET') {
    return sendJson(res, 200, {
      title: config.title,
      subtitle: config.subtitle,
      attributionText: config.attributionText,
      licenseText: config.licenseText
    });
  }

  if (pathname === '/api/verify-token') {
    const token = req.headers['x-workshop-token'] || searchParams.get('token');
    const isValid = token === WORKSHOP_TOKEN;
    return sendJson(res, 200, { valid: isValid });
  }

  if (pathname === '/api/images' && req.method === 'GET') {
    const images = getImagesList();
    return sendJson(res, 200, { images });
  }

  if (pathname === '/api/annotations' && req.method === 'GET') {
    const annotations = readAnnotations();
    const imageId = searchParams.get('imageId');
    if (imageId) {
      return sendJson(res, 200, {
        annotations: annotations.filter(a => a.imageId === imageId)
      });
    }
    return sendJson(res, 200, { annotations });
  }

  if (pathname === '/api/annotations' && req.method === 'POST') {
    // Validate Token
    const token = req.headers['x-workshop-token'] || searchParams.get('token');
    if (token !== WORKSHOP_TOKEN) {
      return sendJson(res, 401, {
        error: 'Token inválido ou não fornecido. Apenas participantes autorizados podem salvar intervenções.'
      });
    }

    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 2e6) { // 2MB limit
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (!payload.imageId || !Array.isArray(payload.balloons)) {
          return sendJson(res, 400, { error: 'Payload incompleto (imageId e balloons são obrigatórios)' });
        }

        const annotations = readAnnotations();
        const newEntry = {
          id: payload.id || `ann_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          imageId: payload.imageId,
          author: (payload.author || config.defaultAuthor || 'Participante').trim(),
          title: (payload.title || '').trim(),
          balloons: payload.balloons.map(b => ({
            id: b.id || `b_${Math.random().toString(36).substring(2, 7)}`,
            type: b.type || 'speech', // 'speech' | 'thought' | 'whisper'
            text: b.text || '',
            x: Number(b.x) || 50, // Percentage of image width (0-100)
            y: Number(b.y) || 50, // Percentage of image height (0-100)
            tailDirection: b.tailDirection || 'bottom-left' // 'bottom-left', 'bottom-right', 'top-left', 'top-right'
          })),
          updatedAt: new Date().toISOString()
        };

        // If updating an existing contribution by ID
        const existingIdx = annotations.findIndex(a => a.id === newEntry.id);
        if (existingIdx >= 0) {
          annotations[existingIdx] = newEntry;
        } else {
          annotations.push(newEntry);
        }

        writeAnnotations(annotations);
        writeMarkdownRecords(annotations, newEntry);
        queueGitHubSync(newEntry.author, newEntry.imageId);
        return sendJson(res, 200, { success: true, annotation: newEntry });
      } catch (err) {
        console.error('Error parsing POST /api/annotations:', err);
        return sendJson(res, 400, { error: 'Formato JSON inválido' });
      }
    });
    return;
  }

  // DELETE annotation
  if (pathname === '/api/annotations' && req.method === 'DELETE') {
    const token = req.headers['x-workshop-token'] || searchParams.get('token');
    if (token !== WORKSHOP_TOKEN) {
      return sendJson(res, 401, { error: 'Token inválido' });
    }

    const id = searchParams.get('id');
    const imageId = searchParams.get('imageId');
    const author = (searchParams.get('author') || '').trim().toLowerCase();

    let annotations = readAnnotations();
    const initialLen = annotations.length;

    if (id) {
      annotations = annotations.filter(a => a.id !== id);
    } else if (imageId && author) {
      annotations = annotations.filter(a => !(a.imageId === imageId && (a.author || '').toLowerCase() === author));
    }

    writeAnnotations(annotations);
    writeMarkdownRecords(annotations);
    queueGitHubSync('Remocao', imageId || 'exclusao');
    return sendJson(res, 200, { success: true, deleted: initialLen - annotations.length });
  }

  // RESET all annotations and logs to zero
  if (pathname === '/api/reset' && req.method === 'POST') {
    const token = req.headers['x-workshop-token'] || searchParams.get('token');
    if (token !== WORKSHOP_TOKEN) {
      return sendJson(res, 401, { error: 'Token inválido para operação de reset' });
    }

    // Safety backup
    const current = readAnnotations();
    if (current.length > 0) {
      const backupPath = path.join(__dirname, 'data', `annotations.backup_${Date.now()}.json`);
      fs.writeFileSync(backupPath, JSON.stringify(current, null, 2), 'utf8');
    }

    writeAnnotations([]);
    writeMarkdownRecords([]);
    queueGitHubSync('Reset', 'todas');
    return sendJson(res, 200, { success: true, message: 'Banco de dados zerado com sucesso!' });
  }

  // --- MARKDOWN RECORDS ROUTE ---
  if ((pathname === '/api/registros.md' || pathname === '/registros.md' || pathname === '/api/export-markdown') && req.method === 'GET') {
    if (fs.existsSync(MARKDOWN_LOG_FILE)) {
      res.writeHead(200, {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      return fs.createReadStream(MARKDOWN_LOG_FILE).pipe(res);
    } else {
      return sendJson(res, 404, { error: 'Arquivo markdown ainda não gerado' });
    }
  }

  // --- PAGE ROUTING ---
  if (pathname === '/' || pathname === '/galeria') {
    return serveStaticFile(req, res, path.join(PUBLIC_DIR, 'index.html'));
  }

  if (pathname === '/participante') {
    return serveStaticFile(req, res, path.join(PUBLIC_DIR, 'participant.html'));
  }

  // --- STATIC FILES ---
  // Prevent directory traversal
  const safeSuffix = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const targetPath = path.join(PUBLIC_DIR, safeSuffix);

  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
    return serveStaticFile(req, res, targetPath);
  }

  // Default 404
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
});

// Generate/sync markdown records initially with existing data and sync from GitHub on startup
writeMarkdownRecords(readAnnotations());
syncFromGitHubOnStartup().then(() => {
  writeMarkdownRecords(readAnnotations());
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`  ACERVO VIVO — OFICINA DE CRIAÇÃO & GALERIA`);
  console.log(`======================================================`);
  console.log(`  * Modo Público:        http://localhost:${PORT}/`);
  console.log(`  * Modo Participante:   http://localhost:${PORT}/participante?token=${WORKSHOP_TOKEN}`);
  console.log(`  * Registro Markdown:   http://localhost:${PORT}/registros.md`);
  console.log(`  * Token configurado:   ${WORKSHOP_TOKEN}`);
  console.log(`======================================================\n`);
});
