/* 只放大已展示的附件，不创建或揭示新素材。 */
(() => {
  let dialog = null;
  const close = () => { if (dialog) { dialog.close(); dialog.remove(); dialog = null; } };
  const mount = root => {
    close();
    for (const img of root.querySelectorAll('.site-page .archive-photo img, .source-photo .source-sheet > img')) {
      if (img.closest('button,a')) continue;
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'archive-image-open';
      button.setAttribute('aria-label', '放大查看：' + (img.alt || '图片'));
      button.title = '点击查看完整图片';
      img.replaceWith(button); button.append(img);
      const hint = document.createElement('span'); hint.className = 'archive-image-hint'; hint.textContent = '点击查看完整图片'; button.append(hint);
      button.addEventListener('click', () => {
        close(); dialog = document.createElement('dialog'); dialog.className = 'archive-image-dialog';
        dialog.setAttribute('aria-label', img.alt || '图片查看器');
        const bar = document.createElement('div'); bar.className = 'archive-image-bar';
        const label = document.createElement('span'); label.textContent = '图片查看器';
        const exit = document.createElement('button'); exit.type = 'button'; exit.textContent = '关闭（Esc）'; exit.addEventListener('click', close);
        const zoom = document.createElement('button'); zoom.type = 'button'; zoom.textContent = '原始尺寸';
        const pane = document.createElement('div'); pane.className = 'archive-image-pane'; pane.tabIndex = 0;
        const full = document.createElement('img'); full.src = img.currentSrc || img.src; full.alt = img.alt;
        zoom.addEventListener('click', () => { const natural = pane.classList.toggle('natural-size'); zoom.textContent = natural ? '适合窗口' : '原始尺寸'; });
        bar.append(label, zoom, exit); pane.append(full);
        const caption = document.createElement('p'); caption.textContent = img.closest('figure')?.querySelector('figcaption')?.textContent || img.alt;
        dialog.append(bar, pane, caption); document.body.append(dialog);
        dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
        dialog.showModal(); exit.focus();
      });
    }
  };
  window.__archiveImageViewer = {mount};
})();
