// Trackball — rotate entire globe pivot (earth + atmosphere + clouds + markers)
const canvas = renderer.domElement;
const TRACK_SENS = 0.005;

function trackballMove(clientX, clientY) {
  const dx = clientX - px;
  const dy = clientY - py;
  px = clientX;
  py = clientY;
  globePivot.rotation.y += dx * TRACK_SENS;
  globePivot.rotation.x += dy * TRACK_SENS;
  globePivot.rotation.x = Math.max(-1.25, Math.min(1.25, globePivot.rotation.x));
  trackVelX = dx * TRACK_SENS * 0.35;
  trackVelY = dy * TRACK_SENS * 0.35;
}

function trackballStart(clientX, clientY) {
  drag = true;
  dragging = true;
  px = clientX;
  py = clientY;
  trackVelX = 0;
  trackVelY = 0;
  canvas.classList.add('dragging');
}

function trackballEnd() {
  drag = false;
  canvas.classList.remove('dragging');
  setTimeout(() => { dragging = false; }, 80);
}

canvas.addEventListener('mousedown', e => { if (e.button === 0) trackballStart(e.clientX, e.clientY); });
window.addEventListener('mouseup', () => { if (drag) trackballEnd(); });
canvas.addEventListener('mousemove', e => { if (drag) trackballMove(e.clientX, e.clientY); });

canvas.addEventListener('touchstart', e => {
  if (e.touches.length === 1) { e.preventDefault(); trackballStart(e.touches[0].clientX, e.touches[0].clientY); }
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  if (drag && e.touches.length === 1) { e.preventDefault(); trackballMove(e.touches[0].clientX, e.touches[0].clientY); }
}, { passive: false });
canvas.addEventListener('touchend', () => { if (drag) trackballEnd(); });

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  camera.position.z += e.deltaY * 0.002;
  camera.position.z = Math.max(1.2, Math.min(22, camera.position.z));
  CosmicZoom.update(camera.position.z);
}, { passive: false });

// Handle window resize so canvas always full and correct
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Raycast for globe clicks - focus rotate/zoom on the Earth itself
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

container.addEventListener('click', onGlobeClick);

function globeClickTargets() {
  const targets = [];
  if (window._meMarker) targets.push(window._meMarker);
  if (window.Commerce?.markers) targets.push(...Commerce.markers);
  globePivot.children.forEach(c => {
    if (c.userData?.name || c.userData?.vendor || c.userData?.type === 'me' || c.userData?.type === 'pilot') {
      if (!targets.includes(c)) targets.push(c);
    }
  });
  return targets;
}

function onGlobeClick(e) {
  if (dragging) return;
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const markerHits = raycaster.intersectObjects(globeClickTargets(), true);
  if (markerHits.length > 0) {
    const hit = markerHits[0].object;
    const root = hit.userData?.vendor ? hit : (hit.parent?.userData?.vendor ? hit.parent : hit);
    const ud = root.userData || hit.userData || {};

    if (ud.vendor) {
      MapDepict.action('vendor', { lat: ud.vendor.lat, lng: ud.vendor.lng, detail: ud.vendor.name });
      ACIControl?.reply('Κατάστημα: ' + ud.vendor.name + ' — πες order ή κλικ 🛒');
      Commerce.orderPitogyra();
      return;
    }
    if (ud.type === 'me' || ud.name === (me?.name || 'Αξάς') || root === window._meMarker) {
      if (voiceEnabled) startVoiceOptions();
      else toggleKryfto();
      return;
    }
    if (ud.name) {
      MapDepict.action('explore', { lat: ud.lat, lng: ud.lng, detail: ud.name });
      ACIControl?.reply('User: ' + ud.name);
      if (voiceEnabled) speak('Επιλέχθηκε ' + ud.name + '.', () => {});
      return;
    }
  }

  const intersects = raycaster.intersectObject(earth);
  if (intersects.length > 0) {
    const point = intersects[0].point;
    focusOnGlobePoint(point);
    cityLevel = camera.position.z < 2.2;
    MapDepict.action('explore', { detail: 'globe' });
  }
}

function focusOnGlobePoint(point) {
  const dir = point.clone().normalize();
  const rotY = Math.atan2(dir.x, dir.z);
  globePivot.rotation.y = -rotY;
  const rotX = Math.asin(Math.max(-1, Math.min(1, dir.y)));
  globePivot.rotation.x = Math.max(-1.25, Math.min(1.25, -rotX * 0.7));
  camera.position.z = 1.7;
  cityLevel = camera.position.z < 2.2;
}

// =====================================================
