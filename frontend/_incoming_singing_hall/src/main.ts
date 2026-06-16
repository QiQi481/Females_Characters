/**
 * 女书·江永 — 游戏入口
 * 初始化 Phaser 游戏实例
 */
import './style.css';
import Phaser from 'phaser';
import { gameConfig } from './config';

// 启动游戏
new Phaser.Game(gameConfig);

console.log('🌸 女书·江永 — 文字解密游戏已启动');
