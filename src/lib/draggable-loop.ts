/** A continuous track made of two identical halves. Returns listener cleanup. */
export function attachDraggableLoop(row: HTMLElement, track: HTMLElement, reverse: boolean) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let offset = 0;
  let width = track.scrollWidth / 2;
  let frame = 0;
  let previous = 0;
  let pointer: number | null = null;
  let startX = 0;
  let lastX = 0;
  let dragged = false;
  let suppressClick = false;

  const render = () => {
    if (!width) return;
    offset = ((offset % width) + width) % width;
    track.style.transform = `translate3d(${-offset}px, 0, 0)`;
  };
  const observer = new ResizeObserver(() => {
    width = track.scrollWidth / 2;
    render();
  });
  observer.observe(track);
  const tick = (time: number) => {
    if (previous && pointer === null && !reducedMotion.matches && !document.hidden) {
      offset += (reverse ? -1 : 1) * Math.min(time - previous, 50) * 0.035;
      render();
    }
    previous = time;
    frame = requestAnimationFrame(tick);
  };
  const down = (event: PointerEvent) => {
    if (!event.isPrimary || event.button !== 0) return;
    pointer = event.pointerId;
    startX = lastX = event.clientX;
    dragged = false;
    suppressClick = false;
  };
  const move = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    if (!dragged && Math.abs(event.clientX - startX) < 6) return;
    if (!dragged) {
      dragged = true;
      row.setPointerCapture(event.pointerId);
      row.dataset.dragging = 'true';
    }
    offset -= event.clientX - lastX;
    lastX = event.clientX;
    render();
  };
  const end = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    suppressClick = dragged;
    pointer = null;
    delete row.dataset.dragging;
    if (row.hasPointerCapture(event.pointerId)) row.releasePointerCapture(event.pointerId);
    previous = 0;
  };
  const click = (event: MouseEvent) => {
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  };
  const preventNativeDrag = (event: DragEvent) => event.preventDefault();
  row.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
  row.addEventListener('lostpointercapture', end);
  row.addEventListener('click', click, true);
  row.addEventListener('dragstart', preventNativeDrag);
  frame = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    row.removeEventListener('pointerdown', down);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', end);
    window.removeEventListener('pointercancel', end);
    row.removeEventListener('lostpointercapture', end);
    row.removeEventListener('click', click, true);
    row.removeEventListener('dragstart', preventNativeDrag);
  };
}
