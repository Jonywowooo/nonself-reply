(() => {
  'use strict';
  const src = './assets/ending/nonself-reply-simu-B-clean.mp4';
  const view = () => `<article class="ending-cinema" aria-label="非本人回复结尾影片">
    <div class="ending-screen">
      <video class="ending-video" src="${src}" controls playsinline preload="metadata" aria-label="非本人回复，四木出品"></video>
      <button class="ending-start" type="button">播放结尾影片</button>
    </div>
    <p class="ending-playback-status" role="status"></p>
    <nav class="ending-cinema-actions" aria-label="影片操作">
      <button class="ending-replay" type="button" hidden>重看影片</button>
      <button type="button" data-action="return-computer">返回电脑</button>
      <a class="ending-download" href="${src}" download hidden>下载影片观看</a>
    </nav>
  </article>`;
  const play = root => {
    const panel = root.querySelector('.ending-cinema');
    if (!panel) return;
    const video = panel.querySelector('video');
    const status = panel.querySelector('.ending-playback-status');
    status.textContent = '';
    video.play()?.catch(() => {
      if (video.error) return;
      panel.querySelector('.ending-start').hidden = false;
      status.textContent = '点击播放，开启影片声音。';
    });
  };
  const mount = root => {
    const panel = root.querySelector('.ending-cinema');
    if (!panel) return;
    const video = panel.querySelector('video');
    const start = panel.querySelector('.ending-start');
    const replay = panel.querySelector('.ending-replay');
    const status = panel.querySelector('.ending-playback-status');
    start.addEventListener('click', () => play(root));
    replay.addEventListener('click', () => { video.currentTime = 0; play(root); });
    video.addEventListener('play', () => { start.hidden = true; replay.hidden = true; status.textContent = ''; });
    video.addEventListener('ended', () => { replay.hidden = false; replay.focus(); });
    video.addEventListener('error', () => {
      start.hidden = true;
      status.textContent = '影片暂时无法播放。可以下载观看，或返回电脑后重试；进度已保留。';
      panel.querySelector('.ending-download').hidden = false;
    });
  };
  window.__endingFilm = { view, mount, play };
})();
