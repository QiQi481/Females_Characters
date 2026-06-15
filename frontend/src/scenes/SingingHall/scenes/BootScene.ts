/**
 * BootScene - 启动场景
 * 负责加载游戏所需资源，然后跳转到主场景
 */
import Phaser from 'phaser';
import { SceneKeys } from '../types';

const assetUrl = (fileName: string): string =>
  `/assets/singing-hall/${fileName}`;

const mainBgUrl = assetUrl('main_bg.png');
const sistersUrl = assetUrl('sisters_sing.png');
const completionMidUrl = assetUrl('completion_mid.png');
const completionTopUrl = assetUrl('completion_top.png');
const dialogueBgUrl = assetUrl('dialogue_bg.png');
const sistersSceneBgUrl = assetUrl('sisters_scene_bg.png');
const sistersFullSceneUrl = assetUrl('sisters_fullscene.png');
const paperImgUrl = assetUrl('paper_img.png');
const pipaImgUrl = assetUrl('pipa.png');
const sistersTextUrl = assetUrl('sisters_text.png');
const fanOpenUrl = assetUrl('fan_open.png');
const bimoUrl = assetUrl('bimo.png');
const bimoTextUrl = assetUrl('bimo_text.png');
const pipaTextUrl = assetUrl('pipa_text.png');
const fanTextUrl = assetUrl('fan_text.png');
const nvshuGirlUrl = assetUrl('nvshu_girl.png');
const nvshuGirlTextUrl = assetUrl('nvshu_girl_text.png');
const bimoBigUrl = assetUrl('bimo_big.png');
const paperTextUrl = assetUrl('paper_text.png');
const openBookIconUrl = '/assets/ui/open_book_icon.png';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.BOOT });
  }

  preload(): void {
    // ========== 加载提示文字 ==========
    const loadingText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 30,
      '女书·江永',
      {
        fontSize: '32px',
        color: '#e8d5b7',
        fontFamily: 'serif',
      }
    );
    loadingText.setOrigin(0.5);

    const subText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 20,
      '加载中……',
      {
        fontSize: '16px',
        color: '#a89984',
        fontFamily: 'serif',
      }
    );
    subText.setOrigin(0.5);

    // ========== 加载外部图片资源 ==========
    // 主场景背景图（使用 Vite 导入的 URL）
    this.load.image('main_bg', mainBgUrl);

    // 围坐姐妹图片
    this.load.image('sisters_img', sistersUrl);

    // 完成场景 - 中间层（桌面/背景）
    this.load.image('completion_mid', completionMidUrl);

    // 完成场景 - 最上层（人物立绘）
    this.load.image('completion_top', completionTopUrl);

    // 姐妹对话场景 - 对话气泡背景图
    this.load.image('dialogue_bg', dialogueBgUrl);

    // 姐妹对话场景 - 场景背景底图
    this.load.image('sisters_scene_bg', sistersSceneBgUrl);

    // 姐妹对话场景 - 完整界面图（含人物+对话气泡）
    this.load.image('sisters_fullscene', sistersFullSceneUrl);

    // 传唱纸片图片
    this.load.image('paper_img', paperImgUrl);

    // 琵琶图片
    this.load.image('pipa_img', pipaImgUrl);

    // 两个副场景共用的词典入口图标
    this.load.image('open_book_icon', openBookIconUrl);

    // 围坐姐妹上方文字图片（身声，保留白底）
    this.load.image('sisters_text_img', sistersTextUrl);

    // 唱扇女展开页图片
    this.load.image('fan_open_img', fanOpenUrl);

    // 笔墨图片
    this.load.image('bimo_img', bimoUrl);

    // 笔墨上方文字图片
    this.load.image('bimo_text_img', bimoTextUrl);

    // 琵琶上方文字图片
    this.load.image('pipa_text_img', pipaTextUrl);

    // 唱扇女上方文字图片
    this.load.image('fan_text_img', fanTextUrl);

    // 女书女子图片（纸片与琵琶之间）
    this.load.image('nvshu_girl_img', nvshuGirlUrl);

    // 唱扇女左上方文字图片
    this.load.image('nvshu_girl_text_img', nvshuGirlTextUrl);

    // 笔墨大图预览
    this.load.image('bimo_big_img', bimoBigUrl);

    // 传唱纸片上方文字图片（纸）
    this.load.image('paper_text_img', paperTextUrl);

    // ========== 用图形生成简单贴图（不需要外部资源） ==========
    // 玩家 - 蓝色圆形
    this.createCircleTexture('player', 16, 0x4a90d9);

    // 线索标记 - 金色菱形
    this.createDiamondTexture('clue_marker', 12, 0xffd700);

    // NPC - 粉色圆形
    this.createCircleTexture('npc', 14, 0xe8a0bf);

    // 唱扇女入口标记
    this.createCircleTexture('song_entrance', 20, 0xff6b6b);

    // 地面纹理
    this.createGroundTexture();

    // 词典按钮
    this.createButtonTexture('btn_dictionary', 120, 36, 0x5c4a3d);
  }

  create(): void {
    // 去除围坐姐妹图片的白色背景
    this.removeWhiteBg('sisters_img', 230);

    // 去除唱扇女展开页的白色背景
    this.removeWhiteBg('fan_open_img', 240);

    // 去除笔墨图片的白色背景
    this.removeWhiteBg('bimo_img', 240);

    // 去除女书女子图片的白色背景
    this.removeWhiteBg('nvshu_girl_img', 240);

    // 唱扇女文字图片保留白色背景（不做去除处理）

    // 去除笔墨大图的白色背景
    this.removeWhiteBg('bimo_big_img', 240);

    const startScene =
      this.registry.get('startScene') ?? SceneKeys.MAIN;

    // 短暂停留后进入指定场景
    this.time.delayedCall(500, () => {
      this.scene.start(startScene);
    });
  }

  /** 去除纹理中接近白色的像素（设为透明） */
  private removeWhiteBg(key: string, threshold: number = 230): void {
    const texture = this.textures.get(key);
    if (!texture || !texture.source[0]?.image) return;

    const img = texture.source[0].image as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > threshold && data[i + 1] > threshold && data[i + 2] > threshold) {
        data[i + 3] = 0; // alpha = 0 (透明)
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // 用处理后的canvas更新Phaser纹理
    this.textures.removeKey(key);
    this.textures.addCanvas(key, canvas);
  }

  // ========== 辅助方法：生成纹理 ==========

  /** 生成圆形纹理 */
  private createCircleTexture(key: string, radius: number, color: number): void {
    const size = radius * 2 + 4;
    const graphics = this.add.graphics();
    graphics.fillStyle(color, 1);
    graphics.fillCircle(size / 2, size / 2, radius);
    graphics.generateTexture(key, size, size);
    graphics.destroy();
  }

  /** 生成菱形纹理 */
  private createDiamondTexture(key: string, size: number, color: number): void {
    const s = size * 2 + 4;
    const graphics = this.add.graphics();
    graphics.fillStyle(color, 1);
    graphics.fillPoints([
      { x: s / 2, y: 2 },
      { x: s - 2, y: s / 2 },
      { x: s / 2, y: s - 2 },
      { x: 2, y: s / 2 },
    ], true);
    graphics.generateTexture(key, s, s);
    graphics.destroy();
  }

  /** 生成按钮纹理 */
  private createButtonTexture(key: string, w: number, h: number, color: number): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(0, 0, w, h, 6);
    graphics.generateTexture(key, w, h);
    graphics.destroy();
  }

  /** 生成简单地面纹理 */
  private createGroundTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0x3d5a3c, 1);
    g.fillRect(0, 0, 64, 64);
    // 加一些草地点缀
    g.fillStyle(0x4a7a4a, 0.5);
    g.fillRect(0, 0, 16, 4);
    g.fillRect(32, 16, 8, 4);
    g.fillRect(48, 48, 16, 4);
    g.generateTexture('ground', 64, 64);
    g.destroy();
  }

}

