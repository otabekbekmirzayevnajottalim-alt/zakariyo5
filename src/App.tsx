import React, { useEffect, useRef, useState } from 'react';

const SPRITES = {
  dinoStand: `
           ████████
          ███▄██████
          ██████████
          ██████████
          ██████
          █████████
█         ███
██       ███████
███     ████████
████████████████
 ██████████████
  ████████████
    █████████
     ███  ██
     ██   ██
     █    █
     ██   ██`,
  dinoRun1: `
           ████████
          ███▄██████
          ██████████
          ██████████
          ██████
          █████████
█         ███
██       ███████
███     ████████
████████████████
 ██████████████
  ████████████
    █████████
     ███  ██
     ██   
     █    
     ██   `,
  dinoRun2: `
           ████████
          ███▄██████
          ██████████
          ██████████
          ██████
          █████████
█         ███
██       ███████
███     ████████
████████████████
 ██████████████
  ████████████
    █████████
     ███  ██
          ██
          █
          ██`,
  dinoDuck1: `
                                  ████████
                                 ███▄██████
                                 ██████████
█       █████████                ██████████
██    ████████████████████████████████
███  █████████████████████████████████
████████████████████████████████████
 ████████████████████████████████
   ██████████████████████████
     ███  ██
     ██   
     █    
     ██   `,
  dinoDuck2: `
                                  ████████
                                 ███▄██████
                                 ██████████
█       █████████                ██████████
██    ████████████████████████████████
███  █████████████████████████████████
████████████████████████████████████
 ████████████████████████████████
   ██████████████████████████
     ███  ██
          ██
          █
          ██`,
  cactusSmall: `
  ██  
  ██  
█ ██  
█ ██ █
████ █
██████
  ██  
  ██  
  ██  `,
  cactusLarge: `
   ███   
   ███   
   ███   
██ ███   
██ ███ ██
██████ ██
█████████
   ███   
   ███   
   ███   
   ███   `,
  bird1: `
      █ 
     ██ 
    ███ 
   ████ 
███████████
   ████ 
    ██  `,
  bird2: `
   ████ 
    ███ 
     ██ 
███████████
   ████ 
    ██  `
};

function createPixelSprite(ascii: string, scale = 2, color = '#535353') {
  const rows = ascii.replace(/^\n/, '').split('\n');
  const height = rows.length;
  const width = Math.max(...rows.map(r => r.length));
  
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  
  ctx.fillStyle = color;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      if (rows[y][x] && rows[y][x] !== ' ') {
        if (rows[y][x] === '▄') {
          // Transparent eye
        } else {
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
  }
  return canvas;
}

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 150;
const GROUND_Y = 130;
const GRAVITY = 0.6;
const JUMP_VELOCITY = -10;
const INITIAL_SPEED = 5;
const SPEED_INCREMENT = 0.001;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const hiScoreRef = useRef<HTMLSpanElement>(null);
  const [gameOver, setGameOver] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const gameState = useRef({
    frames: 0,
    score: 0,
    highScore: parseInt(localStorage.getItem('dinoHighScore') || '0'),
    gameSpeed: INITIAL_SPEED,
    isGameOver: false,
    isPlaying: false,
    dino: {
      x: 50,
      y: 0,
      width: 44,
      height: 47,
      dy: 0,
      isJumping: false,
      isDucking: false,
    },
    obstacles: [] as any[],
    groundX: 0
  });

  const spritesRef = useRef<Record<string, HTMLCanvasElement>>({});
  const requestRef = useRef<number>();

  useEffect(() => {
    // Generate sprites
    spritesRef.current = {
      dinoStand: createPixelSprite(SPRITES.dinoStand, 2),
      dinoRun1: createPixelSprite(SPRITES.dinoRun1, 2),
      dinoRun2: createPixelSprite(SPRITES.dinoRun2, 2),
      dinoDuck1: createPixelSprite(SPRITES.dinoDuck1, 2),
      dinoDuck2: createPixelSprite(SPRITES.dinoDuck2, 2),
      cactusSmall: createPixelSprite(SPRITES.cactusSmall, 2),
      cactusLarge: createPixelSprite(SPRITES.cactusLarge, 2),
      bird1: createPixelSprite(SPRITES.bird1, 2),
      bird2: createPixelSprite(SPRITES.bird2, 2),
    };

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      // Initial draw
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
      ctx.strokeStyle = '#535353';
      ctx.stroke();
      
      const dinoSprite = spritesRef.current.dinoStand;
      gameState.current.dino.y = GROUND_Y - dinoSprite.height;
      gameState.current.dino.width = dinoSprite.width;
      gameState.current.dino.height = dinoSprite.height;
      ctx.drawImage(dinoSprite, gameState.current.dino.x, gameState.current.dino.y);
      
      ctx.fillStyle = '#535353';
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Press Space to Start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }
    
    if (hiScoreRef.current) {
      hiScoreRef.current.innerText = gameState.current.highScore.toString().padStart(5, '0');
    }
  }, []);

  const getDinoSprite = () => {
    const state = gameState.current;
    const sprites = spritesRef.current;
    
    if (state.isGameOver) return sprites.dinoStand;
    if (state.dino.isJumping) return sprites.dinoStand;
    if (state.dino.isDucking) {
      return Math.floor(state.frames / 10) % 2 === 0 ? sprites.dinoDuck1 : sprites.dinoDuck2;
    }
    return Math.floor(state.frames / 10) % 2 === 0 ? sprites.dinoRun1 : sprites.dinoRun2;
  };

  const spawnObstacle = () => {
    const state = gameState.current;
    const typeRand = Math.random();
    let type = 'cactusSmall';
    let y = GROUND_Y - spritesRef.current.cactusSmall.height;
    let width = spritesRef.current.cactusSmall.width;
    let height = spritesRef.current.cactusSmall.height;

    const isGroup = Math.random() > 0.5;
    const groupSize = isGroup ? Math.floor(Math.random() * 2) + 2 : 1;

    if (typeRand > 0.8 && state.score > 200) {
      type = 'bird';
      const heights = [GROUND_Y - 25, GROUND_Y - 50, GROUND_Y - 75];
      y = heights[Math.floor(Math.random() * heights.length)];
      width = spritesRef.current.bird1.width;
      height = spritesRef.current.bird1.height;
      state.obstacles.push({ x: CANVAS_WIDTH, y, width, height, type });
    } else {
      type = typeRand > 0.4 ? 'cactusLarge' : 'cactusSmall';
      const sprite = spritesRef.current[type];
      y = GROUND_Y - sprite.height;
      width = sprite.width;
      height = sprite.height;
      
      for (let i = 0; i < groupSize; i++) {
        state.obstacles.push({ 
          x: CANVAS_WIDTH + i * (width - 2), 
          y, 
          width, 
          height, 
          type 
        });
      }
    }
  };

  const triggerGameOver = () => {
    const state = gameState.current;
    state.isPlaying = false;
    state.isGameOver = true;
    if (state.score > state.highScore) {
      state.highScore = Math.floor(state.score);
      localStorage.setItem('dinoHighScore', state.highScore.toString());
    }
    setGameOver(true);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#535353';
      ctx.font = '20px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('G A M E  O V E R', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
      
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText('Press Space to Restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    }
  };

  const update = () => {
    const state = gameState.current;
    if (!state.isPlaying) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    state.frames++;
    state.gameSpeed += SPEED_INCREMENT;

    if (state.frames % 5 === 0) {
      state.score++;
    }

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Ground
    state.groundX -= state.gameSpeed;
    if (state.groundX <= -CANVAS_WIDTH) {
      state.groundX = 0;
    }
    ctx.beginPath();
    ctx.moveTo(state.groundX, GROUND_Y);
    ctx.lineTo(state.groundX + CANVAS_WIDTH * 2, GROUND_Y);
    ctx.strokeStyle = '#535353';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Ground noise
    ctx.fillStyle = '#535353';
    for(let i=0; i<10; i++) {
       const noiseX = (state.groundX + i * 60) % CANVAS_WIDTH;
       if (noiseX > 0) {
         ctx.fillRect(noiseX, GROUND_Y + 5 + (i%3)*2, 2, 2);
       }
    }

    // Dino
    const dino = state.dino;
    dino.dy += GRAVITY;
    dino.y += dino.dy;

    const currentDinoSprite = getDinoSprite();
    dino.width = currentDinoSprite.width;
    dino.height = currentDinoSprite.height;
    
    const floorY = GROUND_Y - dino.height;
    
    if (dino.y > floorY) {
      dino.y = floorY;
      dino.dy = 0;
      dino.isJumping = false;
    }

    ctx.drawImage(currentDinoSprite, dino.x, dino.y);

    // Obstacles
    const lastObstacle = state.obstacles[state.obstacles.length - 1];
    const minDistance = 200 + state.gameSpeed * 20;
    
    if (!lastObstacle || (CANVAS_WIDTH - lastObstacle.x > minDistance)) {
      if (Math.random() < 0.02) {
        spawnObstacle();
      }
    }

    for (let i = 0; i < state.obstacles.length; i++) {
      const obs = state.obstacles[i];
      obs.x -= state.gameSpeed;
      
      let obsSprite;
      if (obs.type === 'cactusSmall') obsSprite = spritesRef.current.cactusSmall;
      else if (obs.type === 'cactusLarge') obsSprite = spritesRef.current.cactusLarge;
      else if (obs.type === 'bird') {
        obsSprite = Math.floor(state.frames / 15) % 2 === 0 ? spritesRef.current.bird1 : spritesRef.current.bird2;
      }
      
      if (obsSprite) {
        ctx.drawImage(obsSprite, obs.x, obs.y);
      }

      // Collision
      const paddingX = 8;
      const paddingY = 8;
      if (
        dino.x + paddingX < obs.x + obs.width - paddingX &&
        dino.x + dino.width - paddingX > obs.x + paddingX &&
        dino.y + paddingY < obs.y + obs.height - paddingY &&
        dino.y + dino.height - paddingY > obs.y + paddingY
      ) {
        triggerGameOver();
        return;
      }
    }

    state.obstacles = state.obstacles.filter(obs => obs.x + obs.width > 0);

    // Score
    const scoreText = Math.floor(state.score).toString().padStart(5, '0');
    const hiText = state.highScore > 0 ? state.highScore.toString().padStart(5, '0') : '00000';
    
    if (scoreRef.current) scoreRef.current.innerText = scoreText;
    if (hiScoreRef.current) hiScoreRef.current.innerText = hiText;

    requestRef.current = requestAnimationFrame(update);
  };

  const startGame = () => {
    const state = gameState.current;
    state.isPlaying = true;
    state.isGameOver = false;
    state.score = 0;
    state.gameSpeed = INITIAL_SPEED;
    state.obstacles = [];
    state.frames = 0;
    setHasStarted(true);
    setGameOver(false);
    
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(update);
  };

  const jump = () => {
    const state = gameState.current;
    if (!state.dino.isJumping && !state.dino.isDucking) {
      state.dino.dy = JUMP_VELOCITY;
      state.dino.isJumping = true;
    }
  };

  const duck = (isDucking: boolean) => {
    const state = gameState.current;
    if (!state.dino.isJumping) {
      state.dino.isDucking = isDucking;
      if (isDucking) {
        state.dino.dy = 5;
      }
    } else if (isDucking) {
      state.dino.dy += 5;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (!gameState.current.isPlaying && !gameState.current.isGameOver) {
          startGame();
        } else if (gameState.current.isGameOver) {
          startGame();
        } else {
          jump();
        }
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        duck(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        duck(false);
      }
    };

    const handleTouchStart = () => {
      if (!gameState.current.isPlaying && !gameState.current.isGameOver) {
        startGame();
      } else if (gameState.current.isGameOver) {
        startGame();
      } else {
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('touchstart', handleTouchStart);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('touchstart', handleTouchStart);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <>
      <div className="ui-header">
        <div className="title-group">
          <p className="label">O'yin Loyihasi</p>
          <h1>DINO RUN</h1>
        </div>
        <div className="score-panel">
          <p className="label">HI SCORE</p>
          <p className="value">
            <span ref={scoreRef}>00000</span> <span style={{ color: '#ccc', fontSize: '24px' }} ref={hiScoreRef}>00000</span>
          </p>
        </div>
      </div>

      <div className="game-container">
        <div className="grid-overlay"></div>
        <div className="status-indicator">
          <div className="dot"></div>
          <span className="status-text">Live Simulation</span>
        </div>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ 
            imageRendering: 'pixelated', 
            width: '100%', 
            height: '100%', 
            position: 'relative', 
            zIndex: 5,
            background: 'transparent'
          }}
        />
      </div>

      <div className="controls-footer">
        <div className="control-card">
          <p className="label">Sakrash</p>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="control-key">SPACE</span>
            <span className="control-desc">To'siqlardan o'tish</span>
          </div>
        </div>
        <div className="control-card">
          <p className="label">Egilish</p>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="control-key">DOWN</span>
            <span className="control-desc">Pastroq uchish</span>
          </div>
        </div>
        <div className="control-card">
          <p className="label">Pause</p>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="control-key">ESC</span>
            <span className="control-desc">O'yinni to'xtatish</span>
          </div>
        </div>
      </div>
    </>
  );
}
