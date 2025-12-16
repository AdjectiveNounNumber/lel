const visualiser = document.getElementById("visualiser");
const scene = document.getElementById("scene");

const infoPanel = document.getElementById("infoPanel");
const infoOverlay = document.getElementById("infoOverlay");
const closePanel = document.getElementById("closePanel");
const panelTitle = document.getElementById("panelTitle");
const panelSteps = document.getElementById("panelSteps");
const panelSequence = document.getElementById("panelSequence");

let nodes = {};
let links = [];
let queue = [{ value: 1, parent: null }];

const repulsion = -50;
const attraction = 0.3;
const friction = 0.8;

/* ---------- Collatz ---------- */
const collatzNext = n => n % 2 === 0 ? n / 2 : 3 * n + 1;

function predecessors(n) {
    const out = [n * 2];
    if ((n - 1) % 3 === 0) {
        const p = (n - 1) / 3;
        if (p > 0 && p % 2) out.push(p);
    }
    return out;
}

function collatzPath(n) {
    const path = [];
    while (n !== 1) {
        path.push(n);
        n = collatzNext(n);
    }
    path.push(1);
    return path;
}

/* ---------- Biased queue pick ---------- */
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

/* ---------- Nodes ---------- */
function createNode(value, parent) {
    const angle = Math.random() * Math.PI * 2;
    const r = 80;
    const x = parent ? parent.x + Math.cos(angle) * r : (Math.random() - 0.5) * 600;
    const y = parent ? parent.y + Math.sin(angle) * r : (Math.random() - 0.5) * 600;

    const el = document.createElement("div");
    el.className = "node";
    el.textContent = value;
    scene.appendChild(el);

    el.onclick = e => {
        e.stopPropagation();
        const path = collatzPath(value);
        panelTitle.textContent = value;
        panelSteps.textContent = `Steps: ${path.length - 1}`;
        renderPanelPath(path);
        infoPanel.classList.add("open");
        infoOverlay.classList.add("visible");
    };

    nodes[value] = { value, x, y, vx: 0, vy: 0, el };
}

/* ---------- Panel ---------- */
function renderPanelPath(path) {
    panelSequence.innerHTML = "";
    path.forEach((n, i) => {
        const s = document.createElement("span");
        s.textContent = n;
        s.style.margin = "0 6px";
        s.style.padding = "6px 10px";
        s.style.borderRadius = "50%";
        s.style.background = "#007bff";
        s.style.color = "white";
        panelSequence.appendChild(s);
    });
}

closePanel.onclick = () => {
    infoPanel.classList.remove("open");
    infoOverlay.classList.remove("visible");
};

/* ---------- Simulation ---------- */
function step() {
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

    for (const v in nodes) {
        const n = nodes[v];
        n.vx *= friction;
        n.vy *= friction;
        n.x += n.vx;
        n.y += n.vy;
        n.el.style.left = n.x + "px";
        n.el.style.top = n.y + "px";
    }
}

/* ---------- Growth ---------- */
function grow() {
    if (queue.length === 0) return;
    const { value, parent } = pickBiasedFromQueue(queue);
    if (nodes[value]) return;

    createNode(value, parent ? nodes[parent] : null);

    predecessors(value).forEach(p => {
        if (!nodes[p]) queue.push({ value: p, parent: value });
    });
}

/* ---------- Main loop ---------- */
function animate() {
    if (Math.random() < 0.02) grow();
    step();
    requestAnimationFrame(animate);
}

grow();
animate();
