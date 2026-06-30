//canvas & board 
let board;
let context;
const boardWidth = 800;
const boardHeight = 400;
const groundHeight = 40;
const groundY = boardHeight - groundHeight;

let startScreen;

let gameState = "start"; // start | playing | gameover | locked
let frameCount = 0;
let score = 0;
const maxLives = 3;
let lives = maxLives;
let highScore = Number(localStorage.getItem("marioRunHighScore")) || 0;
let gameSpeed = 4;

const playerWidth = 56;
const playerHeight = 72;
let player = {
    x: 70,
    y: groundY - playerHeight,
    width: playerWidth,
    height: playerHeight
};
let velocityY = 0;
const gravity = 0.6;
const jumpStrength = -12.5;
let isJumping = false;

let obstaclesArray = [];
let nextSpawnFrame = 60;

let clouds = [];
let hills = [];
let groundScrollX = 0;

window.onload = function () {
    board = document.getElementById("board");
    board.width = boardWidth;
    board.height = boardHeight;
    context = board.getContext("2d");
    startScreen = document.getElementById("startScreen");

    initBackground();

    document.addEventListener("keydown", handleInput);
    board.addEventListener("pointerdown", handleInput);
    if (startScreen) startScreen.addEventListener("pointerdown", handleInput);

    requestAnimationFrame(update);
};

function handleInput(e) {
    if (e.type === "keydown" && e.code !== "Space" && e.code !== "ArrowUp") {
        return;
    }
    if (e.type === "keydown") e.preventDefault();

    if (gameState === "start") {
        startGame();
        return;
    }
    if (gameState === "gameover") {
        if (lives > 0) resetGame();
        return;
    }
    if (gameState === "locked") return;
    jump();
}

function jump() {
    if (gameState !== "playing") return;
    if (!isJumping) {
        velocityY = jumpStrength;
        isJumping = true;
        playTone(620, 0.09);
    }
}

function startGame() {
    gameState = "playing";
    if (startScreen) startScreen.classList.add("hidden");
}

function resetGame() {
    score = 0;
    gameSpeed = 4;
    frameCount = 0;
    obstaclesArray = [];
    nextSpawnFrame = 60;
    player.y = groundY - playerHeight;
    velocityY = 0;
    isJumping = false;
    gameState = "playing";
}

function endGame() {
    if (gameState !== "playing") return;
    lives--;
    if (lives <= 0) {
        gameState = "locked";
    } else {
        gameState = "gameover";
    }
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("marioRunHighScore", String(Math.floor(highScore)));
    }
    playTone(160, 0.35);
}

function update() {
    requestAnimationFrame(update);

    context.clearRect(0, 0, boardWidth, boardHeight);

    drawBackground();

    if (gameState === "playing") {
        frameCount++;

        gameSpeed = 4 + Math.min(frameCount / 600, 4);

        velocityY += gravity;
        player.y += velocityY;
        if (player.y >= groundY - playerHeight) {
            player.y = groundY - playerHeight;
            velocityY = 0;
            isJumping = false;
        }

        if (frameCount >= nextSpawnFrame) {
            spawnObstacle();
            nextSpawnFrame = frameCount + 55 + Math.floor(Math.random() * 45);
        }

        for (let i = obstaclesArray.length - 1; i >= 0; i--) {
            const obs = obstaclesArray[i];
            obs.x -= gameSpeed;

            if (isColliding(player, obs)) {
                endGame();
                break;
            }
            if (obs.x + obs.width < 0) {
                obstaclesArray.splice(i, 1);
                score += 1; // +1 point
            }
        }

        score += 0.05;
    }

    // draw obstacles
    for (const obs of obstaclesArray) {
        if (obs.type === "pipe") drawPipe(obs.x, obs.y, obs.width, obs.height);
        else drawGoomba(obs.x, obs.y, obs.width, obs.height, frameCount);
    }

    // draw player
    drawMario(player.x, player.y, player.width, player.height, isJumping, frameCount);

    drawHud();

    if (gameState === "gameover" || gameState === "locked") {
        drawGameOver();
    }
}

function spawnObstacle() {
    const isPipe = Math.random() < 0.5;
    if (isPipe) {
        const h = 45 + Math.floor(Math.random() * 35);
        obstaclesArray.push({
            type: "pipe",
            x: boardWidth,
            y: groundY - h,
            width: 46,
            height: h
        });
    } else {
        const size = 40;
        obstaclesArray.push({
            type: "goomba",
            x: boardWidth,
            y: groundY - size,
            width: size,
            height: size
        });
    }
}

function isColliding(a, b) {
    const pad = 8; 
    return (
        a.x + pad < b.x + b.width &&
        a.x + a.width - pad > b.x &&
        a.y + pad < b.y + b.height &&
        a.y + a.height > b.y
    );
}


// วาดพื้นหลัง

function initBackground() {
    clouds = [
        { x: 100, y: 60, scale: 1 },
        { x: 380, y: 40, scale: 0.8 },
        { x: 600, y: 80, scale: 1.2 }
    ];
    hills = [
        { x: 60, scale: 1 },
        { x: 420, scale: 1.3 },
        { x: 680, scale: 0.9 }
    ];
}

function drawBackground() {
    // sky
    context.fillStyle = "#5C94FC";
    context.fillRect(0, 0, boardWidth, boardHeight);

    // clouds (slow parallax)
    context.fillStyle = "#FFFFFF";
    for (const c of clouds) {
        c.x -= (gameState === "playing" ? gameSpeed * 0.15 : 0);
        if (c.x < -80) c.x = boardWidth + 60;
        drawCloud(c.x, c.y, c.scale);
    }

    // hills (medium parallax)
    context.fillStyle = "#3DA53D";
    for (const h of hills) {
        h.x -= (gameState === "playing" ? gameSpeed * 0.4 : 0);
        if (h.x < -160) h.x = boardWidth + 100;
        drawHill(h.x, groundY, h.scale);
    }

    // ground
    drawGround();
}

function drawCloud(x, y, scale) {
    context.beginPath();
    context.ellipse(x, y, 22 * scale, 14 * scale, 0, 0, Math.PI * 2);
    context.ellipse(x + 18 * scale, y - 8 * scale, 16 * scale, 12 * scale, 0, 0, Math.PI * 2);
    context.ellipse(x + 34 * scale, y, 18 * scale, 13 * scale, 0, 0, Math.PI * 2);
    context.fill();
}

function drawHill(x, baseY, scale) {
    context.beginPath();
    context.moveTo(x - 70 * scale, baseY);
    context.quadraticCurveTo(x, baseY - 90 * scale, x + 70 * scale, baseY);
    context.closePath();
    context.fill();
}

function drawGround() {
    context.fillStyle = "#C84C0C";
    context.fillRect(0, groundY, boardWidth, groundHeight);

    // อิฐ
    groundScrollX -= gameState === "playing" ? gameSpeed : 0;
    const tile = 40;
    if (groundScrollX <= -tile) groundScrollX += tile;

    context.strokeStyle = "#7A2E00";
    context.lineWidth = 2;
    for (let x = groundScrollX - tile; x < boardWidth + tile; x += tile) {
        context.strokeRect(x, groundY, tile, groundHeight);
        context.beginPath();
        context.moveTo(x + tile / 2, groundY);
        context.lineTo(x + tile / 2, groundY + groundHeight);
        context.stroke();
    }
    context.fillStyle = "#2A1A0A";
    context.fillRect(0, groundY, boardWidth, 3);
}

function drawMario(x, y, w, h, jumping, frame) {
    const legSwing = !jumping && Math.floor(frame / 6) % 2 === 0;

    // งอ เอา เงา
    context.fillStyle = "rgba(0,0,0,0.2)";
    context.beginPath();
    context.ellipse(x + w / 2, groundY + 4, w * 0.4, 5, 0, 0, Math.PI * 2);
    context.fill();

    // ขอ อา ขา
    context.fillStyle = "#0D47A1";
    if (legSwing) {
        context.fillRect(x + w * 0.12, y + h * 0.78, w * 0.28, h * 0.22);
        context.fillRect(x + w * 0.6, y + h * 0.70, w * 0.28, h * 0.30);
    } else {
        context.fillRect(x + w * 0.12, y + h * 0.70, w * 0.28, h * 0.30);
        context.fillRect(x + w * 0.6, y + h * 0.78, w * 0.28, h * 0.22);
    }

    // ตอ อัว ตัว
    context.fillStyle = "#0D47A1";
    context.fillRect(x + w * 0.12, y + h * 0.45, w * 0.76, h * 0.35);

    // สอ เอื้อ เสื้อ
    context.fillStyle = "#E52521";
    context.fillRect(x, y + h * 0.40, w, h * 0.18);
    context.fillRect(x - w * 0.06, y + h * 0.42, w * 0.18, h * 0.28);
    context.fillRect(x + w * 0.88, y + h * 0.42, w * 0.18, h * 0.28);

    // กระดม
    context.fillStyle = "#FBD000";
    context.fillRect(x + w * 0.30, y + h * 0.48, w * 0.10, w * 0.10);
    context.fillRect(x + w * 0.60, y + h * 0.48, w * 0.10, w * 0.10);

    // หน้า
    context.fillStyle = "#F7B26A";
    context.fillRect(x + w * 0.18, y + h * 0.10, w * 0.64, h * 0.32);

    // หมอ อวก หมก
    context.fillStyle = "#E52521";
    context.fillRect(x + w * 0.08, y, w * 0.84, h * 0.16);
    context.fillRect(x + w * 0.40, y + h * 0.10, w * 0.46, h * 0.10);

    // หนอ อวด หนวด
    context.fillStyle = "#5A3A1A";
    context.fillRect(x + w * 0.28, y + h * 0.30, w * 0.44, h * 0.07);

    // ตอ อา ตา
    context.fillStyle = "#2A1A0A";
    context.fillRect(x + w * 0.55, y + h * 0.18, w * 0.08, h * 0.08);
}

function drawGoomba(x, y, w, h, frame) {
    const squish = Math.floor(frame / 8) % 2 === 0 ? 0 : 2;

    context.fillStyle = "rgba(0,0,0,0.2)";
    context.beginPath();
    context.ellipse(x + w / 2, groundY + 4, w * 0.45, 5, 0, 0, Math.PI * 2);
    context.fill();

    // ตัว
    context.fillStyle = "#8B4513";
    context.beginPath();
    context.ellipse(x + w / 2, y + h / 2 + squish / 2, w / 2, (h - squish) / 2, 0, 0, Math.PI * 2);
    context.fill();

    // ตีน
    context.fillStyle = "#3D2410";
    context.fillRect(x + w * 0.05, y + h - 6, w * 0.32, 8);
    context.fillRect(x + w * 0.63, y + h - 6, w * 0.32, 8);

    // ตา
    context.fillStyle = "#FFFFFF";
    context.beginPath();
    context.ellipse(x + w * 0.34, y + h * 0.42, w * 0.13, h * 0.15, 0, 0, Math.PI * 2);
    context.ellipse(x + w * 0.66, y + h * 0.42, w * 0.13, h * 0.15, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#1A1A1A";
    context.beginPath();
    context.ellipse(x + w * 0.37, y + h * 0.46, w * 0.05, h * 0.06, 0, 0, Math.PI * 2);
    context.ellipse(x + w * 0.69, y + h * 0.46, w * 0.05, h * 0.06, 0, 0, Math.PI * 2);
    context.fill();

    // ตาโกด
    context.strokeStyle = "#1A1A1A";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x + w * 0.22, y + h * 0.28);
    context.lineTo(x + w * 0.42, y + h * 0.34);
    context.moveTo(x + w * 0.78, y + h * 0.28);
    context.lineTo(x + w * 0.58, y + h * 0.34);
    context.stroke();
}

function drawPipe(x, y, w, h) {
    context.fillStyle = "#00A800";
    context.fillRect(x, y + 14, w, h - 14);
    context.fillStyle = "#00C000";
    context.fillRect(x + 5, y + 14, 7, h - 14);

    // ทอ อ่อ ท่อ
    context.fillStyle = "#00A800";
    context.fillRect(x - 5, y, w + 10, 16);
    context.fillStyle = "#00E000";
    context.fillRect(x - 5, y, w + 10, 5);
    context.strokeStyle = "#005A00";
    context.lineWidth = 2;
    context.strokeRect(x - 5, y, w + 10, 16);
    context.strokeRect(x, y + 14, w, h - 14);
}

function drawHud() {
    context.textAlign = "left";
    context.fillStyle = "#FFFFFF";
    context.strokeStyle = "#2A1A0A";
    context.lineWidth = 3;
    context.font = "bold 20px 'Press Start 2P', Arial";

    const scoreText = "SCORE " + Math.floor(score).toString().padStart(5, "0");
    context.strokeText(scoreText, 16, 30);
    context.fillText(scoreText, 16, 30);

    context.font = "bold 13px 'Press Start 2P', Arial";
    const hiText = "HI " + Math.floor(highScore).toString().padStart(5, "0");
    context.strokeText(hiText, 16, 54);
    context.fillText(hiText, 16, 54);

    const livesText = "LIVES " + lives;
    context.textAlign = "right";
    context.strokeText(livesText, boardWidth - 16, 30);
    context.fillText(livesText, boardWidth - 16, 30);
    context.textAlign = "left";
}

function drawGameOver() {
    context.fillStyle = "rgba(0,0,0,0.45)";
    context.fillRect(0, 0, boardWidth, boardHeight);

    context.textAlign = "center";
    context.fillStyle = "#FFFFFF";
    context.strokeStyle = "#000000";
    context.lineWidth = 3;

    context.font = "bold 34px 'Press Start 2P', Arial";
    context.strokeText("GAME OVER", boardWidth / 2, boardHeight / 2 - 20);
    context.fillStyle = "#E52521";
    context.fillText("GAME OVER", boardWidth / 2, boardHeight / 2 - 20);

    context.font = "14px 'Press Start 2P', Arial";
    context.fillStyle = "#FFFFFF";
    if (gameState === "locked") {
        context.fillStyle = "#FBD000";
        context.fillText("หมดชีวิตแล้ว!", boardWidth / 2, boardHeight / 2 + 16);
        context.font = "11px 'Press Start 2P', Arial";
        context.fillStyle = "#FFFFFF";
        context.fillText("เปิดไฟล์ใหม่เพื่อเล่นอีกครั้ง", boardWidth / 2, boardHeight / 2 + 44);
    } else {
        context.fillText("เหลือ " + lives + " ชีวิต - กด SPACE เพื่อเล่นใหม่", boardWidth / 2, boardHeight / 2 + 24);
    }
}

// เสียงจาก Ai ทำให้
let audioCtx = null;
function playTone(freq, duration) {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        gain.gain.value = 0.07;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
    }
}
