// ============================================================
// BootScene — Splash screen, asset loading, session initialization
// ============================================================

import Phaser from 'phaser';
import { api } from '../../config/api.js';
import type { DeviceInfo } from '../../../../lib/types/index.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Generate procedural assets (no external files needed)
    this.createProceduralAssets();
  }

  create(): void {
    // Show splash while we initialize
    const bg = this.add.rectangle(220, 480, 440, 960, 0x0a0e27);
    bg.setOrigin(0.5);

    const logo = this.add.text(220, 400, 'CM', {
      fontSize: '64px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    const title = this.add.text(220, 470, 'CreditMind', {
      fontSize: '28px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: '#f1f5f9',
    }).setOrigin(0.5);

    const subtitle = this.add.text(220, 510, 'Business Mindset Assessment', {
      fontSize: '14px',
      fontFamily: 'sans-serif',
      color: '#94a3b8',
    }).setOrigin(0.5);

    // Animated gradient background for logo
    const logoBox = this.add.rectangle(220, 400, 100, 100, 0x6366f1, 0.8);
    logoBox.setStrokeStyle(2, 0x818cf8);
    this.add.existing(logoBox);
    logo.setDepth(1);

    // Pulsing animation
    this.tweens.add({
      targets: logoBox,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const startBtn = this.add.text(220, 620, 'Start Assessment', {
      fontSize: '18px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#6366f1',
      padding: { x: 32, y: 16 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    // Round corners effect via stroke
    const btnBg = this.add.rectangle(220, 620, 240, 52, 0x6366f1);
    btnBg.setInteractive({ useHandCursor: true });
    startBtn.setDepth(1);

    const statusText = this.add.text(220, 700, '', {
      fontSize: '12px',
      fontFamily: 'sans-serif',
      color: '#94a3b8',
    }).setOrigin(0.5);

    const onStart = async () => {
      btnBg.disableInteractive();
      startBtn.disableInteractive();
      statusText.setText('Preparing your unique assessment...');

      try {
        const deviceInfo: DeviceInfo = {
          userAgent: navigator.userAgent,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          touchSupported: 'ontouchstart' in window,
          platform: navigator.platform,
        };

        // Generate a simple user ID (in production this would come from auth)
        const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        const response = await api.startGame({
          user_id: userId,
          device_info: deviceInfo,
        });

        // Hide loading screen
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) loadingScreen.classList.add('hidden');
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) gameContainer.classList.add('active');

        // Transition to Phase 1
        this.scene.start('Phase1Scene', {
          sessionId: response.session_id,
          firstQuestion: response.question,
          progress: response.progress,
          totalEstimated: response.total_estimated,
          userId,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Connection error';
        statusText.setText(`Error: ${msg}. Tap to retry.`);
        btnBg.setInteractive({ useHandCursor: true });
        startBtn.setInteractive({ useHandCursor: true });
      }
    };

    btnBg.on('pointerup', onStart);
    startBtn.on('pointerup', onStart);

    // Hide browser loading screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.classList.add('hidden');
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) gameContainer.classList.add('active');
  }

  private createProceduralAssets(): void {
    // Create colored rectangle textures for UI elements
    const colors = [
      { key: 'btn-primary', color: 0x6366f1 },
      { key: 'btn-success', color: 0x22c55e },
      { key: 'btn-warning', color: 0xf59e0b },
      { key: 'btn-danger', color: 0xef4444 },
      { key: 'card-bg', color: 0x1e2952 },
      { key: 'bar-bg', color: 0x1e293b },
      { key: 'progress-bg', color: 0x1e293b },
      { key: 'progress-fill', color: 0x6366f1 },
    ];

    for (const { key, color } of colors) {
      const gfx = this.make.graphics({ add: false } as Phaser.Types.GameObjects.Graphics.Options);
      gfx.fillStyle(color, 1);
      gfx.fillRect(0, 0, 64, 64);
      gfx.generateTexture(key, 64, 64);
      gfx.destroy();
    }

    // Create particle texture
    const particleGfx = this.make.graphics({ add: false } as Phaser.Types.GameObjects.Graphics.Options);
    particleGfx.fillStyle(0xffffff, 1);
    particleGfx.fillCircle(4, 4, 4);
    particleGfx.generateTexture('particle', 8, 8);
    particleGfx.destroy();
  }
}
