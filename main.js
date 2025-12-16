// ====== Core setup ======
const visualiser = document.getElementById('visualiser');
const scene = document.getElementById('scene');

const repulsion = -50;
const attraction = 0.3;
const friction = 0.8;

let nodes = {};
let links = [];
let followNodeId = null;

// ====== Camera ======
let camera = { x: 0, y: 0, scale: 1 };
const minScale = 0.1;
const maxScale = 5;

function updateCameraTransform() {
    scene.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`;
}

function centerCameraOnOrigin() {
    const r = visualiser.getBoundingClientRect();
    camera.x = r.width / 2;
    camera.y = r.height / 2;
    camera.scale = 1;
    updateCameraTransform();
}
centerCameraOnOrigin();

// ====== Collatz helpers ======
function predecessors(n) {
    const preds = [n * 2];
    if ((n - 1) % 3 === 0) {
        const p = (n - 1) / 3;
        if (p > 0 && p % 2 !== 0) preds.push(p);
    }
    return preds;
}

function collatzNext(n) {
    return n % 2 === 0 ? n / 2 : 3 * n + 1;
}

function collatzPathToOne(start) {
    const path = [];
    let n = start;
    while (n !== 1) {
        path.push(n);
        n = collatzNext(n);
    }
    path.push(1);
    return path;
}

// ====== Biased queue selection (LOW values favored, HIGH allowed) ======
function pickBiasedFromQueue(queue) {
    const bias = 1.2;
    let total = 0;
    const weights = queue.map(q => {
        const w = 1 / Math.pow(Math.log2(q.value + 2), bias);
        total += w;
        return w;
    });

    let r = Math.random() * total;
    for (let i = 0; i < queue.length; i++) {
        r -= weights[i];
        if (r <= 0) return queue.splice(i, 1)[0];
    }
    return queue.shift();
}

// ====== Incremental node creation ======
let queue = [{ value: 1, parentValue: null }];
const maxNodes = 20000000000000000000;

function addNextNodeFromQueue() {
    if (!queue.length) return;

    const { value, parentValue } = pickBiasedFromQueue(queue);
    if (nodes[value]) return;

    let x = 0, y = 0;
    if (parentValue !== null && nodes[parentValue]) {
        const p = nodes[parentValue];
        const a = Math.random() * Math.PI * 2;
        x = p.x + Math.cos(a) * 80;
        y = p.y + Math.sin(a) * 80;
    } else {
        x = (Math.random() - 0.5) * 600;
        y = (Math.random() - 0.5) * 600;
    }

    nodes[value] = { value, x, y, vx: 0, vy: 0, element: null };
    createOrUpdateNodeElement(value);

    if (parentValue !== null) {
        links.push({ source: parentValue, target: value });
    }

    predecessors(value).forEach(p => {
        if (!nodes[p]) queue.push({ value: p, parentValue: value });
    });
}

// ====== Drawing ======
function createOrUpdateNodeElement(value) {
    const n = nodes[value];
    if (!n.element) {
        const el = document.createElement('div');
        el.className = 'node';
        el.textContent = value;
        scene.appendChild(el);
        n.element = el;

        el.onclick = e => {
            e.stopPropagation();
            const path = collatzPathToOne(value);
            document.getElementById('panelTitle').textContent = value;
            document.getElementById('panelSteps').textContent = `Steps: ${path.length - 1}`;
            renderPanelPath(path);
            document.getElementById('infoPanel').classList.add('open');
            document.getElementById('infoOverlay').classList.add('visible');
        };
    }
    n.element.style.left = `${n.x}px`;
    n.element.style.top = `${n.y}px`;
}

function renderPanelPath(path) {
    const panel = document.getElementById('panelSequence');
    panel.innerHTML = '';
    path.forEach(v => {
        const s = document.createElement('span');
        s.textContent = v;
        s.style.margin = '0 6px';
        s.style.padding = '6px 10px';
        s.style.borderRadius = '50%';
        s.style.background = '#007bff';
        s.style.color = 'white';
        panel.appendChild(s);
    });
}

// ====== Simulation ======
function updateSimulation() {
    for (const a in nodes) {
        for (const b in nodes) {
            if (a === b) continue;
            const A = nodes[a], B = nodes[b];
            const dx = A.x - B.x;
            const dy = A.y - B.y;
            const d = Math.hypot(dx, dy) || 1;
            if (d < 500) {
                const f = -repulsion / d;
                A.vx += dx * f / d;
                A.vy += dy * f / d;
            }
        }
    }

    for (const k in nodes) {
        const n = nodes[k];
        n.vx *= friction;
        n.vy *= friction;
        n.x += n.vx;
        n.y += n.vy;
    }
}

// ====== Main loop ======
function animate() {
    if (Math.random() < 0.02) addNextNodeFromQueue();
    updateSimulation();
    for (const v in nodes) createOrUpdateNodeElement(v);
    requestAnimationFrame(animate);
}

addNextNodeFromQueue();
animate();
