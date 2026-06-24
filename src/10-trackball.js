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

function onGlobeClick(e) {
  if (dragging) return;
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(earth);
  if (intersects.length > 0) {
    const point = intersects[0].point;
    focusOnGlobePoint(point);
    cityLevel = camera.position.z < 2.2;

    const markerHits = raycaster.intersectObject(window._meMarker, true);
    if (markerHits.length > 0) {
      if (voiceEnabled) startVoiceOptions();
      else toggleKryfto();
      return;
    }

    const gLocal = latLngToPos(36.2, 28.1, 1.04);
    const gWorld = new THREE.Vector3(gLocal.x, gLocal.y, gLocal.z).applyMatrix4(globePivot.matrixWorld);
    if (point.distanceTo(gWorld) < 0.22) groupOrder();
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
