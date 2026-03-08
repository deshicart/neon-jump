/**
 * enemies.js  –  EnemyManager
 *
 * Enemy types:
 *   floater  – drifts horizontally across the screen
 *   bouncer  – bounces up and down
 *   shooter  – fires projectiles at the player every few seconds
 *
 * Depends on: levels.js
 */
class EnemyManager {
  constructor (scene) {
    this.scene      = scene;
    this.gameWidth  = scene.scale.width;
    this.gameHeight = scene.scale.height;

    this.enemyGroup = scene.physics.add.group({ allowGravity: false });
    this.bulletGroup= scene.physics.add.group({ allowGravity: false });

    this.active  = [];   // active enemy objects
    this.pool    = [];   // inactive pool
    this.bullets = [];   // active bullet objects
    this.bPool   = [];   // bullet pool

    this.spawnTimer = 0;
    this.SPAWN_INTERVAL = 3500; // ms between spawn attempts
  }

  // ── Update ─────────────────────────────────────────────────────
  update (delta, playerSprite) {
    const cam         = this.scene.cameras.main;
    const topBound    = cam.scrollY - 80;
    const bottomBound = cam.scrollY + this.gameHeight + 80;
    const dt          = delta / 1000;

    this.spawnTimer += delta;
    const lv = window.getCurrentLevel(window.currentScore || 0);
    const maxEnemies = lv ? lv.enemyCount : 0;

    if (maxEnemies > 0 && this.active.length < maxEnemies && this.spawnTimer >= this.SPAWN_INTERVAL) {
      this.spawnTimer = 0;
      this._spawnRandom(cam.scrollY);
    }

    // Update enemies
    for (let i = this.active.length - 1; i >= 0; i--) {
      const e = this.active[i];
      if (!e.active) { this.active.splice(i, 1); continue; }

      switch (e.getData('etype')) {
        case 'floater':  this._updateFloater(e, dt);  break;
        case 'bouncer':  this._updateBouncer(e, dt);  break;
        case 'shooter':  this._updateShooter(e, dt, playerSprite); break;
      }

      // Recycle if off-screen
      if (e.y > bottomBound || e.y < topBound - 50) {
        this._recycleEnemy(e, i);
      }
    }

    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (!b.active) { this.bullets.splice(i, 1); continue; }
      if (b.y > bottomBound || b.y < topBound) {
        this._recycleBullet(b, i);
      }
    }
  }

  // ── Spawn helpers ───────────────────────────────────────────────
  _spawnRandom (camScrollY) {
    const types = ['floater', 'bouncer', 'shooter'];
    const lv    = window.getCurrentLevel(window.currentScore || 0);
    // Shooters unlock at level 3+
    const available = lv.index >= 2 ? types : types.slice(0, 2);
    const type = available[Phaser.Math.Between(0, available.length - 1)];
    const x    = Phaser.Math.Between(30, this.gameWidth - 30);
    const y    = camScrollY + Phaser.Math.Between(20, this.gameHeight * 0.5);
    this.spawnEnemy(this.scene, x, y, type);
  }

  /**
   * Spawn a specific enemy type.
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {string} type  floater | bouncer | shooter
   */
  spawnEnemy (scene, x, y, type) {
    const texKey = scene.textures.exists('enemy_' + type) ? 'enemy_' + type : 'enemy_floater';
    let e;
    if (this.pool.length > 0) {
      e = this.pool.pop();
      e.setTexture(texKey);
      e.setPosition(x, y);
      e.setActive(true).setVisible(true);
      e.body.reset(x, y);
      e.body.setVelocity(0, 0);
    } else {
      e = this.enemyGroup.create(x, y, texKey);
      e.body.allowGravity = false;
    }

    e.setDisplaySize(28, 28);
    e.body.setSize(24, 24);
    e.setData('etype', type);
    e.setData('startX', x);
    e.setData('startY', y);
    e.setData('dir', Phaser.Math.RND.sign());
    e.setData('shootTimer', Phaser.Math.Between(2000, 4000));
    e.setAlpha(1);

    switch (type) {
      case 'floater':
        e.body.setVelocityX(e.getData('dir') * Phaser.Math.Between(55, 100));
        break;
      case 'bouncer': {
        const spd = Phaser.Math.Between(60, 120);
        e.body.setVelocity(e.getData('dir') * 50, spd);
        break;
      }
      case 'shooter':
        // Stationary; fires bullets
        e.body.setVelocity(0, 0);
        break;
    }

    this.active.push(e);
    return e;
  }

  // ── Per-type logic ──────────────────────────────────────────────
  _updateFloater (e, dt) {
    // Wrap horizontally
    if (e.x < -20)                  e.x = this.gameWidth + 20;
    if (e.x > this.gameWidth + 20)  e.x = -20;
    e.body.reset(e.x, e.y);
  }

  _updateBouncer (e, dt) {
    // Wrap horizontally; bounce off vertical bounds within a range
    if (e.x < -20)                  { e.x = this.gameWidth + 20; e.body.reset(e.x, e.y); }
    if (e.x > this.gameWidth + 20)  { e.x = -20; e.body.reset(e.x, e.y); }

    const startY = e.getData('startY');
    const range  = 80;
    if (e.y > startY + range && e.body.velocity.y > 0) {
      e.body.setVelocityY(-Math.abs(e.body.velocity.y));
    }
    if (e.y < startY - range && e.body.velocity.y < 0) {
      e.body.setVelocityY(Math.abs(e.body.velocity.y));
    }
  }

  _updateShooter (e, dt, playerSprite) {
    if (!playerSprite) return;
    let timer = e.getData('shootTimer') - (dt * 1000);
    if (timer <= 0) {
      this._fireBullet(e, playerSprite);
      timer = Phaser.Math.Between(2500, 4500);
    }
    e.setData('shootTimer', timer);

    // Slow drift
    const startX = e.getData('startX');
    const dir    = e.getData('dir');
    e.x += dir * 25 * dt;
    if (Math.abs(e.x - startX) > 60) {
      e.setData('dir', -dir);
    }
    e.body.reset(e.x, e.y);
  }

  _fireBullet (shooter, player) {
    const texKey = this.scene.textures.exists('bullet') ? 'bullet' : 'coin';
    let b;
    if (this.bPool.length > 0) {
      b = this.bPool.pop();
      b.setTexture(texKey);
      b.setPosition(shooter.x, shooter.y);
      b.setActive(true).setVisible(true);
    } else {
      b = this.bulletGroup.create(shooter.x, shooter.y, texKey);
      b.body.allowGravity = false;
    }

    b.setDisplaySize(10, 10);
    b.setData('isBullet', true);

    // Aim at player
    const angle = Phaser.Math.Angle.Between(shooter.x, shooter.y, player.x, player.y);
    const speed = 180;
    b.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    this.bullets.push(b);
    return b;
  }

  // ── Recycle ─────────────────────────────────────────────────────
  _recycleEnemy (e, idx) {
    this.active.splice(idx, 1);
    e.setActive(false).setVisible(false);
    e.body.setVelocity(0, 0);
    this.pool.push(e);
  }

  _recycleBullet (b, idx) {
    this.bullets.splice(idx, 1);
    b.setActive(false).setVisible(false);
    b.body.setVelocity(0, 0);
    this.bPool.push(b);
  }

  // ── Accessors ────────────────────────────────────────────────────
  getEnemyGroup ()  { return this.enemyGroup;  }
  getBulletGroup () { return this.bulletGroup; }

  /** Destroy an enemy on hit, return score bonus. */
  destroyEnemy (e) {
    const idx = this.active.indexOf(e);
    if (idx !== -1) this._recycleEnemy(e, idx);
    return 25;
  }

  destroyBullet (b) {
    const idx = this.bullets.indexOf(b);
    if (idx !== -1) this._recycleBullet(b, idx);
  }
}

window.EnemyManager = EnemyManager;
