/**
 * daily_reward.js  –  Daily login-reward system using localStorage.
 */
class DailyReward {
  constructor () {
    this.STORAGE_KEY = 'neonJumpDailyReward';
    this._load();
  }

  // ── Persistence ────────────────────────────────────────────────
  _load () {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const d       = JSON.parse(raw);
        this.lastClaim  = d.lastClaim  || null;
        this.streak     = d.streak     || 0;
        this.totalCoins = d.totalCoins || 0;
      } else {
        this._reset();
      }
    } catch (_) {
      this._reset();
    }
  }

  _reset () {
    this.lastClaim  = null;
    this.streak     = 0;
    this.totalCoins = 0;
  }

  _save () {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        lastClaim:  this.lastClaim,
        streak:     this.streak,
        totalCoins: this.totalCoins
      }));
    } catch (_) { /* storage unavailable – silent fail */ }
  }

  // ── Public API ──────────────────────────────────────────────────
  /**
   * Returns true when at least 24 hours have elapsed since the last claim
   * (or if the player has never claimed).
   */
  canClaim () {
    if (!this.lastClaim) return true;
    return (Date.now() - new Date(this.lastClaim).getTime()) >= 86400000;
  }

  /**
   * Processes a claim.
   * @returns {number} coins awarded (0 if not yet claimable)
   */
  claim () {
    if (!this.canClaim()) return 0;

    const now = Date.now();

    // Update streak
    if (this.lastClaim) {
      const elapsed = now - new Date(this.lastClaim).getTime();
      // Keep streak if claim is within 48h window (give some leeway)
      this.streak = elapsed <= 172800000 ? this.streak + 1 : 1;
    } else {
      this.streak = 1;
    }

    this.lastClaim = new Date(now).toISOString();

    // Reward = base + streak bonus + small random
    const base        = 50;
    const streakBonus = Math.min(this.streak * 10, 150);
    const rand        = Math.floor(Math.random() * 101); // 0-100
    const reward      = base + streakBonus + rand;

    this.totalCoins += reward;
    this._save();
    return reward;
  }

  /**
   * Returns a human-readable countdown string, or 'CLAIM NOW' if claimable.
   */
  getTimeUntilNextClaim () {
    if (this.canClaim()) return 'CLAIM NOW';

    const remaining = (new Date(this.lastClaim).getTime() + 86400000) - Date.now();
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000)   / 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  /** Returns the current day streak count. */
  getStreak () {
    return this.streak;
  }
}

window.DailyReward = DailyReward;
