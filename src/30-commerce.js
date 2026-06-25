// ── COMMERCE: real vendors, menu, orders (no drone simulation) ──
const Commerce = {
  vendors: [],
  markers: [],
  selected: null,
  cart: {},
  _uiReady: false,

  haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  userLatLng() {
    if (userLocated && window._lastPos) return { lat: window._lastPos.lat, lng: window._lastPos.lng };
    return { lat: 36.4239, lng: 28.2245 };
  },

  defaultMenu(vendor) {
    const cat = String(vendor.category || '').toLowerCase();
    const name = String(vendor.name || '').toLowerCase();
    if (/bar|restaurant|fast_food|food|bakery/.test(cat) || /goals|pizza|πιτο|pit/.test(name)) {
      return [
        { name: 'Μπύρα', price: 4 },
        { name: 'Τσιγάρα', price: 5.5 },
        { name: 'Πιτογύρα', price: 3.5 },
        { name: 'Νερό', price: 1.5 },
      ];
    }
    if (/supermarket|shop/.test(cat)) {
      return [{ name: 'Ψωμί', price: 2 }, { name: 'Γάλα', price: 1.8 }, { name: 'Νερό', price: 1 }];
    }
    if (/pharmacy/.test(cat)) {
      return [{ name: 'Παυσίπονο', price: 6 }, { name: 'Βιταμίνες', price: 12 }];
    }
    return [{ name: 'Είδος 1', price: 5 }, { name: 'Είδος 2', price: 8 }];
  },

  menuFor(vendor) {
    const items = Array.isArray(vendor.items) ? vendor.items.filter(i => i && i.name) : [];
    return items.length ? items : this.defaultMenu(vendor);
  },

  async loadVendors() {
    try {
      const r = await fetch(SB_URL + '/rest/v1/vendors?select=id,name,emoji,lat,lng,category,items,is_active,delivery_enabled&is_active=eq.true&limit=80', {
        headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY },
      });
      this.vendors = r.ok ? await r.json() : [];
    } catch { this.vendors = []; }
    const u = this.userLatLng();
    this.vendors.sort((a, b) => this.haversineKm(u.lat, u.lng, a.lat, a.lng) - this.haversineKm(u.lat, u.lng, b.lat, b.lng));
    this.showOnGlobe();
    return this.vendors;
  },

  flyToVendor(v) {
    if (!v || v.lat == null) return;
    const p = latLngToPos(v.lat, v.lng, 1.03);
    if (typeof flyToPoint === 'function') flyToPoint(new THREE.Vector3(p.x, p.y, p.z), 1.42);
    MapDepict?.action('vendor', { lat: v.lat, lng: v.lng, detail: v.name });
  },

  showOnGlobe() {
    this.markers.forEach(m => { if (m.parent) m.parent.remove(m); });
    this.markers = [];
    if (!this.vendors.length) return;
    MapDepict?.action('vendor', { vendors: this.vendors, detail: this.vendors.length + ' shops' });
    this.vendors.forEach(v => {
      const p = latLngToPos(v.lat, v.lng, 1.028);
      const col = /bar|restaurant|fast_food|food/.test(v.category || '') ? 0xff8844 : 0xffcc44;
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), new THREE.MeshBasicMaterial({ color: col }));
      m.position.set(p.x, p.y, p.z);
      m.userData = { vendor: v };
      globePivot.add(m);
      this.markers.push(m);
    });
    this.flyToVendor(this.vendors[0]);
  },

  initUI() {
    if (this._uiReady) return;
    this._uiReady = true;
    const panel = document.getElementById('vendor-menu');
    document.getElementById('vm-close')?.addEventListener('click', () => this.hideMenu());
    document.getElementById('vm-back')?.addEventListener('click', () => this.showPicker());
    document.getElementById('vm-place')?.addEventListener('click', () => this.placeCart());
    if (panel) panel.addEventListener('click', e => e.stopPropagation());
  },

  showMenu() {
    this.initUI();
    document.getElementById('vendor-menu')?.classList.add('open');
  },

  hideMenu() {
    document.getElementById('vendor-menu')?.classList.remove('open');
    this.selected = null;
    this.cart = {};
  },

  async showPicker(filter) {
    await this.loadVendors();
    this.showMenu();
    this.selected = null;
    this.cart = {};
    const list = document.getElementById('vm-list');
    const detail = document.getElementById('vm-detail');
    if (list) list.style.display = 'block';
    if (detail) detail.style.display = 'none';
    const title = document.getElementById('vm-title');
    if (title) title.textContent = 'Επίλεξε κατάστημα · ' + this.vendors.length;

    let rows = this.vendors;
    if (filter) {
      const q = filter.toLowerCase();
      rows = this.vendors.filter(v => (v.name + ' ' + v.category).toLowerCase().includes(q));
      if (!rows.length) rows = this.vendors;
    }

    if (!list) return;
    list.innerHTML = '';
    const u = this.userLatLng();
    rows.slice(0, 24).forEach(v => {
      const km = this.haversineKm(u.lat, u.lng, v.lat, v.lng).toFixed(1);
      const row = document.createElement('div');
      row.className = 'vm-vendor';
      row.innerHTML = '<span style="font-size:22px">' + (v.emoji || '🏪') + '</span><div><div style="color:#fda;font-weight:600">' + v.name + '</div><div style="color:#9ab;font-size:10px">' + (v.category || 'shop') + ' · ' + km + ' km</div></div>';
      row.onclick = () => this.openVendor(v);
      list.appendChild(row);
    });
    if (rows[0]) this.flyToVendor(rows[0]);
    ACIControl?.reply('Tap vendor on globe or list — ' + rows.length + ' shops');
  },

  openVendor(vendor) {
    if (!vendor) return;
    this.selected = vendor;
    this.cart = {};
    this.flyToVendor(vendor);
    this.showMenu();
    const list = document.getElementById('vm-list');
    const detail = document.getElementById('vm-detail');
    if (list) list.style.display = 'none';
    if (detail) detail.style.display = 'block';
    const title = document.getElementById('vm-title');
    if (title) title.textContent = (vendor.emoji || '🏪') + ' ' + vendor.name;
    this.renderCart();
    AciCli?.print('vendor: ' + vendor.name + ' — add items, tap Παραγγελία', 'ok');
  },

  renderCart() {
    const box = document.getElementById('vm-items');
    if (!box || !this.selected) return;
    const menu = this.menuFor(this.selected);
    box.innerHTML = '';
    menu.forEach(item => {
      const key = item.name;
      const qty = this.cart[key] || 0;
      const row = document.createElement('div');
      row.className = 'vm-item';
      row.innerHTML = '<span>' + item.name + ' <small style="color:#9ab">' + (item.price || 0) + ' AVC</small></span>';
      const q = document.createElement('div');
      q.className = 'vm-qty';
      const minus = document.createElement('button');
      minus.textContent = '−';
      minus.onclick = () => { this.cart[key] = Math.max(0, (this.cart[key] || 0) - 1); this.renderCart(); };
      const span = document.createElement('span');
      span.textContent = String(qty);
      span.style.minWidth = '18px';
      span.style.textAlign = 'center';
      const plus = document.createElement('button');
      plus.textContent = '+';
      plus.onclick = () => { this.cart[key] = (this.cart[key] || 0) + 1; this.renderCart(); };
      q.append(minus, span, plus);
      row.appendChild(q);
      box.appendChild(row);
    });
    const total = menu.reduce((s, i) => s + (this.cart[i.name] || 0) * (i.price || 0), 0);
    const btn = document.getElementById('vm-place');
    if (btn) btn.textContent = total > 0 ? 'Παραγγελία · ' + total.toFixed(1) + ' AVC' : 'Παραγγελία';
  },

  cartItems() {
    const menu = this.menuFor(this.selected || {});
    return menu
      .filter(i => (this.cart[i.name] || 0) > 0)
      .map(i => ({ name: i.name, qty: this.cart[i.name], price: i.price }));
  },

  async placeCart() {
    const vendor = this.selected;
    const items = this.cartItems();
    if (!vendor) { ACIControl?.reply('Pick a vendor first'); return; }
    if (!items.length) { ACIControl?.reply('Add at least one item'); return; }
    if (!Auth?.user) {
      ACIControl?.reply('Sign in to place order');
      Auth?.signInGoogle();
      return;
    }
    await this.placeOrder(vendor, items);
  },

  async placeOrder(vendor, items, notes) {
    requestLocationIfNeeded(async () => {
      let dLat = this.userLatLng().lat;
      let dLng = this.userLatLng().lng;
      if (userLocated && window._lastPos) {
        dLat = window._lastPos.lat;
        dLng = window._lastPos.lng;
      }
      const total = items.reduce((s, i) => s + (i.qty || 1) * (i.price || 0), 0);
      let orderResult = null;
      let errMsg = '';
      try {
        const headers = Auth?.authHeaders ? await Auth.authHeaders() : sbHeaders();
        const r = await fetch(SB_URL + '/functions/v1/order-intake', {
          method: 'POST', headers,
          body: JSON.stringify({
            vendor_id: vendor.id,
            items: items.map(i => ({ name: i.name, qty: i.qty || 1, price: i.price })),
            delivery_lat: dLat,
            delivery_lng: dLng,
            notes: notes || ('Astranov order · ' + vendor.name),
            calc: { total_avc: total },
          }),
        });
        const j = await r.json().catch(() => ({}));
        if (r.ok) orderResult = j;
        else errMsg = j.error || j.message || ('HTTP ' + r.status);
      } catch (e) { errMsg = String(e.message || e); }

      const driverObj = orderResult?.driver;
      const driver = driverObj?.name || orderResult?.order?.driver_name || (orderResult?.seeking_driver ? 'seeking driver' : null);
      const ordId = orderResult?.order?.short_id || orderResult?.order?.id;

      MapDepict?.action('order', {
        lat: dLat, lng: dLng,
        vendorLat: vendor.lat, vendorLng: vendor.lng,
        detail: vendor.name + (ordId ? ' · ' + ordId : ''),
      });
      if (window.DrivingView) DrivingView.setDestination(vendor.lat, vendor.lng);

      let msg;
      if (orderResult?.order) {
        msg = orderResult.seeking_driver
          ? 'Παραγγελία ' + (ordId || '') + ' στο ' + vendor.name + '. Αναζητούμε οδηγό — claim στο CLI.'
          : 'Παραγγελία ' + (ordId || '') + ' στο ' + vendor.name + '. Οδηγός: ' + (driver || 'pending') + '.';
        this.hideMenu();
      } else {
        msg = 'Παραγγελία απέτυχε: ' + (errMsg || 'server error') + '. Δοκίμασε ξανά.';
      }

      ACIControl?.reply(msg);
      AciCli?.print(msg, orderResult?.order ? 'ok' : 'err');
      FieldBrain?.pulse('order', vendor.name + ' → ' + (driver || 'pending'), { role: 'client' });
      if (Voice.maySpeak()) speak(msg.slice(0, 120), () => resumeListening());
    });
  },

  announceVendors() {
    this.showPicker();
  },

  async openOrderFlow(query) {
    await this.loadVendors();
    if (!this.vendors.length) {
      ACIControl?.reply('No vendors on map yet');
      return;
    }
    const q = String(query || '').trim();
    if (q.length >= 2) {
      const hit = this.vendors.find(v => (v.name + ' ' + v.category).toLowerCase().includes(q.toLowerCase()));
      if (hit) { this.openVendor(hit); return; }
    }
    this.showPicker(q.length >= 2 ? q : '');
  },

  async orderPitogyra() {
    await this.openOrderFlow('goals');
  },
};