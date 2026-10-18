/**
 * D.5.7 + D.5.10 — Weapon system + HUD.
 *
 * Left-click → fire pistol: raycast from camera forward, if hit a
 * bot, damage it. Decrement ammo. Show muzzle flash + impact decal.
 *
 * HUD: HP bar, ammo counter, crosshair (HTML overlay).
 *
 * The pistol is a stub — the decompiled `weapons.ts` has
 * `PrimaryAttack` / `WeaponIdle` / `Reload` methods we'd call
 * here. For v1, the weapon logic is inline.
 */

import { Scene } from "@babylonjs/core/scene";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { Ray } from "@babylonjs/core/Culling/ray";

import type { StubBot } from "./bot";

export interface WeaponOptions {
  camera: UniversalCamera;
  scene: Scene;
  damage?: number;
  maxAmmo?: number;
  range?: number;
  fireRate?: number; // shots per second
}

export class Pistol {
  readonly camera: UniversalCamera;
  readonly scene: Scene;
  readonly damage: number;
  readonly maxAmmo: number;
  readonly range: number;
  private fireCooldown = 0;
  private fireRate: number;
  private ammo: number;
  private flashMesh: any; // AbstractMesh
  private flashLife = 0;
  private lastFireTime = 0;
  private onHit: (target: StubBot, pos: Vector3) => void;

  constructor(opts: WeaponOptions) {
    this.camera = opts.camera;
    this.scene = opts.scene;
    this.damage = opts.damage ?? 12;
    this.maxAmmo = opts.maxAmmo ?? 50;
    this.range = opts.range ?? 100;
    this.fireRate = opts.fireRate ?? 4;
    this.ammo = this.maxAmmo;
    this.onHit = () => {};

    // Muzzle flash: small bright sphere in front of camera
    this.flashMesh = null;
  }

  setOnHit(callback: (target: StubBot, pos: Vector3) => void): void {
    this.onHit = callback;
  }

  getAmmo(): number {
    return this.ammo;
  }

  getMaxAmmo(): number {
    return this.maxAmmo;
  }

  canFire(): boolean {
    return this.ammo > 0 && this.fireCooldown <= 0;
  }

  /**
   * Try to fire. If `bots` is provided, raycast forward and damage
   * the closest bot hit.
   */
  fire(bots?: StubBot[]): { hit: StubBot | null; pos: Vector3 } {
    if (!this.canFire()) return { hit: null, pos: new Vector3() };
    this.ammo--;
    this.fireCooldown = 1 / this.fireRate;
    this.lastFireTime = performance.now();

    // Muzzle flash
    this.spawnMuzzleFlash();

    const origin = this.camera.position;
    const forward = this.camera.getDirection(new Vector3(0, 0, 1));

    // Raycast
    if (bots && bots.length > 0) {
      const ray = new Ray(origin, forward, this.range);

      let closestBot: StubBot | null = null;
      let closestDist = Infinity;
      let closestPos: Vector3 = origin.add(forward.scale(this.range));

      for (const bot of bots) {
        // Use bot position + simple sphere distance check
        // (we don't have proper mesh picking set up)
        const botPos = new Vector3(bot.entity.pev.origin.x, bot.entity.pev.origin.y + 0.9, bot.entity.pev.origin.z);
        const dist = Vector3.Distance(origin, botPos);
        if (dist > this.range) continue;
        // Check if bot is in front
        const toBot = botPos.subtract(origin);
        toBot.normalize();
        const dot = Vector3.Dot(forward, toBot);
        if (dot < 0.85) continue; // > ~30° off-axis
        if (dist < closestDist) {
          closestDist = dist;
          closestBot = bot;
          closestPos = botPos;
        }
      }
      if (closestBot) {
        closestBot.damage(this.damage);
        this.onHit(closestBot, closestPos);
        return { hit: closestBot, pos: closestPos };
      }
    }
    return { hit: null, pos: origin.add(forward.scale(this.range)) };
  }

  /** Step cooldown. */
  update(deltaMs: number): void {
    if (this.fireCooldown > 0) {
      this.fireCooldown -= deltaMs / 1000;
    }
    if (this.flashLife > 0) {
      this.flashLife -= deltaMs / 1000;
      if (this.flashLife <= 0 && this.flashMesh) {
        this.flashMesh.dispose();
        this.flashMesh = null;
      }
    }
  }

  /** Replenish ammo (R key reload). */
  reload(): void {
    this.ammo = this.maxAmmo;
  }

  private spawnMuzzleFlash(): void {
    if (this.flashMesh) {
      this.flashMesh.dispose();
    }
    // Use MeshBuilder imported lazily
    import("@babylonjs/core/Meshes/meshBuilder").then(({ MeshBuilder }) => {
      import("@babylonjs/core/Materials/standardMaterial").then(({ StandardMaterial }) => {
        this.flashMesh = MeshBuilder.CreateSphere("muzzleflash", { diameter: 0.3 }, this.scene);
        const mat = new StandardMaterial("muzzleflash_mat", this.scene);
        mat.emissiveColor = new Color3(1, 0.9, 0.4);
        mat.diffuseColor = new Color3(1, 0.9, 0.4);
        this.flashMesh.material = mat;
        const fwd = this.camera.getDirection(new Vector3(0, 0, 1));
        this.flashMesh.position = this.camera.position.add(fwd.scale(1.0));
        this.flashLife = 0.05; // 50ms
      });
    });
  }
}

/**
 * D.5.10 — HUD overlay (HTML).
 *
 * Updates the existing #status div with HP + ammo + crosshair.
 * For a richer HUD, we'd use Babylon GUI; for v1, HTML is fine.
 */
export class HudOverlay {
  private root: HTMLElement;
  private hpBar: HTMLElement;
  private hpText: HTMLElement;
  private ammoText: HTMLElement;
  private crosshair: HTMLElement;
  private hitMarker: HTMLElement;
  private hitMarkerTime = 0;
  /** Damage flash — red overlay on the screen when player takes damage. */
  private damageFlash: HTMLElement;
  private damageFlashTime = 0;
  /** Kill counter (top right). */
  private killText: HTMLElement;
  private kills = 0;
  /** Death banner — big "YOU DIED" overlay. */
  private deathBanner: HTMLElement;
  private deathBannerTime = 0;
  /** Notification log (kill messages). */
  private notify: HTMLElement;
  private notifications: Array<{ text: string; timer: number }> = [];

  constructor(parent: HTMLElement) {
    // Build HUD
    this.root = document.createElement("div");
    this.root.id = "hud";
    this.root.style.cssText = `
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      pointer-events: none; z-index: 10; font: 14px monospace;
      color: #0f0; user-select: none;
    `;
    parent.appendChild(this.root);

    // Crosshair
    this.crosshair = document.createElement("div");
    this.crosshair.style.cssText = `
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 24px; height: 24px;
      background: radial-gradient(circle, transparent 0%, transparent 40%, #0f0 40%, #0f0 45%, transparent 45%);
      opacity: 0.8;
    `;
    this.root.appendChild(this.crosshair);

    // HP bar (top left)
    const hpContainer = document.createElement("div");
    hpContainer.style.cssText = `
      position: absolute; top: 40px; left: 10px;
      width: 200px; height: 16px;
      background: rgba(0,0,0,0.5); border: 1px solid #0f0;
    `;
    this.root.appendChild(hpContainer);
    this.hpBar = document.createElement("div");
    this.hpBar.style.cssText = `
      width: 100%; height: 100%;
      background: linear-gradient(90deg, #0f0, #ff0);
      transition: width 0.1s;
    `;
    hpContainer.appendChild(this.hpBar);
    this.hpText = document.createElement("div");
    this.hpText.style.cssText = `
      position: absolute; top: 56px; left: 10px;
      color: #0f0;
    `;
    this.root.appendChild(this.hpText);
    this.hpText.textContent = "HP: 100";

    // Ammo (bottom right)
    this.ammoText = document.createElement("div");
    this.ammoText.style.cssText = `
      position: absolute; bottom: 20px; right: 20px;
      font-size: 24px; color: #0f0;
      text-shadow: 2px 2px 0 #000;
    `;
    this.root.appendChild(this.ammoText);
    this.ammoText.textContent = "∞ / ∞";

    // Hit marker (small X at center when you hit)
    this.hitMarker = document.createElement("div");
    this.hitMarker.style.cssText = `
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      color: #f00; font-size: 32px; font-weight: bold;
      opacity: 0; transition: opacity 0.05s;
    `;
    this.hitMarker.textContent = "✕";
    this.root.appendChild(this.hitMarker);

    // Damage flash (red overlay)
    this.damageFlash = document.createElement("div");
    this.damageFlash.style.cssText = `
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(circle, transparent 30%, rgba(255,0,0,0.6) 100%);
      opacity: 0; transition: opacity 0.1s;
      pointer-events: none;
    `;
    this.root.appendChild(this.damageFlash);

    // Kill counter (top right)
    this.killText = document.createElement("div");
    this.killText.style.cssText = `
      position: absolute; top: 40px; right: 20px;
      font-size: 18px; color: #ff0;
      text-shadow: 2px 2px 0 #000;
    `;
    this.root.appendChild(this.killText);
    this.killText.textContent = "KILLS: 0";

    // Death banner
    this.deathBanner = document.createElement("div");
    this.deathBanner.style.cssText = `
      position: absolute; top: 30%; left: 50%;
      transform: translate(-50%, -50%);
      color: #f00; font-size: 80px; font-weight: bold;
      text-shadow: 4px 4px 0 #000;
      opacity: 0; transition: opacity 0.2s;
      letter-spacing: 8px;
    `;
    this.deathBanner.textContent = "YOU DIED";
    this.root.appendChild(this.deathBanner);

    // Notification log (bottom left)
    this.notify = document.createElement("div");
    this.notify.style.cssText = `
      position: absolute; bottom: 60px; left: 10px;
      color: #ff0; font-size: 16px;
      text-shadow: 1px 1px 0 #000;
    `;
    this.root.appendChild(this.notify);
  }

  update(health: number, maxHealth: number, ammo: number, maxAmmo: number, deltaMs: number): void {
    const pct = Math.max(0, Math.min(100, (health / maxHealth) * 100));
    this.hpBar.style.width = pct + "%";
    this.hpBar.style.background = pct > 50 ? "linear-gradient(90deg, #0f0, #ff0)" :
                                    pct > 25 ? "linear-gradient(90deg, #f80, #f00)" :
                                                "#f00";
    this.hpText.textContent = `HP: ${Math.max(0, Math.round(health))}`;
    this.ammoText.textContent = `${ammo} / ${maxAmmo}`;
    this.killText.textContent = `KILLS: ${this.kills}`;

    if (this.hitMarkerTime > 0) {
      this.hitMarkerTime -= deltaMs / 1000;
      if (this.hitMarkerTime <= 0) {
        this.hitMarker.style.opacity = "0";
      }
    }
    if (this.damageFlashTime > 0) {
      this.damageFlashTime -= deltaMs / 1000;
      if (this.damageFlashTime <= 0) {
        this.damageFlash.style.opacity = "0";
      }
    }
    if (this.deathBannerTime > 0) {
      this.deathBannerTime -= deltaMs / 1000;
      if (this.deathBannerTime <= 0) {
        this.deathBanner.style.opacity = "0";
      }
    }
    // Update notifications
    this.notifications = this.notifications.filter((n) => {
      n.timer -= deltaMs / 1000;
      return n.timer > 0;
    });
    this.notify.innerHTML = this.notifications.map((n) => n.text).join("<br/>");
  }

  flashHit(): void {
    this.hitMarker.style.opacity = "1";
    this.hitMarkerTime = 0.15;
  }

  flashDamage(): void {
    this.damageFlash.style.opacity = "1";
    this.damageFlashTime = 0.2;
  }

  showDeath(): void {
    this.deathBanner.style.opacity = "1";
    this.deathBannerTime = 3.0;
  }

  hideDeath(): void {
    this.deathBanner.style.opacity = "0";
    this.deathBannerTime = 0;
  }

  incrementKills(name: string): void {
    this.kills++;
    this.addNotification(`+ ${name}`);
  }

  addNotification(text: string): void {
    this.notifications.unshift({ text, timer: 3.0 });
    if (this.notifications.length > 5) this.notifications.length = 5;
  }

  dispose(): void {
    this.root.remove();
  }
}
