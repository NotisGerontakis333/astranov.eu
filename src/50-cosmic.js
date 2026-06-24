// ── COSMIC ZOOM: Earth → satellites → solar system → galaxy ──
const CosmicZoom = {
  level: 'earth',
  solarGroup: null,
  galaxyPts: null,
  satGroup: null,
  issMarker: null,

  init() {
    this.solarGroup = new THREE.Group();
    this.solarGroup.visible = false;
    scene.add(this.solarGroup);
    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffcc33 }));
    this.solarGroup.add(sun);
    const planets = [
      { n: 'Mercury', c: 0xaaaaaa, r: 0.04, dist: 0.7, sp: 0.004 },
      { n: 'Venus', c: 0xddbb88, r: 0.06, dist: 1.0, sp: 0.003 },
      { n: 'Mars', c: 0xff6644, r: 0.05, dist: 1.5, sp: 0.0025 },
      { n: 'Jupiter', c: 0xccaa77, r: 0.12, dist: 2.2, sp: 0.0015 },
      { n: 'Saturn', c: 0xddcc99, r: 0.1, dist: 3.0, sp: 0.001 }
    ];
    planets.forEach((p, i) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(p.r, 10, 10), new THREE.MeshBasicMaterial({ color: p.c }));
      m.userData = { dist: p.dist, speed: p.sp, phase: i };
      this.solarGroup.add(m);
    });
    const gPos = [];
    for (let i = 0; i < 6000; i++) {
      const arm = (i % 4) * 0.4;
      const t = Math.random() * Math.PI * 2;
      const rad = 8 + Math.random() * 25 + arm * 3;
      gPos.push(Math.cos(t) * rad, (Math.random() - 0.5) * 2, Math.sin(t) * rad);
    }
    const gGeo = new THREE.BufferGeometry();
    gGeo.setAttribute('position', new THREE.Float32BufferAttribute(gPos, 3));
    this.galaxyPts = new THREE.Points(gGeo, new THREE.PointsMaterial({ color: 0xaaccff, size: 0.04, sizeAttenuation: true, transparent: true, opacity: 0.6 }));
    this.galaxyPts.visible = false;
    scene.add(this.galaxyPts);
    this.satGroup = new THREE.Group();
    globePivot.add(this.satGroup);
    this.spawnStarlinkShell();
    this.trackISS();
    setInterval(() => this.trackISS(), 30000);
  },

  spawnStarlinkShell() {
    for (let i = 0; i < 120; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = 1.06 + (i % 5) * 0.008;
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.003, 4, 4), new THREE.MeshBasicMaterial({ color: 0x88aaff }));
      m.position.set(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
      m.userData = { orb: i * 0.01, r };
      this.satGroup.add(m);
    }
    const iss = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00ffcc }));
    iss.userData = { type: 'iss' };
    this.satGroup.add(iss);
    this.issMarker = iss;
  },

  async trackISS() {
    try {
      const r = await fetch('https://api.open-notify.org/iss-now.json');
      const j = await r.json();
      if (j.iss_position && this.issMarker) {
        const lat = parseFloat(j.iss_position.latitude);
        const lng = parseFloat(j.iss_position.longitude);
        const p = latLngToPos(lat, lng, 1.065);
        this.issMarker.position.set(p.x, p.y, p.z);
        window._lastPos = window._lastPos || {};
      }
    } catch {}
  },

  update(camZ) {
    let level = 'earth', label = 'EARTH';
    if (camZ > 14) { level = 'galaxy'; label = 'GALAXY'; }
    else if (camZ > 6) { level = 'system'; label = 'SOLAR SYSTEM'; }
    else if (camZ > 3.5) { level = 'orbit'; label = 'ORBIT — ISS · STARLINK'; }
    if (level !== this.level) this.level = level;
    const zl = document.getElementById('zoom-label');
    if (zl) zl.textContent = label + ' (z=' + camZ.toFixed(1) + ')';
    globePivot.visible = camZ < 12;
    if (this.solarGroup) this.solarGroup.visible = camZ > 5 && camZ < 18;
    if (this.galaxyPts) this.galaxyPts.visible = camZ > 12;
    if (this.satGroup) this.satGroup.visible = camZ < 10;
    if (this.solarGroup && this.solarGroup.visible) {
      const t = Date.now() * 0.001;
      this.solarGroup.children.forEach((c, i) => {
        if (i === 0 || !c.userData.dist) return;
        const a = t * c.userData.speed * 200 + c.userData.phase;
        c.position.set(Math.cos(a) * c.userData.dist, Math.sin(a * 0.3) * 0.2, Math.sin(a) * c.userData.dist);
      });
    }
    if (this.satGroup) {
      const t = Date.now() * 0.0003;
      this.satGroup.children.forEach((c, i) => {
        if (c.userData.type === 'iss') return;
        if (c.userData.orb != null) {
          const a = t + c.userData.orb * 50;
          const r = c.userData.r;
          c.position.x = r * Math.cos(a);
          c.position.z = r * Math.sin(a);
        }
      });
    }
  }
};
