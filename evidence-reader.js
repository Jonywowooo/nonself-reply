/* Views use supplied records. Reconstruction artwork is not recovered original evidence. */
window.__evidenceReader = (() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text = value => '<p>' + escape(value).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
  const button = (id, mode, label, active) => `<button class="system-button" data-action="evidence-mode" data-record="${escape(id)}" data-mode="${mode}" aria-pressed="${active === mode}">${label}</button>`;
  const controls = (id, modes, active) => '<div class="source-tabs">' + modes.map(([mode,label]) => button(id,mode,label,active)).join('') + '</div>';
  const device = () => '<section class="evidence-reader"><div class="device-diagram asset-photo device-whole"><img src="./assets/device-hand-master-v1.png" alt="手掌托着有线装置，接头缠白胶布，多余细线收成两个圈" draggable="false"></div><p>接头有白胶布，细线收成两个圈。照片没有保留拍摄时间或型号。</p></section>';
  const crop = (id, mode) => `<section class="evidence-reader"><h3>原片与刊用范围</h3><p class="faint">取景范围复原 · 依据私人保管说明，不是新恢复的底片。尺寸、道路形状不作为案情依据。</p>${controls(id,[['original','完整范围'],['print','报社刊用'],['compare','并排比较']],mode)}<div class="crop-pair">${(mode === 'compare' ? ['original','print'] : [mode === 'print' ? 'print' : 'original']).map(view => `<figure><div class="crop-diagram asset-photo ${view === 'print' ? 'print-only' : 'original-full'}"><img src="./assets/road-original-master-v1.png" alt="${view === 'print' ? '刊用取景范围复原：仅保留烧毁车辆' : '完整取景范围复原：烧毁车辆与车后的道路'}" draggable="false">${view === 'original' ? '<span class="crop-outline" aria-hidden="true"></span>' : ''}</div><figcaption>${view === 'print' ? '刊用范围：保留车辆' : '私人原片范围：车辆及车后的道路'}</figcaption></figure>`).join('')}</div><p>祁向生附记：原片没交。车可以给他们看，后面的路不行。</p></section>`;
  const margin = () => '<section class="evidence-reader"><h3>剪报与页边字</h3><p class="faint">按现存抄录分区排版；原纸未署名、未署日期。</p><div class="newspaper-transcript"><article><h4>剪报正文</h4>'+text('车内生物痕迹来源未能完全确认。')+'</article><aside><h4>页边两种字</h4>'+text('带自己的样本，能不能查出我是谁？')+text('他们会找到母亲')+'</aside></div></section>';
  const render = (record, views = {}, zooms = {}) => {
    if (!record) return '';
    const modes = validModes(record.id);
    const mode = modes.includes(views[record.id]) ? views[record.id] : (record.id === 'legacy:qixiangsheng:files:3' ? 'compare' : modes[0]);
    let html = '';
    if (record.id === 'legacy:fangxingzhi:files:0') return device();
    if (record.id === 'legacy:qixiangsheng:files:3') html = crop(record.id,mode);
    if (record.id === 'legacy:sunianci:files:1') return margin();
    if (!html) return '';
    const zoom = Math.min(3,Math.max(1,Number(zooms[record.id]) || 1));
    const toolbar = `<div class="evidence-zoom"><button class="system-button" data-action="evidence-zoom" data-record="${record.id}" data-delta="-0.5" ${zoom === 1 ? 'disabled' : ''}>缩小</button><span>${zoom * 100}%</span><button class="system-button" data-action="evidence-zoom" data-record="${record.id}" data-delta="0.5" ${zoom === 3 ? 'disabled' : ''}>放大</button><span class="faint">放大后可用滚动条移动；并排图同步缩放。</span></div>`;
    let panel = 0;
    return html.replace('<h3>',toolbar+'<h3>').replace(/(<div class="(?:device-diagram[^"]*|crop-diagram[^"]*|newspaper-transcript)"[^>]*>)([\s\S]*?)(<\/div>)/g, (_,open,body,close) => `<div class="evidence-pan" tabindex="0" aria-label="附件画面，可滚动查看" data-pan-key="${escape(record.id)}:${mode}:${panel++}"><div class="evidence-scaled" style="width:100%;zoom:${zoom}">${open}${body}${close}</div></div>`);
  };
  const validModes = id => id === 'legacy:fangxingzhi:files:0' ? ['whole'] : id === 'legacy:qixiangsheng:files:3' ? ['original','print','compare'] : id === 'legacy:sunianci:files:1' ? ['whole'] : [];
  return { render, validModes };
})();
