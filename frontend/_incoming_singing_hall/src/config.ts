/**
 * 女书游戏 - Phaser 配置与常量
 */
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainScene } from './scenes/MainScene';

/** 视口尺寸（屏幕可见区域） */
export const VIEW_WIDTH = 1920;
export const VIEW_HEIGHT = 1080;

/** 世界尺寸（地图实际大小，与底图 2172×724 一致） */
export const WORLD_WIDTH = 4344;
export const WORLD_HEIGHT = 1448;

/** 兼容旧代码（MainScene 中仍用 GAME_WIDTH/HEIGHT 作为世界尺寸） */
export const GAME_WIDTH = WORLD_WIDTH;
export const GAME_HEIGHT = WORLD_HEIGHT;

/** 玩家移动速度 */
export const PLAYER_SPEED = 400;

/** 交互距离（像素） */
export const INTERACT_DISTANCE = 160;

/** 存档Key */
export const SAVE_KEY = 'womenbook_save';

/** Phaser 游戏配置 */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, MainScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};
