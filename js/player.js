/**
 * player.js  –  Player class
 *
 * Features:
 *  • Arcade-physics body with gravity
 *  • Auto-jump when landing on a platform
 *  • Left / right movement (keyboard + touch)
 *  • Double-jump (1 extra air jump)
 *  • Screen wrapping (exit left → appear right and vice-versa)
 *  • Power-ups: shield (invincibility), rocket (burst upward), magnet (coin pull)
 *  • Death animation (flash red, fall)
 */
class Player {
  // Physics constants
  static JUMP_FORCE        = 520;
  static SPRING_FORCE      = 720;
  static ROCKET_FORCE      = 900;
  static MOVE_SPEED        = 230;
  static GRAVITY           = 900;
  static POWERUP_DURATION  = 6000; // ms

  constructor (scene, x, y) {
    this.scene  = scene;
    this.alive  = true;
    this.isInAir= true;

    // Double-jump state
    this.doubleJumpAvailable = false;
    this.doubleJumpUsed      = false;

    // Power-up timers (ms remaining)
    this.shield      = 0;
    this.rocket      = 0;
    this.magnet      = 0;
    this.shieldActive= false;
    this.rocketActive= false;
    this.magnetActive= false;

    // Collected coins this run
    this.coins = 0;

    // Create physics sprite
    const texKey = scene.textures.exists('player') ? 'player' : '__DEFAULT';
    this.sprite = scene.physics.add.sprite(x, y, texKey);
    this.sprite.setDisplaySize(24, 36);
    this.sprite.body.setSize(20, 34);
    this.sprite.body.setGravityY(Player.GRAVITY);
    this.sprite.body.setMaxVelocityY(900);
    this.sprite.body.setCollideWorldBounds(false);
    this.sprite.setDepth(10);

    // Lives
    this.lives = 3;
    this._invincibleTimer = 0; // ms after hit

    // Input flags (set by keyboard and DOM touch buttons)
    this.moveLeft  = false;
    this.moveRight = false;
    this._jumpPressed     = false;
    this._jumpJustPressed = false;

    this._setupKeyboard();
    this._setupTouchDOM();
  }

  // ── Input setup ─────────────────────────────────────────────────
  _setupKeyboard () {
    this._keys = this.scene.input.keyboard.addKeys({
      left:   Phaser.Input.Keyboard.KeyCodes.LEFT,
      right:  Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up:     Phaser.Input.Keyboard.KeyCodes.UP,
      a:      Phaser.Input.Keyboard.KeyCodes.A,
      d:      Phaser.Input.Keyboard.KeyCodes.D,
      w:      Phaser.Input.Keyboard.KeyCodes.W,
      space:  Phaser.Input.Keyboard.KeyCodes.SPACE
    });
  }

  _setupTouchDOM () {
    const leftBtn  = document.getElementById('touch-left');
    const rightBtn = document.getElementById('touch-right');
    if (!leftBtn || !rightBtn) return;

    const setL = (v) => { this.moveLeft  = v; leftBtn.classList.toggle('active', v);  };
    const setR = (v) => { this.moveRight = v; rightBtn.classList.toggle('active', v); };

    leftBtn.addEventListener('touchstart',  (e) => { e.preventDefault(); setL(true);  }, { passive: false });
    leftBtn.addEventListener('touchend',    (e) => { e.preventDefault(); setL(false); }, { passive: false });
    leftBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); setL(false); }, { passive: false });
    rightBtn.addEventListener('touchstart',  (e) => { e.preventDefault(); setR(true);  }, { passive: false });
    rightBtn.addEventListener('touchend',    (e) => { e.preventDefault(); setR(false); }, { passive: false });
    rightBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); setR(false); }, { passive: false });

    // Mouse fallback (desktop testing)
    leftBtn.addEventListener('mousedown',  () => setL(true));
    leftBtn.addEventListener('mouseup',    () => setL(false));
    leftBtn.addEventListener('mouseleave', () => setL(false));
    rightBtn.addEventListener('mousedown',  () => setR(true));
    rightBtn.addEventListener('mouseup',    () => setR(false));
    rightBtn.addEventListener('mouseleave', () => setR(false));
  }

  // ── Per-frame update ────────────────────────────────────────────
  update (delta) {
    if (!this.alive) return;

    const dt   = delta / 1000;
    const keys = this._keys;
    const body = this.sprite.body;
    const W    = this.scene.scale.width;

    // ── Read input ────────────────────────────────────────────────
    const goLeft  = this.moveLeft  || keys.left.isDown  || keys.a.isDown;
    const goRight = this.moveRight || keys.right.isDown || keys.d.isDown;
    const jumpNow = keys.up.isDown || keys.w.isDown || keys.space.isDown;

    // ── Horizontal movement ───────────────────────────────────────
    if (goLeft)       body.setVelocityX(-Player.MOVE_SPEED);
    else if (goRight) body.setVelocityX( Player.MOVE_SPEED);
    else              body.setVelocityX(0);

    // ── Screen wrap ───────────────────────────────────────────────
    if (this.sprite.x < -20)  this.sprite.x = W + 20;
    if (this.sprite.x > W + 20) this.sprite.x = -20;

    // ── Double-jump via keyboard ──────────────────────────────────
    if (jumpNow && !this._jumpPressed) {
      this._jumpPressed = true;
      if (this.isInAir && !this.doubleJumpUsed) {
        this.doubleJumpUsed = true;
        body.setVelocityY(-Player.JUMP_FORCE);
        this._emitJumpParticles();
      }
    }
    if (!jumpNow) this._jumpPressed = false;

    // ── Power-up timers ───────────────────────────────────────────
    if (this.shield > 0) { this.shield -= delta; if (this.shield <= 0) { this.shield = 0; this.shieldActive = false; } }
    if (this.rocket > 0) {
      this.rocket -= delta;
      body.setVelocityY(-Player.ROCKET_FORCE);
      if (this.rocket <= 0) { this.rocket = 0; this.rocketActive = false; }
    }
    if (this.magnet > 0) { this.magnet -= delta; if (this.magnet <= 0) { this.magnet = 0; this.magnetActive = false; } }

    // ── Invincibility flash after hit ─────────────────────────────
    if (this._invincibleTimer > 0) {
      this._invincibleTimer -= delta;
      this.sprite.setAlpha((Math.floor(this._invincibleTimer / 80) % 2 === 0) ? 1 : 0.3);
      if (this._invincibleTimer <= 0) this.sprite.setAlpha(1);
    }

    // ── Track air state ───────────────────────────────────────────
    if (body.velocity.y > 10) this.isInAir = true;
  }

  // ── Called by GameScene collider callback ────────────────────────
  /**
   * Player has landed on top of a platform.
   * @param {Phaser.GameObjects.Image} platform
   */
  onLand (platform) {
    if (!this.alive) return;

    this.isInAir           = false;
    this.doubleJumpUsed    = false;
    this.doubleJumpAvailable = true;

    const type = platform ? platform.getData('type') : 'normal';

    if (type === 'spring') {
      this.sprite.body.setVelocityY(-Player.SPRING_FORCE);
      this._emitJumpParticles(0xff00ff);
    } else {
      this.sprite.body.setVelocityY(-Player.JUMP_FORCE);
      this._emitJumpParticles();
    }

    this.isInAir = true; // will be on the way up immediately
  }

  // ── Hit by enemy / bullet ────────────────────────────────────────
  takeDamage () {
    if (this._invincibleTimer > 0) return false; // still invincible
    if (this.shieldActive)         return false; // shield absorbs hit

    this.lives--;
    this._invincibleTimer = 1500; // 1.5s invincibility
    this.scene.cameras.main.shake(200, 0.01);

    if (this.lives <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  die () {
    if (!this.alive) return;
    this.alive = false;
    this.sprite.body.setVelocityX(0);
    this.sprite.body.setGravityY(400);

    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      tint: 0xff0000,
      duration: 800,
      onComplete: () => {
        this.scene.events.emit('playerDead');
      }
    });
  }

  // ── Power-up activators ──────────────────────────────────────────
  activateShield () {
    this.shield       = Player.POWERUP_DURATION;
    this.shieldActive = true;
  }

  activateRocket () {
    this.rocket       = 2000; // 2s burst
    this.rocketActive = true;
  }

  activateMagnet () {
    this.magnet       = Player.POWERUP_DURATION;
    this.magnetActive = true;
  }

  // ── Coin magnet pull ─────────────────────────────────────────────
  attractCoins (coinGroup) {
    if (!this.magnetActive) return;
    const px = this.sprite.x;
    const py = this.sprite.y;
    coinGroup.getChildren().forEach(coin => {
      if (!coin.active || coin.getData('collected')) return;
      const dist = Phaser.Math.Distance.Between(px, py, coin.x, coin.y);
      if (dist < 160) {
        const angle = Phaser.Math.Angle.Between(coin.x, coin.y, px, py);
        coin.x += Math.cos(angle) * 5;
        coin.y += Math.sin(angle) * 5;
        coin.body.reset(coin.x, coin.y);
      }
    });
  }

  // ── Particles (simple) ───────────────────────────────────────────
  _emitJumpParticles (color) {
    if (!this.scene.textures.exists('particle')) return;
    const c = color || 0x00ffff;
    for (let i = 0; i < 5; i++) {
      const p = this.scene.add.image(
        this.sprite.x + Phaser.Math.Between(-12, 12),
        this.sprite.y + 18,
        'particle'
      );
      p.setTint(c).setScale(0.5).setDepth(9);
      this.scene.tweens.add({
        targets: p,
        x: p.x + Phaser.Math.Between(-25, 25),
        y: p.y + Phaser.Math.Between(8, 22),
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: 280,
        onComplete: () => p.destroy()
      });
    }
  }

  destroy () {
    // Clean up DOM listeners are not strictly needed as we only remove on scene shutdown
    this.sprite.destroy();
  }
}

window.Player = Player;
