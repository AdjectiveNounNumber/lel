/* ===== DOM ===== */
const visualiser = document.getElementById("visualiser");
const scene = document.getElementById("scene");

const panel = document.getElementById("infoPanel");
const overlay = document.getElementById("infoOverlay");
const closeBtn = document.getElementById("closePanel");

/* ===== Camera ===== */
const camera = { x: 0, y: 0, scale: 1 };
function updateCamera() {
    scene.style.transform =
        `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`;
}
(() => {
    const r = visualiser.getBoundingClientRect();
    camera.x = r.width / 2;
    camera.y = r.height / 2;
    updateCamera();
})();

/* ===== Data ===== */
const nodes = new Map();
const links = [];
let followNode = null;

const MAX_NODES = 1200;

/* ===== Collatz ===== */
const next = n => (n & 1) ? 3 * n + 1 : n >> 1;
const predecessors = n => {
    const p = [n * 2];
    if ((n - 1) % 3 === 0) {
        const v = (n - 1) / 3;
        if (v & 1) p.push(v);
    }
    return p;
};

/* ===== Spatial Hash (KEY OPTIMIZATION) ===== */
const CELL = 200;
const grid = new Map();

function gridKey(x, y) {
    return ((x / CELL) | 0) + "," + ((y / CELL) | 0);
}

function rebuildGrid() {
    grid.clear();
    for (const n of nodes.values()) {
        const k = gridKey(n.x, n.y);
        (grid.get(k) || grid.set(k, []).get(k)).push(n);
    }
}

/* ===== Physics ===== */
const REPULSION = 900;
const ATTRACTION = 0.02;
const FRICTION = 0.85;

function simulate() {
    rebuildGrid();

    for (const n of nodes.values()) {
        const cx = (n.x / CELL) | 0;
        const cy = (n.y / CELL) | 0;

        for (let gx = cx - 1; gx <= cx + 1; gx++) {
            for (let gy = cy - 1; gy <= cy + 1; gy++) {
                const bucket = grid.get(gx + "," + gy);
                if (!bucket) continue;

                for (const m of bucket) {
                    if (m === n) continue;
                    const dx = n.x - m.x;
                    const dy = n.y - m.y;
                    const d2 = dx * dx + dy * dy || 1;
                    const f = REPULSION / d2;
                    n.vx += dx * f;
                    n.vy += dy * f;
                }
            }
        }
    }

    for (const { a, b } of links) {
        const A = nodes.get(a);
        const B = nodes.get(b);
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        A.vx += dx * ATTRACTION;
        A.vy += dy * ATTRACTION;
        B.vx -= dx * ATTRACTION;
        B.vy -= dy * ATTRACTION;
    }

    for (const n of nodes.values()) {
        n.vx *= FRICTION;
        n.vy *= FRICTION;
        n.x += n.vx;
        n.y += n.vy;
        n.el.style.left = n.x + "px";
        n.el.style.top = n.y + "px";
    }
}

/* ===== Node Creation ===== */
function createNode(value, parent = null) {
    if (nodes.has(value)) return;
    if (nodes.size >= MAX_NODES) return;

    const el = document.createElement("div");
    el.className = "node";
    el.textContent = value;
    scene.appendChild(el);

    const node = {
        x: (Math.random() - .5) * 600,
        y: (Math.random() - .5) * 600,
        vx: 0,
        vy: 0,
        el
    };

    nodes.set(value, node);

    if (parent !== null) {
        links.push({ a: parent, b: value });
    }

    for (const p of predecessors(value)) {
        if (!nodes.has(p)) queue.push([p, value]);
    }
}

/* ===== Build ===== */
const queue = [[1, null]];
function expand() {
    if (!queue.length) return;
    const [v, p] = queue.shift();
    createNode(v, p);
}

/* ===== Loop ===== */
function loop() {
    if (Math.random() < 0.5) expand();
    simulate();
    if (followNode && nodes.has(followNode)) {
        const n = nodes.get(followNode);
        camera.x = visualiser.clientWidth / 2 - n.x * camera.scale;
        camera.y = visualiser.clientHeight / 2 - n.y * camera.scale;
        updateCamera();
    }
    requestAnimationFrame(loop);
}

expand();
loop();
