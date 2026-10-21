/** سحب خفيف بأحداث المؤشر: إن تحرّك الإصبع فهو سحب، وإلا فهو لمسة */
export function draggable(el: HTMLElement, onDrop: (target: HTMLElement | null) => void, onTap: () => void) {
  let sx = 0, sy = 0, dragging = false, down = false;
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', (e) => {
    down = true;
    dragging = false;
    sx = e.clientX;
    sy = e.clientY;
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!dragging && Math.hypot(dx, dy) > 10) {
      dragging = true;
      el.classList.add('dragging');
    }
    if (dragging) el.style.transform = `translate(${dx}px, ${dy}px)`;
  });
  const end = (e: PointerEvent, cancelled: boolean) => {
    if (!down) return;
    down = false;
    if (!dragging) {
      if (!cancelled) onTap();
      return;
    }
    el.classList.remove('dragging');
    el.style.transform = '';
    el.style.visibility = 'hidden';
    const under = cancelled ? null : document.elementFromPoint(e.clientX, e.clientY);
    el.style.visibility = '';
    onDrop((under?.closest('.drop') as HTMLElement) ?? null);
  };
  el.addEventListener('pointerup', (e) => end(e, false));
  el.addEventListener('pointercancel', (e) => end(e, true));
}
