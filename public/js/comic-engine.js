/**
 * Acervo Vivo - Comic Balloon Engine
 * Manages draggable, editable, scalable speech and thought balloons.
 */

export class ComicEngine {
  constructor(stageElement, options = {}) {
    this.stage = stageElement;
    this.editable = options.editable ?? false;
    this.balloons = [];
    this.selectedBalloon = null;
    this.onChanged = options.onChanged || (() => {});
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };

    this.initListeners();
  }

  initListeners() {
    if (!this.editable) return;

    // Deselect balloon on background click
    this.stage.addEventListener('pointerdown', (e) => {
      if (e.target === this.stage || e.target.tagName === 'IMG') {
        this.deselectAll();
      }
    });

    window.addEventListener('pointermove', (e) => this.handleDragMove(e));
    window.addEventListener('pointerup', () => this.handleDragEnd());
    window.addEventListener('pointercancel', () => this.handleDragEnd());
  }

  setBalloons(balloonsData) {
    this.clear();
    balloonsData.forEach(data => this.addBalloon(data, false));
    this.onChanged(this.getBalloonsData());
  }

  clear() {
    this.balloons.forEach(b => b.el.remove());
    this.balloons = [];
    this.selectedBalloon = null;
  }

  addBalloon(initialData = {}, triggerChange = true) {
    const data = {
      id: initialData.id || `b_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: initialData.type || 'speech',
      text: initialData.text || '',
      x: initialData.x !== undefined ? Number(initialData.x) : 50,
      y: initialData.y !== undefined ? Number(initialData.y) : 40,
      tailDirection: initialData.tailDirection || 'bottom-left'
    };

    const balloonEl = document.createElement('div');
    balloonEl.className = `comic-balloon ${data.type}`;
    balloonEl.dataset.id = data.id;

    // Balloon Content
    const textEl = document.createElement('div');
    textEl.className = 'balloon-text';
    textEl.textContent = data.text;
    if (this.editable) {
      textEl.contentEditable = 'true';
      textEl.spellcheck = false;
      textEl.addEventListener('input', () => {
        data.text = textEl.textContent;
        this.onChanged(this.getBalloonsData());
      });
      textEl.addEventListener('focus', () => {
        this.selectBalloon(balloonItem);
      });
    }

    // Tail SVG
    const tailEl = this.createTailElement(data.type, data.tailDirection);

    balloonEl.appendChild(textEl);
    balloonEl.appendChild(tailEl);

    // Controls (only in editable participant mode)
    if (this.editable) {
      const controlsEl = document.createElement('div');
      controlsEl.className = 'balloon-controls';
      controlsEl.innerHTML = `
        <button type="button" class="balloon-btn toggle-type" title="Mudar estilo de balão">
          ${data.type === 'speech' ? '💭 Pensamento' : '💬 Fala'}
        </button>
        <button type="button" class="balloon-btn toggle-tail" title="Mudar lado da ponta">
          ⇄ Ponta
        </button>
        <button type="button" class="balloon-btn delete" title="Excluir balão">
          ✕
        </button>
      `;

      controlsEl.querySelector('.toggle-type').addEventListener('click', (e) => {
        e.stopPropagation();
        data.type = data.type === 'speech' ? 'thought' : 'speech';
        balloonEl.className = `comic-balloon ${data.type}${balloonItem === this.selectedBalloon ? ' selected' : ''}`;
        controlsEl.querySelector('.toggle-type').innerHTML = data.type === 'speech' ? '💭 Pensamento' : '💬 Fala';
        this.updateTail(balloonItem);
        this.onChanged(this.getBalloonsData());
      });

      controlsEl.querySelector('.toggle-tail').addEventListener('click', (e) => {
        e.stopPropagation();
        const dirs = ['bottom-left', 'bottom-right', 'top-left', 'top-right'];
        const currentIdx = dirs.indexOf(data.tailDirection);
        data.tailDirection = dirs[(currentIdx + 1) % dirs.length];
        this.updateTail(balloonItem);
        this.onChanged(this.getBalloonsData());
      });

      controlsEl.querySelector('.delete').addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeBalloon(data.id);
      });

      balloonEl.appendChild(controlsEl);

      // Drag listener
      balloonEl.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.balloon-controls') || e.target === textEl) return;
        this.selectBalloon(balloonItem);
        this.startDrag(e, balloonItem);
      });
    }

    this.stage.appendChild(balloonEl);

    const balloonItem = {
      id: data.id,
      data,
      el: balloonEl,
      textEl,
      tailEl
    };

    this.balloons.push(balloonItem);
    this.updatePosition(balloonItem);

    if (this.editable && triggerChange) {
      this.selectBalloon(balloonItem);
      setTimeout(() => textEl.focus(), 50);
      this.onChanged(this.getBalloonsData());
    }

    return balloonItem;
  }

  createTailElement(type, direction) {
    const tailWrap = document.createElement('div');
    tailWrap.className = `balloon-tail ${direction}`;

    if (type === 'thought') {
      tailWrap.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff" stroke="#141414" stroke-width="2.5">
          <circle cx="8" cy="8" r="5" />
          <circle cx="16" cy="18" r="3" />
        </svg>
      `;
    } else {
      // Classic speech wedge
      tailWrap.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path d="M 0 0 L 22 0 L 4 22 Z" fill="#ffffff" stroke="#141414" stroke-width="2.5" stroke-linejoin="round" />
          <path d="M 2 0 L 20 0" stroke="#ffffff" stroke-width="4" />
        </svg>
      `;
    }
    return tailWrap;
  }

  updateTail(item) {
    item.tailEl.remove();
    item.tailEl = this.createTailElement(item.data.type, item.data.tailDirection);
    item.el.appendChild(item.tailEl);
  }

  updatePosition(item) {
    item.el.style.left = `${item.data.x}%`;
    item.el.style.top = `${item.data.y}%`;
    item.el.classList.toggle('flip-controls', item.data.y < 18);
  }

  selectBalloon(item) {
    this.deselectAll();
    this.selectedBalloon = item;
    item.el.classList.add('selected');
  }

  deselectAll() {
    this.balloons.forEach(b => b.el.classList.remove('selected'));
    this.selectedBalloon = null;
  }

  removeBalloon(id) {
    const idx = this.balloons.findIndex(b => b.id === id);
    if (idx >= 0) {
      this.balloons[idx].el.remove();
      this.balloons.splice(idx, 1);
      if (this.selectedBalloon?.id === id) {
        this.selectedBalloon = null;
      }
      this.onChanged(this.getBalloonsData());
    }
  }

  startDrag(e, item) {
    this.isDragging = true;
    this.activeDragItem = item;

    const stageRect = this.stage.getBoundingClientRect();
    const balloonRect = item.el.getBoundingClientRect();

    const currentPxX = (item.data.x / 100) * stageRect.width;
    const currentPxY = (item.data.y / 100) * stageRect.height;

    this.dragOffset = {
      x: (e.clientX - stageRect.left) - currentPxX,
      y: (e.clientY - stageRect.top) - currentPxY
    };

    item.el.setPointerCapture(e.pointerId);
  }

  handleDragMove(e) {
    if (!this.isDragging || !this.activeDragItem) return;

    const stageRect = this.stage.getBoundingClientRect();
    let newPxX = (e.clientX - stageRect.left) - this.dragOffset.x;
    let newPxY = (e.clientY - stageRect.top) - this.dragOffset.y;

    // Clamp inside stage with 5% margin
    const marginPxX = stageRect.width * 0.05;
    const marginPxY = stageRect.height * 0.05;

    newPxX = Math.max(marginPxX, Math.min(stageRect.width - marginPxX, newPxX));
    newPxY = Math.max(marginPxY, Math.min(stageRect.height - marginPxY, newPxY));

    this.activeDragItem.data.x = Math.round((newPxX / stageRect.width) * 1000) / 10;
    this.activeDragItem.data.y = Math.round((newPxY / stageRect.height) * 1000) / 10;

    this.updatePosition(this.activeDragItem);
  }

  handleDragEnd() {
    if (this.isDragging) {
      this.isDragging = false;
      this.activeDragItem = null;
      this.onChanged(this.getBalloonsData());
    }
  }

  getBalloonsData() {
    return this.balloons.map(b => ({ ...b.data }));
  }
}
