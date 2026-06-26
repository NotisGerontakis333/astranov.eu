// === YOUTUBE ON GLOBE — search + watch in Astranov Command Line deck ===
const GlobeVideo = {
  _results: [],
  _currentId: null,
  _marker: null,

  PIPED: [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.adminforge.de',
    'https://api.piped.projectsegfau.lt',
  ],

  init() {
    document.getElementById('yt-close')?.addEventListener('click', () => this.hide());
    document.getElementById('yt-open-ext')?.addEventListener('click', () => {
      if (this._currentId) window.open('https://www.youtube.com/watch?v=' + this._currentId, '_blank', 'noopener');
    });
  },

  parseId(input) {
    const s = String(input || '').trim();
    if (!s) return null;
    const m1 = s.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/i);
    if (m1) return m1[1];
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
    return null;
  },

  async pipedSearch(query) {
    const q = encodeURIComponent(query);
    let lastErr = '';
    for (const base of this.PIPED) {
      try {
        const r = await fetch(base + '/search?q=' + q + '&filter=videos', {
          headers: { Accept: 'application/json' },
        });
        if (!r.ok) { lastErr = r.status + ' ' + base; continue; }
        const items = await r.json();
        if (!Array.isArray(items) || !items.length) { lastErr = 'empty ' + base; continue; }
        return items.slice(0, 8).map((it, i) => {
          const url = it.url || '';
          const id = it.id || this.parseId(url) || this.parseId('https://youtube.com' + url);
          return {
            id,
            title: it.title || ('Video ' + (i + 1)),
            channel: it.uploaderName || it.uploader || '',
            duration: it.duration || 0,
            thumbnail: it.thumbnail,
          };
        }).filter(v => v.id);
      } catch (e) {
        lastErr = String(e.message || e);
      }
    }
    throw new Error(lastErr || 'search failed');
  },

  showPanel(title) {
    GlobeDeck?.showStage('globe-youtube', 'video', title || 'YouTube on globe');
    SuperCli?.setContext?.('idle');
    const panel = document.getElementById('globe-youtube');
    if (panel) panel.classList.add('open', 'deck-active');
  },

  hide() {
    this.stop();
    document.getElementById('globe-youtube')?.classList.remove('open', 'deck-active');
    if (GlobeDeck?.activeTask === 'video') GlobeDeck?.completeTask('video');
    SuperCli?.setContext?.(SuperCli.inferContext?.() || 'idle');
  },

  stop() {
    const frame = document.getElementById('yt-frame');
    if (frame) frame.src = 'about:blank';
    this._currentId = null;
    if (this._marker?.parent) this._marker.parent.remove(this._marker);
    this._marker = null;
  },

  renderResults(items, query) {
    const list = document.getElementById('yt-results');
    if (!list) return;
    list.innerHTML = '';
    items.forEach((v, i) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'yt-row';
      const mins = v.duration ? Math.floor(v.duration / 60) + ':' + String(v.duration % 60).padStart(2, '0') : '';
      row.innerHTML = '<span class="yt-n">' + (i + 1) + '</span>'
        + '<span class="yt-meta"><b>' + this.esc(v.title) + '</b>'
        + '<small>' + this.esc(v.channel) + (mins ? ' · ' + mins : '') + '</small></span>';
      row.onclick = () => this.play(v.id, v);
      list.appendChild(row);
    });
    const hint = document.getElementById('yt-hint');
    if (hint) hint.textContent = items.length
      ? 'Tap a result or type: play 2 · ' + query
      : 'No results — try another search';
  },

  esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  play(videoId, meta) {
    const id = this.parseId(videoId);
    if (!id) {
      AciCli?.print('invalid video id', 'err');
      return;
    }
    this._currentId = id;
    this.showPanel((meta?.title || 'YouTube').slice(0, 48));
    const frame = document.getElementById('yt-frame');
    const title = document.getElementById('yt-now-title');
    if (title) title.textContent = meta?.title || id;
    if (frame) {
      frame.src = 'https://www.youtube-nocookie.com/embed/' + id
        + '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
    }
    GlobeDeck?.expand('YouTube · ' + (meta?.title || id).slice(0, 40));
    AciCli?.print('▶ ' + (meta?.title || id), 'ok');
    ACIControl?.reply('Playing on globe — ' + (meta?.title || id).slice(0, 80));
    MapDepict?.action('video', { detail: (meta?.title || id).slice(0, 40) });
    this.pulseOnGlobe();
    AciCoders?.observeActivity?.('youtube', (meta?.title || id).slice(0, 80));
    FieldBrain?.pulse?.('media', 'youtube · ' + (meta?.title || id).slice(0, 60), { role: 'client' });
  },

  pulseOnGlobe() {
    const u = window._lastPos || { lat: 36.22, lng: 28.12 };
    MapDepict?.pulse?.(u.lat, u.lng, 0xff4466, '▶ YouTube', 12000);
    if (this._marker?.parent) this._marker.parent.remove(this._marker);
    const pos = latLngToPos(u.lat, u.lng, 1.06);
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.14, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xff2244, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
    );
    plane.position.set(pos.x, pos.y, pos.z);
    plane.lookAt(0, 0, 0);
    plane.userData = { type: 'yt-screen' };
    globePivot.add(plane);
    this._marker = plane;
  },

  async find(query) {
    const q = String(query || '').trim();
    if (!q) {
      ACIControl?.reply('usage: youtube <search> · watch <url> · find video about …');
      return { error: 'empty' };
    }
    const direct = this.parseId(q);
    if (direct) {
      this.play(direct, { title: q });
      return { ok: true, id: direct };
    }

    this.showPanel('Searching YouTube…');
    GlobeDeck?.setThinking(true, 'Finding videos…');
    AciCli?.print('youtube search · ' + q, 'cmd');

    try {
      const items = await this.pipedSearch(q);
      this._results = items;
      this.renderResults(items, q);
      GlobeDeck?.setThinking(false);
      if (!items.length) {
        AciCli?.print('no videos found', 'err');
        return { error: 'empty' };
      }
      items.forEach((v, i) => {
        AciCli?.print((i + 1) + '. ' + v.title.slice(0, 70) + (v.channel ? ' · ' + v.channel : ''), 'dim');
      });
      ACIControl?.reply('Found ' + items.length + ' — playing #1 · tap others in deck');
      this.play(items[0].id, items[0]);
      return { ok: true, count: items.length };
    } catch (e) {
      GlobeDeck?.setThinking(false);
      const msg = 'YouTube search failed: ' + (e.message || e);
      AciCli?.print(msg, 'err');
      ACIControl?.reply('Search failed — try again or paste a youtube link');
      return { error: msg };
    }
  },

  playIndex(n) {
    const idx = parseInt(n, 10) - 1;
    const v = this._results[idx];
    if (!v) {
      AciCli?.print('no result #' + n + ' — search first', 'err');
      return;
    }
    this.play(v.id, v);
  },

  wantsYoutube(text) {
    const low = String(text || '').toLowerCase();
    return /youtube|youtu\.be|^yt\b|find\s+(me\s+)?(a\s+)?videos?\b|watch\s+.*video|βίντεο\s+(για|στο)|δες\s+(βίντεο|youtube)|παρακολούθησε|show\s+me\s+.*video/.test(low)
      || this.parseId(text);
  },

  queryFromText(text) {
    return String(text || '')
      .replace(/^(youtube|yt|find\s+videos?\s+(about|on|for)?|find\s+me\s+a\s+video\s+(about|on|for)?|watch\s+videos?\s+(about|on|for)?|watch|video\s+find|βίντεο\s+(για|στο)?|δες\s+βίντεο\s+(για|στο)?|παρακολούθησε)\s*/i, '')
      .trim();
  },
};
window.GlobeVideo = GlobeVideo;