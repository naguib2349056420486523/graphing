const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');
const input = document.getElementById('funcInput');

const config = {
    gridColor: "#333333",
    axisColor: "#ffffff",
    textColor: "#888888",
    lineColor: "#00d2ff",
    lineWidth: 4,
    glow: true
};

let width, height;
let camera = { x: 0, y: 0 }; 
let scale = 40; 
let isDragging = false;
let lastMouse = { x: 0, y: 0 };

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    draw();
}
window.addEventListener('resize', resize);
resize();

function parseAndEvaluate(expression, xVal) {
    let expr = expression.toLowerCase().replace(/\s+/g, '');
    try {
        const mathProps = ['sin', 'cos', 'tan', 'sqrt', 'abs', 'pow', 'log', 'PI', 'E'];
        let jsExpr = expr.replace(/\^/g, '**');
        mathProps.forEach(prop => {
            const regex = new RegExp(`(?<![a-z])${prop}`, 'g');
            jsExpr = jsExpr.replace(regex, `Math.${prop}`);
        });
        const f = new Function('x', `return ${jsExpr};`);
        return f(xVal);
    } 
    catch (e) {
        return NaN;
    }
}

function toMathX(px) { return (px - width / 2) / scale + camera.x; }
function toMathY(py) { return -(py - height / 2) / scale + camera.y; }
function toPixelX(mx) { return (mx - camera.x) * scale + width / 2; }
function toPixelY(my) { return -((my - camera.y) * scale) + height / 2; }

function drawGrid() {
    ctx.lineWidth = 1;
    ctx.font = "12px Arial";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    const left = toMathX(0);
    const right = toMathX(width);
    const bottom = toMathY(height);
    const top = toMathY(0);

    const roughStep = 100 / scale; 
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    let step = magnitude;
    if (roughStep / magnitude > 5) step = magnitude * 10;
    else if (roughStep / magnitude > 2) step = magnitude * 5;
    else if (roughStep / magnitude > 1) step = magnitude * 2;

    const startX = Math.floor(left / step) * step;
    for (let x = startX; x <= right; x += step) {
        const px = toPixelX(x);
        const isAxis = Math.abs(x) < step / 1000;
        
        ctx.strokeStyle = isAxis ? config.axisColor : config.gridColor;
        ctx.lineWidth = isAxis ? 2 : 1;

        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
        ctx.stroke();

        if (!isAxis) {
            ctx.fillStyle = config.textColor;
            ctx.fillText(Number(x.toPrecision(4)), px, toPixelY(0) + 20);
        }
    }

    const startY = Math.floor(bottom / step) * step;
    for (let y = startY; y <= top; y += step) {
        const py = toPixelY(y);
        const isAxis = Math.abs(y) < step / 1000;
        
        ctx.strokeStyle = isAxis ? config.axisColor : config.gridColor;
        ctx.lineWidth = isAxis ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(width, py);
        ctx.stroke();

        if (!isAxis) {
            ctx.fillStyle = config.textColor;
            ctx.fillText(Number(y.toPrecision(4)), toPixelX(0) - 20, py);
        }
    }
}

function drawGraph() {
    const expression = input.value;
    if (!expression) return;

    ctx.beginPath();
    ctx.lineWidth = config.lineWidth;
    ctx.strokeStyle = config.lineColor;
    ctx.lineJoin = "round";

    if(config.glow) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = config.lineColor;
    }

    let isDrawing = false;
    
    for (let px = 0; px < width; px++) {
        const x = toMathX(px);
        const y = parseAndEvaluate(expression, x);

        if (Number.isFinite(y)) {
            const py = toPixelY(y);
            
            if (isDrawing && Math.abs(py - toPixelY(parseAndEvaluate(expression, toMathX(px-1)))) > height) {
                 isDrawing = false;
            }

            if (!isDrawing) {
                ctx.moveTo(px, py);
                isDrawing = true;
            } else {
                ctx.lineTo(px, py);
            }
        } else {
            isDrawing = false;
        }
    }
    ctx.stroke();  
    ctx.shadowBlur = 0;
}

function draw() {
    ctx.fillStyle = "#121212";
    ctx.fillRect(0, 0, width, height);
    drawGrid();
    drawGraph();
}

input.addEventListener('input', draw);

canvas.addEventListener('mousedown', e => {
    isDragging = true;
    lastMouse = { x: e.clientX, y: e.clientY };
});

window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    camera.x -= dx / scale;
    camera.y += dy / scale; 
    lastMouse = { x: e.clientX, y: e.clientY };
    draw();
});

window.addEventListener('mouseup', () => isDragging = false);

canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const zoomIntensity = 0.1;
    const direction = e.deltaY < 0 ? 1 : -1;
    const zoomFactor = 1 + (zoomIntensity * direction);
    const mouseMathX = toMathX(e.clientX);
    const mouseMathY = toMathY(e.clientY);

    scale *= zoomFactor;
    scale = Math.max(0.1, Math.min(scale, 10000));

    const newMouseMathX = toMathX(e.clientX);
    const newMouseMathY = toMathY(e.clientY);

    camera.x -= (newMouseMathX - mouseMathX);
    camera.y -= (newMouseMathY - mouseMathY);

    draw();
},
 { passive: false });