/**
 * main.js  –  Neon Jump – Phaser 3 game entry point
 *
 * Scenes:
 *   BootScene     – procedurally generate all textures, then go to MenuScene
 *   MenuScene     – title / daily reward / high-score / play button
 *   GameScene     – main gameplay loop
 *   GameOverScene – score summary / retry / menu
 *
 * Global helpers used from other files:
 *   window.LevelConfig, window.getCurrentLevel
 *   window.DailyReward, window.PlatformManager
 *   window.EnemyManager, window.Player, window.UIManager
 */

// ─────────────────────────────────────────────────────────────────────────────
// Shared globals
// ─────────────────────────────────────────────────────────────────────────────
window.currentScore = 0;
window.currentCoins = 0;

function _getHighScore () {
  return parseInt(localStorage.getItem('neonJumpHiScore') || '0', 10);
}
function _setHighScore (v) {
  if (v > _getHighScore()) localStorage.setItem('neonJumpHiScore', v);
}
function _getTotalCoins () {
  return parseInt(localStorage.getItem('neonJumpTotalCoins') || '0', 10);
}
function _addTotalCoins (v) {
  localStorage.setItem('neonJumpTotalCoins', _getTotalCoins() + v);
}

// ─────────────────────────────────────────────────────────────────────────────
// BootScene  –  asset / texture generation
// ─────────────────────────────────────────────────────────────────────────────
class BootScene extends Phaser.Scene {
  constructor () { super({ key: 'BootScene' }); }

  preload () {
    // Nothing to preload – all graphics are procedural
  }

  create () {
    this._genTextures();
    this.scene.start('MenuScene');
  }

  _genTextures () {
    // Helper: create a neon-glow rectangle texture
    const neonRect = (key, w, h, color, alpha) => {
      const g = this.make.graphics({ add: false });
      // Outer glow
      g.fillStyle(color, (alpha || 1) * 0.18);
      g.fillRoundedRect(0, 0, w, h + 4, 3);
      // Mid glow
      g.fillStyle(color, (alpha || 1) * 0.38);
      g.fillRoundedRect(1, 1, w - 2, h + 2, 2);
      // Core
      g.fillStyle(color, alpha || 1);
      g.fillRect(2, 3, w - 4, h - 3);
      // Top highlight
      g.fillStyle(0xffffff, 0.45);
      g.fillRect(3, 3, w - 6, 2);
      g.generateTexture(key, w, h + 4);
      g.destroy();
    };

    // ── Platforms ─────────────────────────────────────────────────
    neonRect('platform_normal',    100, 14, 0x00ffff);
    neonRect('platform_moving',    100, 14, 0x00ff88);
    neonRect('platform_crumbling', 100, 14, 0xff6600);
    neonRect('platform_coin',      100, 14, 0xffdd00);

    // Spring platform: add coil detail
    {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xff00ff, 0.18);  g.fillRoundedRect(0, 0, 100, 18, 3);
      g.fillStyle(0xff00ff, 0.38);  g.fillRoundedRect(1, 1, 98, 16, 2);
      g.fillStyle(0xff00ff, 1);     g.fillRect(2, 4, 96, 10);
      g.fillStyle(0xffffff, 0.45);  g.fillRect(3, 4, 94, 2);
      // Coil marks
      g.fillStyle(0xffffff, 0.55);
      for (let i = 10; i < 95; i += 14) {
        g.fillRect(i, 8, 5, 6);
      }
      g.generateTexture('platform_spring', 100, 18);
      g.destroy();
    }

    // ── Player ────────────────────────────────────────────────────
    {
      const g = this.make.graphics({ add: false });
      const W = 24, H = 36;
      // Body glow
      g.fillStyle(0x00ffff, 0.18); g.fillEllipse(W/2, H/2, W + 8, H + 8);
      // Body
      g.fillStyle(0x003344, 1);    g.fillRect(4, 10, 16, 20);
      g.fillStyle(0x00ffff, 1);    g.strokeRect(4, 10, 16, 20);
      // Head
      g.fillStyle(0x001122, 1);    g.fillRect(6, 2, 12, 10);
      g.fillStyle(0x00ffff, 1);    g.strokeRect(6, 2, 12, 10);
      // Visor (cyan glow)
      g.fillStyle(0x00ffff, 0.8);  g.fillRect(8, 4, 8, 5);
      // Legs
      g.fillStyle(0x00bbcc, 1);
      g.fillRect(5, 30, 6, 6);
      g.fillRect(13, 30, 6, 6);
      g.generateTexture('player', W, H);
      g.destroy();
    }

    // ── Enemies ───────────────────────────────────────────────────
    // floater
    {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xff2255, 0.2);  g.fillEllipse(14, 14, 32, 20);
      g.fillStyle(0x330011, 1);    g.fillEllipse(14, 14, 28, 16);
      g.fillStyle(0xff2255, 1);    g.strokeEllipse(14, 14, 28, 16);
      g.fillStyle(0xff6688, 0.9);  g.fillCircle(14, 14, 5);
      // Antennae
      g.lineStyle(2, 0xff2255, 1);
      g.lineBetween(8, 8, 4, 2);
      g.lineBetween(20, 8, 24, 2);
      g.generateTexture('enemy_floater', 28, 28);
      g.destroy();
    }
    // bouncer
    {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xff8800, 0.2);  g.fillCircle(14, 14, 16);
      g.fillStyle(0x331100, 1);    g.fillCircle(14, 14, 13);
      g.fillStyle(0xff8800, 1);    g.strokeCircle(14, 14, 13);
      // Spikes
      g.fillStyle(0xff8800, 1);
      for (let a = 0; a < 360; a += 45) {
        const rad = Phaser.Math.DegToRad(a);
        g.fillTriangle(
          14 + Math.cos(rad) * 13, 14 + Math.sin(rad) * 13,
          14 + Math.cos(rad + 0.3) * 18, 14 + Math.sin(rad + 0.3) * 18,
          14 + Math.cos(rad - 0.3) * 18, 14 + Math.sin(rad - 0.3) * 18
        );
      }
      g.generateTexture('enemy_bouncer', 28, 28);
      g.destroy();
    }
    // shooter
    {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x8800ff, 0.2);  g.fillRect(0, 0, 28, 28);
      g.fillStyle(0x110022, 1);    g.fillRect(2, 2, 24, 24);
      g.fillStyle(0x8800ff, 1);    g.strokeRect(2, 2, 24, 24);
      // Eye
      g.fillStyle(0xff00ff, 1);    g.fillCircle(14, 12, 5);
      g.fillStyle(0xffffff, 0.9);  g.fillCircle(16, 10, 2);
      // Barrel
      g.fillStyle(0x8800ff, 1);    g.fillRect(20, 12, 8, 4);
      g.generateTexture('enemy_shooter', 28, 28);
      g.destroy();
    }

    // ── Bullet ────────────────────────────────────────────────────
    {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xff00ff, 0.3);  g.fillCircle(5, 5, 5);
      g.fillStyle(0xff00ff, 1);    g.fillCircle(5, 5, 3);
      g.fillStyle(0xffffff, 0.8);  g.fillCircle(4, 4, 1);
      g.generateTexture('bullet', 10, 10);
      g.destroy();
    }

    // ── Coin ──────────────────────────────────────────────────────
    {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xffdd00, 0.25);  g.fillCircle(9, 9, 9);
      g.fillStyle(0x886600, 1);     g.fillCircle(9, 9, 7);
      g.fillStyle(0xffdd00, 1);     g.strokeCircle(9, 9, 7);
      g.fillStyle(0xffdd00, 0.9);   g.fillCircle(9, 9, 4);
      g.generateTexture('coin', 18, 18);
      g.destroy();
    }

    // ── Particle ──────────────────────────────────────────────────
    {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x00ffff, 1);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture('particle', 4, 4);
      g.destroy();
    }

    // ── Power-ups ─────────────────────────────────────────────────
    const pwrColors = { shield: 0x00aaff, rocket: 0xff4400, magnet: 0xcc00ff };
    Object.entries(pwrColors).forEach(([name, color]) => {
      const g = this.make.graphics({ add: false });
      g.fillStyle(color, 0.3);  g.fillCircle(12, 12, 12);
      g.fillStyle(0x000000, 0.7); g.fillCircle(12, 12, 9);
      g.fillStyle(color, 1);    g.strokeCircle(12, 12, 9);
      g.fillStyle(color, 1);    g.fillCircle(12, 12, 5);
      g.generateTexture('powerup_' + name, 24, 24);
      g.destroy();
    });

    // ── Star (background) ─────────────────────────────────────────
    {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 2, 2);
      g.generateTexture('star', 2, 2);
      g.destroy();
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MenuScene
// ─────────────────────────────────────────────────────────────────────────────
class MenuScene extends Phaser.Scene {
  constructor () { super({ key: 'MenuScene' }); }

  create () {
    const W = this.scale.width;
    const H = this.scale.height;

    this._buildBackground();

    const textCfg = (size, color) => ({
      fontFamily: "'Orbitron', monospace",
      fontSize:   size + 'px',
      color:      color || '#00ffff',
      stroke:     '#000000',
      strokeThickness: 3,
      shadow: { color: color || '#00ffff', blur: 16, fill: true }
    });

    // ── Title ──
    this.add.text(W / 2, H * 0.18, 'NEON', textCfg(56, '#00ffff')).setOrigin(0.5);
    this.add.text(W / 2, H * 0.18 + 55, 'JUMP', textCfg(56, '#ff00ff')).setOrigin(0.5);

    // ── High score ──
    const hi = _getHighScore();
    this.add.text(W / 2, H * 0.42, 'BEST: ' + hi, textCfg(18, '#ffff00')).setOrigin(0.5);

    // ── Total coins ──
    this.add.text(W / 2, H * 0.48, '⬡ ' + _getTotalCoins(), textCfg(15, '#ffdd00')).setOrigin(0.5);

    // ── Play button ──
    const playBtn = this._makeButton(W / 2, H * 0.62, '▶  PLAY', 22, 0x00ffff, 0x003344);
    playBtn.on('pointerup', () => {
      this._stopDailyTimer();
      this.scene.start('GameScene');
    });

    // ── Daily reward button ──
    this._dailyReward = new window.DailyReward();
    const drBtn = this._makeButton(W / 2, H * 0.76, 'DAILY REWARD', 16, 0xffdd00, 0x222200);
    drBtn.on('pointerup', () => this._claimDailyReward(drBtn));

    // Start pulsing if claimable
    if (this._dailyReward.canClaim()) {
      this.tweens.add({ targets: drBtn, scaleX: 1.05, scaleY: 1.05, yoyo: true, repeat: -1, duration: 600 });
    }

    // Timer label
    this._drTimerLabel = this.add.text(W / 2, H * 0.82, '', textCfg(12, '#ffdd00')).setOrigin(0.5);
    this._updateDrLabel();
    this._drInterval = setInterval(() => this._updateDrLabel(), 1000);
  }

  _buildBackground () {
    const W = this.scale.width;
    const H = this.scale.height;

    this.add.rectangle(0, 0, W, H, 0x0a0a0f).setOrigin(0, 0);

    // Stars
    if (this.textures.exists('star')) {
      for (let i = 0; i < 120; i++) {
        const x = Phaser.Math.Between(0, W);
        const y = Phaser.Math.Between(0, H);
        const s = this.add.image(x, y, 'star').setAlpha(Math.random() * 0.7 + 0.1);
        this.tweens.add({ targets: s, alpha: 0.05, yoyo: true, repeat: -1, duration: Phaser.Math.Between(800, 3000) });
      }
    }

    // Grid lines (subtle)
    const g = this.add.graphics();
    g.lineStyle(1, 0x003333, 0.3);
    for (let x = 0; x < W; x += 40) g.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += 40) g.lineBetween(0, y, W, y);
  }

  _makeButton (x, y, label, fontSize, textColor, bgColor) {
    const padX = 28, padH = 14;
    const style = {
      fontFamily: "'Orbitron', monospace",
      fontSize:   fontSize + 'px',
      color:      '#' + textColor.toString(16).padStart(6, '0'),
      stroke: '#000000', strokeThickness: 2,
      shadow: { color: '#' + textColor.toString(16).padStart(6, '0'), blur: 14, fill: true }
    };
    const txt = this.add.text(x, y, label, style).setOrigin(0.5);
    const bounds = txt.getBounds();
    const bg = this.add.rectangle(x, y, bounds.width + padX * 2, bounds.height + padH * 2, bgColor, 0.85)
      .setStrokeStyle(2, textColor, 1).setInteractive({ useHandCursor: true });

    bg.on('pointerover',  () => bg.setFillStyle(bgColor | 0x111111, 0.88));
    bg.on('pointerout',   () => bg.setFillStyle(bgColor, 0.85));
    bg.on('pointerdown',  () => { txt.setScale(0.95); bg.setScale(0.95); });
    bg.on('pointerup',    () => { txt.setScale(1);    bg.setScale(1); });

    txt.setDepth(1);
    return bg;
  }

  _claimDailyReward (btn) {
    const reward = this._dailyReward.claim();
    if (reward > 0) {
      _addTotalCoins(reward);
      this.tweens.killTweensOf(btn);
      btn.setScale(1);
      const W = this.scale.width;
      const popup = this.add.text(W / 2, this.scale.height * 0.68, '+' + reward + ' COINS!', {
        fontFamily: "'Orbitron', monospace", fontSize: '20px',
        color: '#ffdd00', shadow: { color: '#ffdd00', blur: 18, fill: true }
      }).setOrigin(0.5).setDepth(10);
      this.tweens.add({ targets: popup, y: popup.y - 50, alpha: 0, duration: 1400, onComplete: () => popup.destroy() });
      this._updateDrLabel();
    }
  }

  _updateDrLabel () {
    if (this._drTimerLabel && this._drTimerLabel.active) {
      this._drTimerLabel.setText(this._dailyReward.getTimeUntilNextClaim());
    }
  }

  _stopDailyTimer () {
    if (this._drInterval) { clearInterval(this._drInterval); this._drInterval = null; }
  }

  shutdown () { this._stopDailyTimer(); }
}

// ─────────────────────────────────────────────────────────────────────────────
// GameScene
// ─────────────────────────────────────────────────────────────────────────────
class GameScene extends Phaser.Scene {
  constructor () { super({ key: 'GameScene' }); }

  create () {
    const W = this.scale.width;
    const H = this.scale.height;

    window.currentScore = 0;
    window.currentCoins = 0;

    // ── World & camera ─────────────────────────────────────────────
    this.physics.world.setBounds(0, -500000, W, 502000);
    this.cameras.main.setBounds(0, -500000, W, 502000);

    // Player start position
    this.PLAYER_START_Y = H * 0.7;

    // Background
    this._buildBackground();

    // ── Create managers ────────────────────────────────────────────
    this.platformMgr = new window.PlatformManager(this, this.PLAYER_START_Y);
    this.enemyMgr    = new window.EnemyManager(this);
    this.player      = new window.Player(this, W / 2, this.PLAYER_START_Y - 20);
    this.ui          = new window.UIManager(this);

    // ── Physics colliders ──────────────────────────────────────────
    // Platform colliders – one-way (only collide when falling DOWN)
    const processFn = (playerSprite, _platform) => {
      return playerSprite.body.velocity.y >= -10; // allow through when jumping up
    };

    this.platformMgr.getGroups().forEach(grp => {
      this.physics.add.collider(
        this.player.sprite, grp,
        (playerSprite, platform) => {
          if (platform.getData('crumbled')) return;
          if (platform.getData('type') === 'crumbling') {
            if (!platform.getData('crumbling')) {
              this.platformMgr.crumble(platform);
            }
          }
          this.player.onLand(platform);
        },
        processFn, this
      );
    });

    // Coin collection
    this.physics.add.overlap(
      this.player.sprite,
      this.platformMgr.getCoinGroup(),
      (_player, coin) => {
        if (coin.getData('collected')) return;
        coin.setData('collected', true);
        this._collectCoin(coin);
      },
      null, this
    );

    // Enemy collision → player takes damage
    this.physics.add.overlap(
      this.player.sprite,
      this.enemyMgr.getEnemyGroup(),
      (_player, enemy) => {
        if (this.player.takeDamage()) {
          // player died
        }
      },
      null, this
    );

    // Bullet collision
    this.physics.add.overlap(
      this.player.sprite,
      this.enemyMgr.getBulletGroup(),
      (_player, bullet) => {
        this.enemyMgr.destroyBullet(bullet);
        this.player.takeDamage();
      },
      null, this
    );

    // ── Power-up spawning timer ────────────────────────────────────
    this.time.addEvent({
      delay:    8000,
      loop:     true,
      callback: () => this._trySpawnPowerup()
    });

    // ── Score & level tracking ─────────────────────────────────────
    this._highestY    = this.PLAYER_START_Y;
    this._score       = 0;
    this._coins       = 0;
    this._currentLvIdx= 0;
    this._gameOver    = false;

    // ── Player death event ─────────────────────────────────────────
    this.events.on('playerDead', () => this._doGameOver());

    // ── Camera: start at player ────────────────────────────────────
    this.cameras.main.scrollY = this.PLAYER_START_Y - H * 0.6;
  }

  _buildBackground () {
    const W = this.scale.width;
    // Tall background strip covering most of the world height
    const BG_TOP    = -500000;
    const BG_HEIGHT = 502000;

    // Fill with dark color
    this.add.rectangle(0, BG_TOP, W, BG_HEIGHT, 0x0a0a0f).setOrigin(0, 0);

    // Scatter many stars across a large vertical range
    const STAR_BAND = 30000;
    for (let i = 0; i < 600; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(this.PLAYER_START_Y - STAR_BAND, this.PLAYER_START_Y + 800);
      const s = this.add.image(x, y, 'star')
        .setAlpha(Phaser.Math.FloatBetween(0.08, 0.55))
        .setDepth(0);
      this.tweens.add({ targets: s, alpha: 0.04, yoyo: true, repeat: -1, duration: Phaser.Math.Between(1200, 4000) });
    }

    // Subtle neon grid lines (tile sprite covering game)
    const g = this.add.graphics().setDepth(0);
    g.lineStyle(1, 0x003333, 0.12);
    for (let x = 0; x < W; x += 40)        g.lineBetween(x, BG_TOP, x, BG_TOP + BG_HEIGHT);
    for (let y = BG_TOP; y < BG_TOP + BG_HEIGHT; y += 40) g.lineBetween(0, y, W, y);
  }

  // ── Coin collect ───────────────────────────────────────────────
  _collectCoin (coin) {
    this._coins++;
    window.currentCoins = this._coins;

    // Fly-up tween
    const pop = this.add.text(coin.x, coin.y - 10, '+1', {
      fontFamily: "'Orbitron', monospace", fontSize: '14px', color: '#ffdd00',
      shadow: { color: '#ffdd00', blur: 10, fill: true }
    }).setDepth(20);
    this.tweens.add({ targets: pop, y: pop.y - 28, alpha: 0, duration: 600, onComplete: () => pop.destroy() });

    coin.setActive(false).setVisible(false);
  }

  // ── Power-up spawn ─────────────────────────────────────────────
  _trySpawnPowerup () {
    if (Math.random() > 0.35) return; // 35% chance
    const W    = this.scale.width;
    const cam  = this.cameras.main;
    const types = ['shield', 'rocket', 'magnet'];
    const type  = Phaser.Utils.Array.GetRandom(types);
    const x     = Phaser.Math.Between(30, W - 30);
    const y     = cam.scrollY + Phaser.Math.Between(50, this.scale.height * 0.6);

    if (!this.textures.exists('powerup_' + type)) return;
    const pu = this.physics.add.image(x, y, 'powerup_' + type);
    pu.setDisplaySize(24, 24);
    pu.body.allowGravity = false;
    pu.setData('puType', type);
    pu.setDepth(8);

    this.tweens.add({ targets: pu, y: y - 10, yoyo: true, repeat: -1, duration: 700 });

    this.physics.add.overlap(this.player.sprite, pu, () => {
      switch (type) {
        case 'shield': this.player.activateShield(); break;
        case 'rocket': this.player.activateRocket(); break;
        case 'magnet': this.player.activateMagnet(); break;
      }
      const pop = this.add.text(x, y - 10, type.toUpperCase() + '!', {
        fontFamily: "'Orbitron', monospace", fontSize: '14px', color: '#ffffff',
        shadow: { color: '#ffffff', blur: 10, fill: true }
      }).setDepth(20);
      this.tweens.add({ targets: pop, y: pop.y - 30, alpha: 0, duration: 800, onComplete: () => pop.destroy() });
      pu.destroy();
    });

    // Auto-destroy after 10s
    this.time.delayedCall(10000, () => { if (pu.active) pu.destroy(); });
  }

  // ── Per-frame update ────────────────────────────────────────────
  update (time, delta) {
    if (this._gameOver) return;
    if (this.ui && this.ui.isPaused()) return;

    const H   = this.scale.height;
    const cam = this.cameras.main;

    // ── Player ────────────────────────────────────────────────────
    this.player.update(delta);

    // ── Coin magnet ───────────────────────────────────────────────
    this.player.attractCoins(this.platformMgr.getCoinGroup());

    // ── Platform manager ──────────────────────────────────────────
    this.platformMgr.update(delta);

    // ── Enemy manager ─────────────────────────────────────────────
    this.enemyMgr.update(delta, this.player.sprite);

    // ── Camera: follow player upward only ─────────────────────────
    const targetScrollY = this.player.sprite.y - H * 0.55;
    if (targetScrollY < cam.scrollY) {
      cam.scrollY = Phaser.Math.Linear(cam.scrollY, targetScrollY, 0.15);
    }

    // ── Score: track highest altitude ─────────────────────────────
    if (this.player.sprite.y < this._highestY) {
      this._highestY = this.player.sprite.y;
      this._score = Math.floor((this.PLAYER_START_Y - this._highestY) / 8);
      window.currentScore = this._score;
    }

    // ── Level progression ─────────────────────────────────────────
    const newLvIdx = window.getCurrentLevelIndex(this._score);
    if (newLvIdx > this._currentLvIdx) {
      this._currentLvIdx = newLvIdx;
      const lv = window.LevelConfig[newLvIdx];
      this.ui.showLevelUp(lv.name);
    }

    // ── Update HUD ────────────────────────────────────────────────
    const lv = window.getCurrentLevel(this._score);
    this.ui.update(
      this._score,
      this._coins,
      this.player.lives,
      lv.name,
      _getHighScore(),
      { shield: this.player.shield, rocket: this.player.rocket, magnet: this.player.magnet },
      delta
    );

    // ── Game over: player fell below camera ───────────────────────
    if (this.player.alive && this.player.sprite.y > cam.scrollY + H + 120) {
      this.player.die();
    }
  }

  _doGameOver () {
    if (this._gameOver) return;
    this._gameOver = true;

    _setHighScore(this._score);
    _addTotalCoins(this._coins);

    // Brief pause, then switch to GameOverScene
    this.time.delayedCall(900, () => {
      this.scene.start('GameOverScene', {
        score:    this._score,
        coins:    this._coins,
        highScore: _getHighScore()
      });
    });
  }

  shutdown () {
    // Clean up DOM button listeners are removed on Player destroy
    if (this.player) this.player.destroy();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GameOverScene
// ─────────────────────────────────────────────────────────────────────────────
class GameOverScene extends Phaser.Scene {
  constructor () { super({ key: 'GameOverScene' }); }

  init (data) {
    this.score     = data.score     || 0;
    this.coins     = data.coins     || 0;
    this.highScore = data.highScore || _getHighScore();
  }

  create () {
    const W = this.scale.width;
    const H = this.scale.height;

    this.add.rectangle(0, 0, W, H, 0x0a0a0f).setOrigin(0, 0);

    // Dim overlay
    this.add.rectangle(W / 2, H / 2, W * 0.88, H * 0.7, 0x000011, 0.9)
      .setStrokeStyle(2, 0x00ffff, 0.7);

    const tc = (size, color) => ({
      fontFamily: "'Orbitron', monospace",
      fontSize:   size + 'px',
      color:      color || '#ff0044',
      stroke: '#000', strokeThickness: 3,
      shadow: { color: color || '#ff0044', blur: 14, fill: true }
    });

    // Game over title
    const title = this.add.text(W / 2, H * 0.18, 'GAME OVER', tc(32, '#ff0044')).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 500 });

    // Score
    this.add.text(W / 2, H * 0.32, 'SCORE', tc(14, '#888888')).setOrigin(0.5);
    this.add.text(W / 2, H * 0.38, this.score.toString(), tc(34, '#00ffff')).setOrigin(0.5);

    // High score
    const isNew = this.score >= this.highScore && this.score > 0;
    const hiColor = isNew ? '#ffff00' : '#888888';
    this.add.text(W / 2, H * 0.48, isNew ? '★ NEW BEST ★' : 'BEST: ' + this.highScore, tc(16, hiColor)).setOrigin(0.5);

    // Coins earned
    this.add.text(W / 2, H * 0.56, '⬡ +' + this.coins + ' COINS', tc(15, '#ffdd00')).setOrigin(0.5);

    // Total coins
    this.add.text(W / 2, H * 0.62, 'TOTAL: ' + _getTotalCoins(), tc(13, '#888800')).setOrigin(0.5);

    // Share button
    const shareBtn = this._btn(W / 2, H * 0.72, 'SHARE', 15, 0x00ffff, 0x002244);
    shareBtn.on('pointerup', () => this._share());

    // Retry button
    const retryBtn = this._btn(W / 2, H * 0.82, '▶ RETRY', 20, 0x00ff88, 0x003322);
    retryBtn.on('pointerup', () => this.scene.start('GameScene'));

    // Menu button
    const menuBtn = this._btn(W / 2, H * 0.91, 'MENU', 15, 0xff00ff, 0x220033);
    menuBtn.on('pointerup', () => this.scene.start('MenuScene'));

    // Twinkle stars
    for (let i = 0; i < 60; i++) {
      const s = this.add.image(
        Phaser.Math.Between(0, W),
        Phaser.Math.Between(0, H),
        'star'
      ).setAlpha(Phaser.Math.FloatBetween(0.05, 0.4)).setDepth(0);
      this.tweens.add({ targets: s, alpha: 0.02, yoyo: true, repeat: -1, duration: Phaser.Math.Between(600, 2500) });
    }
  }

  _btn (x, y, label, size, textColor, bgColor) {
    const tc = textColor.toString(16).padStart(6, '0');
    const style = {
      fontFamily: "'Orbitron', monospace", fontSize: size + 'px',
      color: '#' + tc, stroke: '#000', strokeThickness: 2,
      shadow: { color: '#' + tc, blur: 12, fill: true }
    };
    const txt = this.add.text(x, y, label, style).setOrigin(0.5).setDepth(1);
    const b   = txt.getBounds();
    const bg  = this.add.rectangle(x, y, b.width + 44, b.height + 20, bgColor, 0.88)
      .setStrokeStyle(2, textColor, 1)
      .setInteractive({ useHandCursor: true });
    bg.on('pointerover',  () => bg.setFillStyle(bgColor | 0x0a0a0a, 0.88));
    bg.on('pointerout',   () => bg.setFillStyle(bgColor, 0.88));
    bg.on('pointerdown',  () => { txt.setScale(0.95); bg.setScale(0.95); });
    bg.on('pointerup',    () => { txt.setScale(1);    bg.setScale(1); });
    return bg;
  }

  _share () {
    const text = `I scored ${this.score} in Neon Jump! Can you beat me? 🎮`;
    if (navigator.share) {
      navigator.share({ title: 'Neon Jump', text }).catch(() => {});
    } else {
      // Fallback: copy to clipboard
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          const W = this.scale.width;
          const pop = this.add.text(W / 2, this.scale.height * 0.65, 'COPIED!', {
            fontFamily: "'Orbitron', monospace", fontSize: '14px', color: '#00ffff',
            shadow: { color: '#00ffff', blur: 10, fill: true }
          }).setOrigin(0.5).setDepth(20);
          this.tweens.add({ targets: pop, alpha: 0, y: pop.y - 20, duration: 1000, onComplete: () => pop.destroy() });
        });
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phaser 3 Game Config
// ─────────────────────────────────────────────────────────────────────────────
const config = {
  type: Phaser.AUTO,
  backgroundColor: '#0a0a0f',
  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width:      480,
    height:     800,
    parent:     document.body
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug:   false
    }
  },
  scene: [BootScene, MenuScene, GameScene, GameOverScene]
};

// Inject touch controls into the DOM before Phaser starts
(function injectTouchControls () {
  const div = document.createElement('div');
  div.id  = 'touch-controls';
  div.innerHTML = '<div id="touch-left">◀</div><div id="touch-right">▶</div>';
  document.body.appendChild(div);
})();

window.__neonJumpGame = new Phaser.Game(config);
