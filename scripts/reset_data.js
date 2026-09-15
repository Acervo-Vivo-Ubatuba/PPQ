import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const dataDir = path.join(projectRoot, 'data');
const annotationsFile = path.join(dataDir, 'annotations.json');
const markdownFile = path.join(dataDir, 'registros_participantes.md');
const rootMarkdownFile = path.join(projectRoot, 'REGISTRO_FALAS.md');
const historyLogFile = path.join(dataDir, 'historico_envios.md');
const backupDriveDir = '/home/felipe/Google Drive/projetos/ubatuba/Paz sem Voz/Paz Para Quem? Registros/F/2026-09-14/PB';
const backupDriveFile = path.join(backupDriveDir, 'REGISTRO_FALAS.md');

console.log("\n=================================================");
console.log("   ACERVO VIVO — REINICIAR BANCO DE DADOS A ZERO");
console.log("=================================================");

// 1. Backup existing annotations if any
if (fs.existsSync(annotationsFile)) {
  try {
    const raw = fs.readFileSync(annotationsFile, 'utf8');
    const parsed = JSON.parse(raw || '[]');
    if (parsed.length > 0) {
      const backupPath = path.join(dataDir, `annotations.backup_${Date.now()}.json`);
      fs.writeFileSync(backupPath, raw, 'utf8');
      console.log(`✓ Backup de segurança salvo em: ${path.basename(backupPath)} (${parsed.length} registros)`);
    }
  } catch (err) {
    console.warn('Aviso ao ler anotações anteriores:', err.message);
  }
}

// 2. Reset annotations.json to empty array
fs.writeFileSync(annotationsFile, '[]\n', 'utf8');
console.log('✓ data/annotations.json resetado para []');

// 3. Reset markdown logs
const nowStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const cleanMarkdown = `# 📜 Acervo Vivo — Registro de Falas e Intervenções dos Participantes

> **Projeto:** Acervo Vivo Ubatuba (#acervovivoubatuba)
> **Última Atualização:** ${nowStr} (Horário de Brasília)
> **Total de Intervenções:** 0 | **Total de Balões e Textos:** 0

---

## 📊 Resumo da Oficina

- **Participantes Ativos:** *Nenhum participante ainda*
- **Fotografias com Intervenção:** 0

---

## 💬 Tabela de Textos Inseridos por Participantes

| Data / Hora | Participante | Fotografia | Tipo | Texto Inserido | Posição na Imagem |
| :--- | :--- | :--- | :---: | :--- | :--- |
| - | - | - | - | *Nenhum texto inserido ainda* | - |

---

## 🖼️ Diálogos Detalhados por Fotografia

*Nenhuma imagem possui intervenções registradas ainda.*
`;

fs.writeFileSync(markdownFile, cleanMarkdown, 'utf8');
fs.writeFileSync(rootMarkdownFile, cleanMarkdown, 'utf8');
console.log('✓ data/registros_participantes.md e REGISTRO_FALAS.md resetados');

// 4. Reset history log
const cleanHistory = `# 📜 Histórico Cumulativo de Envios — Acervo Vivo
> Log em tempo real de cada envio individual realizado por participantes.

---
`;
fs.writeFileSync(historyLogFile, cleanHistory, 'utf8');
console.log('✓ data/historico_envios.md resetado');

// 5. Reset Google Drive backup if available
if (fs.existsSync(backupDriveDir)) {
  fs.writeFileSync(backupDriveFile, cleanMarkdown, 'utf8');
  console.log('✓ Backup no Google Drive atualizado: REGISTRO_FALAS.md');
}

console.log("\n>>> BANCO DE DADOS ZERADO COM SUCESSO! <<<");
console.log("Agora o mural está 100% limpo, pronto para a oficina começar do zero.\n");
