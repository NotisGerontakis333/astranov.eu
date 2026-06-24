// === SAT RADIO HANDHELD — EU PMR triband global SIM ===
const SatRadio = {
  open: false,
  mesh: null,
  pttActive: false,
  config: {
    pmrChannel: 11,
    pmrFreqMHz: 446.13125,
    pmrLabel: 'EU PMR 11',
    bands: ['UHF 403–470 MHz', 'VHF 156 MHz marine', 'SAT L-band global'],
    sim: 'Virtual Global SIM · roaming',
    callsign: 'ASTRANOV-AXAS'
  },

  show() {
    this.open = true;
    const panel = document.getElementById('sat-radio');
    if (panel) {
      panel.classList.add('open');
      panel.querySelector('.sr-freq').textContent = this.config.pmrFreqMHz + ' MHz';
      panel.querySelector('.sr-ch').textContent = this.config.pmrLabel;
      panel.querySelector('.sr-sim').textContent = this.config.sim;
      panel.querySelector('.sr-bands').textContent = this.config.bands.join(' · ');
    }
    this.spawnHandheld();
    const up = window._lastPos || { lat: 36.22, lng: 28.12 };
    MapDepict.action('vhf', { lat: up.lat, lng: up.lng, detail: this.config.pmrLabel + ' ' + this.config.pmrFreqMHz });
    ACIControl.reply('Triband SAT radio · ' + this.config.pmrLabel + ' · ' + this.config.pmrFreqMHz + ' MHz — PTT to transmit');
    speak('Triband satellite radio ready. EU PMR channel eleven, four four six megahertz. PTT όταν είσαι έτοιμος.', () => {
      if (recognition) { isListening = true; try { recognition.start(); } catch { isListening = false; } }
    });
  },

  hide() {
    this.open = false;
    this.pttActive = false;
    document.getElementById('sat-radio')?.classList.remove('open');
    if (this.mesh?.parent) this.mesh.parent.remove(this.mesh);
    this.mesh = null;
    if (Comms) Comms.vhfActive = false;
  },

  spawnHandheld() {
    if (this.mesh?.parent) this.mesh.parent.remove(this.mesh);
    const up = window._lastPos || { lat: 36.22, lng: 28.12 };
    const p = latLngToPos(up.lat + 0.06, up.lng + 0.04, 1.048);
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.07, 0.018),
      new THREE.MeshBasicMaterial({ color: 0x223344 })
    );
    g.add(body);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.032, 0.022),
      new THREE.MeshBasicMaterial({ color: 0x00ccaa })
    );
    screen.position.set(0, 0.008, 0.01);
    g.add(screen);
    const ant = new THREE.Mesh(
      new THREE.CylinderGeometry(0.003, 0.003, 0.055, 6),
      new THREE.MeshBasicMaterial({ color: 0x888899 })
    );
    ant.position.set(0, 0.05, 0);
    g.add(ant);
    const satLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.005, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0x00ff88 })
    );
    satLed.position.set(0.02, 0.03, 0.012);
    g.add(satLed);
    g.position.set(p.x, p.y, p.z);
    g.lookAt(0, 0, 0);
    globePivot.add(g);
    this.mesh = g;
    AIGraphics?.spawnEffect(g.position, 0xffdd44, 20, 45);
  },

  formatTx(msg) {
    return '[' + this.config.callsign + '] [' + this.config.pmrLabel + ' ' + this.config.pmrFreqMHz + ' MHz] [TRIBAND SAT SIM] ' + msg;
  },

  transmit(msg) {
    const tx = this.formatTx(msg);
    ACIControl.reply(tx.slice(0, 220));
    try { navigator.clipboard.writeText(tx); } catch (_) {}
    ACI?.feed('vhf-tx', tx.slice(0, 120));
    if (this.mesh) AIGraphics?.spawnEffect(this.mesh.position, 0xffdd44, 12, 30);
    speak('PMR eleven transmitted. ' + msg.slice(0, 100), () => {});
    return tx;
  },

  bindUI() {
    const ptt = document.getElementById('sr-ptt');
    const close = document.getElementById('sr-close');
    if (ptt) {
      ptt.onmousedown = ptt.ontouchstart = (e) => { e.preventDefault(); this.pttActive = true; ptt.classList.add('active'); };
      const up = () => { this.pttActive = false; ptt.classList.remove('active'); };
      ptt.onmouseup = ptt.onmouseleave = ptt.ontouchend = up;
    }
    if (close) close.onclick = () => { this.hide(); if (recognition) recognition.onresult = handleVoiceCommand; };
  }
};
window.SatRadio = SatRadio;