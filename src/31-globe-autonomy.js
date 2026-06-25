// === GLOBE AUTONOMY — visual truth neurons, no babysitting ===
// Every real map action spawns a globe neuron + field memory for the collective brain.

const GLOBE_TRUTH_ANCHORS = [
  { lat: 36.4239, lng: 28.2245, text: 'Rhodes field: locate human, then search vendors — globe zoom is step one.' },
  { lat: 36.42, lng: 28.22, text: 'Real vendor menus only; compare on-map; one tap confirm & pay AVC.' },
  { lat: 36.41, lng: 28.23, text: 'Drivers shown as blue pulses — nearest assign; no fake delivery sim.' },
];

const GlobeAutonomy = {
  _hooked: false,
  _recent: new Map(),
  _debounceEvolve: null,

  principleFor(type, opts) {
    const d = (opts.detail || '').slice(0, 40);
    const map = {
      location: 'Locate human first — zoom globe to user before vendor/driver search.',
      compare: 'Compare real vendor menus on-map; never invent prices (' + d + ').',
      driver: 'Show real online drivers on globe — honest distance.',
      pay: 'Confirm & pay against real AVC balance and real menu items.',
      order: 'Order arc vendor→user; driver assign visible — no babysitting.',
      vendor: 'Real vendors only; empty menu → request fill, not fake items.',
      commerce: 'Smart order autonomy: parse intent, match, suggest, confirm once.',
    };
    return map[type] || null;
  },

  shouldPulse(type) {
    return /^(order|vendor|compare|driver|pay|location|commerce)$/.test(type);
  },

  onMapAction(type, opts = {}) {
    if (!this.shouldPulse(type)) return;
    const lat = opts.lat != null ? opts.lat : (MapDepict?.userPos?.().lat ?? 36.42);
    const lng = opts.lng != null ? opts.lng : (MapDepict?.userPos?.().lng ?? 28.22);
    const key = type + ':' + String(opts.detail || '').slice(0, 36);
    const now = Date.now();
    if (this._recent.has(key) && now - this._recent.get(key) < 45000) return;
    this._recent.set(key, now);

    const principle = this.principleFor(type, opts);
    if (principle && window.ACI?.spawnNeuron) {
      ACI.spawnNeuron(lat, lng, 1.12 + Math.random() * 0.25, principle);
    }

    const action = type === 'order' || type === 'pay' ? 'order' : 'commerce';
    FieldBrain?.pulse(action, (opts.detail || type).slice(0, 180), {
      role: 'client',
      props: { map_type: type, visual_truth: true, lat, lng },
    });

    if (!this._debounceEvolve && Auth?.user) {
      this._debounceEvolve = setTimeout(() => {
        this._debounceEvolve = null;
        ACI?.feed('commerce', 'visual-truth-' + type);
      }, 120000);
    }
  },

  hookMapDepict() {
    if (!window.MapDepict || MapDepict._autonomyHooked) return;
    MapDepict._autonomyHooked = true;
    const orig = MapDepict.action.bind(MapDepict);
    MapDepict.action = (type, opts = {}) => {
      const result = orig(type, opts);
      GlobeAutonomy.onMapAction(type, opts);
      return result;
    };
    const origSearch = MapDepict.showOrderSearch?.bind(MapDepict);
    if (origSearch) {
      MapDepict.showOrderSearch = (opts = {}) => {
        const u = origSearch(opts);
        GlobeAutonomy.onMapAction('commerce', {
          lat: opts.userLat,
          lng: opts.userLng,
          detail: (opts.wantedLabels || []).join(' + ') || 'smart order',
        });
        return u;
      };
    }
  },

  plantAnchors() {
    if (!window.ACI?.spawnNeuron) return;
    GLOBE_TRUTH_ANCHORS.forEach(a => ACI.spawnNeuron(a.lat, a.lng, 1.45, a.text));
  },

  async syncBrain() {
    const r = await ACI?.api({ mode: 'ensure_neurons' });
    if (r?.principles?.length) ACI.syncNeuronsFromPrinciples(r.principles);
    return r;
  },

  init() {
    if (this._hooked) return;
    this._hooked = true;
    this.hookMapDepict();
    this.plantAnchors();
    this.syncBrain().catch(() => {});
    console.log('%c[GlobeAutonomy] visual truth neurons active', 'color:#66ffcc');
  },
};

window.GlobeAutonomy = GlobeAutonomy;