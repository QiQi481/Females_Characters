/**
 * MainScene - 主场景：姐妹围坐一起唱歌
 *
 * 底图 2172×724，屏幕视口 800×600，相机跟随玩家。
 * 包含所有线索：唱扇女展开页、围坐姐妹、女红篮、传唱纸片、歌案/唱扇女
 * 玩家自由探索，收集女书符号，在词典中配对。
 * 全部词条配对后推测"歌声传记"句子，完成场景。
 */
import Phaser from 'phaser';
import { SceneKeys } from '../types';
import {
  PLAYER_SPEED,
  INTERACT_DISTANCE,
  GAME_WIDTH,
  GAME_HEIGHT,
  VIEW_WIDTH,
  VIEW_HEIGHT,
} from '../config';
import { SaveSystem } from '../systems/SaveSystem';
import { DictionarySystem } from '../systems/DictionarySystem';
import { DictionaryUI } from '../ui/DictionaryUI';
import {
  SONG_ENTRIES,
  SONG_CLUES,
  SONG_SLOTS,
  SISTERS_NPC,
  FINAL_SENTENCE_IDS,
} from './song/SongData';

export class MainScene extends Phaser.Scene {
  // ========== 系统 ==========
  private saveSystem!: SaveSystem;
  private dictSystem!: DictionarySystem;

  // ========== 游戏对象 ==========
  private player!: Phaser.Physics.Arcade.Sprite;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;

  // ========== UI ==========
  private dictUI!: DictionaryUI;
  private interactHint!: Phaser.GameObjects.Container;
  private _sistersTextHint!: Phaser.GameObjects.Container;
  private _hintText!: Phaser.GameObjects.Text;



  // ========== 线索标记精灵 ==========
  private clueMarkers: Phaser.Physics.Arcade.Sprite[] = [];
  private clueMarkerBaseScales: number[] = [];
  private npcSprites: Phaser.Physics.Arcade.Sprite[] = [];
  private npcSistersBaseScale = 1;
  private _girlImg!: Phaser.GameObjects.Image;
  private _girlImgBaseScale = 1;

  // ========== 弹窗/对话状态 ==========
  private popupContainer!: Phaser.GameObjects.Container;
  private popupBg!: Phaser.GameObjects.Rectangle;
  private popupTitle!: Phaser.GameObjects.Text;
  private popupText!: Phaser.GameObjects.Text;
  private popupCloseBtn!: Phaser.GameObjects.Text;
  private popupOpen = false;

  private dialogueContainer!: Phaser.GameObjects.Container;
  private dialogueText!: Phaser.GameObjects.Text;
  private dialogueNextHint!: Phaser.GameObjects.Text;
  private dialogueIndex = 0;
  private dialogues: string[] = [];
  private dialogueOpen = false;

  // ========== 推测面板 ==========
  private guessContainer!: Phaser.GameObjects.Container;
  private guessSlots: Phaser.GameObjects.Text[] = [];
  private guessEntryIds: (string | null)[] = [];
  private guessOnConfirm: ((ids: string[]) => void) | null = null;
  private guessAvailable: { id: string; char: string }[] = [];
  private guessSelectedIndex = 0;
  private guessOpen = false;

  // ========== 线索进度 ==========
  private clueFoundCount = 0;
  private clueTotalCount = SONG_CLUES.length + 1; // 5个线索 + 1个NPC
  private foundClueIds: Set<string> = new Set();
  private clueProgressText!: Phaser.GameObjects.Text;

  // ========== 交互状态 ==========
  private canInteract = false;
  private currentTarget = '';
  private currentClueIndex = -1;
  private _pendingEntryIds: string[] = [];

  // ========== 完成场景状态 ==========
  private completionMode = false;
  private savedPlayerPos: { x: number; y: number } | null = null;

  // ========== 姐妹对话场景状态 ==========
  private sistersSceneOpen = false;
  private sistersScenePhase1 = true;
  private sistersScenePhase2 = false;
  private sistersScenePhase3 = false;
  private _sistersKeyHandler: ((event: KeyboardEvent) => void) | null = null;
  private _sistersClickHandler: (() => void) | null = null;

  // ========== 纸片大图预览状态 ==========
  private paperPreviewOpen = false;
  private paperPreviewPhase1 = true;
  private paperPreviewPhase2 = false;
  private _paperKeyHandler: ((event: KeyboardEvent) => void) | null = null;

  // ========== 唱扇女大图预览状态 ==========
  private fanPreviewOpen = false;
  private fanPreviewPhase1 = true;
  private fanPreviewPhase2 = false;
  private _fanKeyHandler: ((event: KeyboardEvent) => void) | null = null;
  private bimoPreviewOpen = false;
  private bimoPreviewPhase1 = true;
  private _bimoKeyHandler: ((event: KeyboardEvent) => void) | null = null;

  // ========== 琵琶大图预览状态（三阶段）==========
  private pipaPreviewOpen = false;
  private pipaPreviewPhase1 = true;
  private pipaPreviewPhase2 = false;
  private pipaTextLine = 0;  // Phase 3 逐行显示：0=待显示, 1/2/3=已显示行数
  private pipaDialogueTextObj: Phaser.GameObjects.Text | null = null;
  private _pipaKeyHandler: ((event: KeyboardEvent) => void) | null = null;

  // ========== 笔墨名称标签（接近时显示）==========
  private _bimoLabelGfx!: Phaser.GameObjects.Graphics;
  private _bimoLabelText!: Phaser.GameObjects.Text;

  // ========== 唱扇女NPC场景图预览状态（三阶段逐行）==========
  private girlPreviewOpen = false;
  private girlPhase1 = true;       // Phase 1：场景图 + 标题
  private girlTextLine = 0;        // Phase 2 已显示行数
  private girlLines: string[] = [];
  private girlDialogueTextObj: Phaser.GameObjects.Text | null = null;
  private _girlKeyHandler: ((event: KeyboardEvent) => void) | null = null;

  // ========== 唱扇女展开页名称标签（接近时显示）==========
  private _fanLabelGfx!: Phaser.GameObjects.Graphics;
  private _fanLabelText!: Phaser.GameObjects.Text;

  // ========== 围坐姐妹名称标签（接近时显示）==========
  private _sistersLabelGfx!: Phaser.GameObjects.Graphics;
  private _sistersLabelText!: Phaser.GameObjects.Text;

  // ========== 唱扇女名称标签（接近时显示）==========
  private _girlLabelGfx!: Phaser.GameObjects.Graphics;
  private _girlLabelText!: Phaser.GameObjects.Text;

  // ========== 传唱纸片名称标签（接近时显示）==========
  private _paperLabelGfx!: Phaser.GameObjects.Graphics;
  private _paperLabelText!: Phaser.GameObjects.Text;

  // ========== 琵琶名称标签（接近时显示）==========
  private _pipaLabelGfx!: Phaser.GameObjects.Graphics;
  private _pipaLabelText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SceneKeys.MAIN });
  }

  create(): void {
    // ========== 世界边界（与底图尺寸一致）==========
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // ========== 初始化系统 ==========
    this.saveSystem = new SaveSystem();
    this.dictSystem = new DictionarySystem(this.saveSystem);

    SONG_ENTRIES.forEach((entry) => {
      const existing = this.saveSystem.getEntry(entry.id);
      if (!existing) {
        this.saveSystem.unlockEntry({ ...entry, unlocked: false, matched: false });
      }
    });

    // ========== 背景底图（放大2倍填满世界）==========
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'main_bg');
    bg.setScale(2);
    bg.setDepth(0);

    // ========== 玩家 ==========
    this.player = this.physics.add.sprite(400, 900, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.body!.setSize(56, 56);

    // ========== 相机：跟随玩家，初始视口居中 ==========
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // ========== 键盘输入 ==========
    this.keyW = this.input.keyboard!.addKey('W');
    this.keyA = this.input.keyboard!.addKey('A');
    this.keyS = this.input.keyboard!.addKey('S');
    this.keyD = this.input.keyboard!.addKey('D');

    this.input.keyboard?.on('keydown-E', () => {
      if (this.popupOpen || this.dialogueOpen || this.guessOpen || this.sistersSceneOpen) return;
      if (this.dictUI?.isOpened()) return;
      this.handleInteract();
    });

    this.input.keyboard?.on('keydown-Q', () => {
      if (this.sistersSceneOpen) return;
      if (this.dictUI?.isOpened()) return;
      if (this.popupOpen) { this.closePopup(); return; }
      if (this.dialogueOpen) { this.closeDialogue(); return; }
      if (this.guessOpen) { this.closeGuessPanel(); return; }
    });

    // ========== ESC 键：完成场景中返回主游戏 ==========
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.completionMode) {
        this.exitCompletionMode();
      }
    });

    // ========== 创建所有UI ==========
    this.createPopup();
    this.createDialogueBubble();
    this.createGuessPanel();
    this.createInteractHint();

    // ========== 词典UI ==========
    this.dictUI = new DictionaryUI(this, this.dictSystem);
    this.dictUI.setSlots(SONG_SLOTS);

    this.events.on('resume', () => {
      this.checkAllMatched();
    });

    // ========== 线索标记 ==========
    this.placeClues();

    // ========== NPC ==========
    this.placeNPCs();

    // ========== HUD：固定在屏幕上的UI（使用 setScrollFactor(0)）==========
    this.createHUD();
  }

  update(): void {
    if (this.completionMode || this.popupOpen || this.dialogueOpen || this.guessOpen || this.dictUI?.isOpened() || this.sistersSceneOpen) {
      this.player.setVelocity(0, 0);
      return;
    }

    // 玩家移动（WASD）
    let vx = 0;
    let vy = 0;
    if (this.keyA.isDown) vx = -PLAYER_SPEED;
    else if (this.keyD.isDown) vx = PLAYER_SPEED;
    if (this.keyW.isDown) vy = -PLAYER_SPEED;
    else if (this.keyS.isDown) vy = PLAYER_SPEED;
    this.player.setVelocity(vx, vy);

    // 检测附近可交互对象
    this.checkProximity();
  }

  // ==================== HUD（固定在屏幕上，不随相机滚动）====================

  private createHUD(): void {
    // 词典入口按钮（屏幕最上方中间 - 使用新词典图标）
    const dictBtn = this.add.image(VIEW_WIDTH / 2, 30, 'icon1_img')
      .setScale(0.15)
      .setDepth(52)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    dictBtn.on('pointerover', () => dictBtn.setScale(0.17));
    dictBtn.on('pointerout', () => dictBtn.setScale(0.15));
    dictBtn.on('pointerdown', () => {
      if (!this.dictUI?.isOpened()) {
        this.dictUI.open();
      }
    });

    // 左上角古风信息面板（参考三朝书副场景样式：米色底+左侧红褐竖线+轻阴影）
    const lrG = this.add.graphics().setDepth(51).setScrollFactor(0);
    const lrX = 10, lrY = 10, lrW = 280, lrH = 82, lrR = 4;
    // 轻微阴影（10层递增偏移，边缘更模糊）
    for (let i = 0; i < 10; i++) {
      lrG.fillStyle(0x000000, 0.04 - i * 0.0035);
      lrG.fillRoundedRect(lrX + 3 + i * 2, lrY + 5 + i * 2, lrW + i * 2, lrH + i * 2, lrR + i);
    }
    // 米色/宣纸色主体（约85%透明度）
    lrG.fillStyle(0xE8DCC8, 0.85);
    lrG.fillRoundedRect(lrX, lrY, lrW, lrH, lrR);
    // 左侧红褐色竖线装饰（4px宽）
    lrG.fillStyle(0x7A3020, 0.9);
    lrG.fillRect(lrX + 2, lrY + 2, 4, lrH - 4);
    // 面板内文字标题（两行）
    // 第一行：小字宋体 浅灰红色
    this.add.text(lrX + 14, lrY + 14, '三朝书 · 副场景二', {
      fontSize: '16px',
      color: '#8B6E5E',
      fontFamily: '"SimSun", "Microsoft YaHei", serif',
    }).setOrigin(0, 0).setDepth(52).setScrollFactor(0);
    // 第二行：大字深红色加粗宋体
    this.add.text(lrX + 28, lrY + 44, '离别  /  坐唱堂', {
      fontSize: '28px',
      color: '#701818',
      fontFamily: '"SimSun", "Microsoft YaHei", serif',
      fontStyle: 'bold',
    }).setOrigin(0, 0).setDepth(52).setScrollFactor(0);

    // 右上角线索进度（浮空+阴影）
    // 灰色阴影
    this.add.rectangle(VIEW_WIDTH - 6, 14, 180, 44, 0x666666, 0.4)
      .setOrigin(1, 0)
      .setDepth(51)
      .setScrollFactor(0);
    // 黑色底矩形
    this.add.rectangle(VIEW_WIDTH - 10, 10, 180, 44, 0x000000, 0.7)
      .setOrigin(1, 0)
      .setDepth(52)
      .setScrollFactor(0);
    this.clueProgressText = this.add.text(VIEW_WIDTH - 100, 32, `线索 0/${this.clueTotalCount}`, {
      fontSize: '24px',
      color: '#ffd700',
      fontFamily: '"SimSun", "Microsoft YaHei", serif',
    }).setOrigin(0.5).setDepth(53).setScrollFactor(0);

    // 底部操作提示
    this.add.text(VIEW_WIDTH / 2, VIEW_HEIGHT - 28, 'WASD 移动 | E 交互 | Q 退出', {
      fontSize: '24px',
      color: '#a89984',
      fontFamily: 'serif',
    }).setOrigin(0.5).setDepth(51).setScrollFactor(0);
  }

  // ==================== 线索放置 ====================

  private placeClues(): void {
    SONG_CLUES.forEach((clue, index) => {
      // 传唱纸片和琵琶使用专用图片，其他线索使用通用标记
      const marker = this.physics.add.sprite(
        clue.x, clue.y,
        clue.id === 'clue_paper' ? 'paper_img' : clue.id === 'clue_pipa' ? 'pipa_img' : clue.id === 'clue_fan' ? 'fan_open_img' : clue.id === 'clue_basket' ? 'bimo_img' : 'clue_marker'
      );
      if (clue.id === 'clue_paper') marker.setScale(0.35 * 0.7);
      if (clue.id === 'clue_pipa') marker.setScale(0.35);
      if (clue.id === 'clue_fan') marker.setScale(0.35);
      if (clue.id === 'clue_basket') marker.setScale(0.4);

      // 传唱纸片上方女书文字图片
      if (clue.id === 'clue_paper') {
        this.add.image(clue.x, clue.y - 200, 'paper_text_img')
          .setScale(0.25)
          .setDepth(6);
        // 传唱纸片名称标签（黑色半透明胶囊，接近时显示）
        const paperLabelX = clue.x;
        const paperLabelY = clue.y - 300;
        const pw = 120, ph = 56;
        this._paperLabelGfx = this.add.graphics().setDepth(7).setVisible(false);
        this._paperLabelGfx.fillStyle(0x000000, 0.6);
        this._paperLabelGfx.fillRoundedRect(paperLabelX - pw / 2, paperLabelY - ph / 2, pw, ph, ph / 2);
        this._paperLabelText = this.add.text(paperLabelX, paperLabelY, '__', {
          fontSize: '32px', color: '#f5e6d3',
          fontFamily: '"SimSun", "Microsoft YaHei", serif',
        }).setOrigin(0.5).setDepth(8).setVisible(false);
      }

      // 笔墨左上角女书文字图片
      if (clue.id === 'clue_basket') {
        this.add.image(clue.x - 120, clue.y - 130, 'bimo_text_img')
          .setScale(0.25)
          .setDepth(6);
        // 笔墨名称标签（黑色半透明胶囊，尺寸2x，接近时显示）
        const bmoLabelX = clue.x - 120;
        const bmoLabelY = clue.y - 230;
        const bw = 120, bh = 56;
        this._bimoLabelGfx = this.add.graphics().setDepth(7).setVisible(false);
        this._bimoLabelGfx.fillStyle(0x000000, 0.6);
        this._bimoLabelGfx.fillRoundedRect(bmoLabelX - bw / 2, bmoLabelY - bh / 2, bw, bh, bh / 2);
        this._bimoLabelText = this.add.text(bmoLabelX, bmoLabelY, '笔墨', {
          fontSize: '32px', color: '#f5e6d3',
          fontFamily: '"SimSun", "Microsoft YaHei", serif',
        }).setOrigin(0.5).setDepth(8).setVisible(false);
      }

      // 琵琶上方女书文字图片
      if (clue.id === 'clue_pipa') {
        this.add.image(clue.x, clue.y - 270, 'pipa_text_img')
          .setScale(0.25)
          .setDepth(6);
        // 琵琶名称标签（黑色半透明胶囊，接近时显示）
        const pipaLabelX = clue.x;
        const pipaLabelY = clue.y - 320;
        const piw = 120, pih = 56;
        this._pipaLabelGfx = this.add.graphics().setDepth(7).setVisible(false);
        this._pipaLabelGfx.fillStyle(0x000000, 0.6);
        this._pipaLabelGfx.fillRoundedRect(pipaLabelX - piw / 2, pipaLabelY - pih / 2, piw, pih, pih / 2);
        this._pipaLabelText = this.add.text(pipaLabelX, pipaLabelY, '琵琶', {
          fontSize: '32px', color: '#f5e6d3',
          fontFamily: '"SimSun", "Microsoft YaHei", serif',
        }).setOrigin(0.5).setDepth(8).setVisible(false);
      }

        // 唱扇女展开图上方女书文字图片
      if (clue.id === 'clue_fan') {
        this.add.image(clue.x, clue.y - 170, 'fan_text_img')
          .setScale(0.28)
          .setDepth(6);
        // 歌扇展开图名称标签（黑色半透明胶囊，接近时显示）
        const fanLabelX = clue.x;
        const fanLabelY = clue.y - 250;
        const fw = 260, fh = 56;
        this._fanLabelGfx = this.add.graphics().setDepth(7).setVisible(false);
        this._fanLabelGfx.fillStyle(0x000000, 0.6);
        this._fanLabelGfx.fillRoundedRect(fanLabelX - fw / 2, fanLabelY - fh / 2, fw, fh, fh / 2);
        this._fanLabelText = this.add.text(fanLabelX, fanLabelY, '__ __ 展开图', {
          fontSize: '32px', color: '#f5e6d3',
          fontFamily: '"SimSun", "Microsoft YaHei", serif',
        }).setOrigin(0.5).setDepth(8).setVisible(false);
      }

      marker.setDepth(5);
      marker.setData('clueIndex', index);
      marker.setData('clueId', clue.id);

      this.tweens.add({
        targets: marker,
        y: clue.y - 16,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // 名称标签已移除

      this.clueMarkers.push(marker);
      this.clueMarkerBaseScales.push(marker.scaleX);
    });
  }

  // ==================== NPC放置 ====================

  private placeNPCs(): void {
    // 围坐姐妹（使用围坐姐妹图片，可点击交互）
    const sistersSprite = this.physics.add.sprite(SISTERS_NPC.x, SISTERS_NPC.y, 'sisters_img');
    sistersSprite.setDepth(5);
    sistersSprite.setData('npcId', 'sisters');
    sistersSprite.setScale(0.9);
    this.npcSistersBaseScale = 0.9;
    this.tweens.add({
      targets: sistersSprite,
      y: SISTERS_NPC.y - 8,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.npcSprites.push(sistersSprite);

    // 围坐姐妹名称标签（黑色半透明胶囊，接近时显示，在身声文字图片上方）
    {
      const slx = SISTERS_NPC.x + 280;
      const sly = SISTERS_NPC.y - 310 - 100;
      const sw = 200, sh = 56;
      this._sistersLabelGfx = this.add.graphics().setDepth(7).setVisible(false);
      this._sistersLabelGfx.fillStyle(0x000000, 0.6);
      this._sistersLabelGfx.fillRoundedRect(slx - sw / 2, sly - sh / 2, sw, sh, sh / 2);
      this._sistersLabelText = this.add.text(slx, sly, '__ __', {
        fontSize: '32px', color: '#f5e6d3',
        fontFamily: '"SimSun", "Microsoft YaHei", serif',
      }).setOrigin(0.5).setDepth(8).setVisible(false);
    }

    // 围坐姐妹右上角文字图片（身声，保留白底）
    const sistersTextImg = this.add.image(SISTERS_NPC.x + 280, SISTERS_NPC.y - 310, 'sisters_text_img')
      .setScale(0.2)
      .setDepth(6)
      .setInteractive({ useHandCursor: true });

    // 鼠标悬停提示
    const stx = SISTERS_NPC.x + 280;
    const sty = SISTERS_NPC.y - 310;
    const stTip = this.add.container(stx, sty - 50).setDepth(50).setVisible(false);
    this.add.graphics()
      .fillStyle(0x000000, 0.6).fillRoundedRect(-60, -16, 120, 32, 16)
      .setDepth(0);
    this.add.text(0, 0, '按 E 查看身声', { fontSize: '15px', color: '#ffffff', fontFamily: '"SimSun", "Microsoft YaHei", serif' })
      .setOrigin(0.5).setDepth(1);
    stTip.setSize(120, 32);

    sistersTextImg.on('pointerover', () => { stTip.setVisible(true); });
    sistersTextImg.on('pointerout', () => { stTip.setVisible(false); });
    this._sistersTextHint = stTip;

    // 女书女子（传唱纸片 x:2900 与琵琶 x:4100 之间，位置约 x:3500）镜像+浮空+阴影
    // 灰色阴影（多层椭圆叠加，边缘模糊，浮空效果）
    const girlShadow = this.add.graphics().setDepth(3);
    // 底层大面积柔光阴影
    for (let i = 0; i < 20; i++) {
      const alpha = 0.06 - i * 0.0028;
      const offsetX = 4 + i * 3;
      const offsetY = 16 + i * 3.5;
      const w = 120 + i * 5;
      const h = 24 + i * 4;
      girlShadow.fillStyle(0x555555, alpha);
      girlShadow.fillEllipse(3500 + offsetX, 900 + offsetY, w, h);
    }
    // 核心深色阴影（更贴近底图主体）
    for (let i = 0; i < 8; i++) {
      const alpha = 0.18 - i * 0.02;
      girlShadow.fillStyle(0x444444, alpha);
      girlShadow.fillEllipse(3500 + 6 + i * 2, 900 + 18 + i * 2.5, 130 + i * 3, 28 + i * 3);
    }
    // 唱扇女图片（镜像+浮空动画）
    this._girlImg = this.add.image(3500, 900, 'nvshu_girl_img')
      .setScale(0.84)
      .setFlipX(true)
      .setDepth(5);
    this._girlImgBaseScale = 0.84;
    const girlImg = this._girlImg;
    this.tweens.add({
      targets: girlImg,
      y: 895,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    // 唱扇女左上方文字图片
    this.add.image(3500 - 160, 900 - 370, 'nvshu_girl_text_img')
      .setScale(0.25)
      .setDepth(6);

    // 唱扇女名称标签（黑色半透明胶囊，接近时显示，在女书文字图片上方）
    {
      const glx = 3500 - 160;
      const gly = 900 - 370 - 100;
      const gw = 200, gh = 56;
      this._girlLabelGfx = this.add.graphics().setDepth(7).setVisible(false);
      this._girlLabelGfx.fillStyle(0x000000, 0.6);
      this._girlLabelGfx.fillRoundedRect(glx - gw / 2, gly - gh / 2, gw, gh, gh / 2);
      this._girlLabelText = this.add.text(glx, gly, '唱扇女', {
        fontSize: '32px', color: '#f5e6d3',
        fontFamily: '"SimSun", "Microsoft YaHei", serif',
      }).setOrigin(0.5).setDepth(8).setVisible(false);
    }
  }

  // ==================== 交互提示（跟随相机）====================

  private createInteractHint(): void {
    const cx = VIEW_WIDTH / 2;
    const y = VIEW_HEIGHT - 80;
    const bw = 340, bh = 48;

    const container = this.add.container(cx, y).setDepth(30).setScrollFactor(0).setVisible(false);
    this.interactHint = container;

    // 黑色半透明底条
    const bg = this.add.rectangle(0, 0, bw, bh, 0x000000, 0.6)
      .setOrigin(0.5);
    container.add(bg);

    // 提示文字
    this._hintText = this.add.text(0, 0, '', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: '\"SimSun\", \"Microsoft YaHei\", serif',
    }).setOrigin(0.5);
    container.add(this._hintText);
  }

  // ==================== 距离检测 ====================

  private checkProximity(): void {
    let nearestDist = INTERACT_DISTANCE;
    let nearestTarget = '';
    let nearestIndex = -1;

    this.clueMarkers.forEach((marker) => {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, marker.x, marker.y);
      const clueIdx = marker.getData('clueIndex') as number;
      const clue = SONG_CLUES[clueIdx];
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestTarget = 'clue_' + clue.id;
        nearestIndex = clueIdx;
      }
    });

    [
      { sprite: this.npcSprites[0], npc: SISTERS_NPC, id: 'npc_sisters' },
    ].forEach(({ sprite, id }) => {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, sprite.x, sprite.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestTarget = id;
        nearestIndex = -1;
      }
    });

    // 唱扇女NPC交互检测
    {
      const gDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, 3500, 900);
      if (gDist < nearestDist) {
        nearestDist = gDist;
        nearestTarget = 'npc_girl';
        nearestIndex = -1;
      }
    }

    if (nearestTarget) {
      this.canInteract = true;
      this.currentTarget = nearestTarget;
      this.currentClueIndex = nearestIndex;
      // 显示交互提示
      let hintName = '';
      if (nearestTarget.startsWith('clue_') && nearestIndex >= 0) {
        hintName = SONG_CLUES[nearestIndex].name;
      } else if (nearestTarget === 'npc_sisters') {
        hintName = SISTERS_NPC.name;
      } else if (nearestTarget === 'npc_girl') {
        hintName = '唱扇女';
      }
      this._hintText.setText('按E键和[' + hintName + ']交互');
      this.interactHint.setVisible(true);

      // 线索标记缩放：最近的可交互线索放大到 1.4 倍
      this.clueMarkers.forEach((marker, idx) => {
        if (idx === nearestIndex) {
          marker.setScale(this.clueMarkerBaseScales[idx] * 1.4);
        } else {
          marker.setScale(this.clueMarkerBaseScales[idx]);
        }
      });

      // NPC 缩放：最近的 NPC 放大到 1.2 倍
      this.npcSprites.forEach((sprite) => {
        sprite.setScale(nearestTarget === 'npc_sisters' ? this.npcSistersBaseScale * 1.2 : this.npcSistersBaseScale);
      });
      this._girlImg.setScale(nearestTarget === 'npc_girl' ? this._girlImgBaseScale * 1.2 : this._girlImgBaseScale);
    } else {
      this.canInteract = false;
      this.currentTarget = '';
      this.currentClueIndex = -1;
      this.interactHint.setVisible(false);

      // 没有可交互对象时，恢复所有原始尺寸
      this.clueMarkers.forEach((marker, idx) => {
        marker.setScale(this.clueMarkerBaseScales[idx]);
      });
      this.npcSprites.forEach((sprite) => {
        sprite.setScale(this.npcSistersBaseScale);
      });
      this._girlImg.setScale(this._girlImgBaseScale);
    }

    // 身声图片接近提示
    const stDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, SISTERS_NPC.x + 280, SISTERS_NPC.y - 310);
    if (stDist < INTERACT_DISTANCE && !this._sistersTextHint.visible) {
      this._sistersTextHint.setVisible(true);
    } else if (stDist >= INTERACT_DISTANCE && this._sistersTextHint.visible) {
      this._sistersTextHint.setVisible(false);
    }

    // 笔墨名称标签接近显示（笔墨标记或笔墨文字图片任一靠近时显示）
    const basketClue = SONG_CLUES.find((c) => c.id === 'clue_basket');
    if (basketClue) {
      const bmoDist1 = Phaser.Math.Distance.Between(this.player.x, this.player.y, basketClue.x, basketClue.y);
      const bmoDist2 = Phaser.Math.Distance.Between(this.player.x, this.player.y, basketClue.x - 120, basketClue.y - 130);
      const shouldShow = bmoDist1 < INTERACT_DISTANCE || bmoDist2 < INTERACT_DISTANCE;
      if (shouldShow && !this._bimoLabelGfx.visible) {
        this._bimoLabelGfx.setVisible(true);
        this._bimoLabelText.setVisible(true);
      } else if (!shouldShow && this._bimoLabelGfx.visible) {
        this._bimoLabelGfx.setVisible(false);
        this._bimoLabelText.setVisible(false);
      }
    }

    // 琵琶名称标签接近显示（玩家靠近或鼠标悬停琵琶标记/文字图片时显示）
    const pipaClue = SONG_CLUES.find((c) => c.id === 'clue_pipa');
    if (pipaClue) {
      const pipaDist1 = Phaser.Math.Distance.Between(this.player.x, this.player.y, pipaClue.x, pipaClue.y);
      const pipaDist2 = Phaser.Math.Distance.Between(this.player.x, this.player.y, pipaClue.x, pipaClue.y - 270);
      // 鼠标悬停检测
      const worldPt = this.cameras.main.getWorldPoint(this.input.activePointer.x, this.input.activePointer.y);
      const mouseDist1 = Phaser.Math.Distance.Between(worldPt.x, worldPt.y, pipaClue.x, pipaClue.y);
      const mouseDist2 = Phaser.Math.Distance.Between(worldPt.x, worldPt.y, pipaClue.x, pipaClue.y - 270);
      const shouldShow = pipaDist1 < INTERACT_DISTANCE || pipaDist2 < INTERACT_DISTANCE || mouseDist1 < INTERACT_DISTANCE || mouseDist2 < INTERACT_DISTANCE;
      if (shouldShow && !this._pipaLabelGfx.visible) {
        this._pipaLabelGfx.setVisible(true);
        this._pipaLabelText.setVisible(true);
      } else if (!shouldShow && this._pipaLabelGfx.visible) {
        this._pipaLabelGfx.setVisible(false);
        this._pipaLabelText.setVisible(false);
      }
    }

    // 唱扇女展开页名称标签接近显示
    const fanClue = SONG_CLUES.find((c) => c.id === 'clue_fan');
    if (fanClue) {
      const fanDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, fanClue.x, fanClue.y);
      const shouldShow = fanDist < INTERACT_DISTANCE;
      if (shouldShow && !this._fanLabelGfx.visible) {
        this._fanLabelGfx.setVisible(true);
        this._fanLabelText.setVisible(true);
      } else if (!shouldShow && this._fanLabelGfx.visible) {
        this._fanLabelGfx.setVisible(false);
        this._fanLabelText.setVisible(false);
      }
    }

    // 围坐姐妹名称标签接近显示（围坐姐妹图片或身声文字图片任一靠近时显示）
    {
      const sDist1 = Phaser.Math.Distance.Between(this.player.x, this.player.y, SISTERS_NPC.x, SISTERS_NPC.y);
      const sDist2 = Phaser.Math.Distance.Between(this.player.x, this.player.y, SISTERS_NPC.x + 280, SISTERS_NPC.y - 310);
      const shouldShow = sDist1 < INTERACT_DISTANCE || sDist2 < INTERACT_DISTANCE;
      if (shouldShow && !this._sistersLabelGfx.visible) {
        this._sistersLabelGfx.setVisible(true);
        this._sistersLabelText.setVisible(true);
      } else if (!shouldShow && this._sistersLabelGfx.visible) {
        this._sistersLabelGfx.setVisible(false);
        this._sistersLabelText.setVisible(false);
      }
    }

    // 传唱纸片名称标签接近显示（纸片标记或纸字文字图片任一靠近时显示）
    const paperClue = SONG_CLUES.find((c) => c.id === 'clue_paper');
    if (paperClue) {
      const pDist1 = Phaser.Math.Distance.Between(this.player.x, this.player.y, paperClue.x, paperClue.y);
      const pDist2 = Phaser.Math.Distance.Between(this.player.x, this.player.y, paperClue.x, paperClue.y - 200);
      const shouldShow = pDist1 < INTERACT_DISTANCE || pDist2 < INTERACT_DISTANCE;
      if (shouldShow && !this._paperLabelGfx.visible) {
        this._paperLabelGfx.setVisible(true);
        this._paperLabelText.setVisible(true);
      } else if (!shouldShow && this._paperLabelGfx.visible) {
        this._paperLabelGfx.setVisible(false);
        this._paperLabelText.setVisible(false);
      }
    }

    // 唱扇女名称标签接近显示（唱扇女文字图片或唱扇女图片任一靠近时显示）
    {
      const gDist1 = Phaser.Math.Distance.Between(this.player.x, this.player.y, 3500, 900);
      const gDist2 = Phaser.Math.Distance.Between(this.player.x, this.player.y, 3500 - 160, 900 - 370);
      const shouldShow = gDist1 < INTERACT_DISTANCE || gDist2 < INTERACT_DISTANCE;
      if (shouldShow && !this._girlLabelGfx.visible) {
        this._girlLabelGfx.setVisible(true);
        this._girlLabelText.setVisible(true);
      } else if (!shouldShow && this._girlLabelGfx.visible) {
        this._girlLabelGfx.setVisible(false);
        this._girlLabelText.setVisible(false);
      }
    }
  }

  // ==================== 交互处理 ====================

  private handleInteract(): void {
    if (!this.canInteract) return;

    // 记录找到的线索
    this.markClueFound(this.currentTarget);
    this.interactHint.setVisible(false);

    if (this.currentTarget.startsWith('clue_')) {
      const clue = SONG_CLUES[this.currentClueIndex];
      if (clue) {
        // 传唱纸片：显示大图预览
        if (clue.id === 'clue_paper') {
          this.openPaperPreview();
        } else if (clue.id === 'clue_fan') {
          this.openFanPreview();
        } else if (clue.id === 'clue_basket') {
          this.openBimoPreview();
        } else if (clue.id === 'clue_pipa') {
          this.openPipaPreview();
        } else {
          this.showCluePopup(clue.name, clue.displayText, clue.isFake ? [] : clue.entryIds);
        }
      }
    } else if (this.currentTarget === 'npc_sisters') {
      // 打开姐妹场景（先展示图，再显示文字）
      this.openSistersScene();
    } else if (this.currentTarget === 'npc_girl') {
      // 打开唱扇女场景图
      this.openGirlPreview();
    }
  }

  /** 标记线索已找到，更新进度 */
  private markClueFound(target: string): void {
    if (!this.foundClueIds.has(target)) {
      this.foundClueIds.add(target);
      this.clueFoundCount++;
      this.clueProgressText.setText(`线索 ${this.clueFoundCount}/${this.clueTotalCount}`);
    }
  }

  // ==================== 线索弹窗 ====================

  private createPopup(): void {
    const cx = VIEW_WIDTH / 2;
    const cy = VIEW_HEIGHT / 2;
    this.popupContainer = this.add.container(0, 0).setDepth(90).setVisible(false).setScrollFactor(0);

    const overlay = this.add.rectangle(cx, cy, VIEW_WIDTH, VIEW_HEIGHT, 0x000000, 0.7);
    overlay.setInteractive();
    this.popupContainer.add(overlay);

    this.popupBg = this.add.rectangle(cx, cy, 1120, 800, 0x2a1f14, 0.95);
    this.popupBg.setStrokeStyle(4, 0xc8a96e);
    this.popupContainer.add(this.popupBg);

    this.popupTitle = this.add.text(cx, cy - 350, '', {
      fontSize: '40px', color: '#e8d5b7', fontFamily: 'serif', wordWrap: { width: 1000 },
    }).setOrigin(0.5, 0);
    this.popupContainer.add(this.popupTitle);

    this.popupText = this.add.text(cx - 500, cy - 260, '', {
      fontSize: '30px', color: '#d4c5a9', fontFamily: 'serif', wordWrap: { width: 1000 }, lineSpacing: 16,
    });
    this.popupContainer.add(this.popupText);

    this.popupCloseBtn = this.add.text(cx + 500, cy - 370, '✕ 关闭 [Q]', {
      fontSize: '28px', color: '#c8a96e', backgroundColor: '#3d2e1f', padding: { x: 16, y: 6 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.popupCloseBtn.on('pointerdown', () => this.closePopup());
    this.popupContainer.add(this.popupCloseBtn);

    this.input.keyboard?.on('keydown-Q', () => {
      if (this.popupOpen) this.closePopup();
    });
  }

  private showCluePopup(title: string, text: string, entryIds: string[]): void {
    this.popupTitle.setText(title);
    this.popupText.setText(text);
    this.popupOpen = true;
    this._pendingEntryIds = entryIds;
    this.popupContainer.setVisible(true);
    this.scene.pause();
  }

  private closePopup(): void {
    this.popupOpen = false;
    this.popupContainer.setVisible(false);
    this.scene.resume();
    if (this._pendingEntryIds.length > 0) {
      this._pendingEntryIds.forEach((id) => {
        const entry = SONG_ENTRIES.find((e) => e.id === id);
        if (entry) this.dictSystem.unlock({ ...entry });
      });
      this._pendingEntryIds = [];
    }
  }

  // ==================== 对话气泡 ====================

  private createDialogueBubble(): void {
    this.dialogueContainer = this.add.container(0, 0).setDepth(85).setVisible(false).setScrollFactor(0);

    const bubbleBg = this.add.rectangle(VIEW_WIDTH / 2, VIEW_HEIGHT - 200, 1200, 160, 0x1a1210, 0.9);
    bubbleBg.setStrokeStyle(4, 0xc8a96e);
    this.dialogueContainer.add(bubbleBg);

    this.dialogueText = this.add.text(VIEW_WIDTH / 2, VIEW_HEIGHT - 230, '', {
      fontSize: '30px', color: '#e8d5b7', fontFamily: 'serif', wordWrap: { width: 1120 }, align: 'center',
    }).setOrigin(0.5, 0);
    this.dialogueContainer.add(this.dialogueText);

    this.dialogueNextHint = this.add.text(VIEW_WIDTH / 2, VIEW_HEIGHT - 70, '按 E 继续 | 按 Q 退出', {
      fontSize: '24px', color: '#a89984',
    }).setOrigin(0.5);
    this.dialogueContainer.add(this.dialogueNextHint);

    // 对话键盘事件（不能用 keydown-E/Q，因为场景暂停后不触发）
    // 改用全局键盘事件
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (!this.dialogueOpen) return;
      if (event.key === 'e' || event.key === 'E') {
        this.nextDialogue();
      } else if (event.key === 'q' || event.key === 'Q') {
        this.closeDialogue();
      }
    });
  }

  private showCurrentDialogue(): void {
    if (this.dialogueIndex < this.dialogues.length) {
      this.dialogueText.setText(this.dialogues[this.dialogueIndex]);
    }
  }

  private nextDialogue(): void {
    this.dialogueIndex++;
    if (this.dialogueIndex < this.dialogues.length) {
      this.showCurrentDialogue();
    } else {
      this.closeDialogue();
    }
  }

  private closeDialogue(): void {
    this.dialogueOpen = false;
    this.dialogueContainer.setVisible(false);
    this.scene.resume();
  }

  // ==================== 推测面板 ====================

  private createGuessPanel(): void {
    const cx = VIEW_WIDTH / 2;
    const cy = VIEW_HEIGHT / 2;
    this.guessContainer = this.add.container(0, 0).setDepth(95).setVisible(false).setScrollFactor(0);

    const overlay = this.add.rectangle(cx, cy, VIEW_WIDTH, VIEW_HEIGHT, 0x000000, 0.75);
    overlay.setInteractive();
    this.guessContainer.add(overlay);

    const bg = this.add.rectangle(cx, cy, 1000, 700, 0x2a1f14, 0.95);
    bg.setStrokeStyle(4, 0xc8a96e);
    this.guessContainer.add(bg);

    this.guessContainer.add(this.add.text(cx, cy - 300, '🔍 推测句子含义', {
      fontSize: '44px', color: '#e8d5b7', fontFamily: 'serif',
    }).setOrigin(0.5));

    this.guessContainer.add(this.add.text(cx, cy - 220, '你已经解锁了所有词条，请推测这句话的含义：', {
      fontSize: '28px', color: '#a89984', fontFamily: 'serif',
    }).setOrigin(0.5));

    for (let i = 0; i < 4; i++) {
      const sx = cx - 270 + i * 180;
      const sy = cy - 40;
      const slotBg = this.add.rectangle(sx, sy, 140, 100, 0x3d2e1f);
      slotBg.setStrokeStyle(4, 0xc8a96e);
      slotBg.setInteractive({ useHandCursor: true });
      slotBg.setData('slotIndex', i);
      slotBg.on('pointerdown', () => { this.guessSelectedIndex = i; });
      this.guessContainer.add(slotBg);

      const slotText = this.add.text(sx, sy, '?', {
        fontSize: '48px', color: '#666', fontFamily: 'serif',
      }).setOrigin(0.5);
      this.guessContainer.add(slotText);
      this.guessSlots.push(slotText);
    }

    this.guessContainer.add(this.add.text(cx, cy + 120, '点击下方词条填入上方空位：', {
      fontSize: '26px', color: '#a89984', fontFamily: 'serif',
    }).setOrigin(0.5));

    const confirmBtn = this.add.text(cx + 360, cy + 280, '✓ 确认', {
      fontSize: '32px', color: '#7ec87e', backgroundColor: '#2d3d1f', padding: { x: 32, y: 16 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    confirmBtn.on('pointerdown', () => this.confirmGuess());
    this.guessContainer.add(confirmBtn);

    const cancelBtn = this.add.text(cx - 360, cy + 280, '✕ 取消 [Q]', {
      fontSize: '32px', color: '#e07070', backgroundColor: '#3d1f1f', padding: { x: 32, y: 16 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    cancelBtn.on('pointerdown', () => this.closeGuessPanel());
    this.guessContainer.add(cancelBtn);

    this.guessEntryIds = [null, null, null, null];

    this.input.keyboard?.on('keydown-Q', () => {
      if (this.guessOpen) this.closeGuessPanel();
    });
  }

  private showGuessPanel(available: { id: string; char: string }[], onConfirm: (ids: string[]) => void): void {
    this.guessAvailable = available;
    this.guessOnConfirm = onConfirm;
    this.guessEntryIds = [null, null, null, null];
    this.guessSelectedIndex = 0;
    this.guessSlots.forEach((s) => { s.setText('?'); s.setColor('#666'); });
    this.refreshGuessButtons();
    this.guessOpen = true;
    this.guessContainer.setVisible(true);
    this.scene.pause();
  }

  private refreshGuessButtons(): void {
    this.guessContainer.each((child: Phaser.GameObjects.GameObject) => {
      if (child.getData && child.getData('availBtn') === true) child.destroy();
    });

    const cx = VIEW_WIDTH / 2;
    const startX = cx - (this.guessAvailable.length * 90) / 2;

    this.guessAvailable.forEach((entry, i) => {
      const btn = this.add.text(startX + i * 100, VIEW_HEIGHT / 2 + 180, entry.char, {
        fontSize: '48px', color: '#ffd700', backgroundColor: '#3d2e1f', padding: { x: 20, y: 12 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      btn.setData('availBtn', true);
      btn.setData('entryId', entry.id);
      btn.on('pointerdown', () => this.fillGuessSlot(entry.id, entry.char));
      this.guessContainer.add(btn);
    });
  }

  private fillGuessSlot(entryId: string, char: string): void {
    const idx = this.guessSelectedIndex;
    this.guessEntryIds[idx] = entryId;
    this.guessSlots[idx].setText(char);
    this.guessSlots[idx].setColor('#ffd700');
    for (let i = 0; i < 4; i++) {
      if (this.guessEntryIds[i] === null) { this.guessSelectedIndex = i; return; }
    }
    this.guessSelectedIndex = 0;
  }

  private confirmGuess(): void {
    const ids = this.guessEntryIds.filter((id): id is string => id !== null);
    if (ids.length < 4) return;
    if (this.guessOnConfirm) this.guessOnConfirm(ids);
    this.closeGuessPanel();
  }

  private closeGuessPanel(): void {
    this.guessOpen = false;
    this.guessContainer.setVisible(false);
    this.scene.resume();
  }

  // ==================== 姐妹对话场景（两阶段：先展示图，再显示文字）====================

  /**
   * 打开姐妹场景 - Phase 1：展示完整界面图（对话框无文字）
   * 玩家按 E 或点击后进入 Phase 2：显示对话文字
   * Q 键返回主场景
   */
  private openSistersScene(): void {
    this.sistersSceneOpen = true;
    this.sistersScenePhase1 = true;
    this.sistersScenePhase2 = false;
    this.sistersScenePhase3 = false;
    this.savedPlayerPos = { x: this.player.x, y: this.player.y };

    // 隐藏所有线索、NPC、玩家、HUD
    this.clueMarkers.forEach((m) => m.setVisible(false));
    this.npcSprites.forEach((s) => s.setVisible(false));
    this.player.setVisible(false);
    if (this.dictUI?.isOpened()) this.dictUI.close();
    const hudChildren = this.children.getAll('depth', 51) as Phaser.GameObjects.GameObject[];
    hudChildren.forEach((c) => { if ((c as any).setVisible) (c as any).setVisible(false); });
    const hud52Children = this.children.getAll('depth', 52) as Phaser.GameObjects.GameObject[];
    hud52Children.forEach((c) => { if ((c as any).setVisible) (c as any).setVisible(false); });

    // 相机居中到世界中心
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.cameras.main.stopFollow();
    this.tweens.add({
      targets: this.cameras.main,
      scrollX: cx - VIEW_WIDTH / 2,
      scrollY: cy - VIEW_HEIGHT / 2,
      duration: 800,
      ease: 'Sine.easeInOut',
    });

    // 显示完整界面图 - 铺满全屏居中
    const sceneImg = this.add.image(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 'sisters_fullscene')
      .setDepth(50)
      .setScrollFactor(0)
      .setName('sisters_scene_img');
    const scaleX = VIEW_WIDTH / (sceneImg.width || 1608);
    const scaleY = VIEW_HEIGHT / (sceneImg.height || 436);
    sceneImg.setScale(Math.max(scaleX, scaleY));

    // Phase 1 提示
    this.add.text(VIEW_WIDTH / 2, VIEW_HEIGHT - 60, '按 E 或 点击 显示文字 | Q 返回', {
      fontSize: '24px', color: '#a89984', fontFamily: 'serif',
      backgroundColor: '#00000088',
      padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0).setName('sisters_phase1_hint');

    // 键盘事件
    const keyHandler = (event: KeyboardEvent) => {
      if (!this.sistersSceneOpen) return;
      if (event.key === 'q' || event.key === 'Q') {
        this.closeSistersScene();
      } else if (this.sistersScenePhase1 && (event.key === 'e' || event.key === 'E')) {
        this.enterSistersPhase2();
      } else if (this.sistersScenePhase2 && (event.key === 'e' || event.key === 'E')) {
        this.enterSistersPhase3();
      } else if (this.sistersScenePhase3 && (event.key === 'e' || event.key === 'E')) {
        this.enterSistersPhase4();
      } else if (event.key === 'e' || event.key === 'E') {
        this.closeSistersScene();
      }
    };
    this.input.keyboard?.on('keydown', keyHandler);

    // 鼠标/触摸事件
    const clickHandler = () => {
      if (!this.sistersSceneOpen) return;
      if (this.sistersScenePhase1) {
        this.enterSistersPhase2();
      } else if (this.sistersScenePhase2) {
        this.enterSistersPhase3();
      } else if (this.sistersScenePhase3) {
        this.enterSistersPhase4();
      }
    };
    this.input.on('pointerdown', clickHandler);

    this._sistersKeyHandler = keyHandler;
    this._sistersClickHandler = clickHandler;

    // 解锁"声"词条
    this.unlockSistersEntry();
  }

  /** Phase 2：只显示标题"唱扇女。"，提示继续按E */
  private enterSistersPhase2(): void {
    this.sistersScenePhase1 = false;
    this.sistersScenePhase2 = true;

    // 移除 Phase 1 提示
    const hint = this.children.getByName('sisters_phase1_hint');
    if (hint) hint.destroy();

    // 显示标题
    const textX = VIEW_WIDTH * 0.12;
    const textY = VIEW_HEIGHT - 280;

    this.add.text(textX, textY, '唱扇女。', {
      fontSize: '32px', color: '#ffd700', fontFamily: 'serif', fontStyle: 'bold',
    }).setOrigin(0, 0).setDepth(101).setScrollFactor(0).setName('sisters_dialogue_title');

    // 提示继续按E
    this.add.text(VIEW_WIDTH / 2, VIEW_HEIGHT - 60, '按 E 或 点击 继续阅读 | Q 返回', {
      fontSize: '24px', color: '#a89984', fontFamily: 'serif',
      backgroundColor: '#00000088',
      padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0).setName('sisters_phase2_hint');
  }

  /** Phase 3：显示第一段文字 */
  private enterSistersPhase3(): void {
    this.sistersScenePhase2 = false;
    this.sistersScenePhase3 = true;

    // 移除 Phase 2 提示
    const hint = this.children.getByName('sisters_phase2_hint');
    if (hint) hint.destroy();

    // 在标题下方显示第一段正文
    const textX = VIEW_WIDTH * 0.12;
    const textY = VIEW_HEIGHT - 280 + 44;

    this.add.text(textX, textY, '', {
      fontSize: '24px', color: '#e8d5b7', fontFamily: 'serif',
      wordWrap: { width: VIEW_WIDTH * 0.72 }, lineSpacing: 12,
    }).setOrigin(0, 0).setDepth(101).setScrollFactor(0).setName('sisters_dialogue_p1')
      .setText(
        '在江永，女书并不只是写在纸上的字，也是在姐妹们围坐、做女红、唱女歌时被传下来的声音。'
      );

    // 提示继续按E
    this.add.text(VIEW_WIDTH / 2, VIEW_HEIGHT - 60, '按 E 或 点击 继续阅读 | Q 返回', {
      fontSize: '24px', color: '#a89984', fontFamily: 'serif',
      backgroundColor: '#00000088',
      padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0).setName('sisters_phase3_hint');
  }

  /** Phase 4：显示第二段文字 */
  private enterSistersPhase4(): void {
    this.sistersScenePhase3 = false;

    // 移除 Phase 3 提示
    const hint = this.children.getByName('sisters_phase3_hint');
    if (hint) hint.destroy();

    // 在第一段下方显示第二段正文
    const textX = VIEW_WIDTH * 0.12;
    const textY = VIEW_HEIGHT - 280 + 44 + 52;

    this.add.text(textX, textY, '', {
      fontSize: '24px', color: '#e8d5b7', fontFamily: 'serif',
      wordWrap: { width: VIEW_WIDTH * 0.72 }, lineSpacing: 12,
    }).setOrigin(0, 0).setDepth(101).setScrollFactor(0).setName('sisters_dialogue_text')
      .setText(
        '女书常与妇女聚集缝衣、唱女书歌的场景相连，她们围坐在一起，不是闲谈，\n' +
        '而是一种互相教会、互相安慰、互相记住的方式。'
      );

    // 提示可返回
    this.add.text(VIEW_WIDTH / 2, VIEW_HEIGHT - 60, '按 Q / E 返回主场景', {
      fontSize: '24px', color: '#a89984', fontFamily: 'serif',
      backgroundColor: '#00000088',
      padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0).setName('sisters_close_hint');
  }

  /** 关闭姐妹场景 */
  private closeSistersScene(): void {
    this.sistersSceneOpen = false;

    // 移除监听器
    if (this._sistersKeyHandler) this.input.keyboard?.off('keydown', this._sistersKeyHandler);
    if (this._sistersClickHandler) this.input.off('pointerdown', this._sistersClickHandler);
    this._sistersKeyHandler = null;
    this._sistersClickHandler = null;

    // 销毁场景元素
    ['sisters_scene_img', 'sisters_dialogue_title', 'sisters_dialogue_p1', 'sisters_dialogue_text', 'sisters_close_hint', 'sisters_phase2_hint', 'sisters_phase3_hint'].forEach((name) => {
      const obj = this.children.getByName(name);
      if (obj) obj.destroy();
    });
    const hint = this.children.getByName('sisters_phase1_hint');
    if (hint) hint.destroy();

    // 恢复游戏状态
    this.clueMarkers.forEach((m) => m.setVisible(true));
    this.npcSprites.forEach((s) => s.setVisible(true));
    this.player.setVisible(true);
    if (this.savedPlayerPos) {
      this.player.setPosition(this.savedPlayerPos.x, this.savedPlayerPos.y);
    }
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  }

  // ==================== 传唱纸片大图预览（三阶段）====================

  /** Phase 1：纸片大图（暗背景 + 居中大图） */
  private openPaperPreview(): void {
    this.paperPreviewOpen = true;
    this.paperPreviewPhase1 = true;
    this.paperPreviewPhase2 = false;
    this.scene.pause();

    const cx = VIEW_WIDTH / 2;
    const cy = VIEW_HEIGHT / 2;

    // 暗色遮罩
    const overlay = this.add.rectangle(cx, cy, VIEW_WIDTH, VIEW_HEIGHT, 0x000000, 0.8)
      .setDepth(95)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .setName('paper_overlay');

    // 纸片大图居中显示
    this.add.image(cx, cy, 'paper_img')
      .setScale(0.8)
      .setDepth(96)
      .setScrollFactor(0)
      .setName('paper_big_img');

    // Phase 1 提示
    this.add.text(cx, VIEW_HEIGHT - 50, '按 E 或 点击 查看场景 | Q 返回', {
      fontSize: '22px', color: '#a89984', fontFamily: 'serif',
      backgroundColor: '#00000088', padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setDepth(97).setScrollFactor(0).setName('paper_phase1_hint');

    // 点击：Phase 1 → Phase 2
    overlay.on('pointerdown', () => {
      if (this.paperPreviewPhase1) this.enterPaperPhase2();
    });

    // 键盘事件
    const keyHandler = (e: KeyboardEvent) => {
      if (!this.paperPreviewOpen) return;
      if (e.key === 'q' || e.key === 'Q' || e.key === 'Escape') {
        this.closePaperPreview();
      } else if (this.paperPreviewPhase1 && (e.key === 'e' || e.key === 'E')) {
        this.enterPaperPhase2();
      } else if (this.paperPreviewPhase2 && (e.key === 'e' || e.key === 'E')) {
        this.enterPaperPhase3();
      } else if (!this.paperPreviewPhase1 && !this.paperPreviewPhase2 && (e.key === 'e' || e.key === 'E')) {
        this.closePaperPreview();
      }
    };
    window.addEventListener('keydown', keyHandler);
    this._paperKeyHandler = keyHandler;
  }

  /** Phase 2：持扇女子场景图 + "唱扇女"黄色标题 */
  private enterPaperPhase2(): void {
    this.paperPreviewPhase1 = false;
    this.paperPreviewPhase2 = true;

    // 移除纸片大图和 Phase 1 提示
    const oldImg = this.children.getByName('paper_big_img');
    if (oldImg) oldImg.destroy();
    const hint = this.children.getByName('paper_phase1_hint');
    if (hint) hint.destroy();

    const cx = VIEW_WIDTH / 2;

    // 持扇女子场景图，铺满视口
    const sceneImg = this.add.image(cx, VIEW_HEIGHT / 2 - 40, 'sisters_fullscene')
      .setDepth(96)
      .setScrollFactor(0)
      .setName('paper_big_img');
    const scaleX = VIEW_WIDTH / (sceneImg.width || 1608);
    const scaleY = VIEW_HEIGHT / (sceneImg.height || 436);
    sceneImg.setScale(Math.max(scaleX, scaleY));

    // "唱扇女" 黄色大字
    const textX = VIEW_WIDTH * 0.12;
    const textY = VIEW_HEIGHT - 340;
    this.add.text(textX, textY, '唱扇女。', {
      fontSize: '32px', color: '#ffd700', fontFamily: 'serif', fontStyle: 'bold',
    }).setOrigin(0, 0).setDepth(101).setScrollFactor(0).setName('paper_dialogue_title');

    // Phase 2 提示
    this.add.text(cx, VIEW_HEIGHT - 50, '按 E 或 点击 继续阅读 | Q 返回', {
      fontSize: '22px', color: '#a89984', fontFamily: 'serif',
      backgroundColor: '#00000088', padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0).setName('paper_phase2_hint');

    // 更新遮罩点击
    const overlay = this.children.getByName('paper_overlay') as Phaser.GameObjects.Rectangle;
    if (overlay) {
      overlay.removeAllListeners('pointerdown');
      overlay.on('pointerdown', () => {
        if (this.paperPreviewPhase2) this.enterPaperPhase3();
        else this.closePaperPreview();
      });
    }
  }

  /** Phase 3：显示小字内容 */
  private enterPaperPhase3(): void {
    this.paperPreviewPhase2 = false;

    // 移除 Phase 2 提示
    const hint = this.children.getByName('paper_phase2_hint');
    if (hint) hint.destroy();

    const textX = VIEW_WIDTH * 0.12;
    const textY = VIEW_HEIGHT - 340 + 64;  // 唱扇女下方

    const line1 = '__上只留两行字，心中却有万重山。';
    const line2 = '愿__远去，仍记旧时__ __声。';
    const line3 = '请在字典中找到对应的女书字。';

    // 正文（在唱扇女下面）
    this.add.text(textX, textY, '', {
      fontSize: '24px', color: '#e8d5b7', fontFamily: 'serif',
      wordWrap: { width: VIEW_WIDTH * 0.76 }, lineSpacing: 20,
    }).setOrigin(0, 0).setDepth(101).setScrollFactor(0).setName('paper_dialogue_text')
      .setText(line1 + '\n' + line2 + '\n' + line3);

    // 关闭提示
    this.add.text(VIEW_WIDTH / 2, VIEW_HEIGHT - 50, '按 E 或 点击 返回主场景 | Q 返回', {
      fontSize: '22px', color: '#a89984', fontFamily: 'serif',
      backgroundColor: '#00000088', padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0).setName('paper_close_hint');
  }

  /** 关闭纸片大图预览 */
  private closePaperPreview(): void {
    if (!this.paperPreviewOpen) return;
    this.paperPreviewOpen = false;

    // 移除键盘监听
    if (this._paperKeyHandler) {
      window.removeEventListener('keydown', this._paperKeyHandler);
      this._paperKeyHandler = null;
    }

    // 销毁预览元素
    ['paper_overlay', 'paper_big_img', 'paper_close_hint', 'paper_phase1_hint', 'paper_phase2_hint', 'paper_dialogue_title', 'paper_dialogue_text'].forEach((name) => {
      const obj = this.children.getByName(name);
      if (obj) obj.destroy();
    });

    this.scene.resume();
  }

  // ==================== 唱扇女展开页大图预览 ====================

  /** Phase 1：歌扇展开大图（灰色背景 + 居中大图） */
  private openFanPreview(): void {
    this.fanPreviewOpen = true;
    this.fanPreviewPhase1 = true;
    this.fanPreviewPhase2 = false;
    this.scene.pause();

    const cx = VIEW_WIDTH / 2;
    const cy = VIEW_HEIGHT / 2;

    // 灰色半透明遮罩
    const overlay = this.add.rectangle(cx, cy, VIEW_WIDTH, VIEW_HEIGHT, 0x000000, 0.8)
      .setDepth(95)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .setName('fan_overlay');

    // 歌扇展开大图居中显示
    this.add.image(cx, cy, 'fan_open_img')
      .setScale(1.2)
      .setDepth(96)
      .setScrollFactor(0)
      .setName('fan_big_img');

    // Phase 1 提示
    this.add.text(cx, VIEW_HEIGHT - 50, '按 E 或 点击 查看场景 | Q 返回', {
      fontSize: '22px', color: '#a89984', fontFamily: 'serif',
      backgroundColor: '#00000088', padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setDepth(97).setScrollFactor(0).setName('fan_phase1_hint');

    // 点击：Phase 1 → Phase 2
    overlay.on('pointerdown', () => {
      if (this.fanPreviewPhase1) this.enterFanPhase2();
    });

    // 键盘事件
    const keyHandler = (e: KeyboardEvent) => {
      if (!this.fanPreviewOpen) return;
      if (e.key === 'q' || e.key === 'Q' || e.key === 'Escape') {
        this.closeFanPreview();
      } else if (this.fanPreviewPhase1 && (e.key === 'e' || e.key === 'E')) {
        this.enterFanPhase2();
      } else if (this.fanPreviewPhase2 && (e.key === 'e' || e.key === 'E')) {
        this.enterFanPhase3();
      } else if (!this.fanPreviewPhase1 && !this.fanPreviewPhase2 && (e.key === 'e' || e.key === 'E')) {
        this.closeFanPreview();
      }
    };
    window.addEventListener('keydown', keyHandler);
    this._fanKeyHandler = keyHandler;
  }

  /** Phase 2：持扇女子场景图 + "唱扇女"黄色标题 */
  private enterFanPhase2(): void {
    this.fanPreviewPhase1 = false;
    this.fanPreviewPhase2 = true;

    // 移除歌扇展开大图和 Phase 1 提示
    const oldImg = this.children.getByName('fan_big_img');
    if (oldImg) oldImg.destroy();
    const hint = this.children.getByName('fan_phase1_hint');
    if (hint) hint.destroy();

    const cx = VIEW_WIDTH / 2;

    // 持扇女子场景图，铺满视口
    const sceneImg = this.add.image(cx, VIEW_HEIGHT / 2 - 40, 'sisters_fullscene')
      .setDepth(96)
      .setScrollFactor(0)
      .setName('fan_big_img');
    const scaleX = VIEW_WIDTH / (sceneImg.width || 1608);
    const scaleY = VIEW_HEIGHT / (sceneImg.height || 436);
    sceneImg.setScale(Math.max(scaleX, scaleY));

    // "唱扇女" 黄色大字（在对话框上方）
    const textX = VIEW_WIDTH * 0.12;
    const textY = VIEW_HEIGHT - 340;
    this.add.text(textX, textY, '唱扇女。', {
      fontSize: '32px', color: '#ffd700', fontFamily: 'serif', fontStyle: 'bold',
    }).setOrigin(0, 0).setDepth(101).setScrollFactor(0).setName('fan_dialogue_title');

    // Phase 2 提示
    this.add.text(cx, VIEW_HEIGHT - 50, '按 E 或 点击 继续阅读 | Q 返回', {
      fontSize: '22px', color: '#a89984', fontFamily: 'serif',
      backgroundColor: '#00000088', padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0).setName('fan_phase2_hint');

    // 更新遮罩点击
    const overlay = this.children.getByName('fan_overlay') as Phaser.GameObjects.Rectangle;
    if (overlay) {
      overlay.removeAllListeners('pointerdown');
      overlay.on('pointerdown', () => {
        if (this.fanPreviewPhase2) this.enterFanPhase3();
        else this.closeFanPreview();
      });
    }
  }

  /** Phase 3：显示小字内容 */
  private enterFanPhase3(): void {
    this.fanPreviewPhase2 = false;

    // 移除 Phase 2 提示
    const hint = this.children.getByName('fan_phase2_hint');
    if (hint) hint.destroy();

    const textX = VIEW_WIDTH * 0.12;
    const textY = VIEW_HEIGHT - 340 + 64;  // 唱扇女下方

    const line1 = '"__ __轻合，此后各自__ __；愿我今日所唱，仍能陪你过山过水。"';
    const line2 = '请在字典中找到对应的女书字。';

    // 正文（在唱扇女下面）
    this.add.text(textX, textY, '', {
      fontSize: '24px', color: '#e8d5b7', fontFamily: 'serif',
      wordWrap: { width: VIEW_WIDTH * 0.76 }, lineSpacing: 20,
    }).setOrigin(0, 0).setDepth(101).setScrollFactor(0).setName('fan_dialogue_text')
      .setText(line1 + '\n' + line2);

    // 关闭提示
    this.add.text(VIEW_WIDTH / 2, VIEW_HEIGHT - 50, '按 E 或 点击 返回主场景 | Q 返回', {
      fontSize: '22px', color: '#a89984', fontFamily: 'serif',
      backgroundColor: '#00000088', padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0).setName('fan_close_hint');
  }

  /** 关闭唱扇女大图预览 */
  private closeFanPreview(): void {
    if (!this.fanPreviewOpen) return;
    this.fanPreviewOpen = false;

    // 移除键盘监听
    if (this._fanKeyHandler) {
      window.removeEventListener('keydown', this._fanKeyHandler);
      this._fanKeyHandler = null;
    }

    // 销毁预览元素
    ['fan_overlay', 'fan_big_img', 'fan_close_hint', 'fan_phase1_hint', 'fan_phase2_hint', 'fan_dialogue_title', 'fan_dialogue_text'].forEach((name) => {
      const obj = this.children.getByName(name);
      if (obj) obj.destroy();
    });

    this.scene.resume();
  }

  // ==================== 琵琶大图预览（三阶段）====================

  /** Phase 1：琵琶大图（黑色半透明背景 + 居中，尺寸适中） */
  private openPipaPreview(): void {
    this.pipaPreviewOpen = true;
    this.pipaPreviewPhase1 = true;
    this.pipaPreviewPhase2 = false;
    this.scene.pause();

    const cx = VIEW_WIDTH / 2;
    const cy = VIEW_HEIGHT / 2;

    // 黑色半透明遮罩
    const overlay = this.add.rectangle(cx, cy, VIEW_WIDTH, VIEW_HEIGHT, 0x000000, 0.8)
      .setDepth(95)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .setName('pipa_overlay');

    // 琵琶大图居中显示（尺寸不要太大）
    this.add.image(cx, cy, 'pipa_img')
      .setScale(0.6)
      .setDepth(96)
      .setScrollFactor(0)
      .setName('pipa_big_img');

    // Phase 1 提示
    this.add.text(cx, VIEW_HEIGHT - 50, '按 E 或 点击 查看场景 | Q 返回', {
      fontSize: '22px', color: '#a89984', fontFamily: 'serif',
      backgroundColor: '#00000088', padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setDepth(97).setScrollFactor(0).setName('pipa_phase1_hint');

    // 点击：Phase 1 → Phase 2
    overlay.on('pointerdown', () => {
      if (this.pipaPreviewPhase1) this.enterPipaPhase2();
    });

    // 键盘事件
    const keyHandler = (e: KeyboardEvent) => {
      if (!this.pipaPreviewOpen) return;
      if (e.key === 'q' || e.key === 'Q' || e.key === 'Escape') {
        this.closePipaPreview();
      } else if (this.pipaPreviewPhase1 && (e.key === 'e' || e.key === 'E')) {
        this.enterPipaPhase2();
      } else if (this.pipaPreviewPhase2 && (e.key === 'e' || e.key === 'E')) {
        this.enterPipaPhase3();
      } else if (!this.pipaPreviewPhase1 && !this.pipaPreviewPhase2 && (e.key === 'e' || e.key === 'E')) {
        this.pipaPhase3Next();
      }
    };
    window.addEventListener('keydown', keyHandler);
    this._pipaKeyHandler = keyHandler;
  }

  /** Phase 2：持扇女子场景图 + "歌堂女"黄色标题 */
  private enterPipaPhase2(): void {
    this.pipaPreviewPhase1 = false;
    this.pipaPreviewPhase2 = true;

    // 移除琵琶大图和 Phase 1 提示
    const oldImg = this.children.getByName('pipa_big_img');
    if (oldImg) oldImg.destroy();
    const hint = this.children.getByName('pipa_phase1_hint');
    if (hint) hint.destroy();

    const cx = VIEW_WIDTH / 2;

    // 持扇女子场景图，铺满视口
    const sceneImg = this.add.image(cx, VIEW_HEIGHT / 2 - 40, 'sisters_fullscene')
      .setDepth(96)
      .setScrollFactor(0)
      .setName('pipa_big_img');
    const scaleX = VIEW_WIDTH / (sceneImg.width || 1608);
    const scaleY = VIEW_HEIGHT / (sceneImg.height || 436);
    sceneImg.setScale(Math.max(scaleX, scaleY));

    // "歌堂女" 黄色大字（在框的上面）
    const textX = VIEW_WIDTH * 0.12;
    const textY = VIEW_HEIGHT - 340;
    this.add.text(textX, textY, '歌堂女。', {
      fontSize: '32px', color: '#ffd700', fontFamily: 'serif', fontStyle: 'bold',
    }).setOrigin(0, 0).setDepth(101).setScrollFactor(0).setName('pipa_dialogue_title');

    // Phase 2 提示
    this.add.text(cx, VIEW_HEIGHT - 50, '按 E 或 点击 继续阅读 | Q 返回', {
      fontSize: '22px', color: '#a89984', fontFamily: 'serif',
      backgroundColor: '#00000088', padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0).setName('pipa_phase2_hint');

    // 更新遮罩点击
    const overlay = this.children.getByName('pipa_overlay') as Phaser.GameObjects.Rectangle;
    if (overlay) {
      overlay.removeAllListeners('pointerdown');
      overlay.on('pointerdown', () => {
        if (this.pipaPreviewPhase2) this.enterPipaPhase3();
        else if (!this.pipaPreviewPhase1 && !this.pipaPreviewPhase2) this.pipaPhase3Next();
        else this.closePipaPreview();
      });
    }
  }

  // Phase 3 每一行的文字
  private pipaLines: string[] = [];

  /** Phase 3：显示小字内容（先出第一行） */
  private enterPipaPhase3(): void {
    this.pipaPreviewPhase2 = false;

    // 移除 Phase 2 提示
    const hint = this.children.getByName('pipa_phase2_hint');
    if (hint) hint.destroy();

    this.pipaLines = [
      '歌堂是妇女们相聚、传习与学习的地方。',
      '她们在这里读纸、读扇，把女书中的字句、歌谣和心事一代代传下去。',
      '笔墨不仅是书写的工具，也像一条细细的线，把姐妹之间的知识、记忆与情感连接起来。',
    ];
    this.pipaTextLine = 0;

    const textX = VIEW_WIDTH * 0.12;
    const textY = VIEW_HEIGHT - 340 + 64;  // 歌堂女下方

    // 正文（在歌堂女下面），初始空文本
    const textObj = this.add.text(textX, textY, '', {
      fontSize: '24px', color: '#e8d5b7', fontFamily: 'serif',
      wordWrap: { width: VIEW_WIDTH * 0.76 }, lineSpacing: 20,
    }).setOrigin(0, 0).setDepth(101).setScrollFactor(0).setName('pipa_dialogue_text');
    this.pipaDialogueTextObj = textObj;

    // 立即显示第一行
    this.pipaPhase3Next();

    // 底部提示（初始）
    this.add.text(VIEW_WIDTH / 2, VIEW_HEIGHT - 50, '按 E 或 点击 继续 | Q 返回', {
      fontSize: '22px', color: '#a89984', fontFamily: 'serif',
      backgroundColor: '#00000088', padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0).setName('pipa_close_hint');
  }

  /** Phase 3 逐行推进：每次 E 显示下一行，最后一行时 E 关闭 */
  private pipaPhase3Next(): void {
    if (!this.pipaPreviewOpen || this.pipaPreviewPhase1 || this.pipaPreviewPhase2) return;

    if (this.pipaTextLine >= this.pipaLines.length) {
      // 全部行已显示，按 E 关闭
      this.closePipaPreview();
      return;
    }

    // 显示下一行
    this.pipaTextLine++;
    const shown = this.pipaLines.slice(0, this.pipaTextLine);
    if (this.pipaDialogueTextObj) {
      this.pipaDialogueTextObj.setText(shown.join('\n'));
    }

    // 更新底部提示
    const hint = this.children.getByName('pipa_close_hint') as Phaser.GameObjects.Text;
    if (hint) {
      if (this.pipaTextLine >= this.pipaLines.length) {
        hint.setText('按 E 或 点击 返回主场景 | Q 返回');
        // 全部行显示完毕后，点击关闭
        const overlay = this.children.getByName('pipa_overlay') as Phaser.GameObjects.Rectangle;
        if (overlay) {
          overlay.removeAllListeners('pointerdown');
          overlay.on('pointerdown', () => this.closePipaPreview());
        }
      } else {
        hint.setText('按 E 或 点击 继续 | Q 返回');
      }
    }
  }

  /** 关闭琵琶大图预览 */
  private closePipaPreview(): void {
    if (!this.pipaPreviewOpen) return;
    this.pipaPreviewOpen = false;

    // 移除键盘监听
    if (this._pipaKeyHandler) {
      window.removeEventListener('keydown', this._pipaKeyHandler);
      this._pipaKeyHandler = null;
    }

    // 重置状态
    this.pipaTextLine = 0;
    this.pipaDialogueTextObj = null;
    this.pipaLines = [];

    // 销毁预览元素
    ['pipa_overlay', 'pipa_big_img', 'pipa_close_hint', 'pipa_phase1_hint', 'pipa_phase2_hint', 'pipa_dialogue_title', 'pipa_dialogue_text'].forEach((name) => {
      const obj = this.children.getByName(name);
      if (obj) obj.destroy();
    });

    this.scene.resume();
  }

  // ==================== 唱扇女NPC场景图预览（三阶段逐行）====================

  /** Phase 1：持扇女子场景图 + "歌堂女"黄色标题 */
  private openGirlPreview(): void {
    this.girlPreviewOpen = true;
    this.girlPhase1 = true;
    this.girlTextLine = 0;
    this.girlLines = [];
    this.girlDialogueTextObj = null;
    this.scene.pause();

    const cx = VIEW_WIDTH / 2;

    // 暗色遮罩
    const overlay = this.add.rectangle(cx, VIEW_HEIGHT / 2, VIEW_WIDTH, VIEW_HEIGHT, 0x000000, 0.8)
      .setDepth(95)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .setName('girl_overlay');

    // 持扇女子场景图，铺满视口
    const sceneImg = this.add.image(cx, VIEW_HEIGHT / 2 - 40, 'sisters_fullscene')
      .setDepth(96)
      .setScrollFactor(0)
      .setName('girl_scene_img');
    const scaleX = VIEW_WIDTH / (sceneImg.width || 1608);
    const scaleY = VIEW_HEIGHT / (sceneImg.height || 436);
    sceneImg.setScale(Math.max(scaleX, scaleY));

    // "歌堂女" 黄色大字（在框的上面）
    const textX = VIEW_WIDTH * 0.12;
    const textY = VIEW_HEIGHT - 340;
    this.add.text(textX, textY, '唱扇女。', {
      fontSize: '32px', color: '#ffd700', fontFamily: 'serif', fontStyle: 'bold',
    }).setOrigin(0, 0).setDepth(101).setScrollFactor(0).setName('girl_dialogue_title');

    // 底部提示
    this.add.text(cx, VIEW_HEIGHT - 50, '按 E 或 点击 继续 | Q 返回', {
      fontSize: '22px', color: '#a89984', fontFamily: 'serif',
      backgroundColor: '#00000088', padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0).setName('girl_phase1_hint');

    // 点击：Phase 1 → Phase 2
    overlay.on('pointerdown', () => {
      if (this.girlPhase1) this.enterGirlPhase2();
      else this.girlPhase2Next();
    });

    // 键盘
    const keyHandler = (e: KeyboardEvent) => {
      if (!this.girlPreviewOpen) return;
      if (e.key === 'q' || e.key === 'Q' || e.key === 'Escape') {
        this.closeGirlPreview();
      } else if ((e.key === 'e' || e.key === 'E')) {
        if (this.girlPhase1) this.enterGirlPhase2();
        else this.girlPhase2Next();
      }
    };
    window.addEventListener('keydown', keyHandler);
    this._girlKeyHandler = keyHandler;
  }

  /** 进入 Phase 2：显示第一行文字 */
  private enterGirlPhase2(): void {
    this.girlPhase1 = false;

    // 移除 Phase 1 提示
    const hint = this.children.getByName('girl_phase1_hint');
    if (hint) hint.destroy();

    this.girlLines = [
      '这里的字，不只用眼睛读。',
      '女书的创制是妇女维护自身利益的迫切需要。',
      '女书作品内容主要是诉苦，用于女性内部的情感交流。',
    ];
    this.girlTextLine = 0;

    const textX = VIEW_WIDTH * 0.12;
    const textY = VIEW_HEIGHT - 340 + 64;  // 歌堂女下方

    // 正文（初始空）
    const textObj = this.add.text(textX, textY, '', {
      fontSize: '24px', color: '#e8d5b7', fontFamily: 'serif',
      wordWrap: { width: VIEW_WIDTH * 0.76 }, lineSpacing: 20,
    }).setOrigin(0, 0).setDepth(101).setScrollFactor(0).setName('girl_dialogue_text');
    this.girlDialogueTextObj = textObj;

    // 立即显示第一行 + 底部提示
    this.girlPhase2Next();
  }

  /** Phase 2 逐行推进：每次 E 显示下一行，最后一行时 E 关闭 */
  private girlPhase2Next(): void {
    if (!this.girlPreviewOpen || this.girlPhase1) return;

    if (this.girlTextLine >= this.girlLines.length) {
      // 全部行已显示，按 E 关闭
      this.closeGirlPreview();
      return;
    }

    // 显示下一行
    this.girlTextLine++;
    const shown = this.girlLines.slice(0, this.girlTextLine);
    if (this.girlDialogueTextObj) {
      this.girlDialogueTextObj.setText(shown.join('\n'));
    }

    // 更新底部提示
    const hint = this.children.getByName('girl_close_hint') as Phaser.GameObjects.Text;
    if (hint) {
      if (this.girlTextLine >= this.girlLines.length) {
        hint.setText('按 E 或 点击 返回主场景 | Q 返回');
        // 全部显示后点击关闭
        const overlay = this.children.getByName('girl_overlay') as Phaser.GameObjects.Rectangle;
        if (overlay) {
          overlay.removeAllListeners('pointerdown');
          overlay.on('pointerdown', () => this.closeGirlPreview());
        }
      }
    } else {
      // 创建底部提示（首次进入 Phase 2 时）
      this.add.text(VIEW_WIDTH / 2, VIEW_HEIGHT - 50,
        this.girlTextLine >= this.girlLines.length ? '按 E 或 点击 返回主场景 | Q 返回' : '按 E 或 点击 继续 | Q 返回', {
        fontSize: '22px', color: '#a89984', fontFamily: 'serif',
        backgroundColor: '#00000088', padding: { x: 20, y: 8 },
      }).setOrigin(0.5).setDepth(100).setScrollFactor(0).setName('girl_close_hint');
    }
  }

  /** 关闭唱扇女NPC场景图预览 */
  private closeGirlPreview(): void {
    if (!this.girlPreviewOpen) return;
    this.girlPreviewOpen = false;

    if (this._girlKeyHandler) {
      window.removeEventListener('keydown', this._girlKeyHandler);
      this._girlKeyHandler = null;
    }

    // 重置状态
    this.girlPhase1 = true;
    this.girlTextLine = 0;
    this.girlDialogueTextObj = null;
    this.girlLines = [];

    ['girl_overlay', 'girl_scene_img', 'girl_close_hint', 'girl_phase1_hint', 'girl_dialogue_title', 'girl_dialogue_text'].forEach((name) => {
      const obj = this.children.getByName(name);
      if (obj) obj.destroy();
    });

    this.scene.resume();
  }

  /** 打开笔墨大图预览（Phase 1：只显示大图） */
  private openBimoPreview(): void {
    this.bimoPreviewOpen = true;
    this.bimoPreviewPhase1 = true;
    this.scene.pause();

    const cx = VIEW_WIDTH / 2;
    const cy = VIEW_HEIGHT / 2;

    // 暗色遮罩
    const overlay = this.add.rectangle(cx, cy, VIEW_WIDTH, VIEW_HEIGHT, 0x000000, 0.85)
      .setDepth(95)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .setName('bimo_overlay');

    // 笔墨大图（左移）
    this.add.image(cx - 210, cy, 'bimo_big_img')
      .setScale(0.75)
      .setDepth(96)
      .setScrollFactor(0)
      .setName('bimo_big_img');

    // Phase 1 提示
    this.add.text(cx, VIEW_HEIGHT - 50, '按 E 或 点击 显示文字 | Q 返回', {
      fontSize: '22px', color: '#a89984', fontFamily: 'serif',
      backgroundColor: '#00000088', padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setDepth(97).setScrollFactor(0).setName('bimo_phase1_hint');

    // 点击：Phase 1 → Phase 2
    overlay.on('pointerdown', () => {
      if (this.bimoPreviewPhase1) this.enterBimoPhase2();
    });

    // 键盘
    const keyHandler = (e: KeyboardEvent) => {
      if (!this.bimoPreviewOpen) return;
      if (e.key === 'q' || e.key === 'Q' || e.key === 'Escape') {
        this.closeBimoPreview();
      } else if (this.bimoPreviewPhase1 && (e.key === 'e' || e.key === 'E')) {
        this.enterBimoPhase2();
      } else if (!this.bimoPreviewPhase1 && (e.key === 'e' || e.key === 'E')) {
        this.closeBimoPreview();
      }
    };
    window.addEventListener('keydown', keyHandler);
    this._bimoKeyHandler = keyHandler;
  }

  /** 笔墨大图 Phase 2：显示文字 */
  private enterBimoPhase2(): void {
    this.bimoPreviewPhase1 = false;

    // 移除 Phase 1 提示
    const hint = this.children.getByName('bimo_phase1_hint');
    if (hint) hint.destroy();

    const cx = VIEW_WIDTH / 2;
    const cy = VIEW_HEIGHT / 2;

    // 右侧歌堂文字
    const gtt = '歌堂是妇女们相聚、传习与学习的地方。\n她们在这里读纸、读扇，\n把女书中的字句、歌谣和心事一代代传下去。\n笔墨不仅是书写的工具，也像一条细细的线，\n把姐妹之间的知识、记忆与情感连接起来。';
    this.add.text(cx + 500, cy, gtt, {
      fontSize: '28px', color: '#d5cfc0', lineSpacing: 16,
      fontFamily: '\"SimSun\", \"Microsoft YaHei\", serif',
    }).setOrigin(0.5).setDepth(96).setScrollFactor(0).setName('bimo_text');

    // Phase 2 提示
    this.add.text(cx, VIEW_HEIGHT - 50, '按 E 或 点击 返回主场景 | Q 返回', {
      fontSize: '22px', color: '#a89984', fontFamily: 'serif',
      backgroundColor: '#00000088', padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setDepth(97).setScrollFactor(0).setName('bimo_phase2_hint');

    // 更新遮罩点击为关闭
    const overlay = this.children.getByName('bimo_overlay') as Phaser.GameObjects.Rectangle;
    if (overlay) {
      overlay.removeAllListeners('pointerdown');
      overlay.on('pointerdown', () => this.closeBimoPreview());
    }
  }

  /** 关闭笔墨大图预览 */
  private closeBimoPreview(): void {
    if (!this.bimoPreviewOpen) return;
    this.bimoPreviewOpen = false;

    // 移除键盘监听
    if (this._bimoKeyHandler) {
      window.removeEventListener('keydown', this._bimoKeyHandler);
      this._bimoKeyHandler = null;
    }

    // 销毁预览元素
    ['bimo_overlay', 'bimo_big_img', 'bimo_phase1_hint', 'bimo_phase2_hint', 'bimo_text'].forEach((name) => {
      const obj = this.children.getByName(name);
      if (obj) obj.destroy();
    });

    this.scene.resume();
  }

  /** 解锁"声"词条 */
  private unlockSistersEntry(): void {
    const entry = SONG_ENTRIES.find((e) => e.id === 'song_sheng');
    if (entry && !this.saveSystem.getEntry('song_sheng')?.unlocked) {
      this.dictSystem.unlock({ ...entry });
      this.showToast('🔔 你听到了"声"这个字，词典已更新');
    }
  }

  // ==================== 完成检测 ====================

  private checkAllMatched(): void {
    const allIds = SONG_ENTRIES.map((e) => e.id);
    if (this.dictSystem.areAllMatched(allIds)) {
      const matched = this.dictSystem.getMatched();
      const available = matched.map((e) => ({ id: e.id, char: e.nvshuChar }));
      this.time.delayedCall(500, () => this.showGuessIfNeeded(available));
    }
  }

  private showGuessIfNeeded(available: { id: string; char: string }[]): void {
    if (this.dictSystem.isSceneComplete('song')) return;
    this.showGuessPanel(available, (ids: string[]) => {
      if (this.dictSystem.verifySentence(ids, FINAL_SENTENCE_IDS)) {
        this.dictSystem.completeScene('song');
        this.enterCompletionScene();
      } else {
        this.showToast('✗ 推测不正确，请再试试。提示：女书是唱出来的。');
      }
    });
  }

  // ==================== 完成场景检测 ====================

  private enterCompletionScene(): void {
    // 进入完成场景模式
    this.completionMode = true;
    this.savedPlayerPos = { x: this.player.x, y: this.player.y };

    // ========== 隐藏所有线索、NPC、玩家、HUD ==========
    // 隐藏线索标记
    this.clueMarkers.forEach((m) => m.setVisible(false));

    // 隐藏 NPC
    this.npcSprites.forEach((s) => s.setVisible(false));

    // 隐藏玩家
    this.player.setVisible(false);

    this.interactHint.setVisible(false);

    // 隐藏词典按钮
    const dictBtn = this.children.getByName?.('dictBtn') as Phaser.GameObjects.Image | undefined;
    if (dictBtn) dictBtn.setVisible(false);
    if (this.dictUI?.isOpened()) this.dictUI.close();

    // 隐藏底部操作提示
    const hudChildren = this.children.getAll('depth', 51) as Phaser.GameObjects.GameObject[];
    hudChildren.forEach((c) => { if ((c as any).setVisible) (c as any).setVisible(false); });
    const hud52Children = this.children.getAll('depth', 52) as Phaser.GameObjects.GameObject[];
    hud52Children.forEach((c) => { if ((c as any).setVisible) (c as any).setVisible(false); });

    // 相机居中到世界中心
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.cameras.main.stopFollow();
    this.tweens.add({
      targets: this.cameras.main,
      scrollX: cx - VIEW_WIDTH / 2,
      scrollY: cy - VIEW_HEIGHT / 2,
      duration: 1000,
      ease: 'Sine.easeInOut',
    });

    // ========== 显示完成场景分层图片 ==========

    // 中间层：桌面/背景图
    this.add.image(cx, cy, 'completion_mid')
      .setScale(2)
      .setDepth(1)
      .setName('completion_mid');

    // 最上层：人物立绘
    this.add.image(cx, cy, 'completion_top')
      .setScale(3)
      .setDepth(10)
      .setName('completion_top');

    // ESC 提示
    this.add.text(VIEW_WIDTH / 2, VIEW_HEIGHT - 60, '按 [ESC] 返回主场景', {
      fontSize: '28px',
      color: '#a89984',
      backgroundColor: '#00000088',
      padding: { x: 20, y: 8 },
      fontFamily: 'serif',
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0).setName('completion_esc_hint');
  }

  /** 退出完成场景，恢复主游戏 */
  private exitCompletionMode(): void {
    this.completionMode = false;

    // 清除完成场景的图层
    ['completion_mid', 'completion_top', 'completion_esc_hint'].forEach((name) => {
      const obj = this.children.getByName(name);
      if (obj) obj.destroy();
    });

    // 恢复线索标记
    this.clueMarkers.forEach((m) => m.setVisible(true));

    // 恢复 NPC
    this.npcSprites.forEach((s) => s.setVisible(true));

    // 恢复玩家
    this.player.setVisible(true);
    if (this.savedPlayerPos) {
      this.player.setPosition(this.savedPlayerPos.x, this.savedPlayerPos.y);
    }

    // 恢复相机跟随
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // 恢复HUD（通过重新创建或手动恢复可见性）
    // 由于HUD元素没有name引用，简单方式是让它们在下次update时自然恢复
  }

  // ==================== Toast ====================

  private showToast(text: string): void {
    const toast = this.add.text(VIEW_WIDTH / 2, 160, text, {
      fontSize: '32px', color: '#ffffff', backgroundColor: '#000000aa',
      padding: { x: 40, y: 20 }, fontFamily: 'serif',
    }).setOrigin(0.5).setDepth(150).setScrollFactor(0);

    this.tweens.add({
      targets: toast, alpha: 0, y: 100, duration: 2000, delay: 1000,
      onComplete: () => toast.destroy(),
    });
  }

  // ==================== 清理 ====================

  shutdown(): void {
    this.dictUI?.destroy();
  }
}
