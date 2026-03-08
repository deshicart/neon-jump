/**
 * platforms.js  –  PlatformManager
 *
 * Manages a recycled pool of platforms.
 * Types: normal | moving | crumbling | spring | coin
 *
 * Depends on: levels.js (LevelConfig, getCurrentLevel)
 */
class PlatformManager {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} startY – world-y where the player spawns
   */
  constructor (scene, startY) {
    this.scene       = scene;
    this.gameWidth   = scene.scale.width;
    this.gameHeight  = scene.scale.height;

    // Physics static group – used for normal/crumbling/spring/coin
    this.staticGroup = scene.physics.add.staticGroup();
    // Separate group for moving platforms (dynamic so we can move them)
    this.movingGroup = scene.physics.add.group({ allowGravity: false, immovable: true });
    // Coin overlap group
    this.coinGroup   = scene.physics.add.staticGroup();

    // All active platform objects (static + moving)
    this.active = [];
    // Inactive pool
    this.pool   = [];

    // Highest (most negative) y generated so far
    this.highestY = startY;

    this._buildInitialPlatforms(startY);
  }

  // ── Initial layout ──────────────────────────────────────────────
  _buildInitialPlatforms (startY) {
    // Guarantee a safe landing platform right below the player
    this._spawnAt(this.gameWidth / 2, startY + 40, 'normal');

    // Pre-fill 3 screens worth of platforms above
    const needed = Math.ceil((this.gameHeight * 3) / 120) + 5;
    for (let i = 0; i < needed; i++) {
      this.highestY -= this._getGap();
      const x = Phaser.Math.Between(55, this.gameWidth - 55);
      this._spawnAt(x, this.highestY, i < 3 ? 'normal' : this._randomType());
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────
  _getGap () {
    const lv = window.getCurrentLevel(window.currentScore || 0);
    return lv ? lv.platformGap : 130;
  }

  _getWidth () {
    const lv = window.getCurrentLevel(window.currentScore || 0);
    return lv ? lv.platformWidth : 90;
  }

  _randomType () {
    const lv = window.getCurrentLevel(window.currentScore || 0);
    const types = lv ? lv.platformTypes : { normal: 1 };
    const r = Math.random();
    let cum = 0;
    for (const [type, prob] of Object.entries(types)) {
      cum += prob;
      if (r <= cum) return type;
    }
    return 'normal';
  }

  // ── Spawn / recycle ─────────────────────────────────────────────
  _spawnAt (x, y, type) {
    let p;
    const isMoving = (type === 'moving');
    const texKey   = this.scene.textures.exists('platform_' + type)
                     ? 'platform_' + type
                     : 'platform_normal';
    const w = this._getWidth();

    if (this.pool.length > 0) {
      p = this.pool.pop();
      // Move to correct physics group if type changed
      if (isMoving && p._inStaticGroup) {
        this.staticGroup.remove(p, false, false);
        this.movingGroup.add(p);
        p._inStaticGroup = false;
      } else if (!isMoving && !p._inStaticGroup) {
        this.movingGroup.remove(p, false, false);
        this.staticGroup.add(p);
        p._inStaticGroup = true;
      }
      p.setTexture(texKey);
      p.setDisplaySize(w, 14);
      p.setActive(true).setVisible(true);
      p.x = x; p.y = y;
      if (isMoving) {
        p.body.reset(x, y);
        p.body.setSize(w, 14);
      } else {
        p.body.reset(x, y);
        p.refreshBody();
      }
    } else {
      if (isMoving) {
        p = this.movingGroup.create(x, y, texKey);
        p.setDisplaySize(w, 14);
        p.body.setSize(w, 14);
        p.body.allowGravity = false;
        p.body.immovable    = true;
        p._inStaticGroup = false;
      } else {
        p = this.staticGroup.create(x, y, texKey);
        p.setDisplaySize(w, 14);
        p.refreshBody();
        p._inStaticGroup = true;
      }
    }

    // Per-type data
    p.setData('type',      type);
    p.setData('startX',    x);
    p.setData('crumbled',  false);
    p.setData('crumbling', false);
    p.setData('hasCoin',   false);

    if (type === 'moving') {
      const lv = window.getCurrentLevel(window.currentScore || 0);
      p.setData('moveDir',   1);
      p.setData('moveSpeed', lv ? lv.platformSpeed : 80);
      p.setData('moveRange', Phaser.Math.Between(50, 110));
    }

    if (type === 'coin') {
      this._spawnCoin(x, y - 22);
      p.setData('hasCoin', true);
    }

    this.active.push(p);
    return p;
  }

  _spawnCoin (x, y) {
    if (!this.scene.textures.exists('coin')) return;
    const c = this.coinGroup.create(x, y, 'coin');
    c.setDisplaySize(18, 18);
    c.refreshBody();
    c.setData('collected', false);
    return c;
  }

  // ── Per-frame update ────────────────────────────────────────────
  /**
   * Call every frame from GameScene.update().
   * @param {number} delta – ms since last frame
   */
  update (delta) {
    const cam        = this.scene.cameras.main;
    const topBound   = cam.scrollY - 120;
    const bottomBound= cam.scrollY + this.gameHeight + 160;
    const dt         = delta / 1000;

    // Generate new platforms above the camera if needed
    while (this.highestY > topBound) {
      this.highestY -= this._getGap();
      const x = Phaser.Math.Between(55, this.gameWidth - 55);
      this._spawnAt(x, this.highestY, this._randomType());
    }

    // Update moving platforms and recycle off-screen ones
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];

      if (!p.active) {
        this.active.splice(i, 1);
        continue;
      }

      if (p.getData('type') === 'moving') {
        const startX     = p.getData('startX');
        const moveDir    = p.getData('moveDir');
        const moveSpeed  = p.getData('moveSpeed');
        const moveRange  = p.getData('moveRange');

        p.x += moveDir * moveSpeed * dt;
        if (p.x > startX + moveRange || p.x < startX - moveRange) {
          p.setData('moveDir', -moveDir);
        }
        p.body.reset(p.x, p.y);
      }

      // Recycle platforms that have gone below the screen
      if (p.y > bottomBound) {
        this._recycle(p, i);
      }
    }

    // Recycle off-screen coins
    const coins = this.coinGroup.getChildren();
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      if (c.y > bottomBound || c.getData('collected')) {
        c.destroy();
      }
    }
  }

  _recycle (p, idx) {
    this.active.splice(idx, 1);
    p.setActive(false).setVisible(false);
    this.pool.push(p);
  }

  // ── Crumble effect ───────────────────────────────────────────────
  /**
   * Call when player lands on a crumbling platform.
   * @param {Phaser.GameObjects.Image} platform
   */
  crumble (platform) {
    if (platform.getData('crumbling')) return;
    platform.setData('crumbling', true);

    this.scene.tweens.add({
      targets: platform,
      alpha: 0,
      duration: 280,
      onComplete: () => {
        const idx = this.active.indexOf(platform);
        if (idx !== -1) this._recycle(platform, idx);
        else {
          platform.setActive(false).setVisible(false);
          this.pool.push(platform);
        }
        platform.setAlpha(1);
      }
    });
  }

  // ── Accessors ────────────────────────────────────────────────────
  /** Returns the Phaser group(s) to set up colliders against. */
  getGroups () {
    return [this.staticGroup, this.movingGroup];
  }

  getCoinGroup () {
    return this.coinGroup;
  }
}

window.PlatformManager = PlatformManager;
