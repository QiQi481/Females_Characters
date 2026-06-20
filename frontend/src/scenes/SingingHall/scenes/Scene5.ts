/**
 * Scene5 - 重构版唱歌厅场景
 *
 * 底图 2172×724，屏幕视口 800×600，相机跟随玩家。
 * 交互逻辑严格对齐 Scene 2 EmbroideryRoomPhaserScene，使用统一对话框。
 * 无全屏场景切换、无全屏立绘、无相机脱离玩家。
 * 玩家自由探索，收集女书符号，在词典中配对。
 * 全部词条配对后推测"歌声传记"句子，完成场景。
 */
import Phaser from 'phaser';
import type { GlobalDictionaryBridge } from '../../../game/GlobalDictionaryBridge';
import { SceneKeys } from '../types';
import { getBgmVolume, BGM_VOLUME_CHANGE_EVENT } from '../../../utils/audioSettings';
import {
  PLAYER_SPEED,
  INTERACT_DISTANCE,
  GAME_WIDTH,
  GAME_HEIGHT,
  VIEW_WIDTH,
  VIEW_HEIGHT,
  setViewportSize,
} from '../config';
import { SaveSystem } from '../systems/SaveSystem';
import { DictionarySystem } from '../systems/DictionarySystem';
import {
  SONG_ENTRIES,
  SONG_CLUES,
  SISTERS_NPC,
  FINAL_SENTENCE_IDS,
  SINGER_NPC_NAME,
  SINGER_INTRO_DIALOGUE_LINES,
  SINGING_GIRL_INTRO_SEEN_FLAG,
  SINGER_NPC_ID,
} from './song/SongData';

type SingingDictionaryPuzzleConfig = {
  puzzleId: string
  activeEntryId: string
  contextSentence: string
  localEntryIds: readonly string[]
}

// ========== Toast 常量 ==========
const TOAST_PADDING_X = 20;
const TOAST_HEIGHT = 66;

// ========== 字典拼图配置 ==========
const GLOBAL_PUZZLE_NUSHU_TEXTURE_KEYS: Record<string, readonly string[]> = {
  geshan: ['singing_nushu_ge', 'singing_nushu_shan'],
  zhi: ['singing_nushu_zhi'],
  yuanxing: ['singing_nushu_yuan', 'singing_nushu_xing'],
};

const LOCAL_ENTRY_NUSHU_TEXTURE_KEYS: Record<string, readonly string[]> = {
  song_sheng: ['singing_nushu_sheng'],
};

const INTERACTION_HINT_NUSHU_TARGETS = new Set(['clue_fan', 'clue_paper']);

const GLOBAL_DICTIONARY_PUZZLES: Record<
  string,
  SingingDictionaryPuzzleConfig
> = {
  clue_fan: {
    puzzleId: 'singing-hall-song-fan',
    activeEntryId: 'geshan',
    contextSentence: '扇面题写歌辞，既能传情，也能留住共同的记忆。',
    localEntryIds: ['song_ge', 'song_shan'],
  },
  clue_paper: {
    puzzleId: 'singing-hall-paper',
    activeEntryId: 'zhi',
    contextSentence: '泛黄的纸页被反复传阅，承载着女书歌谣。',
    localEntryIds: ['song_chuan'],
  },
  npc_girl: {
    puzzleId: 'singing-hall-journey',
    activeEntryId: 'yuanxing',
    contextSentence: '歌辞随女子离开熟悉之地，也被带往更远的地方。',
    localEntryIds: [],
  },
}

// ========== 对话框常量（严格对齐 Scene 2）==========
const DIALOGUE_NPC_GIRL_KEY = 'nvshu_girl_img';
const DIALOGUE_NPC_SISTERS_KEY = 'sisters_img';
const DIALOGUE_BOX_KEY = 'singing_dialogue_box';
const NUSHU_TOKEN = '{{nushu}}';
const DIALOGUE_TEXT_X = -390;
const DIALOGUE_TEXT_Y = -68;
const DIALOGUE_TEXT_WIDTH = 790;
const DIALOGUE_FONT_SIZE = 29;
const DIALOGUE_LINE_HEIGHT = 48;
const DIALOGUE_GLYPH_HEIGHT = 40;
const DIALOGUE_GLYPH_GAP = 3;
const DIALOGUE_GLYPH_TEXTURE_PADDING = 6;

const EXPLORATION_CONTROLS_LABEL = 'WASD 移动 | E 交互 | Tab 词典';
const DIALOGUE_CONTROLS_LABEL = 'E / 点击继续 | Q / ESC 返回';

type DialogueState = 'pending' | 'playing' | 'complete';

// ========== 各线索的对话内容（不再使用全屏预览，改用统一对话框）==========
const SISTERS_DIALOGUE_LINES = [
  '在江永，女书不只是写在纸上的字，也是姐妹们围坐唱女歌时被传下来的声音。',
  '女书常与妇女聚集缝衣、唱女书歌的场景相连，她们围坐在一起互相安慰。',
] as const;

const PAPER_DIALOGUE_LINES = [
  '上只留两行字，心中却有万重山。',
  '愿__远去，仍记旧时__ __声。',
  '请在字典中找到对应的女书字。',
] as const;

const FAN_DIALOGUE_LINES = [
  '"__ __轻合，从此各自__ __；愿我今日所唱，仍能陪你过千山万水。"',
  '请在字典中找到对应的女书字。',
] as const;

const PIPA_DIALOGUE_LINES = [
  '琵琶声响起时，仿佛把人带回江永女子相聚歌唱的时刻。',
  '女书常与歌谣、扇面、三朝书一起，承载女性之间的情感与记忆。',
  '这件琵琶记录着一段被轻声传唱的故事：有离别、有祝愿，也有牵挂。',
] as const;

const BIMO_DIALOGUE_LINES = [
  '歌堂是妇女们相聚、传习与学习的地方。',
  '笔墨像一条细细的线，把姐妹之间的知识、记忆与情感连接起来。',
] as const;

export class Scene5 extends Phaser.Scene {
  // ========== 系统 ==========
  private saveSystem!: SaveSystem;
  private dictSystem!: DictionarySystem;
  private dictionaryBridge!: GlobalDictionaryBridge;
  private isGlobalDictionaryOpen = false;
  private lastFreeExplorationActive?: boolean;
  private bgmVolumeHandler: (() => void) | null = null;
  private pendingDictionaryPuzzle: SingingDictionaryPuzzleConfig | null = null;
  private pendingGlyphToastTargets = new Set<string>();
  private pendingLocalGlyphToastEntryIds = new Set<string>();

  // ========== 游戏对象 ==========
  private player!: Phaser.Physics.Arcade.Sprite;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;

  // ========== UI ==========
  private interactHint!: Phaser.GameObjects.Container;
  private _hintText!: Phaser.GameObjects.Text;
  private interactHintGlyphContent!: Phaser.GameObjects.Container;
  private dictionaryButton!: Phaser.GameObjects.Image;
  private dictionaryButtonLabel!: Phaser.GameObjects.Text;
  private controlsHint!: Phaser.GameObjects.Text;

  // ========== 线索标记精灵 ==========
  private clueMarkers: Phaser.Physics.Arcade.Sprite[] = [];
  private clueMarkerBaseScales: number[] = [];
  private npcSprites: Phaser.Physics.Arcade.Sprite[] = [];
  private npcSistersBaseScale = 1;
  private _girlImg!: Phaser.GameObjects.Image;
  private _girlImgBaseScale = 1;
  private _girlTween?: Phaser.Tweens.Tween;
  private _sistersTween?: Phaser.Tweens.Tween;

  // ========== 弹窗（仅用于 fake 线索简单展示）==========
  private popupContainer!: Phaser.GameObjects.Container;
  private popupOverlay!: Phaser.GameObjects.Rectangle;
  private popupBg!: Phaser.GameObjects.Rectangle;
  private popupTitle!: Phaser.GameObjects.Text;
  private popupText!: Phaser.GameObjects.Text;
  private popupCloseBtn!: Phaser.GameObjects.Text;
  private popupOpen = false;

  // ========== 推测面板 ==========
  private guessContainer!: Phaser.GameObjects.Container;
  private guessOverlay!: Phaser.GameObjects.Rectangle;
  private guessSlots: Phaser.GameObjects.Text[] = [];
  private guessEntryIds: (string | null)[] = [];
  private guessOnConfirm: ((ids: string[]) => void) | null = null;
  private guessAvailable: { id: string; char: string }[] = [];
  private guessSelectedIndex = 0;
  private guessOpen = false;

  // ========== 线索进度 ==========
  private clueFoundCount = 0;
  private clueTotalCount = SONG_CLUES.length + 1;
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

  // ========== 统一对话框（严格对齐 Scene 2 createDialogueBox）==========
  private dialogueContainer!: Phaser.GameObjects.Container;
  private dialogueNpc!: Phaser.GameObjects.Image;
  private dialogueBox!: Phaser.GameObjects.Image;
  private dialogueName!: Phaser.GameObjects.Text;
  private dialogueBefore!: Phaser.GameObjects.Text;
  private dialoguePrefix!: Phaser.GameObjects.Text;
  private dialogueSuffix!: Phaser.GameObjects.Text;
  private dialogueSolvedText!: Phaser.GameObjects.Text;
  private dialogueGlyphContainer!: Phaser.GameObjects.Container;
  private dialogueLinesContainer!: Phaser.GameObjects.Container;
  private dialogueHint!: Phaser.GameObjects.Text;
  private dialogueOpen = false;
  private dialogueLines: string[] = [];
  private dialogueLineIndex = 0;
  private dialogueSpeaker = '';
  private dialogueOnComplete: (() => void) | null = null;

  // ========== NPC 聚焦/恢复（对齐 Scene 2）==========
  private focusedNpc?: Phaser.GameObjects.Image;
  private focusedNpcState?: {
    x: number;
    y: number;
    displayWidth: number;
    displayHeight: number;
    depth: number;
    alpha: number;
    visible: boolean;
  };
  private focusedNpcTween?: Phaser.Tweens.Tween;
  private focusedNpcIsSprite = false;

  // ========== 唱扇女介绍对话状态 ==========
  private girlIntroDialogueState: DialogueState = 'pending';

  // ========== NPC 名称标签（接近时显示）==========
  private _sistersLabelText!: Phaser.GameObjects.Text;
  private _girlLabelText!: Phaser.GameObjects.Text;
  private _paperLabelText!: Phaser.GameObjects.Text;
  private _fanLabelText!: Phaser.GameObjects.Text;
  private _standLabelText!: Phaser.GameObjects.Text;
  private _bimoLabelText!: Phaser.GameObjects.Text;
  private _pipaLabelText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'Scene5' } as any);
  }

  create(): void {
    setViewportSize(this.scale.gameSize.width, this.scale.gameSize.height);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleViewportResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

    // ========== 世界边界（与底图尺寸一致）==========
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // ========== 初始化系统 ==========
    this.saveSystem = new SaveSystem();
    this.dictSystem = new DictionarySystem(this.saveSystem);
    this.dictionaryBridge = this.registry.get(
      'globalDictionaryBridge',
    ) as GlobalDictionaryBridge;
    this.createDialogueGlyphTextures();

    const missingEntries = SONG_ENTRIES.filter(
      (entry) => !this.saveSystem.getEntry(entry.id),
    )
    this.dictSystem.registerEntries('singingHall', SONG_ENTRIES)
    missingEntries.forEach((entry) => this.dictSystem.unlock(entry))

    // ========== 背景音乐 ==========
    const existingBgm = this.sound.get('singing_bgm')
    if (existingBgm) existingBgm.destroy()
    const initialVol = getBgmVolume()
    this.sound.add('singing_bgm', { loop: true, volume: initialVol, mute: initialVol === 0 }).play()

    // 实时响应设置面板的音量变更
    this.bgmVolumeHandler = () => {
      const bgm = this.sound.get('singing_bgm')
      if (bgm) {
        const vol = getBgmVolume()
        bgm.setVolume(vol)
        bgm.setMute(vol === 0)
      }
    }
    window.addEventListener(BGM_VOLUME_CHANGE_EVENT, this.bgmVolumeHandler)

    const singingHallClueIds = new Set([
      ...SONG_CLUES.map((clue) => clue.id),
      SISTERS_NPC.id,
    ])
    this.foundClueIds = new Set(
      this.saveSystem
        .getDiscoveredClues()
        .filter((clueId) => singingHallClueIds.has(clueId)),
    )
    this.clueFoundCount = this.foundClueIds.size

    // ========== 背景底图（放大2倍填满世界）==========
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'main_bg');
    bg.setScale(2);
    bg.setDepth(0);

    // ========== 玩家 ==========
    this.player = this.physics.add.sprite(400, 400, 'player');
    this.player.setTint(0x7a3020);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.body!.setSize(28, 28);

    // ========== 相机：跟随玩家，初始视口居中 ==========
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // ========== 键盘输入 ==========
    this.keyW = this.input.keyboard!.addKey('W');
    this.keyA = this.input.keyboard!.addKey('A');
    this.keyS = this.input.keyboard!.addKey('S');
    this.keyD = this.input.keyboard!.addKey('D');

    this.input.keyboard?.on('keydown-E', () => {
      if (this.dialogueOpen) { this.advanceDialogueLine(); return; }
      if (this.popupOpen || this.guessOpen) return;
      if (this.isGlobalDictionaryOpen) return;
      this.handleInteract();
    });

    this.input.keyboard?.on('keydown-Q', () => {
      if (this.dialogueOpen) { this.closeDialogue(); return; }
      if (this.isGlobalDictionaryOpen) return;
      if (this.popupOpen) { this.closePopup(); return; }
      if (this.guessOpen) { this.closeGuessPanel(); return; }
    });

    this.input.keyboard?.on('keydown-TAB', (event: KeyboardEvent) => {
      event.preventDefault();
      if (this.isGlobalDictionaryOpen) {
        this.dictionaryBridge.closeDictionary();
      } else {
        this.openGlobalDictionary();
      }
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.completionMode) {
        this.exitCompletionMode();
        return;
      }
      if (this.dialogueOpen) { this.closeDialogue(); return; }
      if (this.isGlobalDictionaryOpen) return;
      if (this.popupOpen) { this.closePopup(); return; }
      if (this.guessOpen) this.closeGuessPanel();
    });

    // ========== 创建所有UI ==========
    this.createPopup();
    this.createDialogueBox();
    this.createGuessPanel();
    this.createInteractHint();

    this.events.on('resume', () => {
      this.checkAllMatched();
    });

    // ========== 线索标记 ==========
    this.placeClues();

    // ========== NPC ==========
    this.placeNPCs();

    // ========== HUD：固定在屏幕上的UI（使用 setScrollFactor(0)）==========
    this.createHUD();
    this.syncFreeExplorationState();

    // ========== 唱扇女介绍对话（对齐 Scene 2）==========
    this.initializeGirlIntroDialogue();
  }

  update(): void {
    this.syncFreeExplorationState();
    if (this.completionMode || this.popupOpen || this.guessOpen || this.isGlobalDictionaryOpen || this.dialogueOpen) {
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
    this.syncFreeExplorationState();
  }

  private handleViewportResize(gameSize: Phaser.Structs.Size): void {
    const previousWidth = VIEW_WIDTH;
    const previousHeight = VIEW_HEIGHT;
    setViewportSize(gameSize.width, gameSize.height);

    const centerShiftX = (VIEW_WIDTH - previousWidth) / 2;
    const centerShiftY = (VIEW_HEIGHT - previousHeight) / 2;

    this.layoutPersistentUi(centerShiftX, centerShiftY);
  }

  private layoutPersistentUi(centerShiftX = 0, centerShiftY = 0): void {
    const cx = VIEW_WIDTH / 2;
    const cy = VIEW_HEIGHT / 2;

    if (this.dictionaryButton?.active) {
      this.dictionaryButton.setPosition(cx, 18);
      this.dictionaryButtonLabel.setPosition(cx, 88);
      this.clueProgressText.setPosition(VIEW_WIDTH - 24, 24);
      this.controlsHint.setPosition(cx, VIEW_HEIGHT - 24);
    }

    if (this.interactHint?.active) {
      this.interactHint.setPosition(cx, VIEW_HEIGHT - 105);
    }

    if (this.popupContainer?.active) {
      this.popupOverlay.setPosition(cx, cy).setSize(VIEW_WIDTH, VIEW_HEIGHT);
      this.popupBg.setPosition(cx, cy);
      this.popupTitle.setPosition(cx, cy - 350);
      this.popupText.setPosition(cx - 500, cy - 260);
      this.popupCloseBtn.setPosition(cx + 500, cy - 370);
    }

    if (this.dialogueContainer?.active) {
      this.dialogueContainer.setPosition(cx, VIEW_HEIGHT - 175);
      this.dialogueBox.setDisplaySize(Math.min(VIEW_WIDTH * 0.88, 1500), 300);
      this.fitDialogueNpc();
    }

    if (this.guessContainer?.active) {
      this.guessContainer.x += centerShiftX;
      this.guessContainer.y += centerShiftY;
      this.guessOverlay.setSize(VIEW_WIDTH, VIEW_HEIGHT);
    }
  }

  /** 旧的全屏预览辅助方法——已废弃（Scene 5 不使用快照覆层） */
  private layoutNamedPreviewObjects(
    _centerShiftX: number,
    _centerShiftY: number,
  ): void {
    // Scene 5 不使用全屏图片预览，保留空方法以避免编译错误
  }

  private layoutNamedPreviewObjects(
    centerShiftX: number,
    centerShiftY: number,
  ): void {
    this.children.list.forEach((gameObject) => {
      if (!gameObject.name) return;

      const object = gameObject as Phaser.GameObjects.GameObject & {
        x?: number;
        y?: number;
        scrollFactorX?: number;
        scrollFactorY?: number;
        parentContainer?: Phaser.GameObjects.Container | null;
      };

      if (
        object.parentContainer ||
        object.scrollFactorX !== 0 ||
        object.scrollFactorY !== 0 ||
        typeof object.x !== 'number' ||
        typeof object.y !== 'number'
      ) {
        return;
      }

      object.x += centerShiftX;
      object.y += centerShiftY;
    });

    const cx = VIEW_WIDTH / 2;
    const cy = VIEW_HEIGHT / 2;

    [
      'paper_overlay',
      'fan_overlay',
      'pipa_overlay',
      'girl_overlay',
      'bimo_overlay',
    ].forEach((name) => {
      const overlay = this.children.getByName(name);
      if (overlay instanceof Phaser.GameObjects.Rectangle) {
        overlay.setPosition(cx, cy).setSize(VIEW_WIDTH, VIEW_HEIGHT);
      }
    });

    ['sisters_scene_img', 'girl_scene_img'].forEach((name) => {
      const image = this.children.getByName(name);
      if (image instanceof Phaser.GameObjects.Image) {
        image.setPosition(cx, name === 'girl_scene_img' ? cy - 40 : cy);
        image.setScale(
          Math.max(
            VIEW_WIDTH / image.width,
            VIEW_HEIGHT / image.height,
          ),
        );
      }
    });

    [
      'sisters_phase1_hint',
      'sisters_phase2_hint',
      'sisters_phase3_hint',
      'sisters_close_hint',
    ].forEach((name) => {
      const hint = this.children.getByName(name);
      if (hint instanceof Phaser.GameObjects.Text) {
        hint.setPosition(cx, VIEW_HEIGHT - 60);
      }
    });

    [
      'paper_phase1_hint',
      'paper_phase2_hint',
      'paper_close_hint',
      'fan_phase1_hint',
      'fan_phase2_hint',
      'fan_close_hint',
      'pipa_phase1_hint',
      'pipa_phase2_hint',
      'pipa_close_hint',
      'girl_phase1_hint',
      'girl_close_hint',
      'bimo_phase1_hint',
      'bimo_phase2_hint',
    ].forEach((name) => {
      const hint = this.children.getByName(name);
      if (hint instanceof Phaser.GameObjects.Text) {
        hint.setPosition(cx, VIEW_HEIGHT - 50);
      }
    });

    const completionHint = this.children.getByName('completion_esc_hint');
    if (completionHint instanceof Phaser.GameObjects.Text) {
      completionHint.setPosition(cx, VIEW_HEIGHT - 60);
    }
  }

  // ==================== HUD（固定在屏幕上，不随相机滚动）====================

  private createHUD(): void {
    // 词典入口按钮（两个场景共用全局书本图标）
    const dictBtn = this.add.image(VIEW_WIDTH / 2, 18, 'open_book_icon')
      .setOrigin(0.5, 0)
      .setDisplaySize(110, 85)
      .setDepth(52)
      .setScrollFactor(0)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    this.dictionaryButton = dictBtn;

    dictBtn.on('pointerover', () => dictBtn.setDisplaySize(118, 91));
    dictBtn.on('pointerout', () => dictBtn.setDisplaySize(110, 85));
    dictBtn.on('pointerdown', () => this.openGlobalDictionary());

    this.dictionaryButtonLabel = this.add.text(VIEW_WIDTH / 2, 88, '词典', {
      fontSize: '18px',
      color: '#6f2926',
      backgroundColor: 'rgba(244, 226, 191, 0.82)',
      padding: { x: 9, y: 3 },
      fontFamily: '"SimSun", "Microsoft YaHei", serif',
    }).setOrigin(0.5, 0).setDepth(53).setScrollFactor(0).setVisible(false);

    this.clueProgressText = this.add.text(VIEW_WIDTH - 24, 24, `线索 ${this.clueFoundCount}/${this.clueTotalCount}`, {
      fontSize: '24px',
      color: '#6f2926',
      backgroundColor: 'rgba(244, 226, 191, 0.9)',
      padding: { x: 16, y: 9 },
      fontFamily: '"SimSun", "Microsoft YaHei", serif',
    }).setOrigin(1, 0).setDepth(60).setScrollFactor(0).setVisible(false);
    this.syncClueProgress();

    this.controlsHint = this.add.text(
      VIEW_WIDTH / 2,
      VIEW_HEIGHT - 24,
      EXPLORATION_CONTROLS_LABEL,
      {
        fontSize: '22px',
        color: '#4d3b34',
        backgroundColor: 'rgba(244, 226, 191, 0.82)',
        padding: { x: 14, y: 7 },
        fontFamily: '"SimSun", "Microsoft YaHei", serif',
      },
    ).setOrigin(0.5, 1).setDepth(60).setScrollFactor(0).setVisible(false);
  }

  private createInteractionLabel(
    x: number,
    y: number,
    text: string,
  ): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      fontSize: '28px',
      color: '#6f2926',
      backgroundColor: 'rgba(244, 226, 191, 0.88)',
      padding: { x: 12, y: 6 },
      fontFamily: '"SimSun", "Microsoft YaHei", serif',
    }).setOrigin(0.5).setDepth(8).setVisible(false);
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
        // 传唱纸片名称标签（米色纸签，接近时显示）
        const paperLabelX = clue.x;
        const paperLabelY = clue.y - 300;
        this._paperLabelText = this.createInteractionLabel(
          paperLabelX,
          paperLabelY,
          '纸',
        );
      }

      // 笔墨左上角女书文字图片
      if (clue.id === 'clue_basket') {
        this.add.image(clue.x - 120, clue.y - 130, 'bimo_text_img')
          .setScale(0.25)
          .setDepth(6);
        // 笔墨名称标签（米色纸签，接近时显示）
        const bmoLabelX = clue.x - 120;
        const bmoLabelY = clue.y - 230;
        this._bimoLabelText = this.createInteractionLabel(
          bmoLabelX,
          bmoLabelY,
          '笔墨',
        );
      }

      // 琵琶上方女书文字图片
      if (clue.id === 'clue_pipa') {
        this.add.image(clue.x, clue.y - 270, 'pipa_text_img')
          .setScale(0.25)
          .setDepth(6);
        // 琵琶名称标签（米色纸签，接近时显示）
        const pipaLabelX = clue.x;
        const pipaLabelY = clue.y - 320;
        this._pipaLabelText = this.createInteractionLabel(
          pipaLabelX,
          pipaLabelY,
          '琵琶',
        );
      }

        // 唱扇女展开图上方女书文字图片
      if (clue.id === 'clue_fan') {
        this.add.image(clue.x, clue.y - 170, 'fan_text_img')
          .setScale(0.28)
          .setDepth(6);
        // 歌扇展开图名称标签（米色纸签，接近时显示）
        const fanLabelX = clue.x;
        const fanLabelY = clue.y - 250;
        this._fanLabelText = this.createInteractionLabel(
          fanLabelX,
          fanLabelY,
          '歌扇展开图',
        );
      }

      if (clue.id === 'clue_stand') {
        this._standLabelText = this.createInteractionLabel(
          clue.x,
          clue.y - 180,
          clue.name,
        );
      }

      marker.setDepth(5);
      marker.setAlpha(0.88);
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
    sistersSprite.setAlpha(0.88);
    this.npcSistersBaseScale = 0.9;
    this._sistersTween = this.tweens.add({
      targets: sistersSprite,
      y: SISTERS_NPC.y - 8,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.npcSprites.push(sistersSprite);

    // 围坐姐妹名称标签（米色纸签，接近时显示）
    {
      const slx = SISTERS_NPC.x + 280;
      const sly = SISTERS_NPC.y - 310 - 100;
      this._sistersLabelText = this.createInteractionLabel(
        slx,
        sly,
        '围坐姐妹',
      );
    }

    // 围坐姐妹右上角文字图片（身声，保留白底）
    this.add.image(SISTERS_NPC.x + 280, SISTERS_NPC.y - 310, 'sisters_text_img')
      .setScale(0.2)
      .setDepth(6);

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
      .setAlpha(0.88)
      .setDepth(5);
    this._girlImgBaseScale = 0.84;
    const girlImg = this._girlImg;
    this._girlTween = this.tweens.add({
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

    // 唱扇女名称标签（米色纸签，接近时显示）
    {
      const glx = 3500 - 160;
      const gly = 900 - 370 - 100;
      this._girlLabelText = this.createInteractionLabel(
        glx,
        gly,
        '唱扇女',
      );
    }
  }

  // ==================== 交互提示（跟随相机）====================

  private createInteractHint(): void {
    const cx = VIEW_WIDTH / 2;
    const y = VIEW_HEIGHT - 105;
    const bw = 430, bh = 64;

    const container = this.add.container(cx, y).setDepth(30).setScrollFactor(0).setVisible(false);
    this.interactHint = container;

    const bg = this.add.rectangle(0, 0, bw, bh, 0x4a2923, 0.92)
      .setOrigin(0.5);
    bg.setStrokeStyle(2, 0xd2b47b);
    container.add(bg);

    // 提示文字
    this._hintText = this.add.text(0, 0, '', {
      fontSize: '26px',
      color: '#f7e8ca',
      fontFamily: '"SimSun", "Microsoft YaHei", serif',
    }).setOrigin(0.5);
    this.interactHintGlyphContent = this.add.container(0, 0);
    this.interactHintGlyphContent.setVisible(false);
    container.add(this._hintText);
    container.add(this.interactHintGlyphContent);
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
        nearestTarget = clue.id;
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
      this.renderInteractionHint(nearestTarget, nearestIndex);
      this.interactHint.setVisible(true);

      // 线索标记缩放：最近的可交互线索放大到 1.4 倍
      this.clueMarkers.forEach((marker, idx) => {
        if (idx === nearestIndex) {
          marker
            .setScale(this.clueMarkerBaseScales[idx] * 1.4)
            .setAlpha(1);
        } else {
          marker
            .setScale(this.clueMarkerBaseScales[idx])
            .setAlpha(0.88);
        }
      });

      // NPC 缩放：最近的 NPC 放大到 1.2 倍
      this.npcSprites.forEach((sprite) => {
        const isNearest = nearestTarget === 'npc_sisters';
        sprite
          .setScale(
            isNearest
              ? this.npcSistersBaseScale * 1.2
              : this.npcSistersBaseScale,
          )
          .setAlpha(isNearest ? 1 : 0.92);
      });
      const isGirlNearest = nearestTarget === 'npc_girl';
      this._girlImg
        .setScale(
          isGirlNearest
            ? this._girlImgBaseScale * 1.2
            : this._girlImgBaseScale,
        )
        .setAlpha(isGirlNearest ? 1 : 0.92);
    } else {
      this.canInteract = false;
      this.currentTarget = '';
      this.currentClueIndex = -1;
      this.interactHint.setVisible(false);

      // 没有可交互对象时，恢复所有原始尺寸
      this.clueMarkers.forEach((marker, idx) => {
        marker
          .setScale(this.clueMarkerBaseScales[idx])
          .setAlpha(0.88);
      });
      this.npcSprites.forEach((sprite) => {
        sprite.setScale(this.npcSistersBaseScale).setAlpha(0.88);
      });
      this._girlImg.setScale(this._girlImgBaseScale).setAlpha(0.88);
    }

    // 笔墨名称标签接近显示（笔墨标记或笔墨文字图片任一靠近时显示）
    const basketClue = SONG_CLUES.find((c) => c.id === 'clue_basket');
    if (basketClue) {
      const bmoDist1 = Phaser.Math.Distance.Between(this.player.x, this.player.y, basketClue.x, basketClue.y);
      const bmoDist2 = Phaser.Math.Distance.Between(this.player.x, this.player.y, basketClue.x - 120, basketClue.y - 130);
      const shouldShow = bmoDist1 < INTERACT_DISTANCE || bmoDist2 < INTERACT_DISTANCE;
      if (shouldShow && !this._bimoLabelText.visible) {
        this._bimoLabelText.setVisible(true);
      } else if (!shouldShow && this._bimoLabelText.visible) {
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
      if (shouldShow && !this._pipaLabelText.visible) {
        this._pipaLabelText.setVisible(true);
      } else if (!shouldShow && this._pipaLabelText.visible) {
        this._pipaLabelText.setVisible(false);
      }
    }

    // 唱扇女展开页名称标签接近显示
    const fanClue = SONG_CLUES.find((c) => c.id === 'clue_fan');
    if (fanClue) {
      const fanDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, fanClue.x, fanClue.y);
      const shouldShow = fanDist < INTERACT_DISTANCE;
      if (shouldShow && !this._fanLabelText.visible) {
        this._fanLabelText.setVisible(true);
      } else if (!shouldShow && this._fanLabelText.visible) {
        this._fanLabelText.setVisible(false);
      }
    }

    // 围坐姐妹名称标签接近显示（围坐姐妹图片或身声文字图片任一靠近时显示）
    {
      const sDist1 = Phaser.Math.Distance.Between(this.player.x, this.player.y, SISTERS_NPC.x, SISTERS_NPC.y);
      const sDist2 = Phaser.Math.Distance.Between(this.player.x, this.player.y, SISTERS_NPC.x + 280, SISTERS_NPC.y - 310);
      const shouldShow = sDist1 < INTERACT_DISTANCE || sDist2 < INTERACT_DISTANCE;
      if (shouldShow && !this._sistersLabelText.visible) {
        this._sistersLabelText.setVisible(true);
      } else if (!shouldShow && this._sistersLabelText.visible) {
        this._sistersLabelText.setVisible(false);
      }
    }

    // 传唱纸片名称标签接近显示（纸片标记或纸字文字图片任一靠近时显示）
    const paperClue = SONG_CLUES.find((c) => c.id === 'clue_paper');
    if (paperClue) {
      const pDist1 = Phaser.Math.Distance.Between(this.player.x, this.player.y, paperClue.x, paperClue.y);
      const pDist2 = Phaser.Math.Distance.Between(this.player.x, this.player.y, paperClue.x, paperClue.y - 200);
      const shouldShow = pDist1 < INTERACT_DISTANCE || pDist2 < INTERACT_DISTANCE;
      if (shouldShow && !this._paperLabelText.visible) {
        this._paperLabelText.setVisible(true);
      } else if (!shouldShow && this._paperLabelText.visible) {
        this._paperLabelText.setVisible(false);
      }
    }

    // 唱扇女名称标签接近显示（唱扇女文字图片或唱扇女图片任一靠近时显示）
    {
      const gDist1 = Phaser.Math.Distance.Between(this.player.x, this.player.y, 3500, 900);
      const gDist2 = Phaser.Math.Distance.Between(this.player.x, this.player.y, 3500 - 160, 900 - 370);
      const shouldShow = gDist1 < INTERACT_DISTANCE || gDist2 < INTERACT_DISTANCE;
      if (shouldShow && !this._girlLabelText.visible) {
        this._girlLabelText.setVisible(true);
      } else if (!shouldShow && this._girlLabelText.visible) {
        this._girlLabelText.setVisible(false);
      }
    }

    this.hideInteractionLabels();
  }

  private hideInteractionLabels(): void {
    [
      this._sistersLabelText,
      this._girlLabelText,
      this._paperLabelText,
      this._fanLabelText,
      this._standLabelText,
      this._bimoLabelText,
      this._pipaLabelText,
    ].forEach((label) => label?.setVisible(false));
  }

  private renderInteractionHint(target: string, clueIndex: number): void {
    this.interactHintGlyphContent.removeAll(true);

    const nushuTextureKeys = this.getInteractionHintNushuTextureKeys(target);

    if (!nushuTextureKeys) {
      this.interactHintGlyphContent.setVisible(false);
      this._hintText
        .setText(this.getInteractionHintText(target, clueIndex))
        .setOrigin(0.5)
        .setPosition(0, 0);
      return;
    }

    this._hintText
      .setText('E 交互 ·')
      .setOrigin(0, 0.5);

    const glyphGap = 2;
    const glyphTextGap = 14;
    const glyphHeight = 57.6;
    let glyphX = 0;

    nushuTextureKeys.forEach((sourceTextureKey) => {
      const textureKey = this.getDialogueGlyphTextureKey(sourceTextureKey);
      const renderTextureKey = this.textures.exists(textureKey)
        ? textureKey
        : sourceTextureKey;
      const sourceImage = this.textures.get(renderTextureKey).source[0]?.image;
      const sourceWidth =
        sourceImage && 'width' in sourceImage ? Number(sourceImage.width) : 52;
      const sourceHeight =
        sourceImage && 'height' in sourceImage
          ? Number(sourceImage.height)
          : 82;
      const glyphWidth = glyphHeight * (sourceWidth / sourceHeight);

      const glyph = this.add.image(glyphX, 0, renderTextureKey);
      glyph
        .setDisplaySize(glyphWidth, glyphHeight)
        .setOrigin(0, 0.5);
      this.interactHintGlyphContent.add(glyph);
      glyphX += glyphWidth + glyphGap;
    });

    const totalGlyphWidth = Math.max(glyphX - glyphGap, 1);
    const totalWidth =
      this._hintText.width + glyphTextGap + totalGlyphWidth;
    const startX = -totalWidth / 2;

    this._hintText.setPosition(startX, 0);
    this.interactHintGlyphContent
      .setPosition(startX + this._hintText.width + glyphTextGap, 0)
      .setVisible(true);
  }

  private getInteractionHintNushuTextureKeys(
    target: string,
  ): readonly string[] | undefined {
    if (!INTERACTION_HINT_NUSHU_TARGETS.has(target)) {
      return undefined;
    }

    const dictionaryPuzzle = GLOBAL_DICTIONARY_PUZZLES[target];
    return dictionaryPuzzle
      ? GLOBAL_PUZZLE_NUSHU_TEXTURE_KEYS[dictionaryPuzzle.activeEntryId]
      : undefined;
  }

  private getInteractionHintText(target: string, clueIndex: number): string {
    if (target.startsWith('clue_') && clueIndex >= 0) {
      return `E 交互 · ${SONG_CLUES[clueIndex].name}`;
    }

    if (target === 'npc_sisters') {
      return 'E 交互 · 围坐姐妹';
    }

    if (target === 'npc_girl') {
      return 'E 交互 · 唱扇女';
    }

    return 'E 交互';
  }

  // ==================== 交互处理 ====================

  private handleInteract(): void {
    if (!this.canInteract) return;

    this.markClueFound(this.currentTarget);
    this.interactHint.setVisible(false);

    if (this.currentTarget.startsWith('clue_')) {
      const clue = SONG_CLUES[this.currentClueIndex];
      if (clue) {
        if (clue.id === 'clue_paper') {
          this.startDialogue(SINGER_NPC_NAME, [...PAPER_DIALOGUE_LINES], () => {
            this.unlockEntriesForClue('clue_paper');
            this.showPendingNewGlyphToast('clue_paper');
            this.dictionaryBridge.unlockEntry('zhi');
            this.pendingDictionaryPuzzle = null;
          });
        } else if (clue.id === 'clue_fan') {
          this.startDialogue(SINGER_NPC_NAME, [...FAN_DIALOGUE_LINES], () => {
            this.unlockEntriesForClue('clue_fan');
            this.showPendingNewGlyphToast('clue_fan');
            this.dictionaryBridge.unlockEntry('geshan');
            this.pendingDictionaryPuzzle = null;
          });
        } else if (clue.id === 'clue_basket') {
          this.startDialogue(SINGER_NPC_NAME, [...BIMO_DIALOGUE_LINES], () => {
            this.unlockEntriesForClue('clue_basket');
            this.showPendingNewGlyphToast('clue_basket');
          });
        } else if (clue.id === 'clue_pipa') {
          this.startDialogue(SINGER_NPC_NAME, [...PIPA_DIALOGUE_LINES], () => {
            this.unlockEntriesForClue('clue_pipa');
            this.showPendingNewGlyphToast('clue_pipa');
          });
        } else {
          this.showCluePopup(clue.name, clue.displayText, clue.isFake ? [] : clue.entryIds);
        }
      }
    } else if (this.currentTarget === 'npc_sisters') {
      this.startDialogue('围坐姐妹', [...SISTERS_DIALOGUE_LINES]);
    } else if (this.currentTarget === 'npc_girl') {
      this.startGirlIntroDialogue();
    }
  }

  /** 标记线索已找到，更新进度 */
  private markClueFound(target: string): void {
    if (!this.foundClueIds.has(target)) {
      this.foundClueIds.add(target);
      this.dictSystem.discoverClue(target);
      this.clueFoundCount++;
      this.clueProgressText.setText(`线索 ${this.clueFoundCount}/${this.clueTotalCount}`);
      this.syncClueProgress();

      const dictionaryPuzzle = GLOBAL_DICTIONARY_PUZZLES[target];
      if (dictionaryPuzzle) {
        this.pendingDictionaryPuzzle = dictionaryPuzzle;
        this.pendingGlyphToastTargets.add(target);
      }
    }

    const standClue = SONG_CLUES.find((c) => c.id === 'clue_stand');
    if (standClue) {
      const standDist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        standClue.x,
        standClue.y,
      );
      this._standLabelText.setVisible(standDist < INTERACT_DISTANCE);
      this.hideInteractionLabels();
    }
  }

  private openGlobalDictionary(): void {
    const puzzle = this.pendingDictionaryPuzzle;
    if (!puzzle) {
      this.dictionaryBridge.openDictionary();
      return;
    }

    this.dictionaryBridge.openDictionary({
      puzzleId: puzzle.puzzleId,
      activeEntryId: puzzle.activeEntryId,
      contextSentence: puzzle.contextSentence,
      correctEntryId: puzzle.activeEntryId,
      onSuccess: () => this.handleGlobalDictionaryMatch(puzzle),
    });
  }

  private handleGlobalDictionaryMatch(
    puzzle: SingingDictionaryPuzzleConfig,
  ): void {
    if (!this.scene.isActive()) return;

    puzzle.localEntryIds.forEach((entryId) => {
      const entry = SONG_ENTRIES.find((candidate) => candidate.id === entryId);
      if (!entry) return;
      this.dictSystem.unlock({ ...entry });
      this.saveSystem.matchEntry(entry.id);
    });

    if (this.pendingDictionaryPuzzle?.puzzleId === puzzle.puzzleId) {
      this.pendingDictionaryPuzzle = null;
    }
    this.showToast('词条已写入三朝书词典');
    this.checkAllMatched();
  }

  // ==================== 线索弹窗 ====================

  private createPopup(): void {
    const cx = VIEW_WIDTH / 2;
    const cy = VIEW_HEIGHT / 2;
    this.popupContainer = this.add.container(0, 0).setDepth(90).setVisible(false).setScrollFactor(0);

    this.popupOverlay = this.add.rectangle(cx, cy, VIEW_WIDTH, VIEW_HEIGHT, 0x000000, 0.7);
    this.popupOverlay.setInteractive();
    this.popupContainer.add(this.popupOverlay);

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

    this.popupCloseBtn = this.add.text(cx + 500, cy - 370, '✕ 关闭 [Q / ESC]', {
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
    this.syncFreeExplorationState();
    this.scene.pause();
  }

  private closePopup(): void {
    this.popupOpen = false;
    this.popupContainer.setVisible(false);
    this.scene.resume();
    this.syncFreeExplorationState();
    if (this._pendingEntryIds.length > 0) {
      this._pendingEntryIds.forEach((id) => {
        const entry = SONG_ENTRIES.find((e) => e.id === id);
        if (entry) this.dictSystem.unlock({ ...entry });
      });
      this._pendingEntryIds = [];
    }
  }

  // ==================== 统一对话框（严格对齐 Scene 2 createDialogueBox）====================

  private showDialogueControls(): void {
    this.controlsHint
      .setText(DIALOGUE_CONTROLS_LABEL)
      .setDepth(95)
      .setVisible(true);
  }

  private showExplorationControls(): void {
    this.controlsHint
      .setText(EXPLORATION_CONTROLS_LABEL)
      .setDepth(60)
      .setVisible(false);
  }

  private createDialogueBox(): void {
    const { width, height } = this.scale.gameSize;

    // NPC 立绘（对齐 Scene 2 dialogueNpc）
    this.dialogueNpc = this.add
      .image(width / 2, height * 1.1, this.getDialogueNpcTextureKey())
      .setOrigin(0.5, 1)
      .setDepth(84)
      .setScrollFactor(0)
      .setVisible(false)
      .setAlpha(1);
    this.fitDialogueNpc();

    // 对话框背景图（对齐 Scene 2 dialogueBox）
    this.dialogueBox = this.add.image(0, 0, DIALOGUE_BOX_KEY);
    this.dialogueBox.setAlpha(0.8);
    this.dialogueBox.setDisplaySize(Math.min(width * 0.88, 1500), 300);
    this.dialogueBox
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (this.dialogueOpen) this.advanceDialogueLine();
      });

    // NPC 名称（对齐 Scene 2 dialogueName）
    this.dialogueName = this.add.text(-500, -40, '', {
      fontSize: '34px',
      color: '#f4ddbf',
      fontFamily: '"SimSun", "Microsoft YaHei", serif',
      letterSpacing: 6,
    });
    this.dialogueName.setOrigin(0.5);

    // before 文本（对齐 Scene 2 dialogueBefore）
    this.dialogueBefore = this.add.text(DIALOGUE_TEXT_X, DIALOGUE_TEXT_Y, '', {
      fontSize: '25px',
      color: '#f1f1ee',
      fontFamily: '"SimSun", "Microsoft YaHei", serif',
      wordWrap: { width: 750 },
      lineSpacing: 8,
    });
    this.dialogueBefore.setVisible(false);

    // prefix 文本（对齐 Scene 2 dialoguePrefix）
    this.dialoguePrefix = this.add.text(DIALOGUE_TEXT_X, DIALOGUE_TEXT_Y, '', {
      fontSize: '29px',
      color: '#f1f1ee',
      fontFamily: '"SimSun", "Microsoft YaHei", serif',
    });
    this.dialoguePrefix.setVisible(false);

    // 字形容器（对齐 Scene 2 dialogueGlyphContainer）
    this.dialogueGlyphContainer = this.add.container(0, 0);
    this.dialogueGlyphContainer
      .setSize(DIALOGUE_GLYPH_HEIGHT, DIALOGUE_GLYPH_HEIGHT)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (this.dialogueOpen) {
          this.advanceDialogueLine();
        }
      })
      .on('pointerover', () => this.dialogueGlyphContainer.setAlpha(0.78))
      .on('pointerout', () => this.dialogueGlyphContainer.setAlpha(1))
      .setVisible(false);

    // suffix 文本（对齐 Scene 2 dialogueSuffix）
    this.dialogueSuffix = this.add.text(DIALOGUE_TEXT_X, DIALOGUE_TEXT_Y, '', {
      fontSize: '29px',
      color: '#f1f1ee',
      fontFamily: '"SimSun", "Microsoft YaHei", serif',
    });
    this.dialogueSuffix.setVisible(false);

    // solved 文本（对齐 Scene 2 dialogueSolvedText）
    this.dialogueSolvedText = this.add.text(
      DIALOGUE_TEXT_X,
      DIALOGUE_TEXT_Y,
      '',
      {
        fontSize: '27px',
        color: '#f1f1ee',
        fontFamily: '"SimSun", "Microsoft YaHei", serif',
        wordWrap: { width: 790 },
        lineSpacing: 10,
      },
    );
    this.dialogueSolvedText.setVisible(false);

    // 对话文字行容器（对齐 Scene 2 dialogueLinesContainer）
    this.dialogueLinesContainer = this.add.container(0, 0);

    // 对话提示（对齐 Scene 2 dialogueHint）
    this.dialogueHint = this.add.text(
      520,
      92,
      '',
      {
        fontSize: '19px',
        color: '#d9b99b',
      },
    );
    this.dialogueHint.setOrigin(1, 0.5).setVisible(false);

    // 对话容器（对齐 Scene 2 dialogueContainer）
    this.dialogueContainer = this.add.container(
      width / 2,
      height - 175,
      [
        this.dialogueBox,
        this.dialogueName,
        this.dialogueBefore,
        this.dialoguePrefix,
        this.dialogueGlyphContainer,
        this.dialogueSuffix,
        this.dialogueSolvedText,
        this.dialogueLinesContainer,
        this.dialogueHint,
      ],
    );

    this.dialogueContainer
      .setDepth(85)
      .setScrollFactor(0)
      .setVisible(false);
  }

  /** NPC 立绘自适应（严格对齐 Scene 2 fitDialogueNpc） */
  private fitDialogueNpc(): void {
    if (!this.dialogueNpc) return;

    const { width, height } = this.scale.gameSize;
    const targetHeight = Math.min(height * 1.7, 1900);
    const targetWidth =
      targetHeight * (this.dialogueNpc.width / this.dialogueNpc.height);

    this.dialogueNpc
      .setPosition(width / 2, height * 1.8)
      .setDisplaySize(targetWidth, targetHeight);
  }

  /** 获取对话框 NPC 立绘纹理键（对齐 Scene 2 getDialogueNpcTextureKey） */
  private getDialogueNpcTextureKey(): string {
    const isSisters = this.dialogueSpeaker === '围坐姐妹';
    if (isSisters) {
      if (this.textures.exists(DIALOGUE_NPC_SISTERS_KEY)) return DIALOGUE_NPC_SISTERS_KEY;
      return 'sisters_img';
    }
    if (this.textures.exists(DIALOGUE_NPC_GIRL_KEY)) return DIALOGUE_NPC_GIRL_KEY;
    return 'nvshu_girl_img';
  }

  /** 聚焦 NPC 到对话框立绘（对齐 Scene 2 focusNpcForDialogue） */
  private focusNpcForDialogue(): void {
    // 根据当前说话者决定聚焦哪个 NPC
    const isSisters = this.dialogueSpeaker === '围坐姐妹';

    if (isSisters) {
      const npc = this.npcSprites[0];
      if (!npc) return;

      this._sistersTween?.pause();
      this.focusedNpc = npc as unknown as Phaser.GameObjects.Image;
      this.focusedNpcIsSprite = true;
      this.focusedNpcState = {
        x: npc.x,
        y: npc.y,
        displayWidth: npc.displayWidth,
        displayHeight: npc.displayHeight,
        depth: npc.depth,
        alpha: npc.alpha,
        visible: npc.visible,
      };
      npc.setVisible(false);
    } else {
      // 唱扇女或默认
      const npc = this._girlImg;
      if (!npc) return;

      this._girlTween?.pause();
      this.focusedNpc = npc;
      this.focusedNpcIsSprite = false;
      this.focusedNpcState = {
        x: npc.x,
        y: npc.y,
        displayWidth: npc.displayWidth,
        displayHeight: npc.displayHeight,
        depth: npc.depth,
        alpha: npc.alpha,
        visible: npc.visible,
      };
      npc.setVisible(false);
    }

    // 更新对话框立绘纹理并显示
    this.dialogueNpc.setTexture(this.getDialogueNpcTextureKey());
    this.fitDialogueNpc();
    this.dialogueNpc.setVisible(true);
  }

  /** 恢复 NPC 到世界位置（对齐 Scene 2 restoreNpcAfterDialogue） */
  private restoreNpcAfterDialogue(): void {
    if (!this.focusedNpc || !this.focusedNpcState) {
      this.dialogueNpc?.setVisible(false);
      return;
    }

    this.focusedNpc
      .setPosition(this.focusedNpcState.x, this.focusedNpcState.y)
      .setDisplaySize(
        this.focusedNpcState.displayWidth,
        this.focusedNpcState.displayHeight,
      )
      .setDepth(this.focusedNpcState.depth)
      .setAlpha(this.focusedNpcState.alpha)
      .setVisible(this.focusedNpcState.visible);

    this.dialogueNpc?.setVisible(false);

    // 恢复动画
    if (this.focusedNpcIsSprite) {
      this._sistersTween?.resume();
    } else {
      this._girlTween?.resume();
    }

    this.focusedNpc = undefined;
    this.focusedNpcState = undefined;
  }

  /** 清除对话字形（对齐 Scene 2 clearDialogueGlyphs） */
  private clearDialogueGlyphs(): void {
    this.dialogueGlyphContainer.removeAll(true);
    this.dialogueGlyphContainer
      .setSize(DIALOGUE_GLYPH_HEIGHT, DIALOGUE_GLYPH_HEIGHT)
      .setVisible(false);
  }

  /** 向容器添加字形（对齐 Scene 2 addDialogueGlyphsToContainer） */
  private addDialogueGlyphsToContainer(
    container: Phaser.GameObjects.Container,
    sourceTextureKeys: readonly string[],
    x: number,
    centerY: number,
  ): number {
    let glyphX = 0;
    sourceTextureKeys.forEach((sourceTextureKey) => {
      const textureKey = this.getDialogueGlyphTextureKey(sourceTextureKey);
      const renderTextureKey = this.textures.exists(textureKey)
        ? textureKey
        : sourceTextureKey;
      const glyph = this.add.image(glyphX, 0, renderTextureKey);
      const sourceImage = this.textures.get(renderTextureKey).source[0]?.image;
      const sourceWidth =
        sourceImage && 'width' in sourceImage ? Number(sourceImage.width) : 52;
      const sourceHeight =
        sourceImage && 'height' in sourceImage
          ? Number(sourceImage.height)
          : 82;
      const glyphWidth = DIALOGUE_GLYPH_HEIGHT * (sourceWidth / sourceHeight);

      glyph
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          if (this.dialogueOpen) this.advanceDialogueLine();
        })
        .setDisplaySize(glyphWidth, DIALOGUE_GLYPH_HEIGHT)
        .setOrigin(0, 0.5);
      glyph.setPosition(x + glyphX, centerY);
      container.add(glyph);
      glyphX += glyphWidth + DIALOGUE_GLYPH_GAP;
    });

    const totalWidth = Math.max(glyphX - DIALOGUE_GLYPH_GAP, 1);
    return totalWidth;
  }

  /** 获取对话字形纹理键列表（对齐 Scene 2 getDialogueGlyphTextureKeys） */
  private getDialogueGlyphTextureKeys(): readonly string[] {
    // Scene 5 不使用特定字形，返回空数组
    return [];
  }

  /** 获取对话字形纹理键（对齐 Scene 2 getDialogueGlyphTextureKey） */
  private getDialogueGlyphTextureKey(sourceKey: string): string {
    return sourceKey.startsWith('singing_nushu_')
      ? sourceKey.replace('singing_nushu_', 'singing_dialogue_')
      : `${sourceKey}_dialogue`;
  }

  private createDialogueGlyphTextures(): void {
    const textureKeys = new Set<string>([
      ...Object.values(GLOBAL_PUZZLE_NUSHU_TEXTURE_KEYS).flat(),
      ...Object.values(LOCAL_ENTRY_NUSHU_TEXTURE_KEYS).flat(),
    ]);

    textureKeys.forEach((textureKey) => {
      this.createDialogueGlyphTexture(
        this.getDialogueGlyphTextureKey(textureKey),
        textureKey,
      );
    });
  }

  private createDialogueGlyphTexture(
    targetKey: string,
    sourceKey: string,
  ): void {
    if (this.textures.exists(targetKey)) return;

    const source = this.textures.get(sourceKey).source[0]?.image;
    if (!source) return;

    const sourceImage = source as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = sourceImage.width;
    canvas.height = sourceImage.height;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.drawImage(sourceImage, 0, 0);
    const imageData = context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = -1;
    let maxY = -1;

    for (let index = 0; index < imageData.data.length; index += 4) {
      const red = imageData.data[index];
      const green = imageData.data[index + 1];
      const blue = imageData.data[index + 2];
      const alpha = imageData.data[index + 3];
      const pixelIndex = index / 4;
      const x = pixelIndex % canvas.width;
      const y = Math.floor(pixelIndex / canvas.width);

      if (alpha <= 10 || (red > 225 && green > 225 && blue > 225)) {
        imageData.data[index + 3] = 0;
      } else {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        imageData.data[index] = 244;
        imageData.data[index + 1] = 221;
        imageData.data[index + 2] = 191;
      }
    }

    context.putImageData(imageData, 0, 0);

    if (maxX < minX || maxY < minY) {
      this.textures.addCanvas(targetKey, canvas);
      return;
    }

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = maxX - minX + 1 + DIALOGUE_GLYPH_TEXTURE_PADDING * 2;
    croppedCanvas.height = maxY - minY + 1 + DIALOGUE_GLYPH_TEXTURE_PADDING * 2;
    const croppedContext = croppedCanvas.getContext('2d');
    if (!croppedContext) {
      this.textures.addCanvas(targetKey, canvas);
      return;
    }

    croppedContext.drawImage(
      canvas,
      minX,
      minY,
      maxX - minX + 1,
      maxY - minY + 1,
      DIALOGUE_GLYPH_TEXTURE_PADDING,
      DIALOGUE_GLYPH_TEXTURE_PADDING,
      maxX - minX + 1,
      maxY - minY + 1,
    );
    this.textures.addCanvas(targetKey, croppedCanvas);
  }

  /** 创建对话行文本（对齐 Scene 2 createDialogueLineText） */
  private createDialogueLineText(
    text: string,
    x: number,
    y: number,
    wrap = false,
  ): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      fontSize: `${DIALOGUE_FONT_SIZE}px`,
      color: '#f1f1ee',
      fontFamily: '"SimSun", "Microsoft YaHei", serif',
      wordWrap: wrap ? { width: DIALOGUE_TEXT_WIDTH } : undefined,
      lineSpacing: wrap ? DIALOGUE_LINE_HEIGHT - DIALOGUE_FONT_SIZE : 0,
    });
  }

  /**
   * 渲染可见对话行。
   * 使用动态累计高度定位各行，替代固定 lineIndex * DIALOGUE_LINE_HEIGHT，
   * 确保长文本自动换行后各行不会重叠。
   * 同时根据实际内容高度动态调整对话框背景尺寸，防止文字超出边框。
   */
  private renderVisibleDialogueLines(lines: readonly string[]): void {
    this.dialogueLinesContainer.removeAll(true);

    let currentY = DIALOGUE_TEXT_Y;

    lines.forEach((line) => {
      const lineContainer = this.add.container(DIALOGUE_TEXT_X, currentY);
      const [prefix, suffix] = line.split(NUSHU_TOKEN);

      if (suffix === undefined) {
        const text = this.createDialogueLineText(line, 0, 0, true);
        const wrappedLineCount = Math.max(
          1,
          Math.ceil(text.height / DIALOGUE_LINE_HEIGHT),
        );
        const lineBoxHeight = wrappedLineCount * DIALOGUE_LINE_HEIGHT;
        text.setY(Math.max(0, (lineBoxHeight - text.height) / 2));
        lineContainer.add(text);
        currentY += lineBoxHeight;
      } else {
        const prefixText = this.createDialogueLineText(prefix, 0, 0);
        prefixText.setY(Math.max(0, (DIALOGUE_LINE_HEIGHT - prefixText.height) / 2));
        lineContainer.add(prefixText);
        const glyphCenterY = DIALOGUE_LINE_HEIGHT / 2;
        const glyphWidth = this.addDialogueGlyphsToContainer(
          lineContainer,
          this.getDialogueGlyphTextureKeys(),
          prefixText.width + 10,
          glyphCenterY,
        );
        const suffixText = this.createDialogueLineText(
          suffix,
          prefixText.width + glyphWidth + 22,
          0,
        );
        suffixText.setY(Math.max(0, (DIALOGUE_LINE_HEIGHT - suffixText.height) / 2));
        lineContainer.add(suffixText);
        currentY += DIALOGUE_LINE_HEIGHT;
      }

      this.dialogueLinesContainer.add(lineContainer);
    });

    // 动态调整对话框背景高度，防止文字超出边框
    const contentHeight = currentY - DIALOGUE_TEXT_Y;
    const boxPadding = 120; // 上下留白之和
    const newBoxHeight = Math.max(300, contentHeight + boxPadding);
    this.dialogueBox.setDisplaySize(
      Math.min(this.scale.gameSize.width * 0.88, 1500),
      newBoxHeight,
    );
    // 提示文字跟随对话框底部
    this.dialogueHint.setPosition(520, newBoxHeight / 2 - 58);
  }

  // ==================== 推测面板 ====================

  private createGuessPanel(): void {
    const cx = VIEW_WIDTH / 2;
    const cy = VIEW_HEIGHT / 2;
    this.guessContainer = this.add.container(0, 0).setDepth(95).setVisible(false).setScrollFactor(0);

    this.guessOverlay = this.add.rectangle(cx, cy, VIEW_WIDTH, VIEW_HEIGHT, 0x000000, 0.75);
    this.guessOverlay.setInteractive();
    this.guessContainer.add(this.guessOverlay);

    const bg = this.add.rectangle(cx, cy, 1000, 700, 0x2a1f14, 0.95);
    bg.setStrokeStyle(4, 0xc8a96e);
    this.guessContainer.add(bg);

    this.guessContainer.add(this.add.text(cx, cy - 300, '🔍 推测句子含义', {
      fontSize: '44px', color: '#e8d5b7', fontFamily: 'serif',
    }).setOrigin(0.5));

    this.guessContainer.add(this.add.text(cx, cy - 220, '你已经解锁了所有词条，请推测这句话的含义：', {
      fontSize: '28px', color: '#a89984', fontFamily: 'serif',
    }).setOrigin(0.5));

    const slotCount = FINAL_SENTENCE_IDS.length;
    for (let i = 0; i < slotCount; i++) {
      const totalWidth = (slotCount - 1) * 180;
      const sx = cx - totalWidth / 2 + i * 180;
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

    const cancelBtn = this.add.text(cx - 360, cy + 280, '✕ 取消 [Q / ESC]', {
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
    this.guessEntryIds = new Array(FINAL_SENTENCE_IDS.length).fill(null);
    this.guessSelectedIndex = 0;
    this.guessSlots.forEach((s) => { s.setText('?'); s.setColor('#666'); });
    this.refreshGuessButtons();
    this.guessOpen = true;
    this.guessContainer.setVisible(true);
    this.syncFreeExplorationState();
    this.scene.pause();
  }

  private refreshGuessButtons(): void {
    this.guessContainer.each((child: Phaser.GameObjects.GameObject) => {
      if (child.getData && child.getData('availBtn') === true) child.destroy();
    });

    const cx = VIEW_WIDTH / 2 - this.guessContainer.x;
    const cy = VIEW_HEIGHT / 2 - this.guessContainer.y;
    const startX = cx - (this.guessAvailable.length * 90) / 2;

    this.guessAvailable.forEach((entry, i) => {
      const btn = this.add.text(startX + i * 100, cy + 180, entry.char, {
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
    for (let i = 0; i < FINAL_SENTENCE_IDS.length; i++) {
      if (this.guessEntryIds[i] === null) { this.guessSelectedIndex = i; return; }
    }
    this.guessSelectedIndex = 0;
  }

  private confirmGuess(): void {
    const ids = this.guessEntryIds.filter((id): id is string => id !== null);
    if (ids.length < FINAL_SENTENCE_IDS.length) return;
    if (this.guessOnConfirm) this.guessOnConfirm(ids);
    this.closeGuessPanel();
  }

  private closeGuessPanel(): void {
    this.guessOpen = false;
    this.guessContainer.setVisible(false);
    this.scene.resume();
    this.syncFreeExplorationState();
  }

  // ==================== 统一对话系统（严格对齐 Scene 2）====================

  /** 开始对话（严格对齐 Scene 2 startIntroDialogue） */
  private startDialogue(name: string, lines: string[], onComplete?: () => void): void {
    this.dialogueOpen = true;
    this.syncFreeExplorationState();
    this.dialogueLines = lines;
    this.dialogueLineIndex = 0;
    this.dialogueSpeaker = name;
    this.dialogueOnComplete = onComplete ?? null;

    this.player.setVelocity(0, 0);
    this.interactHint.setVisible(false);
    this.showDialogueControls();

    // 聚焦 NPC 到对话框（对齐 Scene 2）
    this.dialogueName.setText(name);
    this.focusNpcForDialogue();
    this.dialogueContainer.setVisible(true);
    this.renderDialogueLine();
  }

  /** 推进到下一行（对齐 Scene 2 advanceNpcDialogueLine） */
  private advanceDialogueLine(): void {
    if (!this.dialogueOpen) return;
    this.dialogueLineIndex++;
    this.renderDialogueLine();
  }

  /** 渲染当前对话行（严格对齐 Scene 2 renderNpcDialogueLine） */
  private renderDialogueLine(): void {
    if (this.dialogueLineIndex >= this.dialogueLines.length) {
      this.finishDialogue();
      return;
    }

    const visibleLines = this.dialogueLines.slice(0, this.dialogueLineIndex + 1);
    this.dialogueBefore.setVisible(false);
    this.dialoguePrefix.setVisible(false);
    this.dialogueSuffix.setVisible(false);
    this.dialogueSolvedText.setVisible(false);
    this.clearDialogueGlyphs();
    this.renderVisibleDialogueLines(visibleLines);

    this.controlsHint.setText(DIALOGUE_CONTROLS_LABEL);
  }

  /** 关闭对话（按 Q / ESC 中断，不触发 onComplete）（对齐 Scene 2 closeDialogue） */
  private closeDialogue(): void {
    this.dialogueOpen = false;
    this.dialogueLines = [];
    this.dialogueLineIndex = 0;
    this.dialogueSpeaker = '';
    this.dialogueOnComplete = null;
    this.dialogueContainer.setVisible(false);
    this.restoreNpcAfterDialogue();

    if (this.girlIntroDialogueState === 'playing') {
      this.finishGirlIntroDialogue();
    } else {
      this.showExplorationControls();
    }
    this.syncFreeExplorationState();
  }

  /** 完成对话（所有行已显示完毕，触发 onComplete 回调）（对齐 Scene 2） */
  private finishDialogue(): void {
    const onComplete = this.dialogueOnComplete;
    this.dialogueOpen = false;
    this.dialogueLines = [];
    this.dialogueLineIndex = 0;
    this.dialogueSpeaker = '';
    this.dialogueOnComplete = null;
    this.dialogueContainer.setVisible(false);
    this.restoreNpcAfterDialogue();
    this.showExplorationControls();
    if (onComplete) onComplete();

    if (this.girlIntroDialogueState === 'playing') {
      this.finishGirlIntroDialogue();
    }
    this.syncFreeExplorationState();
  }

  // ==================== 唱扇女介绍对话（对齐 Scene 2）====================

  /** 初始化唱扇女介绍对话（对齐 Scene 2 initializeIntroDialogue） */
  private initializeGirlIntroDialogue(): void {
    if (this.saveSystem.isSceneCompleted(SINGING_GIRL_INTRO_SEEN_FLAG)) {
      this.girlIntroDialogueState = 'complete';
      this.showExplorationControls();
      return;
    }
    this.startGirlIntroDialogue();
  }

  /** 开始唱扇女介绍对话（对齐原 MainScene openGirlPreview，每次点击均可触发） */
  private startGirlIntroDialogue(): void {
    if (this.girlIntroDialogueState === 'playing') return;
    this.girlIntroDialogueState = 'playing';
    this.startDialogue(SINGER_NPC_NAME, [...SINGER_INTRO_DIALOGUE_LINES]);
  }

  /** 完成唱扇女介绍对话（对齐 Scene 2 finishIntroDialogue） */
  private finishGirlIntroDialogue(): void {
    if (this.girlIntroDialogueState === 'complete') return;
    this.girlIntroDialogueState = 'complete';
    this.saveSystem.markSceneCompleted(SINGING_GIRL_INTRO_SEEN_FLAG);

    this.markClueFound(SINGER_NPC_ID);
    this.showPendingNewGlyphToast('npc_girl');
    this.dictionaryBridge.unlockEntry('yuanxing');
    this.pendingDictionaryPuzzle = null;
    this.showExplorationControls();
  }

  /** 解锁"声"词条 */
  private unlockSistersEntry(): boolean {
    const entry = SONG_ENTRIES.find((e) => e.id === 'song_sheng');
    if (entry && !this.saveSystem.getEntry('song_sheng')?.unlocked) {
      this.dictSystem.unlock({ ...entry });
      return true;
    }
    return false;
  }

  /**
   * 根据线索 ID 直接解锁其关联的所有词条。
   * 参照 unlockSistersEntry 模式，在对话/交互完成 onComplete 中调用，
   * 无需依赖用户手动按 Tab 进全局词典完成拼图。
   */
  private unlockEntriesForClue(clueId: string): boolean {
    const clue = SONG_CLUES.find((c) => c.id === clueId);
    if (!clue || !clue.unlockEntryIds?.length) return false;

    let anyUnlocked = false;
    clue.unlockEntryIds.forEach((entryId) => {
      const entry = SONG_ENTRIES.find((e) => e.id === entryId);
      if (!entry) return;
      if (!this.saveSystem.getEntry(entryId)?.unlocked) {
        this.dictSystem.unlock({ ...entry });
        anyUnlocked = true;
      }
      // 始终标记为已匹配（支持从保存恢复的场景）
      this.saveSystem.matchEntry(entryId);
    });

    if (anyUnlocked) {
      this.showToast('词条已写入三朝书词典');
    }
    this.checkAllMatched();
    return anyUnlocked;
  }

  // ==================== 完成检测 ====================

  private checkAllMatched(): void {
    const allIds = SONG_ENTRIES.map((e) => e.id);
    if (this.dictSystem.areAllMatched(allIds)) {
      const matched = this.dictSystem.getMatched('singingHall');
      const available = matched.map((e) => ({ id: e.id, char: e.nvshuChar }));
      this.time.delayedCall(500, () => this.showGuessIfNeeded(available));
    }
  }

  private showGuessIfNeeded(available: { id: string; char: string }[]): void {
    if (this.dictSystem.isSceneComplete('singingHall')) return;
    this.showGuessPanel(available, (ids: string[]) => {
      if (this.dictSystem.verifySentence(ids, FINAL_SENTENCE_IDS)) {
        this.dictSystem.completeScene('singingHall');
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
    this.syncFreeExplorationState();
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
    this.dictionaryButtonLabel?.setVisible(false);
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
    this.syncFreeExplorationState();

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

  private showPendingNewGlyphToast(target: string): void {
    if (!this.pendingGlyphToastTargets.delete(target)) return;

    const puzzle = GLOBAL_DICTIONARY_PUZZLES[target];
    const textureKeys = puzzle
      ? GLOBAL_PUZZLE_NUSHU_TEXTURE_KEYS[puzzle.activeEntryId]
      : undefined;
    if (textureKeys?.length) this.showNewGlyphToast(textureKeys);
  }

  private showPendingLocalGlyphToast(entryId: string): void {
    if (!this.pendingLocalGlyphToastEntryIds.delete(entryId)) return;

    const textureKeys = LOCAL_ENTRY_NUSHU_TEXTURE_KEYS[entryId];
    if (textureKeys?.length) this.showNewGlyphToast(textureKeys);
  }

  private showNewGlyphToast(nushuTextureKeys: readonly string[]): void {
    this.dictionaryBridge.showGlyphToast?.({
      nushuImages: nushuTextureKeys.map((textureKey) =>
        `/assets/nushu/${textureKey.replace('singing_nushu_', '')}.png`,
      ),
    });
  }

  private showToast(text: string): void {
    const textObj = this.add.text(0, 0, text, {
      fontSize: '26px',
      color: '#f7e8ca',
      fontFamily: '"SimSun", "Microsoft YaHei", serif',
    }).setOrigin(0.5).setDepth(150);

    const bgWidth = textObj.width + TOAST_PADDING_X * 2;
    const bgHeight = TOAST_HEIGHT;

    const background = this.add.rectangle(
      0,
      0,
      bgWidth,
      bgHeight,
      0x5d2722,
      0.94,
    ).setDepth(149);

    const toast = this.add.container(VIEW_WIDTH / 2, 100, [
      background,
      textObj,
    ]).setDepth(150).setScrollFactor(0);

    this.tweens.add({
      targets: toast, alpha: 0, y: 76, duration: 2000, delay: 1000,
      onComplete: () => toast.destroy(),
    });
  }

  // ==================== 清理 ====================

  shutdown(): void {
    this.dictionaryBridge?.setFreeExplorationActive?.(false);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleViewportResize, this);
    if (this.bgmVolumeHandler) {
      window.removeEventListener(BGM_VOLUME_CHANGE_EVENT, this.bgmVolumeHandler);
      this.bgmVolumeHandler = null;
    }
    this.sound.stopAll();
  }

  setGlobalDictionaryOpen(isOpen: boolean): void {
    this.isGlobalDictionaryOpen = isOpen;
    if (isOpen) this.player?.setVelocity(0, 0);
    this.syncFreeExplorationState();
  }

  private syncClueProgress(): void {
    this.dictionaryBridge?.setClueProgress?.({
      found: this.clueFoundCount,
      total: this.clueTotalCount,
    });
  }

  private syncFreeExplorationState(): void {
    const active =
      !this.isGlobalDictionaryOpen &&
      !this.completionMode &&
      !this.popupOpen &&
      !this.dialogueOpen &&
      !this.guessOpen;

    if (active === this.lastFreeExplorationActive) return;
    this.lastFreeExplorationActive = active;
    this.dictionaryBridge?.setFreeExplorationActive?.(active);
  }
}
