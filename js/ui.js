/**
 * ui.js  –  UIManager
 *
 * Renders and updates all in-game HUD elements using Phaser's display layer:
 *  • Score, high-score, level name, coin count, lives
 *  • Power-up icons with countdown bars
 *  • Level-up banner
 *  • Pause button
 *
 * Main-menu and game-over screens are handled directly in their respective
 * Phaser scenes (MenuScene / GameOverScene in main.js); UIManager focuses on
 * the in-game HUD only.
 */
class UIManager {
  /**
   * @param {Phaser.Scene} scene  – the GameScene
   */
  constructor (scene) {
    this.scene      = scene;
    this.W          = scene.scale.width;
    this.H          = scene.scale.height;

    this._score     = 0;
    this._dispScore = 0;  // animated display value
    this._coins     = 0;
    this._lives     = 3;
    this._levelName = '';
    this._paused    = false;

    // Power-up remaining times (ms)
    this._shieldTime = 0;
    this._rocketTime = 0;
    this._magnetTime = 0;

    this._levelBannerActive = false;

    this._buildHUD();
  }

  // ── Build HUD elements ──────────────────────────────────────────
  _buildHUD () {
    const scene = this.scene;
    const cam   = scene.cameras.main;
    const depth = 50;

    const textCfg = (size, color) => ({
      fontFamily: "'Orbitron', monospace",
      fontSize:   size + 'px',
      color:      color || '#00ffff',
      stroke:     '#000000',
      strokeThickness: 2,
      shadow: { color: color || '#00ffff', blur: 10, fill: true }
    });

    // ── Score ──
    this._scoreLbl = scene.add.text(this.W / 2, 16, '0', textCfg(26))
      .setOrigin(0.5, 0).setDepth(depth).setScrollFactor(0);

    // ── High score (small, top right) ──
    this._hiLbl = scene.add.text(this.W - 8, 14, 'BEST 0', textCfg(11, '#ffff00'))
      .setOrigin(1, 0).setDepth(depth).setScrollFactor(0);

    // ── Level name (top left) ──
    this._levelLbl = scene.add.text(8, 14, 'NEON CITY', textCfg(11, '#ff00ff'))
      .setOrigin(0, 0).setDepth(depth).setScrollFactor(0);

    // ── Coins (below score) ──
    this._coinLbl = scene.add.text(this.W / 2, 46, '⬡ 0', textCfg(13, '#ffdd00'))
      .setOrigin(0.5, 0).setDepth(depth).setScrollFactor(0);

    // ── Lives (heart icons, top-left below level) ──
    this._livesLbl = scene.add.text(8, 30, '♥♥♥', textCfg(13, '#ff4466'))
      .setOrigin(0, 0).setDepth(depth).setScrollFactor(0);

    // ── Pause button (top right corner) ──
    this._pauseBtn = scene.add.text(this.W - 8, 30, '⏸', textCfg(18, '#ffffff'))
      .setOrigin(1, 0).setDepth(depth).setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this._togglePause());

    // ── Power-up panel (bottom left) ──
    this._pwrContainer = scene.add.container(8, this.H - 60).setDepth(depth).setScrollFactor(0);

    // ── Level-up banner (centre) ──
    this._bannerBg = scene.add.rectangle(this.W / 2, this.H / 2, this.W * 0.8, 60, 0x000022, 0.85)
      .setDepth(depth + 1).setScrollFactor(0).setVisible(false);
    this._bannerText = scene.add.text(this.W / 2, this.H / 2, '', {
      fontFamily: "'Orbitron', monospace",
      fontSize:   '22px',
      color:      '#ffff00',
      stroke:     '#000000',
      strokeThickness: 3,
      shadow: { color: '#ffff00', blur: 18, fill: true }
    }).setOrigin(0.5).setDepth(depth + 2).setScrollFactor(0).setVisible(false);

    // Build 3 power-up icon rows
    this._pwrIcons = [];
    const pwrData = [
      { key: 'shield', label: '🛡', color: '#00aaff' },
      { key: 'rocket', label: '🚀', color: '#ff4400' },
      { key: 'magnet', label: '🧲', color: '#cc00ff' }
    ];
    pwrData.forEach((d, i) => {
      const ico = scene.add.text(0, i * 22, d.label + ' ──────', {
        fontFamily: 'monospace', fontSize: '14px', color: d.color
      }).setVisible(false);
      this._pwrContainer.add(ico);
      this._pwrIcons.push({ obj: ico, key: d.key, color: d.color, label: d.label });
    });
  }

  // ── Per-frame update ────────────────────────────────────────────
  /**
   * @param {number} score
   * @param {number} coins
   * @param {number} lives
   * @param {string} levelName
   * @param {number} highScore
   * @param {object} powerups  { shield:ms, rocket:ms, magnet:ms }
   * @param {number} delta
   */
  update (score, coins, lives, levelName, highScore, powerups, delta) {
    // Animate score counter
    if (score !== this._score) {
      this._score = score;
    }
    const diff = this._score - this._dispScore;
    if (Math.abs(diff) > 1) {
      this._dispScore += diff * Math.min(delta / 120, 1);
    } else {
      this._dispScore = this._score;
    }
    this._scoreLbl.setText(Math.floor(this._dispScore).toString());

    // High score
    this._hiLbl.setText('BEST ' + (highScore || 0));

    // Level name
    if (levelName !== this._levelName) {
      this._levelName = levelName;
      this._levelLbl.setText(levelName);
    }

    // Coins
    this._coinLbl.setText('⬡ ' + coins);

    // Lives
    this._livesLbl.setText('♥'.repeat(Math.max(0, lives)));

    // Power-ups
    const dur = Player ? Player.POWERUP_DURATION : 6000;
    this._pwrIcons.forEach(p => {
      const rem = (powerups && powerups[p.key]) || 0;
      if (rem > 0) {
        const bars = Math.ceil((rem / dur) * 6);
        const bar  = '─'.repeat(bars) + ' '.repeat(6 - bars);
        p.obj.setText(p.label + ' ' + bar);
        p.obj.setVisible(true);
      } else {
        p.obj.setVisible(false);
      }
    });
  }

  // ── Level-up banner ─────────────────────────────────────────────
  showLevelUp (levelName) {
    if (this._levelBannerActive) return;
    this._levelBannerActive = true;

    this._bannerText.setText('⬆ ' + levelName + ' ⬆');
    this._bannerBg.setVisible(true);
    this._bannerText.setVisible(true).setAlpha(0);
    this._bannerBg.setAlpha(0);

    this.scene.tweens.add({
      targets: [this._bannerBg, this._bannerText],
      alpha:   1,
      duration: 300,
      yoyo:    true,
      hold:    1400,
      onComplete: () => {
        this._bannerBg.setVisible(false);
        this._bannerText.setVisible(false);
        this._levelBannerActive = false;
      }
    });
  }

  // ── Pause ────────────────────────────────────────────────────────
  _togglePause () {
    this._paused = !this._paused;
    if (this._paused) {
      this.scene.physics.pause();
      this._pauseBtn.setText('▶');
    } else {
      this.scene.physics.resume();
      this._pauseBtn.setText('⏸');
    }
  }

  isPaused () { return this._paused; }

  destroy () {
    // Nothing special needed; scene cleanup handles Phaser objects.
  }
}

window.UIManager = UIManager;
