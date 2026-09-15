# 🚀 Como Hospedar Este Aplicativo Gratuitamente

Este aplicativo foi construído com arquitetura leve (**zero build**, sem dependências externas obrigatórias), o que permite hospedá-lo de forma **100% gratuita** em diversos serviços.

---

## Opção 1: Render.com (Recomendado — Web Service Gratuito)

O [Render](https://render.com) oferece plano gratuito permanente com suporte a Node.js, HTTPS e domínio automático `.onrender.com`.

### Passo a Passo:
1. Suba esta pasta (`AcervoVivo`) para um repositório no seu GitHub (público ou privado).
2. Acesse [dashboard.render.com](https://dashboard.render.com) e clique em **New +** > **Web Service**.
3. Conecte o repositório do GitHub.
4. O Render detectará automaticamente o arquivo [`render.yaml`](./render.yaml). Se configurar manualmente:
   - **Environment:** `Node`
   - **Build Command:** *(deixe em branco)*
   - **Start Command:** `node server.js`
   - **Plan:** `Free`
5. Adicione a variável de ambiente:
   - `WORKSHOP_TOKEN` = `oficina2026` (ou a senha que desejar)
6. Clique em **Deploy Web Service**.

Em 2 minutos você terá:
- **URL da Galeria Pública:** `https://seu-app.onrender.com/`
- **URL dos Participantes:** `https://seu-app.onrender.com/participante?token=oficina2026`

---

## Opção 2: Vercel (Hospedagem Serverless Gratuita com CDN Global)

A [Vercel](https://vercel.com) é ultra-rápida e não tem "tempo de hibernação" (cold start).

### Passo a Passo:
1. Instale a CLI da Vercel ou conecte pelo site:
   ```bash
   npm i -g vercel
   vercel
   ```
2. Ou envie para o GitHub e importe no painel da [Vercel](https://vercel.com/new).
3. O arquivo [`vercel.json`](./vercel.json) já está configurado para servir o frontend e as rotas `/api`.
4. Defina a variável de ambiente `WORKSHOP_TOKEN` no painel da Vercel.

---

## Opção 3: Rede Local Wi-Fi da Oficina (100% Grátis, Sem Precisar de Internet)

Se você estiver em um espaço físico (sala de aula, auditório, centro cultural) com Wi-Fi:

1. No seu computador, inicie o servidor:
   ```bash
   node server.js
   ```
2. Descubra o IP do seu computador na rede local (ex: no Linux/Mac rode `hostname -I` ou `ip a`; no Windows rode `ipconfig`). Exemplo: `192.168.1.15`.
3. Compartilhe com os participantes:
   - **Galeria:** `http://192.168.1.15:3000/`
   - **Participantes:** `http://192.168.1.15:3000/participante?token=oficina2026`
4. Todos os participantes conectados no mesmo Wi-Fi poderão acessar de seus celulares, tablets ou notebooks em tempo real, sem gastar dados móveis e sem depender de servidores externos!

---

## Opção 4: Glitch.com ou Hugging Face Spaces

- **Glitch:** Acesse [glitch.com](https://glitch.com), crie um projeto "Node" e importe o repositório. O Glitch mantém os arquivos e permite edição ao vivo no navegador.
- **Hugging Face Spaces:** Crie um "Space" gratuito do tipo **Docker** ou **Node.js** com até 16 GB de RAM gratuitos.

---

## 🔒 Personalizando o Token e a Atribuição

Edite o arquivo [`config.json`](./config.json):
```json
{
  "workshopToken": "sua-senha-aqui",
  "attributionText": "#acervovivoubatuba",
  "licenseText": "CC-BY 4.0",
  "title": "Acervo Vivo — Oficina de Criação"
}
```
Ou defina a variável de ambiente `WORKSHOP_TOKEN` no painel do serviço de hospedagem.
