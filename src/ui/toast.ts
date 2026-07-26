/* ============================================================
   BİLDİRİM (toast) — prototipten taşındı
   ============================================================ */

let box: HTMLElement | null = null;

export function initToasts(container: HTMLElement): void {
  box = container;
}

export function toast(msg: string, kind: '' | 'good' | 'bad' = ''): void {
  if (!box) return;
  const el = document.createElement('div');
  el.className = 'toast' + (kind ? ' ' + kind : '');
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .4s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 400);
  }, 3200);
  // Aşama 3: ekranda aynı anda en çok 3 bildirim — harita görünür kalsın
  while (box.children.length > 3) box.firstChild?.remove();
}
