const canvas = document.getElementById('sceneCanvas');
const ctx = canvas.getContext('2d');
const appTitle = document.getElementById('appTitle');
const statusText = document.getElementById('statusText');
const outputLog = document.getElementById('outputLog');
const resetBtn = document.getElementById('resetBtn');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const selectModeBtn = document.getElementById('selectModeBtn');
const moveModeBtn = document.getElementById('moveModeBtn');
const objectList = document.getElementById('objectList');
const selectedObject = document.getElementById('selectedObject');
const highlightBtn = document.getElementById('highlightBtn');
const unhighlightBtn = document.getElementById('unhighlightBtn');
const moveXInput = document.getElementById('moveXInput');
const moveYInput = document.getElementById('moveYInput');
const moveSubmitBtn = document.getElementById('moveSubmitBtn');

const BLEED_X = 0.2;
const BLEED_Z = 0.2;
const state = {
  payload: null,
  selectedObjectId: null,
  mode: 'select',
  zoomScale: 1,
  busy: false,
  objectAnchors: new Map(),
  eventRevision: null,
};

function setBusy(value) {
  state.busy = value;
  document.querySelectorAll('button').forEach((button) => {
    if (button.id !== 'zoomInBtn' && button.id !== 'zoomOutBtn') {
      button.disabled = value;
    }
  });
  [moveXInput, moveYInput].forEach((input) => {
    input.disabled = value;
  });
  statusText.textContent = value ? 'Working...' : 'Ready';
  if (!value) {
    updateSelectedObject();
  }
}

async function getJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function postJson(path, body) {
  setBusy(true);
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.output || `${response.status} ${response.statusText}`);
    }
    applyPayload(payload);
  } catch (error) {
    appendOutput(`ERROR: ${error.message}`);
  } finally {
    setBusy(false);
  }
}

function applyPayload(payload) {
  state.payload = payload;
  document.title = payload.title || 'SHRDLU Blocks';
  appTitle.textContent = payload.title || 'SHRDLU Blocks';
  renderEventLog(payload);
  updateMoveInputs();
  renderObjects();
  updateSelectedObject();
  drawScene();
}

function appendOutput(text) {
  outputLog.textContent = text || '';
  outputLog.scrollTop = outputLog.scrollHeight;
}

function renderEventLog(payload) {
  const events = payload.event_log || [];
  state.eventRevision = payload.event_revision ?? null;
  if (!events.length) {
    appendOutput(payload.output || '');
    return;
  }
  const lines = events.map((event) => {
    const status = event.ok ? 'OK' : 'ERROR';
    const result = event.result ? ` -> ${event.result}` : '';
    return `[${event.revision}] ${event.kind}: ${event.label} (${status})${result}`;
  });
  appendOutput(lines.join('\n'));
}

function rgb(color, alpha = 1) {
  const values = color && color.rgb ? color.rgb : [160, 160, 160];
  return `rgba(${values[0]}, ${values[1]}, ${values[2]}, ${alpha})`;
}

function objectLabel(obj) {
  const tags = obj.tags || {};
  const pieces = [];
  if (tags.size) pieces.push(tags.size);
  if (tags.height && tags.height !== tags.size) pieces.push(tags.height);
  if (tags.color) pieces.push(tags.color);
  if (tags.kind) pieces.push(tags.kind);
  const base = pieces.length ? pieces.join(' ') : (obj.kind || 'object');
  return `${base} #${obj.obj_id}`;
}

function renderObjects() {
  objectList.textContent = '';
  const objects = state.payload?.scene?.objects || [];
  for (const obj of objects) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `object-row${obj.obj_id === state.selectedObjectId ? ' selected' : ''}`;
    row.dataset.objectId = obj.obj_id;

    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = rgb(obj.color);

    const name = document.createElement('span');
    name.className = 'object-name';
    name.textContent = objectLabel(obj);

    const pos = document.createElement('span');
    pos.className = 'object-pos';
    pos.textContent = `${obj.position.x.toFixed(2)}, ${obj.position.y.toFixed(2)}`;

    row.append(swatch, name, pos);
    row.addEventListener('click', () => {
      state.selectedObjectId = obj.obj_id;
      renderObjects();
      updateSelectedObject();
      drawScene();
    });
    objectList.append(row);
  }
}

function updateSelectedObject() {
  const obj = selectedObjectData();
  selectedObject.textContent = obj ? objectLabel(obj) : 'None';
  highlightBtn.disabled = state.busy || !obj;
  unhighlightBtn.disabled = state.busy || !obj;
}

function selectedObjectData() {
  const objects = state.payload?.scene?.objects || [];
  return objects.find((obj) => obj.obj_id === state.selectedObjectId) || null;
}

function currentGrasperData() {
  const objects = state.payload?.scene?.objects || [];
  return objects.find((obj) => obj.kind === 'grasper') || null;
}

function updateMoveInputs(point = null, force = false) {
  const nextPoint = point || currentGrasperData()?.position;
  if (!nextPoint) return;
  const inputIsActive = (
    document.activeElement === moveXInput ||
    document.activeElement === moveYInput
  );
  if (!force && inputIsActive) return;
  moveXInput.value = Number(nextPoint.x).toFixed(2);
  moveYInput.value = Number(nextPoint.y).toFixed(2);
}

function readMoveInputs() {
  const x = Number.parseFloat(moveXInput.value);
  const y = Number.parseFloat(moveYInput.value);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    appendOutput('ERROR: move_grasper requires numeric x and y.');
    return null;
  }
  return {
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
  };
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * ratio));
  const height = Math.max(1, Math.floor(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
}

function sceneZoom() {
  return Math.min(canvas.clientWidth, canvas.clientHeight) * 0.82 * state.zoomScale;
}

function worldPoint(obj, point) {
  return {
    x: obj.position.x + point.x,
    y: obj.position.y + point.y,
    z: obj.position.z + point.z,
  };
}

function transformPoint(point) {
  const zoom = sceneZoom();
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  return {
    x: width / 2 + point.x * zoom,
    y: point.y * zoom,
    z: height / 2 + point.z * zoom,
  };
}

function screenPoint(transformed) {
  return {
    x: transformed.x + BLEED_X * transformed.y,
    y: canvas.clientHeight - (transformed.z + BLEED_Z * transformed.y),
  };
}

function worldToScreen(point) {
  return screenPoint(transformPoint(point));
}

function polygonDepth(points) {
  const ordered = points
    .map((point) => [point.y, -point.x, -point.z])
    .sort((a, b) => compareTuple(b, a));
  return ordered[0] || [0, 0, 0];
}

function compareTuple(a, b) {
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const diff = (a[index] || 0) - (b[index] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function drawScene() {
  resizeCanvas();
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  drawGrid(width, height);

  const objects = state.payload?.scene?.objects || [];
  const polygons = [];
  state.objectAnchors.clear();

  for (const obj of objects) {
    const anchor = worldToScreen(obj.position);
    state.objectAnchors.set(obj.obj_id, anchor);
    for (const surface of obj.surfaces || []) {
      const points = surface.map((point) => worldPoint(obj, point));
      polygons.push({
        obj,
        points,
        screen: points.map(worldToScreen),
        depth: polygonDepth(points),
      });
    }
  }

  polygons.sort((a, b) => compareTuple(b.depth, a.depth));
  for (const polygon of polygons) {
    drawPolygon(polygon);
  }
  drawObjectLabels(objects);
}

function drawGrid(width, height) {
  const center = worldToScreen({x: 0, y: 0, z: 0});
  ctx.save();
  ctx.strokeStyle = '#edf1f2';
  ctx.lineWidth = 1;
  for (let value = -0.5; value <= 0.5001; value += 0.1) {
    const a = worldToScreen({x: -0.5, y: value, z: 0});
    const b = worldToScreen({x: 0.5, y: value, z: 0});
    const c = worldToScreen({x: value, y: -0.5, z: 0});
    const d = worldToScreen({x: value, y: 0.5, z: 0});
    line(a, b);
    line(c, d);
  }
  ctx.fillStyle = '#5f6b70';
  ctx.beginPath();
  ctx.arc(center.x, center.y, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  void width;
  void height;
}

function drawPolygon(polygon) {
  const screen = polygon.screen;
  if (screen.length < 2) return;
  const obj = polygon.obj;
  const highlighted = obj.tags && obj.tags.highlight;
  const selected = obj.obj_id === state.selectedObjectId;
  const flash = highlighted && Math.floor(Date.now() / 450) % 2 === 0;
  const fill = flash ? contrastColor(obj.color) : rgb(obj.color, selected ? 0.95 : 0.82);

  ctx.save();
  ctx.lineJoin = 'round';
  if (screen.length === 2) {
    ctx.strokeStyle = fill;
    ctx.lineWidth = selected ? 4 : 3;
    line(screen[0], screen[1]);
  } else {
    ctx.beginPath();
    ctx.moveTo(screen[0].x, screen[0].y);
    for (let index = 1; index < screen.length; index += 1) {
      ctx.lineTo(screen[index].x, screen[index].y);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = selected ? '#11191b' : 'rgba(20, 26, 28, 0.48)';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.stroke();
  }
  ctx.restore();
}

function contrastColor(color) {
  const values = color && color.rgb ? color.rgb : [160, 160, 160];
  return `rgb(${values[0] < 128 ? 255 : 0}, ${values[1] < 128 ? 255 : 0}, ${values[2] < 128 ? 255 : 0})`;
}

function drawObjectLabels(objects) {
  ctx.save();
  ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  for (const obj of objects) {
    if (obj.kind === 'table') continue;
    const anchor = state.objectAnchors.get(obj.obj_id);
    if (!anchor) continue;
    const text = `#${obj.obj_id}`;
    const width = ctx.measureText(text).width + 10;
    ctx.fillStyle = obj.obj_id === state.selectedObjectId ? '#11191b' : 'rgba(255, 255, 255, 0.86)';
    ctx.strokeStyle = 'rgba(17, 25, 27, 0.25)';
    ctx.lineWidth = 1;
    roundedRect(anchor.x - width / 2, anchor.y - 22, width, 20, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = obj.obj_id === state.selectedObjectId ? '#ffffff' : '#1c2528';
    ctx.textAlign = 'center';
    ctx.fillText(text, anchor.x, anchor.y - 12);
  }
  ctx.restore();
}

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function line(a, b) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function screenToWorldOnTable(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const zoom = sceneZoom();
  const worldY = (canvas.clientHeight / 2 - y) / (BLEED_Z * zoom);
  const worldX = (x - canvas.clientWidth / 2 - BLEED_X * worldY * zoom) / zoom;
  return {
    x: Number(worldX.toFixed(3)),
    y: Number(worldY.toFixed(3)),
  };
}

function nearestObject(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  let best = null;
  for (const [objId, point] of state.objectAnchors.entries()) {
    const distance = Math.hypot(point.x - x, point.y - y);
    if (!best || distance < best.distance) {
      best = {objId, distance};
    }
  }
  return best && best.distance < 48 ? best.objId : null;
}

function setMode(mode) {
  state.mode = mode;
  selectModeBtn.classList.toggle('active', mode === 'select');
  moveModeBtn.classList.toggle('active', mode === 'move');
}

async function refresh(options = {}) {
  const quiet = Boolean(options.quiet);
  try {
    const payload = await getJson('/api/state');
    applyPayload(payload);
    if (!quiet) {
      setBusy(false);
    }
  } catch (error) {
    appendOutput(`ERROR: ${error.message}`);
    statusText.textContent = 'Disconnected';
  }
}

function sendAction(name, args = {}) {
  return postJson('/api/action', {action: {name, args}});
}

resetBtn.addEventListener('click', () => postJson('/api/reset', {}));
zoomInBtn.addEventListener('click', () => {
  state.zoomScale = Math.min(2.4, state.zoomScale * 1.15);
  drawScene();
});
zoomOutBtn.addEventListener('click', () => {
  state.zoomScale = Math.max(0.55, state.zoomScale / 1.15);
  drawScene();
});
selectModeBtn.addEventListener('click', () => setMode('select'));
moveModeBtn.addEventListener('click', () => setMode('move'));

document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => sendAction(button.dataset.action));
});

moveSubmitBtn.addEventListener('click', () => {
  const point = readMoveInputs();
  if (point) sendAction('move_grasper', point);
});

highlightBtn.addEventListener('click', () => {
  const obj = selectedObjectData();
  if (obj) sendAction('highlight_object', {obj_id: obj.obj_id});
});

unhighlightBtn.addEventListener('click', () => {
  const obj = selectedObjectData();
  if (obj) sendAction('unhighlight_object', {obj_id: obj.obj_id});
});

canvas.addEventListener('click', (event) => {
  if (state.busy) return;
  if (state.mode === 'move') {
    const point = screenToWorldOnTable(event.clientX, event.clientY);
    updateMoveInputs(point, true);
    sendAction('move_grasper', point);
    return;
  }
  const objId = nearestObject(event.clientX, event.clientY);
  if (objId !== null) {
    state.selectedObjectId = objId;
    renderObjects();
    updateSelectedObject();
    drawScene();
  }
});

window.addEventListener('resize', drawScene);
window.setInterval(() => {
  if (!state.busy) {
    refresh({quiet: true});
  }
}, 750);

function animationLoop() {
  drawScene();
  window.requestAnimationFrame(animationLoop);
}

refresh();
window.requestAnimationFrame(animationLoop);
