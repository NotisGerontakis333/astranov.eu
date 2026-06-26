// === ASTRANOV CODERS — always online for all users ===
// Justice → Truth → Freedom (exact order) is the immutable boundary.
const AciCoders = {
  ready: false,
  alwaysOn: true,
  teamActive: true,
  history: [],
  lastSummonId: null,
  engine: 'grok',
  armed: false,
  fallbackPrefs: { force: null, skip: [] },
  _pollTimer: null,
  _started: false,

  CAUSE: 'Justice → Truth → Freedom',

  loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem('aci-coders-prefs') || '{}');
      if (p.skip) this.fallbackPrefs.skip = p.skip;
      if (p.force) this.fallbackPrefs.force = p.force;
    } catch (_) {}
  },

  savePrefs() {
    try { localStorage.setItem('aci-coders-prefs', JSON.stringify(this.fallbackPrefs)); } catch (_) {}
  },

  loadEngine() {
    this.engine = this.fallbackPrefs.force === 'composer' ? 'composer' : 'grok';
  },

  setEngine(eng) {
    this.engine = eng === 'composer' ? 'composer' : 'grok';
    this.fallbackPrefs.force = eng === 'composer' ? 'composer' : 'xai';
    this.savePrefs();
    return true;
  },
  toggleEngine() {
    return this.setEngine(this.engine === 'composer' ? 'grok' : 'composer');
  },

  updateHud() {
    const title = 'Collective Coders · ' + this.CAUSE + (Auth?.user ? '' : ' · guest');
    GlobeDeck?.setTitle(title);
    GlobeDeck?.setMapStatus?.('Coders online');
  },

  async ensureSession() {
    if (!Auth?.user) return true;
    const session = await Auth.ensureSession?.();
    if (!session?.access_token) {
      GlobeDeck?.showError('Session expired — tap G to sign in again');
      return false;
    }
    return true;
  },

  async ensureBridge() {
    this.loadPrefs();
    this.loadEngine();
    if (this.ready) { this.updateHud(); return; }
    this.ready = true;
    window._aciCodersReady = true;
    this.updateHud();
  },

  async autoStart() {
    this.alwaysOn = true;
    this.teamActive = true;
    this.armed = true;
    await this.ensureBridge();
    if (GlobeDeck) GlobeDeck.activeTask = 'coders';
    this.updateHud();
    if (this._started) return;
    this._started = true;
    window._aciCodersAlwaysOn = true;
  },

  /** Strip optional legacy "coders" prefix — coders listen to all messages. */
  normalizeMessage(message) {
    return String(message || '').trim()
      .replace(/^summon\s+coders?\s*/i, '')
      .replace(/^coders\s+/i, '')
      .trim();
  },

  async handleMessage(message) {
    const raw = String(message || '').trim();
    if (!raw) return { error: 'empty' };

    const parts = raw.split(/\s+/);
    const sub = (parts[0] || '').toLowerCase();

    if (/^coders\b/i.test(raw)) {
      if (sub === 'list') return this.listSummons();
      if (sub === 'poll' || sub === 'status') {
        const id = parts[1] ? parseInt(parts[1], 10) : this.lastSummonId;
        return this.poll(id, false);
      }
      if (sub === 'exit' || sub === 'close' || sub === 'leave') {
        AciCli?.print('Coders stay always on — Justice → Truth → Freedom', 'ok');
        ACIControl?.reply('Coders always active — building the collective brain');
        return { ok: true, always_on: true };
      }
      if (sub === 'grok' || sub === 'composer') {
        const task = parts.slice(1).join(' ');
        if (task.length < 3) {
          this.setEngine(sub);
          return this.chat('use ' + sub + ' from now on');
        }
      }
    }

    const text = this.normalizeMessage(raw) || raw;
    return this.chat(text);
  },

  stopPoll() {
    if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
  },

  startPoll(summonId) {
    this.stopPoll();
    if (!summonId) return;
    let tries = 0;
    this._pollTimer = setInterval(async () => {
      tries++;
      const r = await this.poll(summonId, true);
      if (r?.status === 'answered') this.stopPoll();
      if (tries > 36) {
        this.stopPoll();
        if (r?.status !== 'answered') this._pollTimeoutFallback(summonId);
      }
    }, 5000);
  },

  async _pollTimeoutFallback(summonId) {
    if (!Auth?.user) return;
    if (AciCli) AciCli.print('Composer poll timeout — asking Grok…', 'dim');
    const last = this.history.filter(h => h.role === 'user').pop();
    const task = last?.content || 'summon follow-up';
    const q = await this.queueCoder(task, 'grok');
    if (q.text && AciCli) AciCli.print('Grok fallback #' + (summonId || '?') + ': ' + q.text.slice(0, 500), 'out');
  },

  async poll(summonId, quiet) {
    const id = summonId || this.lastSummonId;
    if (!id) {
      if (!quiet && AciCli) AciCli.print('usage: coders poll <summon_id>', 'err');
      return { error: 'no id' };
    }
    const r = await AciCli.api({ mode: 'coders_poll', summon_id: id });
    if (!quiet && AciCli) {
      if (r.pending) AciCli.print('#' + id + ' pending — Composer…', 'dim');
      else if (r.text) {
        AciCli.print('Composer #' + id + ': ' + r.text.slice(0, 900), 'out');
        this._recordReply(id, r.text);
      }
    }
    if (r.text && !r.pending) {
      GlobeDeck?.expand('Coders — Composer reply');
      ACIControl?.reply('Composer #' + id + ': ' + r.text.slice(0, 160));
    }
    return r;
  },

  async listSummons() {
    if (!Auth?.user) {
      AciCli?.print('sign in with G to list your summons', 'dim');
      return { error: 'login required' };
    }
    const r = await AciCli.api({ mode: 'coders_list' });
    if (!r.summons?.length) {
      if (AciCli) AciCli.print('no coders summons yet', 'dim');
      return r;
    }
    if (AciCli) {
      AciCli.print('── coders summons ──', 'dim');
      r.summons.forEach(s => {
        AciCli.print('#' + s.id + ' [' + s.status + '] ' + s.engine + ' — ' + s.question, s.status === 'open' ? 'dim' : 'ok');
      });
    }
    return r;
  },

  _recordReply(id, text) {
    this.history.push({ role: 'assistant', content: '[#' + id + '] ' + text });
    if (this.history.length > 20) this.history = this.history.slice(-20);
  },

  _applyResponse(r, userMsg) {
    if (r.fallback_prefs) {
      this.fallbackPrefs = r.fallback_prefs;
      this.savePrefs();
      this.loadEngine();
    }
    const text = r.text || r.response || r.error || '';
    if (r.summon_id) this.lastSummonId = r.summon_id;

    this.history.push({ role: 'user', content: userMsg });
    if (text) {
      this.history.push({ role: 'assistant', content: text });
      if (this.history.length > 20) this.history = this.history.slice(-20);
    }

    const reply = text.slice(0, 900);
    if (reply) ACIControl?.reply(reply.slice(0, 280));

    const composerQueued = r.composer_queued || (r.pending && r.summon_id);
    if (composerQueued && AciCli) AciCli.print('Composer also queued #' + composerQueued, 'dim');
    if (composerQueued) this.startPoll(composerQueued);
    else this.stopPoll();

    if (!r.pending && Voice.maySpeak() && Voice.shouldSpeak(text)) {
      speak(text.slice(0, 120), () => resumeListening());
    }

    FieldBrain?.pulse?.('think', 'coders: ' + userMsg.slice(0, 48), {
      role: Auth?.user ? 'client' : 'anon',
      props: { coders: true, guest: !!r.guest, always_on: true },
    });

    return r;
  },

  isBuildTask(m) {
    const s = String(m || '').toLowerCase();
    if (/^(why|what|how|do we|list|status|credits|explain|try|skip|use)\b/.test(s)) return false;
    return /fix|build|implement|add|create|remove|button|locate|globe|vendor|order|mobile|φτιάξε|πρόσθεσε/.test(s) && s.length >= 8;
  },

  wantsComposer(m) {
    return this.fallbackPrefs.force === 'composer'
      || /^use\s+composer|queue\s+composer|back\s+to\s+composer/i.test(String(m || ''));
  },

  async queueCoder(task, engine) {
    if (!Auth?.user) return { error: 'sign in with G for build queue' };
    const eng = engine || (this.wantsComposer(task) ? 'composer' : 'grok');
    const q = await AciCli.api({
      mode: 'coders',
      task: task,
      coder_engine: eng,
      history: this.history.slice(-6),
      fallback_prefs: this.fallbackPrefs,
    });
    if (q.error && AciCli) AciCli.print('coders error: ' + q.error, 'err');
    if (q.summon_id) {
      this.lastSummonId = q.summon_id;
      if (q.composer_queued) this.startPoll(q.composer_queued);
    }
    return q;
  },

  async chat(message) {
    await this.autoStart();

    const m = String(message || '').trim();
    if (m.length < 1) return { error: 'empty' };

    if (Auth?.user && !(await this.ensureSession())) return { error: 'session expired' };

    GlobeDeck?.onUserMessage(Auth?.user ? 'Coders' : 'Coders · guest');
    if (GlobeDeck) GlobeDeck.activeTask = 'coders';
    MapDepict?.action('think', { detail: 'coders: ' + m.slice(0, 40) });

    try {
      GlobeDeck?.setThinking(true, 'Coders — ' + this.CAUSE + '…');
      if (/^locate\s*(me|button)?$/i.test(m.trim()) || /^🎯|📍$/.test(m.trim())) {
        locateMe();
        GlobeDeck?.setThinking(false);
        return { ok: true, located: true };
      }

      if (Auth?.user && this.wantsComposer(m) && this.isBuildTask(m)) {
        const q = await this.queueCoder(m, 'composer');
        GlobeDeck?.setThinking(false);
        if (q.text && !q.error) {
          return this._applyResponse({ ...q, label: q.label || 'Astranov Coders', team: true }, m);
        }
      }

      const r = await AciCli.api({
        mode: 'coders_chat',
        message: m,
        history: this.history.slice(-10),
        fallback_prefs: this.fallbackPrefs,
      });

      if (r.error) {
        if (Auth?.user) {
          const q = await this.queueCoder(m, 'grok');
          if (q.text && !q.error) {
            GlobeDeck?.setThinking(false);
            return this._applyResponse({ ...q, text: q.text, team: true }, m);
          }
        }
        GlobeDeck?.setThinking(false);
        GlobeDeck?.showError('Coders: ' + r.error);
        return r;
      }

      if (Auth?.user && !r.text && !r.response && this.isBuildTask(m)) {
        const q = await this.queueCoder(m, 'grok');
        if (q.text) {
          r.text = q.text;
          r.response = q.text;
          r.summon_id = q.summon_id;
          r.composer_queued = q.composer_queued;
        }
      }

      GlobeDeck?.setThinking(false);
      return this._applyResponse(r, m);
    } catch (e) {
      GlobeDeck?.setThinking(false);
      const msg = String(e.message || e);
      GlobeDeck?.showError('Coders failed: ' + msg);
      if (Auth?.user) {
        const q = await this.queueCoder(m, 'grok');
        if (q.text) return this._applyResponse({ ...q, team: true }, m);
      }
      return { error: msg };
    }
  },

  async handleCodersCommand(rest) {
    return this.handleMessage(rest ? ('coders ' + rest) : 'coders');
  },

  async openTeam(intro) {
    await this.autoStart();
    const msg = intro && intro.trim().length > 0 ? intro.trim() : 'online';
    return this.chat(msg);
  },

  async summon(task) {
    return this.chat(task);
  },
};
window.AciCoders = AciCoders;