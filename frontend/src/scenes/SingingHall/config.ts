/**
 * 女书游戏 - Phaser 配置与常量
 */
import Phaser from 'phaser';
import { EmbroideryRoomPhaserScene } from '../EmbroideryRoom/phaser/EmbroideryRoomPhaserScene'
import type { GlobalDictionaryBridge } from '../../game/GlobalDictionaryBridge'
import { BootScene } from './scenes/BootScene';
import { MainScene } from './scenes/MainScene';
import { Scene5 } from './scenes/Scene5';
import { SceneKeys, type SceneKey } from './types'

/** 视口尺寸（屏幕可见区域） */
export const DESIGN_WIDTH = 1920;
export const DESIGN_HEIGHT = 1080;
export let VIEW_WIDTH = DESIGN_WIDTH;
export let VIEW_HEIGHT = DESIGN_HEIGHT;

export function setViewportSize(width: number, height: number): void {
  VIEW_WIDTH = width;
  VIEW_HEIGHT = height;
}

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

/** 场景独立存档 Key */
export const SAVE_KEY = 'womenbook_singing_hall_save';

/** 创建可挂载到 React 容器中的共享 Phaser 配置。 */
export function createPhaserGameConfig(
  parent: HTMLElement,
  startScene: SceneKey,
  dictionaryBridge: GlobalDictionaryBridge,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
    parent,
    backgroundColor: '#1a1a2e',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [BootScene, MainScene, Scene5, EmbroideryRoomPhaserScene],
    callbacks: {
      preBoot: (game) => {
        game.registry.set('startScene', startScene)
        game.registry.set('globalDictionaryBridge', dictionaryBridge)
      },
    },
    scale: {
      mode: Phaser.Scale.EXPAND,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };
}

export function createSingingHallGameConfig(
  parent: HTMLElement,
  dictionaryBridge: GlobalDictionaryBridge,
): Phaser.Types.Core.GameConfig {
  return createPhaserGameConfig(
    parent,
    SceneKeys.SCENE5,
    dictionaryBridge,
  )
}

export function createEmbroideryRoomGameConfig(
  parent: HTMLElement,
  dictionaryBridge: GlobalDictionaryBridge,
): Phaser.Types.Core.GameConfig {
  return createPhaserGameConfig(
    parent,
    SceneKeys.EMBROIDERY,
    dictionaryBridge,
  )
}
