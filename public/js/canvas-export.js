/**
 * Acervo Vivo - Snapshot Export Engine
 * Renders base photograph with vector comic speech bubbles and CC-BY attribution overlay.
 */

export async function exportSnapshot({
  imgElement,
  balloons,
  stageElement,
  author = '',
  includeAttribution = false,
  attributionText = '#acervovivoubatuba',
  licenseText = 'CC-BY 4.0'
}) {
  return new Promise((resolve, reject) => {
    try {
      const naturalWidth = imgElement.naturalWidth || imgElement.width || 1200;
      const naturalHeight = imgElement.naturalHeight || imgElement.height || 800;

      const stageRect = stageElement.getBoundingClientRect();
      const scaleX = naturalWidth / stageRect.width;
      const scaleY = naturalHeight / stageRect.height;
      const scale = (scaleX + scaleY) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = naturalWidth;
      canvas.height = naturalHeight;
      const ctx = canvas.getContext('2d');

      // 1. Draw base photo
      ctx.drawImage(imgElement, 0, 0, naturalWidth, naturalHeight);

      // 2. Draw each comic balloon
      balloons.forEach(balloon => {
        if (!balloon.text || !balloon.text.trim()) return;

        // Position in native coordinates
        const bx = (balloon.x / 100) * naturalWidth;
        const by = (balloon.y / 100) * naturalHeight;

        // Calculate text box dimensions based on font scale
        const fontSize = Math.max(22, Math.round(24 * scale));
        ctx.font = `bold ${fontSize}px 'Bangers', 'Comic Neue', 'Arial Black', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const lines = wrapText(ctx, balloon.text.trim(), Math.min(naturalWidth * 0.4, 400 * scale));
        const lineHeight = fontSize * 1.35;
        const maxLineWidth = lines.reduce((max, l) => Math.max(max, ctx.measureText(l).width), 0);

        const paddingX = fontSize * 1.1;
        const paddingY = fontSize * 0.8;
        const bubbleWidth = maxLineWidth + paddingX * 2;
        const bubbleHeight = lines.length * lineHeight + paddingY * 1.5;
        const radius = Math.min(28 * scale, bubbleHeight / 2);

        const left = bx - bubbleWidth / 2;
        const top = by - bubbleHeight / 2;

        ctx.save();

        // Bubble Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
        ctx.shadowBlur = 12 * scale;
        ctx.shadowOffsetY = 4 * scale;

        // Draw bubble shape
        if (balloon.type === 'thought') {
          drawThoughtCloud(ctx, left, top, bubbleWidth, bubbleHeight, scale);
        } else {
          drawSpeechBubble(ctx, left, top, bubbleWidth, bubbleHeight, radius, balloon.tailDirection, scale);
        }

        // Fill & Stroke
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.shadowColor = 'transparent'; // Remove shadow for stroke
        ctx.lineWidth = Math.max(3, 4 * scale);
        ctx.strokeStyle = '#151515';
        ctx.stroke();
        ctx.restore();

        // 3. Draw text lines inside bubble
        ctx.save();
        ctx.font = `bold ${fontSize}px 'Bangers', 'Comic Neue', 'Arial Black', sans-serif`;
        ctx.fillStyle = '#111111';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const startY = by - ((lines.length - 1) * lineHeight) / 2;
        lines.forEach((line, i) => {
          ctx.fillText(line, bx, startY + i * lineHeight);
        });
        ctx.restore();
      });

      // 4. Attribution & CC-BY License Overlay (for General Audience / Public Mode)
      if (includeAttribution) {
        const barHeight = Math.max(48, Math.round(56 * scale));
        const barY = naturalHeight - barHeight;

        // Gradient overlay banner at bottom
        ctx.save();
        const gradient = ctx.createLinearGradient(0, barY - 20 * scale, 0, naturalHeight);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.7)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, barY - 20 * scale, naturalWidth, barHeight + 20 * scale);

        // Attribution Typography
        const bannerFontSize = Math.max(16, Math.round(18 * scale));
        ctx.font = `600 ${bannerFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const marginX = 24 * scale;
        const textY = barY + barHeight / 2;

        const leftLabel = author ? `Intervenção: ${author}` : `Acervo Vivo Ubatuba`;
        ctx.fillText(leftLabel, marginX, textY);

        // Right attribution badge: CC-BY 4.0 • #acervovivoubatuba
        ctx.textAlign = 'right';
        const rightLabel = `${licenseText} • ${attributionText}`;
        ctx.fillText(rightLabel, naturalWidth - marginX, textY);
        ctx.restore();
      }

      // Convert to blob and download
      canvas.toBlob(blob => {
        if (!blob) {
          return reject(new Error('Falha ao gerar blob do canvas'));
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const mode = includeAttribution ? 'public-snapshot' : 'workshop-creation';
        a.download = `acervo-vivo_${mode}_${timestamp}.png`;
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        resolve(true);
      }, 'image/png');
    } catch (err) {
      reject(err);
    }
  });
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length ? lines : [''];
}

function drawSpeechBubble(ctx, x, y, w, h, r, tailDir, scale) {
  ctx.beginPath();
  // Rounded rect
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);

  // Tail logic
  const tailSize = 22 * scale;
  if (tailDir === 'bottom-left') {
    const tailBase = x + Math.min(40 * scale, w * 0.35);
    ctx.lineTo(tailBase + tailSize, y + h);
    ctx.lineTo(tailBase - tailSize * 0.4, y + h + tailSize);
    ctx.lineTo(tailBase, y + h);
  } else if (tailDir === 'bottom-right') {
    const tailBase = x + w - Math.min(40 * scale, w * 0.35);
    ctx.lineTo(tailBase, y + h);
    ctx.lineTo(tailBase + tailSize * 0.4, y + h + tailSize);
    ctx.lineTo(tailBase - tailSize, y + h);
  }

  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawThoughtCloud(ctx, x, y, w, h, scale) {
  ctx.beginPath();
  const rx = w / 2;
  const ry = h / 2;
  const cx = x + rx;
  const cy = y + ry;

  // Draw ellipse cloud body
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.closePath();

  // Draw thought circles underneath
  const r1 = 8 * scale;
  const r2 = 5 * scale;
  ctx.moveTo(cx - rx * 0.3 + r1, cy + ry + r1 * 1.4);
  ctx.arc(cx - rx * 0.3, cy + ry + r1 * 1.4, r1, 0, Math.PI * 2);

  ctx.moveTo(cx - rx * 0.45 + r2, cy + ry + r1 * 2.8);
  ctx.arc(cx - rx * 0.45, cy + ry + r1 * 2.8, r2, 0, Math.PI * 2);
}
