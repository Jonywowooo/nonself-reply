(() => {
  'use strict';

  // Window geometry belongs to the existing game save, not a second save key.
  // App routes and form drafts remain owned by app.js.
  const appIds = new Set(['mail', 'browser', 'documents', 'system', 'notes']);
  const MIN_WIDTH = 360;
  const MIN_HEIGHT = 280;
  const TASKBAR_HEIGHT = 30;
  const bindings = new WeakMap();
  const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, low, high) => Math.min(Math.max(value, low), Math.max(low, high));

  const normalize = state => {
    const previous = state.workspace && typeof state.workspace === 'object' ? state.workspace : {};
    const windows = {};
    for (const [id, saved] of Object.entries(previous.windows || {})) {
      if (!appIds.has(id) || !saved || typeof saved !== 'object') continue;
      windows[id] = {
        x: number(saved.x, 40), y: number(saved.y, 32),
        width: number(saved.width, 860), height: number(saved.height, 620),
        maximized: saved.maximized !== false
      };
    }
    const opened = [...new Set((state.openApps || []).filter(id => appIds.has(id)))];
    if (appIds.has(state.currentApp) && !opened.includes(state.currentApp)) opened.push(state.currentApp);
    state.openApps = opened;
    state.minimizedApps = [...new Set((state.minimizedApps || []).filter(id => opened.includes(id)))];
    const order = [...new Set((Array.isArray(previous.order) ? previous.order : []).filter(id => opened.includes(id)))];
    for (const id of opened) if (!order.includes(id)) order.push(id);
    state.workspace = { version: 1, windows, order };
    // Only the active restored window can be identified in a legacy save.
    if (!previous.version && appIds.has(state.currentApp) && state.windowRestored) {
      state.workspace.windows[state.currentApp] = { x: 40, y: 32, width: 860, height: 620, maximized: false };
    }
    return state.workspace;
  };

  const bounds = host => ({
    width: Math.max(800, host?.clientWidth || window.innerWidth || 1024),
    height: Math.max(300, (host?.clientHeight || window.innerHeight || 768) - TASKBAR_HEIGHT)
  });

  const geometry = (state, id, host) => {
    if (!state.workspace?.version) normalize(state);
    const area = bounds(host);
    const rank = Math.max(0, state.openApps.indexOf(id));
    let rect = state.workspace.windows[id];
    if (!rect) {
      const width = Math.min(960, Math.round(area.width * 0.78));
      const height = Math.min(720, Math.round(area.height * 0.86));
      rect = state.workspace.windows[id] = {
        x: Math.min(40 + rank * 24, Math.max(0, area.width - width)),
        y: Math.min(32 + rank * 24, Math.max(0, area.height - height)),
        width, height, maximized: true
      };
    }
    rect.width = clamp(number(rect.width, 860), MIN_WIDTH, area.width);
    rect.height = clamp(number(rect.height, 620), MIN_HEIGHT, area.height);
    rect.x = clamp(number(rect.x, 40), 0, area.width - rect.width);
    rect.y = clamp(number(rect.y, 32), 0, area.height - rect.height);
    return rect;
  };

  const focus = (state, id) => {
    if (!appIds.has(id)) return;
    if (!state.workspace?.version) normalize(state);
    if (!state.openApps.includes(id)) state.openApps.push(id);
    state.minimizedApps = state.minimizedApps.filter(item => item !== id);
    state.workspace.order = state.workspace.order.filter(item => item !== id).concat(id);
    state.currentApp = id;
  };

  const nextVisible = state => {
    if (!state.workspace?.version) normalize(state);
    return [...state.workspace.order].reverse().find(id => state.openApps.includes(id) && !state.minimizedApps.includes(id)) || 'desktop';
  };

  const minimize = (state, id = state.currentApp) => {
    if (!state.workspace?.version) normalize(state);
    if (state.openApps.includes(id) && !state.minimizedApps.includes(id)) state.minimizedApps.push(id);
    if (state.currentApp === id) state.currentApp = nextVisible(state);
  };

  const close = (state, id = state.currentApp) => {
    if (!state.workspace?.version) normalize(state);
    state.openApps = state.openApps.filter(item => item !== id);
    state.minimizedApps = state.minimizedApps.filter(item => item !== id);
    state.workspace.order = state.workspace.order.filter(item => item !== id);
    if (state.currentApp === id) state.currentApp = nextVisible(state);
  };

  const showDesktop = state => {
    state.minimizedApps = [...state.openApps];
    state.currentApp = 'desktop';
  };

  const toggleSize = (state, id = state.currentApp, host) => {
    if (!appIds.has(id)) return;
    const rect = geometry(state, id, host);
    rect.maximized = !rect.maximized;
    focus(state, id);
    return rect.maximized;
  };

  const tile = (state, host) => {
    if (!state.workspace?.version) normalize(state);
    const ids = state.workspace.order.filter(id => state.openApps.includes(id) && !state.minimizedApps.includes(id));
    if (ids.length < 2) return false;
    const area = bounds(host);
    // At 800px two real 400px windows fit. Three or more use two columns.
    const columns = Math.min(ids.length, Math.max(2, Math.floor(area.width / MIN_WIDTH)));
    const rows = Math.ceil(ids.length / columns);
    const height = Math.floor(area.height / rows);
    ids.forEach((id, index) => {
      const column = index % columns, row = Math.floor(index / columns);
      const left = Math.round(column * area.width / columns), right = Math.round((column + 1) * area.width / columns);
      state.workspace.windows[id] = { x: left, y: row * height, width: right - left, height: Math.max(MIN_HEIGHT, row === rows - 1 ? area.height - row * height : height), maximized: false };
    });
    return true;
  };

  const cascade = (state, host) => {
    if (!state.workspace?.version) normalize(state);
    const ids = state.workspace.order.filter(id => state.openApps.includes(id) && !state.minimizedApps.includes(id));
    const area = bounds(host), margin = Math.min(28 * ids.length, 140);
    ids.forEach((id, index) => {
      state.workspace.windows[id] = { x: 20 + index * 24, y: 16 + index * 24, width: Math.max(MIN_WIDTH, Math.min(960, area.width - margin)), height: Math.max(MIN_HEIGHT, area.height - margin), maximized: false };
    });
    return ids.length > 0;
  };

  const layout = (root, state) => {
    const host = root.querySelector('.computer');
    if (!host) return;
    host.classList.add('xp-workspace');
    for (const node of host.querySelectorAll('.window[data-window-app]')) {
      const id = node.dataset.windowApp;
      const rect = geometry(state, id, host);
      const active = state.currentApp === id && !state.minimizedApps.includes(id);
      node.hidden = state.minimizedApps.includes(id) || !state.openApps.includes(id);
      node.classList.toggle('window-active', active);
      node.classList.toggle('window-inactive', !active);
      node.classList.toggle('window-maximized', rect.maximized);
      node.classList.toggle('window-restored', !rect.maximized);
      node.style.zIndex = String(100 + Math.max(0, state.workspace.order.indexOf(id)));
      node.style.left = rect.maximized ? '0px' : rect.x + 'px';
      node.style.top = rect.maximized ? '0px' : rect.y + 'px';
      node.style.width = rect.maximized ? '100%' : rect.width + 'px';
      node.style.height = rect.maximized ? 'calc(100% - 30px)' : rect.height + 'px';
      node.style.right = 'auto'; node.style.bottom = 'auto';
      const button = node.querySelector('.window-controls [data-action="window-size"]');
      if (button) { button.textContent = rect.maximized ? '▣' : '□'; button.setAttribute('aria-label', rect.maximized ? '还原' : '最大化'); }
      const task = host.querySelector('.task-item[data-app="' + id + '"]');
      if (task) { task.classList.toggle('active', active); task.dataset.action = active ? 'minimize' : 'restore-app'; }
    }
  };

  const decorate = (root, state, callbacks = {}) => {
    if (!state.workspace?.version) normalize(state);
    for (const node of root.querySelectorAll('.window[data-window-app]')) {
      if (!node.querySelector('.xp-resize-handle')) {
        for (const direction of ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw']) {
          const handle = document.createElement('i');
          handle.className = 'xp-resize-handle xp-resize-' + direction;
          handle.dataset.resize = direction;
          handle.setAttribute('aria-hidden', 'true');
          node.append(handle);
        }
      }
    }
    layout(root, state);
    const existing = bindings.get(root);
    if (existing) { existing.state = state; existing.callbacks = callbacks; return; }
    const binding = { state, callbacks, gesture: null };
    bindings.set(root, binding);

    root.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      const node = event.target.closest('.window[data-window-app]');
      const handle = event.target.closest('[data-resize]');
      const title = event.target.closest('.window-titlebar');
      if (!node || (!handle && (!title || event.target.closest('button')))) return;
      const current = binding.state, id = node.dataset.windowApp, host = node.closest('.computer');
      const rect = geometry(current, id, host);
      focus(current, id);
      binding.callbacks.onFocus?.(id);
      layout(root, current);
      if (rect.maximized) return;
      event.preventDefault();
      const capture = handle || title;
      capture.setPointerCapture?.(event.pointerId);
      binding.gesture = { id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, start: { ...rect }, direction: handle?.dataset.resize || '', host, capture };
      root.classList.add('xp-window-manipulating');
    });

    root.addEventListener('pointermove', event => {
      const gesture = binding.gesture;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      const current = binding.state, area = bounds(gesture.host), start = gesture.start;
      const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
      const rect = current.workspace.windows[gesture.id];
      const direction = gesture.direction;
      if (!direction) {
        rect.x = clamp(start.x + dx, 0, area.width - start.width);
        rect.y = clamp(start.y + dy, 0, area.height - start.height);
      } else {
        let left = start.x, top = start.y, right = start.x + start.width, bottom = start.y + start.height;
        if (direction.includes('e')) right = clamp(right + dx, left + MIN_WIDTH, area.width);
        if (direction.includes('s')) bottom = clamp(bottom + dy, top + MIN_HEIGHT, area.height);
        if (direction.includes('w')) left = clamp(left + dx, 0, right - MIN_WIDTH);
        if (direction.includes('n')) top = clamp(top + dy, 0, bottom - MIN_HEIGHT);
        Object.assign(rect, { x: left, y: top, width: right - left, height: bottom - top });
      }
      layout(root, current);
    });

    const finish = event => {
      const gesture = binding.gesture;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      binding.gesture = null;
      root.classList.remove('xp-window-manipulating');
      if (gesture.capture.hasPointerCapture?.(event.pointerId)) gesture.capture.releasePointerCapture(event.pointerId);
      binding.callbacks.save?.();
    };
    root.addEventListener('pointerup', finish);
    root.addEventListener('pointercancel', finish);

    const closeMenu = () => root.querySelector('.xp-taskbar-menu')?.remove();
    root.addEventListener('contextmenu', event => {
      if (!event.target.closest('.taskbar') || event.target.closest('.start-button,.task-item,.quick-launch,.tray')) return;
      event.preventDefault(); closeMenu();
      const menu = document.createElement('div');
      menu.className = 'xp-taskbar-menu'; menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', '任务栏窗口排列');
      const current = binding.state;
      const available = current.openApps.filter(id => !current.minimizedApps.includes(id)).length > 1;
      menu.innerHTML = '<button role="menuitem" data-xp-command="cascade">层叠窗口</button><button role="menuitem" data-xp-command="tile"' + (available ? '' : ' disabled') + '>垂直平铺窗口</button><hr><button role="menuitem" data-xp-command="desktop">显示桌面</button>';
      const host = event.target.closest('.computer');
      host.append(menu);
      const box = host.getBoundingClientRect();
      menu.style.left = clamp(event.clientX - box.left, 0, host.clientWidth - 185) + 'px';
      menu.style.bottom = '30px';
      menu.querySelector('button:not(:disabled)')?.focus();
    });
    root.addEventListener('click', event => {
      const command = event.target.closest('[data-xp-command]');
      if (!command) { closeMenu(); return; }
      event.preventDefault();
      const current = binding.state, host = root.querySelector('.computer');
      if (command.dataset.xpCommand === 'tile') tile(current, host);
      if (command.dataset.xpCommand === 'cascade') cascade(current, host);
      if (command.dataset.xpCommand === 'desktop') showDesktop(current);
      closeMenu(); binding.callbacks.save?.();
      if (binding.callbacks.onChange) binding.callbacks.onChange(); else layout(root, current);
    });
    root.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', () => {
      if (!root.querySelector('.computer')) return;
      layout(root, binding.state); binding.callbacks.save?.();
    });
  };

  window.__xpWorkspace = { normalize, geometry, bounds, focus, minimize, close, showDesktop, nextVisible, toggleSize, tile, cascade, decorate, layout };
})();
