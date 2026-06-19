import Phaser from 'phaser'
import { SaveSystem } from '../../../game/systems'
import { finalYanPuzzle, npcConfig } from '../embroideryRoomData'
import type { EmbroideryDictionaryBridge } from './EmbroideryDictionaryBridge'
import { getBgmVolume, BGM_VOLUME_CHANGE_EVENT } from '../../../utils/audioSettings'
import {
  EMBROIDERY_ENTRIES,
  EMBROIDERY_FINAL_YAN_UNLOCK,
  EMBROIDERY_INTERACTIONS,
  EMBROIDERY_INTERACT_DISTANCE,
  EMBROIDERY_NUSHU_ASSETS,
  EMBROIDERY_PLAYER_SPEED,
  EMBROIDERY_SCENE_ID,
  EMBROIDERY_WORLD_HEIGHT,
  EMBROIDERY_WORLD_WIDTH,
  type EmbroideryInteraction,
  type EmbroideryPreviewPhase,
} from './EmbroideryData'

export const EMBROIDERY_ROOM_SCENE_KEY = 'EmbroideryRoomScene'

const BACKGROUND_KEY = 'embroidery_background'
const BACKGROUND_PATH = '/assets/scenes/embroidery-room/background.png'
const BGM_KEY = 'embroidery_bgm'
const BGM_PATH = '/audio/bgm.mp3'
const DIALOGUE_BOX_KEY = 'embroidery_dialogue_box'
const DIALOGUE_BOX_PATH = '/assets/ui/dialogue-box.png'
const DIALOGUE_NPC_KEY = 'embroidery_dialogue_npc'
const DICTIONARY_ICON_KEY = 'open_book_icon'
const NUSHU_TOKEN = '{{nushu}}'
const EXPLORATION_CONTROLS_LABEL =
  'WASD 移动 | E 交互 | Tab 词典'
const DIALOGUE_CONTROLS_LABEL = 'E / 点击继续 | Q / ESC 返回'
const DIALOGUE_TEXT_X = -390
const DIALOGUE_TEXT_Y = -59
const DIALOGUE_TEXT_WIDTH = 790
const DIALOGUE_LINE_HEIGHT = 48
const DIALOGUE_GLYPH_HEIGHT = 36
const DIALOGUE_GLYPH_GAP = 3
const TOAST_GLYPH_HEIGHT = 65
const TOAST_GLYPH_GAP = 3
const TOAST_PADDING_X = 20
const TOAST_HEIGHT = 66
const CULTURE_PREVIEW_TEXT_WIDTH = 620
const CULTURE_PREVIEW_GAP = 48
const CULTURE_PREVIEW_IMAGE_LAYOUT_WIDTH_RATIO = 0.56
const CULTURE_PREVIEW_MAX_IMAGE_WIDTH_RATIO = 0.52
const CULTURE_PREVIEW_MAX_IMAGE_HEIGHT_RATIO = 0.72
const CULTURE_PREVIEW_IMAGE_OFFSET_X = -90
const CULTURE_PREVIEW_IMAGE_OFFSET_Y = 0
const CULTURE_PREVIEW_TITLE_BODY_GAP = 42
const PLAYER_START_POSITION = { x: 400, y: 400 } as const
const EMBROIDERY_INTRO_SEEN_FLAG = 'embroideryIntroSeen'
const EMBROIDERY_ROOM_COMPLETION_FLAG = 'embroideryRoomCompleted'
const EMBROIDERY_YAN_RESOLVED_FLAG = 'embroideryYanResolved'
const PRE_FINAL_CLUE_IDS = [
  'embroidery_handkerchief',
  'embroidery_sewing_basket',
  'embroidery_lamp',
  'embroidery_red_makeup',
  'embroidery_needlework',
] as const
const FINAL_YAN_CLUE_ID = 'embroidery_final_yan'
const MAIN_CLUE_IDS = [
  ...PRE_FINAL_CLUE_IDS,
  FINAL_YAN_CLUE_ID,
] as const
const NUSHU_INTERACTION_LABEL_IDS = new Set([
  'embroidery_lamp',
  'embroidery_red_makeup',
  'embroidery_sewing_basket',
])
const INTRO_DIALOGUE_LINES = [
  '这屋里的东西，都是要被带走的。',
  '帕子、针线、灯下写过的话，都不是摆设。',
  '你若想读懂那本三朝书，就先看看她留下了什么。',
] as const
const SUMMARY_DIALOGUE_LINES = [
  '你看，帕子小，能带在身上。',
  '话说不完，就写下来。',
  '人要离家，字就替她留下。',
] as const

type IntroDialogueState = 'pending' | 'playing' | 'complete'
type NpcDialogueMode =
  | 'none'
  | 'intro'
  | 'interaction'
  | 'final-yan'
  | 'summary'

export class EmbroideryRoomPhaserScene extends Phaser.Scene {
  private saveSystem!: SaveSystem
  private dictionaryBridge!: EmbroideryDictionaryBridge
  private isGlobalDictionaryOpen = false
  private lastFreeExplorationActive?: boolean
  private bgmVolumeHandler: (() => void) | null = null

  private player!: Phaser.Physics.Arcade.Sprite
  private keyW!: Phaser.Input.Keyboard.Key
  private keyA!: Phaser.Input.Keyboard.Key
  private keyS!: Phaser.Input.Keyboard.Key
  private keyD!: Phaser.Input.Keyboard.Key
  private keyE!: Phaser.Input.Keyboard.Key
  private keyQ!: Phaser.Input.Keyboard.Key
  private keyEsc!: Phaser.Input.Keyboard.Key
  private keyTab!: Phaser.Input.Keyboard.Key

  private interactionSprites = new Map<string, Phaser.GameObjects.Image>()
  private interactionLabels = new Map<string, Phaser.GameObjects.Container>()
  private interactionBaseScales = new Map<
    string,
    { scaleX: number; scaleY: number }
  >()
  private interactionTweens = new Map<string, Phaser.Tweens.Tween>()
  private nearestInteraction: EmbroideryInteraction | null = null

  private interactHint!: Phaser.GameObjects.Container
  private interactHintText!: Phaser.GameObjects.Text
  private interactHintGlyphContent!: Phaser.GameObjects.Container
  private renderedInteractHintId?: string
  private clueProgressText!: Phaser.GameObjects.Text
  private controlsText!: Phaser.GameObjects.Text
  private dictionaryButton!: Phaser.GameObjects.Image
  private dictionaryButtonLabel!: Phaser.GameObjects.Text
  private toastText!: Phaser.GameObjects.Text
  private toastGlyphContainer!: Phaser.GameObjects.Container
  private toastGlyphBackground!: Phaser.GameObjects.Rectangle
  private toastGlyphContent!: Phaser.GameObjects.Container
  private toastHideEvent?: Phaser.Time.TimerEvent

  private previewContainer!: Phaser.GameObjects.Container
  private previewOverlay!: Phaser.GameObjects.Rectangle
  private previewPanel!: Phaser.GameObjects.Rectangle
  private previewImage!: Phaser.GameObjects.Image
  private previewTitle!: Phaser.GameObjects.Text
  private previewPhaseText!: Phaser.GameObjects.Text
  private previewBody!: Phaser.GameObjects.Text
  private previewGlyphContainer!: Phaser.GameObjects.Container
  private previewHint!: Phaser.GameObjects.Text
  private activePreview: EmbroideryInteraction | null = null
  private previewPhase = 0
  private culturePreviewTextVisible = false

  private dialogueContainer!: Phaser.GameObjects.Container
  private dialogueNpc!: Phaser.GameObjects.Image
  private dialogueBox!: Phaser.GameObjects.Image
  private dialogueName!: Phaser.GameObjects.Text
  private dialogueBefore!: Phaser.GameObjects.Text
  private dialoguePrefix!: Phaser.GameObjects.Text
  private dialogueSuffix!: Phaser.GameObjects.Text
  private dialogueSolvedText!: Phaser.GameObjects.Text
  private dialogueGlyphContainer!: Phaser.GameObjects.Container
  private dialogueLinesContainer!: Phaser.GameObjects.Container
  private dialogueHint!: Phaser.GameObjects.Text
  private dialogueOpen = false
  private npcDialogueMode: NpcDialogueMode = 'none'
  private npcDialogueLineIndex = 0
  private finalYanUnlocked = false
  private finalYanPromptShown = false
  private finalYanPromptQueued = false
  private introDialogueState: IntroDialogueState = 'pending'
  private focusedNpc?: Phaser.GameObjects.Image
  private focusedNpcState?: {
    x: number
    y: number
    displayWidth: number
    displayHeight: number
    depth: number
    alpha: number
    visible: boolean
  }

  constructor() {
    super({ key: EMBROIDERY_ROOM_SCENE_KEY })
  }

  preload(): void {
    this.load.image(BACKGROUND_KEY, BACKGROUND_PATH)
    this.load.audio(BGM_KEY, BGM_PATH)
    this.load.image(DIALOGUE_BOX_KEY, DIALOGUE_BOX_PATH)
    this.load.image(DIALOGUE_NPC_KEY, npcConfig.dialogueImage)

    EMBROIDERY_INTERACTIONS.forEach((interaction) => {
      this.load.image(interaction.textureKey, interaction.imagePath)
    })

    EMBROIDERY_NUSHU_ASSETS.forEach(([key, path]) => {
      this.load.image(key, path)
    })
  }

  create(): void {
    this.introDialogueState = 'pending'

    // 移除旧 BGM 避免场景重启时无法播放
    const existingBgm = this.sound.get(BGM_KEY)
    if (existingBgm) existingBgm.destroy()
    const initialVol = getBgmVolume()
    this.sound.add(BGM_KEY, { loop: true, volume: initialVol, mute: initialVol === 0 }).play()

    // 实时响应设置面板的音量变更
    this.bgmVolumeHandler = () => {
      const bgm = this.sound.get(BGM_KEY)
      if (bgm) {
        const vol = getBgmVolume()
        bgm.setVolume(vol)
        bgm.setMute(vol === 0)
      }
    }
    window.addEventListener(BGM_VOLUME_CHANGE_EVENT, this.bgmVolumeHandler)

    this.createCombinedNushuTexture('embroidery_nushu_hongzhuang', [
      'embroidery_nushu_hong',
      'embroidery_nushu_zhuang',
    ])
    this.createCombinedNushuTexture('embroidery_nushu_nugong', [
      'embroidery_nushu_nv',
      'embroidery_nushu_hong',
    ])
    EMBROIDERY_NUSHU_ASSETS.forEach(([textureKey]) => {
      this.createDialogueGlyphTexture(
        this.getDialogueGlyphTextureKey(textureKey),
        textureKey,
      )
    })

    this.physics.world.setBounds(
      0,
      0,
      EMBROIDERY_WORLD_WIDTH,
      EMBROIDERY_WORLD_HEIGHT,
    )

    const background = this.add.image(
      EMBROIDERY_WORLD_WIDTH / 2,
      EMBROIDERY_WORLD_HEIGHT / 2,
      BACKGROUND_KEY,
    )
    background.setDisplaySize(EMBROIDERY_WORLD_WIDTH, EMBROIDERY_WORLD_HEIGHT)
    background.setDepth(0)

    this.saveSystem = new SaveSystem()
    this.saveSystem.registerEntries(EMBROIDERY_SCENE_ID, EMBROIDERY_ENTRIES)
    this.dictionaryBridge = this.registry.get(
      'globalDictionaryBridge',
    ) as EmbroideryDictionaryBridge
    this.finalYanUnlocked = this.arePreFinalCluesDiscovered()
    this.finalYanPromptShown = false
    this.finalYanPromptQueued = false

    this.createInteractionObjects()
    this.createPlayer()
    this.createHud()
    this.createPreviewPanel()
    this.createDialogueBox()

    this.bindKeys()
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this)
    this.initializeIntroDialogue()
  }

  update(): void {
    this.refreshFinalYanUnlock()
    this.syncFreeExplorationState()

    // Tab 键切换词典开关（必须在 isGlobalDictionaryOpen 守卫之前处理）
    if (Phaser.Input.Keyboard.JustDown(this.keyTab)) {
      if (this.isGlobalDictionaryOpen) {
        this.dictionaryBridge.closeDictionary()
      } else if (!this.dialogueOpen) {
        this.openGlobalDictionary()
      }
      return
    }

    if (this.isGlobalDictionaryOpen) {
      this.player.setVelocity(0, 0)
      return
    }

    if (this.dialogueOpen) {
      this.player.setVelocity(0, 0)
      if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
        this.advanceNpcDialogueLine()
      } else if (
        Phaser.Input.Keyboard.JustDown(this.keyQ) ||
        Phaser.Input.Keyboard.JustDown(this.keyEsc)
      ) {
        this.closeDialogue()
      }
      return
    }

    if (this.activePreview) {
      this.player.setVelocity(0, 0)

      if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
        this.advancePreview()
      } else if (
        Phaser.Input.Keyboard.JustDown(this.keyQ) ||
        Phaser.Input.Keyboard.JustDown(this.keyEsc)
      ) {
        this.closePreview()
      }
      return
    }

    let velocityX = 0
    let velocityY = 0

    if (this.keyA.isDown) {
      velocityX -= EMBROIDERY_PLAYER_SPEED
    }
    if (this.keyD.isDown) {
      velocityX += EMBROIDERY_PLAYER_SPEED
    }
    if (this.keyW.isDown) {
      velocityY -= EMBROIDERY_PLAYER_SPEED
    }
    if (this.keyS.isDown) {
      velocityY += EMBROIDERY_PLAYER_SPEED
    }
    this.player.setVelocity(velocityX, velocityY)

    this.updateNearestInteraction()

    if (
      this.nearestInteraction &&
      Phaser.Input.Keyboard.JustDown(this.keyE)
    ) {
      this.openPreview(this.nearestInteraction)
      this.syncFreeExplorationState()
    }
  }

  private createInteractionObjects(): void {
    EMBROIDERY_INTERACTIONS.forEach((interaction) => {
      const image = this.add.image(
        interaction.x,
        interaction.y,
        interaction.textureKey,
      )
      image.setDisplaySize(
        interaction.displayWidth,
        interaction.displayWidth * (image.height / image.width),
      )
      image.setDepth(interaction.category === 'npc' ? 8 : 5)
      image.setBlendMode(Phaser.BlendModes.MULTIPLY)
      image.setAlpha(1.0)
      this.interactionSprites.set(interaction.id, image)
      this.interactionBaseScales.set(interaction.id, {
        scaleX: image.scaleX,
        scaleY: image.scaleY,
      })
      this.interactionTweens.set(
        interaction.id,
        this.tweens.add({
          targets: image,
          y: interaction.y - (interaction.category === 'npc' ? 5 : 8),
          duration: interaction.category === 'npc' ? 1200 : 1000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        }),
      )

      const label = this.createInteractionLabel(
        interaction,
        interaction.y + image.displayHeight / 2 - 16,
      )
      label.setVisible(false)
      this.interactionLabels.set(interaction.id, label)
    })
  }

  private createInteractionLabel(
    interaction: EmbroideryInteraction,
    y: number,
  ): Phaser.GameObjects.Container {
    if (
      NUSHU_INTERACTION_LABEL_IDS.has(interaction.id) &&
      interaction.unlock
    ) {
      return this.createNushuInteractionLabel(
        interaction.x,
        y,
        interaction.unlock.nushuTextureKeys,
      )
    }

    const text = this.add.text(0, 0, interaction.title, {
      fontSize: '28px',
      color: '#6f2926',
      fontFamily: '"SimSun", "Microsoft YaHei", serif',
    })
    text.setOrigin(0.5)

    const background = this.add.rectangle(
      0,
      0,
      text.width + 24,
      text.height + 12,
      0xf4e2bf,
      0.88,
    )
    background.setStrokeStyle(1, 0x9b5a38, 0.36)

    const label = this.add.container(interaction.x, y, [background, text])
    label.setDepth(9)
    return label
  }

  private createNushuInteractionLabel(
    x: number,
    y: number,
    textureKeys: readonly string[],
  ): Phaser.GameObjects.Container {
    const glyphHeight = 63
    const glyphWidth = textureKeys.length > 1 ? 42 : 48
    const gap = textureKeys.length > 1 ? -10 : 0
    const contentWidth =
      textureKeys.length * glyphWidth +
      Math.max(0, textureKeys.length - 1) * gap
    const background = this.add.rectangle(
      0,
      0,
      68,
      58,
      0xf4e2bf,
      0.9,
    )
    background.setStrokeStyle(1, 0x9b5a38, 0.38)

    const label = this.add.container(x, y, [background])
    const startX = -contentWidth / 2 + glyphWidth / 2

    textureKeys.forEach((textureKey, index) => {
      const glyph = this.add.image(
        startX + index * (glyphWidth + gap),
        0,
        textureKey,
      )
      glyph.setDisplaySize(glyphWidth, glyphHeight)
      glyph.setBlendMode(Phaser.BlendModes.MULTIPLY)
      label.add(glyph)
    })

    label.setDepth(9)
    return label
  }

  private setIntroInteractionVisibility(visible: boolean): void {
    this.player?.setVisible(visible)

    EMBROIDERY_INTERACTIONS.forEach((interaction) => {
      if (interaction.category !== 'npc') {
        this.interactionSprites.get(interaction.id)?.setVisible(visible)
      }

      this.interactionLabels.get(interaction.id)?.setVisible(false)
    })

    if (!visible) {
      this.interactHint?.setVisible(false)
    }
  }

  private createPlayer(): void {
    this.player = this.physics.add.sprite(
      PLAYER_START_POSITION.x,
      PLAYER_START_POSITION.y,
      'player',
    )
    this.player.setTint(0x7a3020)
    this.player.setDepth(20)
    this.player.setCollideWorldBounds(true)
    this.player.body?.setSize(28, 28)

    const camera = this.cameras.main
    camera.setBounds(
      0,
      0,
      EMBROIDERY_WORLD_WIDTH,
      EMBROIDERY_WORLD_HEIGHT,
    )
    camera.startFollow(this.player, true, 0.08, 0.08)
  }

  private createHud(): void {
    const { width, height } = this.scale.gameSize

    this.dictionaryButton = this.add.image(
      width / 2,
      18,
      DICTIONARY_ICON_KEY,
    )
    this.dictionaryButton
      .setOrigin(0.5, 0)
      .setDisplaySize(110, 85)
      .setDepth(60)
      .setScrollFactor(0)
      .setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (this.introDialogueState === 'complete') {
          this.openGlobalDictionary()
        }
      })
      .on('pointerover', () =>
        this.dictionaryButton.setDisplaySize(118, 91),
      )
      .on('pointerout', () =>
        this.dictionaryButton.setDisplaySize(110, 85),
      )

    this.dictionaryButtonLabel = this.add.text(width / 2, 88, '词典', {
      fontSize: '18px',
      color: '#6f2926',
      backgroundColor: 'rgba(244, 226, 191, 0.82)',
      padding: { x: 9, y: 3 },
      fontFamily: '"SimSun", "Microsoft YaHei", serif',
    })
    this.dictionaryButtonLabel
      .setOrigin(0.5, 0)
      .setDepth(61)
      .setScrollFactor(0)
      .setVisible(false)

    this.clueProgressText = this.add.text(
      width - 24,
      24,
      this.getClueProgressLabel(),
      {
        fontSize: '24px',
        color: '#6f2926',
        backgroundColor: 'rgba(244, 226, 191, 0.9)',
        padding: { x: 16, y: 9 },
        fontFamily: '"SimSun", "Microsoft YaHei", serif',
      },
    )
    this.clueProgressText
      .setOrigin(1, 0)
      .setDepth(60)
      .setScrollFactor(0)
      .setVisible(false)
    this.updateClueProgress()

    this.controlsText = this.add.text(
      width / 2,
      height - 24,
      EXPLORATION_CONTROLS_LABEL,
      {
        fontSize: '22px',
        color: '#4d3b34',
        backgroundColor: 'rgba(244, 226, 191, 0.82)',
        padding: { x: 14, y: 7 },
        fontFamily: '"SimSun", "Microsoft YaHei", serif',
      },
    )
    this.controlsText
      .setOrigin(0.5, 1)
      .setDepth(60)
      .setScrollFactor(0)
      .setAlign('center')
      .setVisible(false)

    const hintBackground = this.add.rectangle(
      0,
      0,
      430,
      64,
      0x4a2923,
      0.92,
    )
    hintBackground.setStrokeStyle(2, 0xd2b47b)
    this.interactHintText = this.add.text(0, 0, '', {
      fontSize: '26px',
      color: '#f7e8ca',
      fontFamily: '"SimSun", "Microsoft YaHei", serif',
    })
    this.interactHintText.setOrigin(0.5)
    this.interactHintGlyphContent = this.add.container(0, 0)
    this.interactHintGlyphContent.setVisible(false)
    this.interactHint = this.add.container(width / 2, height - 105, [
      hintBackground,
      this.interactHintText,
      this.interactHintGlyphContent,
    ])
    this.interactHint.setDepth(65).setScrollFactor(0).setVisible(false)

    this.toastText = this.add.text(width / 2, 100, '', {
      fontSize: '26px',
      color: '#f7e8ca',
      backgroundColor: 'rgba(93, 39, 34, 0.94)',
      padding: { x: 18, y: 10 },
      align: 'center',
    })
    this.toastText
      .setOrigin(0.5, 0)
      .setDepth(80)
      .setScrollFactor(0)
      .setVisible(false)

    this.toastGlyphBackground = this.add.rectangle(
      0,
      0,
      520,
      TOAST_HEIGHT,
      0x5d2722,
      0.94,
    )
    this.toastGlyphContent = this.add.container(0, 0)
    this.toastGlyphContainer = this.add.container(width / 2, 100, [
      this.toastGlyphBackground,
      this.toastGlyphContent,
    ])
    this.toastGlyphContainer
      .setDepth(80)
      .setScrollFactor(0)
      .setVisible(false)
  }

  private createPreviewPanel(): void {
    const { width, height } = this.scale.gameSize

    this.previewOverlay = this.add.rectangle(
      0,
      0,
      width,
      height,
      0x1e1410,
      0.78,
    )
    this.previewOverlay
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (this.activePreview) this.advancePreview()
      })

    this.previewPanel = this.add.rectangle(
      0,
      0,
      Math.min(1420, width - 120),
      Math.min(820, height - 100),
      0xead9b8,
      0.98,
    )
    this.previewPanel.setStrokeStyle(4, 0x7a3020).setVisible(false)

    this.previewImage = this.add.image(
      0,
      0,
      'embroidery_red_makeup',
    )
    this.previewImage
      .setBlendMode(Phaser.BlendModes.NORMAL)
      .setAlpha(1)

    this.previewTitle = this.add.text(
      0,
      0,
      '',
      {
        fontSize: '42px',
        color: '#d5cfc0',
        fontFamily: '"SimSun", "Microsoft YaHei", serif',
        fontStyle: 'bold',
      },
    )
    this.previewTitle.setOrigin(0.5)

    this.previewPhaseText = this.add.text(0, -190, '', {
      fontSize: '20px',
      color: '#a89984',
      letterSpacing: 4,
    })
    this.previewPhaseText.setOrigin(0.5).setVisible(false)

    this.previewBody = this.add.text(
      0,
      0,
      '',
      {
        fontSize: '28px',
        color: '#d5cfc0',
        fontFamily: '"SimSun", "Microsoft YaHei", serif',
        wordWrap: { width: CULTURE_PREVIEW_TEXT_WIDTH },
        lineSpacing: 16,
        align: 'left',
      },
    )
    this.previewBody.setOrigin(0, 0)

    this.previewGlyphContainer = this.add.container(
      0,
      0,
    )

    this.previewHint = this.add.text(
      0,
      height / 2 - 55,
      'E 继续  |  Q / ESC 返回',
      {
        fontSize: '22px',
        color: '#a89984',
        fontFamily: '"SimSun", "Microsoft YaHei", serif',
        backgroundColor: '#00000088',
        padding: { x: 20, y: 8 },
      },
    )
    this.previewHint.setOrigin(0.5)

    this.previewContainer = this.add.container(width / 2, height / 2, [
      this.previewOverlay,
      this.previewPanel,
      this.previewImage,
      this.previewTitle,
      this.previewPhaseText,
      this.previewBody,
      this.previewGlyphContainer,
      this.previewHint,
    ])
    this.previewContainer
      .setDepth(90)
      .setScrollFactor(0)
      .setVisible(false)
  }

  private createDialogueBox(): void {
    const { width, height } = this.scale.gameSize

    this.dialogueNpc = this.add
      .image(width / 2, height * 1.1, this.getDialogueNpcTextureKey())
      .setOrigin(0.5, 1)
      .setDepth(84)
      .setScrollFactor(0)
      .setVisible(false)
      .setAlpha(1)
    this.fitDialogueNpc()

    this.dialogueBox = this.add.image(0, 0, DIALOGUE_BOX_KEY)
    this.dialogueBox.setAlpha(0.8)
    this.dialogueBox.setDisplaySize(Math.min(width * 0.88, 1500), 300)
    this.dialogueBox
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (this.dialogueOpen) this.advanceNpcDialogueLine()
      })

    this.dialogueName = this.add.text(-500, -40, npcConfig.name, {
      fontSize: '34px',
      color: '#f4ddbf',
      fontFamily: '"SimSun", "Microsoft YaHei", serif',
      letterSpacing: 6,
    })
    this.dialogueName.setOrigin(0.5)

    this.dialogueBefore = this.add.text(DIALOGUE_TEXT_X, DIALOGUE_TEXT_Y, '', {
      fontSize: '25px',
      color: '#f1f1ee',
      fontFamily: '"SimSun", "Microsoft YaHei", serif',
      wordWrap: { width: 750 },
      lineSpacing: 8,
    })
    this.dialogueBefore.setVisible(false)

    this.dialoguePrefix = this.add.text(DIALOGUE_TEXT_X, DIALOGUE_TEXT_Y, '', {
      fontSize: '29px',
      color: '#f1f1ee',
      fontFamily: '"SimSun", "Microsoft YaHei", serif',
    })
    this.dialoguePrefix.setVisible(false)

    this.dialogueGlyphContainer = this.add.container(0, 0)
    this.dialogueGlyphContainer
      .setSize(DIALOGUE_GLYPH_HEIGHT, DIALOGUE_GLYPH_HEIGHT)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (this.dialogueOpen) {
          this.advanceNpcDialogueLine()
        }
      })
      .on('pointerover', () => this.dialogueGlyphContainer.setAlpha(0.78))
      .on('pointerout', () => this.dialogueGlyphContainer.setAlpha(1))
      .setVisible(false)

    this.dialogueSuffix = this.add.text(DIALOGUE_TEXT_X, DIALOGUE_TEXT_Y, '', {
      fontSize: '29px',
      color: '#f1f1ee',
      fontFamily: '"SimSun", "Microsoft YaHei", serif',
    })
    this.dialogueSuffix.setVisible(false)

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
    )
    this.dialogueSolvedText.setVisible(false)

    this.dialogueLinesContainer = this.add.container(0, 0)

    this.dialogueHint = this.add.text(
      520,
      92,
      '',
      {
        fontSize: '19px',
        color: '#d9b99b',
      },
    )
    this.dialogueHint.setOrigin(1, 0.5).setVisible(false)

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
    )

    this.dialogueContainer
      .setDepth(85)
      .setScrollFactor(0)
      .setVisible(false)
  }

  private bindKeys(): void {
    const keyboard = this.input.keyboard
    if (!keyboard) return

    this.keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    this.keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.keyS = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S)
    this.keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this.keyE = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    this.keyQ = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q)
    this.keyEsc = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    this.keyTab = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB)
  }

  private showDialogueControls(): void {
    this.controlsText
      .setText(DIALOGUE_CONTROLS_LABEL)
      .setDepth(95)
      .setVisible(true)
  }

  private showExplorationControls(): void {
    this.controlsText
      .setText(EXPLORATION_CONTROLS_LABEL)
      .setDepth(60)
      .setVisible(false)
  }

  private updateNearestInteraction(): void {
    let nearest: EmbroideryInteraction | null = null
    let nearestDistance = EMBROIDERY_INTERACT_DISTANCE

    for (const interaction of EMBROIDERY_INTERACTIONS) {
      const isNpcIntroAvailable =
        interaction.category === 'npc' &&
        this.introDialogueState !== 'complete'

      if (
        interaction.category === 'npc' &&
        !isNpcIntroAvailable &&
        !this.canTriggerFinalYanDialogue()
      ) {
        this.interactionLabels.get(interaction.id)?.setVisible(false)
        continue
      }

      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        interaction.x,
        interaction.y,
      )

      const image = this.interactionSprites.get(interaction.id)
      if (image) {
        image.setAlpha(
          distance < EMBROIDERY_INTERACT_DISTANCE ? 1 : 0.92,
        )
      }

      if (distance < nearestDistance) {
        nearest = interaction
        nearestDistance = distance
      }
    }

    this.nearestInteraction = nearest
    this.interactHint.setVisible(Boolean(nearest))

    EMBROIDERY_INTERACTIONS.forEach((interaction) => {
      const image = this.interactionSprites.get(interaction.id)
      const baseScale = this.interactionBaseScales.get(interaction.id)
      const isNearest = interaction.id === nearest?.id
      const scaleMultiplier = isNearest
        ? interaction.category === 'npc'
          ? 1.1
          : 1.25
        : 1

      if (image && baseScale) {
        image.setScale(
          baseScale.scaleX * scaleMultiplier,
          baseScale.scaleY * scaleMultiplier,
        )
      }
      this.interactionLabels
        .get(interaction.id)
        ?.setVisible(isNearest)
    })

    if (nearest) {
      if (this.renderedInteractHintId !== nearest.id) {
        this.renderInteractionHint(nearest)
        this.renderedInteractHintId = nearest.id
      }
    } else {
      this.renderedInteractHintId = undefined
    }
  }

  private renderInteractionHint(interaction: EmbroideryInteraction): void {
    this.interactHintGlyphContent.removeAll(true)

    const nushuTextureKeys =
      this.getInteractionHintNushuTextureKeys(interaction)

    if (!nushuTextureKeys) {
      this.interactHintGlyphContent.setVisible(false)
      this.interactHintText
        .setText(this.getInteractionHintText(interaction))
        .setOrigin(0.5)
        .setPosition(0, 0)
      return
    }

    this.interactHintText
      .setText('E 交互 ·')
      .setOrigin(0, 0.5)

    const glyphGap = 2
    const glyphTextGap = 14
    const glyphHeight = 57.6
    let glyphX = 0

    nushuTextureKeys.forEach((sourceTextureKey) => {
      const textureKey = this.getDialogueGlyphTextureKey(sourceTextureKey)
      const renderTextureKey = this.textures.exists(textureKey)
        ? textureKey
        : sourceTextureKey
      const sourceImage = this.textures.get(renderTextureKey).source[0]?.image
      const sourceWidth =
        sourceImage && 'width' in sourceImage ? Number(sourceImage.width) : 52
      const sourceHeight =
        sourceImage && 'height' in sourceImage
          ? Number(sourceImage.height)
          : 82
      const glyphWidth = glyphHeight * (sourceWidth / sourceHeight)

      const glyph = this.add.image(glyphX, 0, renderTextureKey)
      glyph
        .setDisplaySize(glyphWidth, glyphHeight)
        .setOrigin(0, 0.5)
      this.interactHintGlyphContent.add(glyph)
      glyphX += glyphWidth + glyphGap
    })

    const totalGlyphWidth = Math.max(glyphX - glyphGap, 1)
    const totalWidth =
      this.interactHintText.width + glyphTextGap + totalGlyphWidth
    const startX = -totalWidth / 2

    this.interactHintText.setPosition(startX, 0)
    this.interactHintGlyphContent
      .setPosition(startX + this.interactHintText.width + glyphTextGap, 0)
      .setVisible(true)
  }

  private getInteractionHintNushuTextureKeys(
    interaction: EmbroideryInteraction,
  ): readonly string[] | undefined {
    if (
      interaction.category === 'npc' ||
      !NUSHU_INTERACTION_LABEL_IDS.has(interaction.id)
    ) {
      return undefined
    }

    return interaction.unlock?.nushuTextureKeys
  }

  private getInteractionHintText(interaction: EmbroideryInteraction): string {
    if (interaction.category !== 'npc') {
      return `E 交互 · ${interaction.title}`
    }

    return `E 交互 ${npcConfig.name}`
  }

  private openPreview(interaction: EmbroideryInteraction): void {
    if (interaction.category === 'npc') {
      if (this.introDialogueState !== 'complete') {
        this.startIntroDialogue()
        return
      }

      if (this.canTriggerFinalYanDialogue()) {
        this.openFinalYanDialogue()
      }
      return
    }

    this.activePreview = interaction
    this.previewPhase = 0
    this.player.setVelocity(0, 0)
    this.interactHint.setVisible(false)
    this.showCurrentInteractionPhase()
  }

  private advancePreview(): void {
    if (!this.activePreview) return

    const phase = this.getActivePreviewPhases()[this.previewPhase]
    if (phase.display === 'culture' && !this.culturePreviewTextVisible) {
      this.culturePreviewTextVisible = true
      this.showCulturePreviewText()
      return
    }

    this.advanceInteractionPhase()
  }

  private getActivePreviewPhases(): readonly EmbroideryPreviewPhase[] {
    if (!this.activePreview) return []

    const phases = this.activePreview.phases
    const hasCulture = phases.some((phase) => phase.display === 'culture')
    const hasDialogue = phases.some((phase) => phase.display === 'dialogue')
    if (!hasCulture || !hasDialogue) return phases

    return [...phases].sort((left, right) => {
      if (left.display === right.display) return 0
      return left.display === 'culture' ? -1 : 1
    })
  }

  private completeActiveInteraction(): void {
    if (!this.activePreview) return

    const interaction = this.activePreview
    const isFirstDiscovery = !this.saveSystem.isClueDiscovered(
      interaction.id,
    )

    this.saveSystem.discoverClue(interaction.id)

    if (
      isFirstDiscovery &&
      interaction.category === 'main' &&
      interaction.unlock
    ) {
      const entry = EMBROIDERY_ENTRIES.find(
        (candidate) =>
          candidate.id === interaction.unlock?.dictionaryEntryId,
      )

      if (entry) {
        this.saveSystem.unlockEntry(entry)
        this.dictionaryBridge.unlockEntry(entry.id)
        this.showNewGlyphToast(interaction.unlock.nushuTextureKeys)
      }
    }

    this.updateClueProgress()
    this.closePreview()
  }

  private advanceInteractionPhase(): void {
    if (!this.activePreview) return

    if (this.previewPhase < this.getActivePreviewPhases().length - 1) {
      this.previewPhase += 1
      this.showCurrentInteractionPhase()
      return
    }

    this.completeActiveInteraction()
  }

  private showCurrentInteractionPhase(): void {
    if (!this.activePreview) return

    const phase = this.getActivePreviewPhases()[this.previewPhase]
    if (phase.display === 'dialogue') {
      this.openInteractionDialogue()
      return
    }

    this.openCulturePreview()
  }

  private openInteractionDialogue(): void {
    if (!this.activePreview) return

    this.previewContainer.setVisible(false)
    this.dialogueOpen = true
    this.npcDialogueMode = 'interaction'
    this.npcDialogueLineIndex = 0
    this.player.setVelocity(0, 0)
    this.interactHint.setVisible(false)
    this.showDialogueControls()
    this.dialogueName.setText(npcConfig.name)
    this.focusNpcForDialogue()
    this.dialogueContainer.setVisible(true)
    this.renderNpcDialogueLine()
  }

  private openCulturePreview(): void {
    if (!this.activePreview) return

    this.culturePreviewTextVisible = false
    this.dialogueOpen = false
    this.npcDialogueMode = 'none'
    this.dialogueContainer.setVisible(false)
    this.restoreNpcAfterDialogue()
    this.controlsText.setDepth(60).setVisible(false)
    this.previewContainer.setVisible(true)
    this.showPreviewPhase()
  }

  private showPreviewPhase(): void {
    if (!this.activePreview) return

    const phase = this.getActivePreviewPhases()[this.previewPhase]
    this.previewImage.setTexture(
      phase.imageTextureKey ?? this.activePreview.textureKey,
    )
    this.fitPreviewImage(this.activePreview)
    this.previewTitle.setText(phase.title ?? this.activePreview.title)
    this.previewTitle.setVisible(this.culturePreviewTextVisible)
    this.previewPhaseText.setVisible(false)
    this.renderPreviewContent(phase)
    this.layoutCulturePreviewContent()
    this.setCulturePreviewTextVisible(this.culturePreviewTextVisible)
    this.previewHint.setText(
      this.culturePreviewTextVisible
        ? this.getCulturePreviewTextHint()
        : 'E / 点击 显示文字 | Q / ESC 返回',
    )
  }

  private showCulturePreviewText(): void {
    if (!this.activePreview) return

    this.setCulturePreviewTextVisible(true)
    this.previewHint.setText(this.getCulturePreviewTextHint())
  }

  private setCulturePreviewTextVisible(visible: boolean): void {
    this.previewTitle.setVisible(visible)
    this.previewBody.setVisible(visible && this.previewBody.text.length > 0)
    this.previewGlyphContainer.setVisible(
      visible && this.previewGlyphContainer.getAll().length > 0,
    )
  }

  private getCulturePreviewTextHint(): string {
    if (!this.activePreview) return 'E / 点击 返回 | Q / ESC 返回'

    return this.previewPhase === this.getActivePreviewPhases().length - 1
      ? 'E / 点击 收下线索 | Q / ESC 返回'
      : 'E / 点击 继续 | Q / ESC 返回'
  }

  private renderPreviewContent(phase: EmbroideryPreviewPhase): void {
    this.previewGlyphContainer.removeAll(true)

    if (!phase.nushuTextureKeys?.length) {
      this.previewBody.setText(phase.text).setVisible(true)
      return
    }

    this.previewBody.setText('').setVisible(false)
    const lines = phase.text.split('\n')

    lines.forEach((line, lineIndex) => {
      const [prefix, suffix] = line.split('{{nushu}}')
      const lineY = lineIndex * 66
      const prefixText = this.createPreviewLineText(prefix, 0, lineY)
      this.previewGlyphContainer.add(prefixText)

      if (suffix === undefined) return

      let glyphX = prefixText.width + 8
      phase.nushuTextureKeys?.forEach((textureKey) => {
        const glyph = this.add.image(glyphX, lineY + 20, textureKey)
        const glyphHeight = 48
        const glyphWidth = glyphHeight * (glyph.width / glyph.height)
        glyph.setDisplaySize(glyphWidth, glyphHeight).setOrigin(0, 0.5)
        this.previewGlyphContainer.add(glyph)
        glyphX += glyphWidth + 5
      })

      const suffixText = this.createPreviewLineText(
        suffix,
        glyphX + 3,
        lineY,
      )
      this.previewGlyphContainer.add(suffixText)
    })
  }

  private createPreviewLineText(
    text: string,
    x: number,
    y: number,
  ): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      fontSize: '28px',
      color: '#d5cfc0',
      fontFamily: '"SimSun", "Microsoft YaHei", serif',
    })
  }

  private fitPreviewImage(interaction: EmbroideryInteraction): void {
    const { width, height } = this.scale.gameSize
    const availableWidth = Math.max(width - 96, 960)
    const maxCultureImageWidth = Math.max(
      420,
      Math.min(
        1000,
        width * CULTURE_PREVIEW_MAX_IMAGE_WIDTH_RATIO,
        availableWidth - CULTURE_PREVIEW_TEXT_WIDTH - CULTURE_PREVIEW_GAP,
      ),
    )
    const maxWidth =
      interaction.category === 'npc' ? 360 : maxCultureImageWidth
    const maxHeight =
      interaction.category === 'npc'
        ? 590
        : Math.min(820, height * CULTURE_PREVIEW_MAX_IMAGE_HEIGHT_RATIO)
    const maxScale = Math.min(
      maxWidth / this.previewImage.width,
      maxHeight / this.previewImage.height,
    )

    this.previewImage
      .setBlendMode(Phaser.BlendModes.NORMAL)
      .setAlpha(1)
      .setScale(maxScale)
  }

  private layoutCulturePreviewContent(): void {
    const imageWidth = this.previewImage.displayWidth
    const imageLayoutWidth =
      imageWidth * CULTURE_PREVIEW_IMAGE_LAYOUT_WIDTH_RATIO
    const totalWidth =
      imageLayoutWidth + CULTURE_PREVIEW_GAP + CULTURE_PREVIEW_TEXT_WIDTH
    const imageX = -totalWidth / 2 + imageLayoutWidth / 2
    const textLeftX = totalWidth / 2 - CULTURE_PREVIEW_TEXT_WIDTH
    const textCenterX = textLeftX + CULTURE_PREVIEW_TEXT_WIDTH / 2
    const titleHeight = this.previewTitle.height
    const bodyHeight = this.getCulturePreviewBodyHeight()
    const textBlockHeight =
      titleHeight + CULTURE_PREVIEW_TITLE_BODY_GAP + bodyHeight
    const titleY = -textBlockHeight / 2 + titleHeight / 2
    const bodyY =
      -textBlockHeight / 2 + titleHeight + CULTURE_PREVIEW_TITLE_BODY_GAP

    this.previewImage.setPosition(
      imageX + CULTURE_PREVIEW_IMAGE_OFFSET_X,
      CULTURE_PREVIEW_IMAGE_OFFSET_Y,
    )
    this.previewTitle.setPosition(textCenterX, titleY)
    this.previewPhaseText.setPosition(textCenterX, titleY)
    this.previewBody.setPosition(textLeftX, bodyY)
    this.previewGlyphContainer.setPosition(textLeftX, bodyY)
  }

  private getCulturePreviewBodyHeight(): number {
    if (this.previewBody.text.length > 0) {
      return this.previewBody.height
    }

    const glyphLines = this.previewGlyphContainer.getAll()
    if (glyphLines.length === 0) return 0

    return Math.max(
      ...glyphLines.map((child) => {
        const gameObject = child as Phaser.GameObjects.GameObject & {
          y?: number
          displayHeight?: number
          height?: number
        }
        return (
          (gameObject.y ?? 0) +
          (gameObject.displayHeight ?? gameObject.height ?? 0)
        )
      }),
    )
  }

  private initializeIntroDialogue(): void {
    if (this.saveSystem.isSceneCompleted(EMBROIDERY_INTRO_SEEN_FLAG)) {
      this.introDialogueState = 'complete'
      this.dialogueOpen = false
      this.npcDialogueMode = 'none'
      this.dialogueContainer.setVisible(false)
      this.setIntroInteractionVisibility(true)
      this.dictionaryButton.setVisible(false)
      this.dictionaryButtonLabel.setVisible(false)
      this.showExplorationControls()
      return
    }

    this.startIntroDialogue()
  }

  private closePreview(): void {
    this.activePreview = null
    this.culturePreviewTextVisible = false
    this.previewContainer.setVisible(false)
    this.setCulturePreviewTextVisible(false)
    this.showExplorationControls()
    this.syncFreeExplorationState()
  }

  private startIntroDialogue(): void {
    if (this.introDialogueState !== 'pending') return

    this.introDialogueState = 'playing'
    this.dialogueOpen = true
    this.npcDialogueMode = 'intro'
    this.npcDialogueLineIndex = 0
    this.player.setVelocity(0, 0)
    this.interactHint.setVisible(false)
    this.setIntroInteractionVisibility(false)
    this.showDialogueControls()
    this.dialogueName.setText(npcConfig.name)
    this.focusNpcForDialogue()
    this.dialogueContainer.setVisible(true)
    this.renderNpcDialogueLine()
    this.syncFreeExplorationState()
  }

  private finishIntroDialogue(): void {
    if (this.introDialogueState === 'complete') return

    this.introDialogueState = 'complete'
    this.saveSystem.markSceneCompleted(EMBROIDERY_INTRO_SEEN_FLAG)
    this.dialogueOpen = false
    this.npcDialogueMode = 'none'
    this.dialogueContainer.setVisible(false)
    this.restoreNpcAfterDialogue()
    this.setIntroInteractionVisibility(true)
    this.dictionaryButton.setVisible(false)
    this.dictionaryButtonLabel.setVisible(false)
    this.showExplorationControls()
    this.syncFreeExplorationState()
  }

  private openFinalYanDialogue(): void {
    if (!this.canTriggerFinalYanDialogue()) return

    this.dialogueOpen = true
    this.npcDialogueMode = 'final-yan'
    this.npcDialogueLineIndex = 0
    this.player.setVelocity(0, 0)
    this.interactHint.setVisible(false)
    this.showDialogueControls()
    this.dialogueName.setText(npcConfig.name)
    this.focusNpcForDialogue()
    this.dialogueContainer.setVisible(true)
    this.renderNpcDialogueLine()
    this.syncFreeExplorationState()
  }

  private closeDialogue(): void {
    const closedMode = this.npcDialogueMode
    this.dialogueOpen = false
    this.npcDialogueMode = 'none'
    this.dialogueContainer.setVisible(false)
    this.restoreNpcAfterDialogue()
    if (closedMode === 'intro') {
      this.finishIntroDialogue()
      return
    }
    if (closedMode === 'interaction') {
      this.activePreview = null
      this.showExplorationControls()
      this.syncFreeExplorationState()
      return
    }
    this.showExplorationControls()
    if (closedMode === 'summary') this.completeEmbroideryRoom()
    this.syncFreeExplorationState()
  }

  private getDialogueNpcTextureKey(): string {
    if (this.textures.exists(DIALOGUE_NPC_KEY)) return DIALOGUE_NPC_KEY

    return (
      EMBROIDERY_INTERACTIONS.find(
        (interaction) => interaction.category === 'npc',
      )?.textureKey ?? DIALOGUE_NPC_KEY
    )
  }

  private fitDialogueNpc(): void {
    if (!this.dialogueNpc) return

    const { width, height } = this.scale.gameSize
    const targetHeight = Math.min(height * 1.7, 1900)
    const targetWidth =
      targetHeight * (this.dialogueNpc.width / this.dialogueNpc.height)

    this.dialogueNpc
      .setPosition(width / 2, height * 1.8)
      .setDisplaySize(targetWidth, targetHeight)
  }

  private focusNpcForDialogue(): void {
    const npcInteraction = EMBROIDERY_INTERACTIONS.find(
      (interaction) => interaction.category === 'npc',
    )
    if (!npcInteraction) return

    const npc = this.interactionSprites.get(npcInteraction.id)
    if (!npc) return

    this.interactionTweens.get(npcInteraction.id)?.pause()
    this.focusedNpc = npc
    this.focusedNpcState = {
      x: npc.x,
      y: npc.y,
      displayWidth: npc.displayWidth,
      displayHeight: npc.displayHeight,
      depth: npc.depth,
      alpha: npc.alpha,
      visible: npc.visible,
    }

    npc.setVisible(false)
    this.fitDialogueNpc()
    this.dialogueNpc.setVisible(true)
    this.interactionLabels.get(npcInteraction.id)?.setVisible(false)
  }

  private restoreNpcAfterDialogue(): void {
    if (!this.focusedNpc || !this.focusedNpcState) {
      this.dialogueNpc?.setVisible(false)
      return
    }

    this.focusedNpc
      .setScrollFactor(1)
      .setPosition(this.focusedNpcState.x, this.focusedNpcState.y)
      .setDisplaySize(
        this.focusedNpcState.displayWidth,
        this.focusedNpcState.displayHeight,
      )
      .setDepth(this.focusedNpcState.depth)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setAlpha(this.focusedNpcState.alpha)
      .setVisible(this.focusedNpcState.visible)

    this.dialogueNpc?.setVisible(false)

    const npcInteraction = EMBROIDERY_INTERACTIONS.find(
      (interaction) => interaction.category === 'npc',
    )
    if (npcInteraction) {
      this.interactionLabels.get(npcInteraction.id)?.setVisible(false)
      this.interactionTweens.get(npcInteraction.id)?.resume()
    }

    this.focusedNpc = undefined
    this.focusedNpcState = undefined
  }

  private renderNpcDialogueLine(): void {
    const lines = this.getNpcDialogueLines()
    const line = lines[this.npcDialogueLineIndex]

    if (!line) {
      if (this.npcDialogueMode === 'intro') {
        this.finishIntroDialogue()
      } else if (this.npcDialogueMode === 'interaction') {
        this.dialogueOpen = false
        this.npcDialogueMode = 'none'
        this.dialogueContainer.setVisible(false)
        this.restoreNpcAfterDialogue()
        this.advanceInteractionPhase()
      } else if (this.npcDialogueMode === 'final-yan') {
        this.collectFinalYan()
      } else {
        this.closeDialogue()
      }
      return
    }

    const visibleLines = lines.slice(0, this.npcDialogueLineIndex + 1)
    this.dialogueBefore.setVisible(false)
    this.dialoguePrefix.setVisible(false)
    this.dialogueSuffix.setVisible(false)
    this.dialogueSolvedText.setVisible(false)
    this.clearDialogueGlyphs()
    this.renderVisibleDialogueLines(visibleLines)

    this.controlsText.setText(DIALOGUE_CONTROLS_LABEL)
  }

  /**
   * 渲染可见对话行。
   * 使用动态累计高度定位各行，确保长文本自动换行后不会重叠。
   * 同时根据实际内容高度动态调整对话框背景尺寸，防止文字超出边框。
   */
  private renderVisibleDialogueLines(lines: readonly string[]): void {
    this.dialogueLinesContainer.removeAll(true)

    let currentY = DIALOGUE_TEXT_Y
    const lineGap = 2

    lines.forEach((line) => {
      const lineContainer = this.add.container(DIALOGUE_TEXT_X, currentY)
      const [prefix, suffix] = line.split(NUSHU_TOKEN)

      if (suffix === undefined) {
        const text = this.createDialogueLineText(line, 0, 0, true)
        lineContainer.add(text)
        currentY += text.height + lineGap
      } else {
        const prefixText = this.createDialogueLineText(prefix, 0, 0)
        lineContainer.add(prefixText)
        const glyphCenterY = prefixText.height / 2
        const glyphWidth = this.addDialogueGlyphsToContainer(
          lineContainer,
          this.getDialogueGlyphTextureKeys(),
          prefixText.width + 10,
          glyphCenterY,
        )
        const suffixText = this.createDialogueLineText(
          suffix,
          prefixText.width + glyphWidth + 22,
          0,
        )
        lineContainer.add(suffixText)
        const lineHeight = Math.max(
          prefixText.height,
          suffixText.height,
          DIALOGUE_GLYPH_HEIGHT,
        )
        currentY += lineHeight + lineGap
      }

      this.dialogueLinesContainer.add(lineContainer)
    })

    // 动态调整对话框背景高度，防止文字超出边框
    const contentHeight = currentY - DIALOGUE_TEXT_Y
    const boxPadding = 120
    const newBoxHeight = Math.max(300, contentHeight + boxPadding)
    this.dialogueBox.setDisplaySize(
      Math.min(this.scale.gameSize.width * 0.88, 1500),
      newBoxHeight,
    )
    // 提示文字跟随对话框底部
    this.dialogueHint.setPosition(520, newBoxHeight / 2 - 58)
  }

  private createDialogueLineText(
    text: string,
    x: number,
    y: number,
    wrap = false,
  ): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      fontSize: '29px',
      color: '#f1f1ee',
      fontFamily: '"SimSun", "Microsoft YaHei", serif',
      wordWrap: wrap ? { width: DIALOGUE_TEXT_WIDTH } : undefined,
      lineSpacing: wrap ? 2 : 0,
    })
  }

  private getNpcDialogueLines(): readonly string[] {
    if (this.npcDialogueMode === 'intro') return INTRO_DIALOGUE_LINES
    if (this.npcDialogueMode === 'interaction') {
      const phase = this.getCurrentInteractionPhase()
      return phase ? phase.text.split('\n') : []
    }
    if (this.npcDialogueMode === 'summary') return SUMMARY_DIALOGUE_LINES

    return [
      finalYanPuzzle.beforeLines[0],
      finalYanPuzzle.puzzleLine,
      finalYanPuzzle.afterLines[0],
    ]
  }

  private advanceNpcDialogueLine(): void {
    if (!this.dialogueOpen) return

    this.npcDialogueLineIndex += 1
    this.renderNpcDialogueLine()
  }

  private getCurrentInteractionPhase(): EmbroideryPreviewPhase | undefined {
    return this.getActivePreviewPhases()[this.previewPhase]
  }

  private getDialogueGlyphTextureKeys(): readonly string[] {
    if (this.npcDialogueMode !== 'interaction') {
      return ['embroidery_nushu_yan']
    }

    const phase = this.getCurrentInteractionPhase()
    return phase?.nushuTextureKeys?.length
      ? phase.nushuTextureKeys
      : ['embroidery_nushu_yan']
  }

  private getDialogueGlyphTextureKey(sourceKey: string): string {
    return sourceKey.startsWith('embroidery_nushu_')
      ? sourceKey.replace('embroidery_nushu_', 'embroidery_dialogue_')
      : `${sourceKey}_dialogue`
  }

  private clearDialogueGlyphs(): void {
    this.dialogueGlyphContainer.removeAll(true)
    this.dialogueGlyphContainer
      .setSize(DIALOGUE_GLYPH_HEIGHT, DIALOGUE_GLYPH_HEIGHT)
      .setVisible(false)
  }

  private addDialogueGlyphsToContainer(
    container: Phaser.GameObjects.Container,
    sourceTextureKeys: readonly string[],
    x: number,
    centerY: number,
  ): number {
    let glyphX = 0
    sourceTextureKeys.forEach((sourceTextureKey) => {
      const textureKey = this.getDialogueGlyphTextureKey(sourceTextureKey)
      const renderTextureKey = this.textures.exists(textureKey)
        ? textureKey
        : sourceTextureKey
      const glyph = this.add.image(glyphX, 0, renderTextureKey)
      const sourceImage = this.textures.get(renderTextureKey).source[0]?.image
      const sourceWidth =
        sourceImage && 'width' in sourceImage ? Number(sourceImage.width) : 52
      const sourceHeight =
        sourceImage && 'height' in sourceImage
          ? Number(sourceImage.height)
          : 82
      const glyphWidth = DIALOGUE_GLYPH_HEIGHT * (sourceWidth / sourceHeight)

      glyph
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          if (this.dialogueOpen) this.advanceNpcDialogueLine()
        })
        .setDisplaySize(glyphWidth, DIALOGUE_GLYPH_HEIGHT)
        .setOrigin(0, 0.5)
      glyph.setPosition(x + glyphX, centerY)
      container.add(glyph)
      glyphX += glyphWidth + DIALOGUE_GLYPH_GAP
    })

    const totalWidth = Math.max(glyphX - DIALOGUE_GLYPH_GAP, 1)
    return totalWidth
  }

  private collectFinalYan(): void {
    const entry = EMBROIDERY_ENTRIES.find(
      (candidate) =>
        candidate.id === EMBROIDERY_FINAL_YAN_UNLOCK.dictionaryEntryId,
    )

    this.saveSystem.discoverClue(FINAL_YAN_CLUE_ID)
    this.updateClueProgress()

    if (entry && !this.saveSystem.isEntryUnlocked(entry.id)) {
      this.saveSystem.unlockEntry(entry)
      this.dictionaryBridge.unlockEntry(entry.id)
      this.showNewGlyphToast(EMBROIDERY_FINAL_YAN_UNLOCK.nushuTextureKeys)
    }

    this.closeDialogue()
  }

  private openGlobalDictionary(): void {
    if (
      this.finalYanUnlocked &&
      this.saveSystem.isEntryUnlocked(finalYanPuzzle.correctEntryId) &&
      !this.saveSystem.isSceneCompleted(EMBROIDERY_YAN_RESOLVED_FLAG)
    ) {
      this.dictionaryBridge.openDictionary({
        puzzleId: finalYanPuzzle.id,
        activeEntryId: finalYanPuzzle.activeEntryId,
        contextSentence: finalYanPuzzle.contextSentence,
        correctEntryId: finalYanPuzzle.correctEntryId,
        onSuccess: () => this.handleFinalYanMatched(),
      })
      return
    }

    this.dictionaryBridge.openDictionary()
  }

  private handleFinalYanMatched(): void {
    if (!this.scene.isActive()) return

    this.saveSystem.markSceneCompleted(EMBROIDERY_YAN_RESOLVED_FLAG)
    this.showToast('三朝书残页已补入：千【言】写尽犹余半')
    this.startSummaryDialogue()
  }

  private startSummaryDialogue(): void {
    this.dialogueOpen = true
    this.npcDialogueMode = 'summary'
    this.npcDialogueLineIndex = 0
    this.player.setVelocity(0, 0)
    this.interactHint.setVisible(false)
    this.showDialogueControls()
    this.dialogueName.setText(npcConfig.name)
    this.focusNpcForDialogue()
    this.dialogueContainer.setVisible(true)
    this.renderNpcDialogueLine()
    this.syncFreeExplorationState()
  }

  setGlobalDictionaryOpen(isOpen: boolean): void {
    this.isGlobalDictionaryOpen = isOpen
    if (isOpen) this.player?.setVelocity(0, 0)
    this.syncFreeExplorationState()
  }

  private syncFreeExplorationState(): void {
    const active =
      !this.isGlobalDictionaryOpen &&
      !this.dialogueOpen &&
      this.activePreview === null

    if (active === this.lastFreeExplorationActive) return
    this.lastFreeExplorationActive = active
    this.dictionaryBridge?.setFreeExplorationActive?.(active)
  }

  private getClueProgressLabel(): string {
    const foundCount = MAIN_CLUE_IDS.filter((clueId) =>
      this.saveSystem?.isClueDiscovered(clueId),
    ).length
    return `线索 ${foundCount}/${MAIN_CLUE_IDS.length}`
  }

  private updateClueProgress(): void {
    this.clueProgressText.setText(this.getClueProgressLabel())
    const foundCount = MAIN_CLUE_IDS.filter((clueId) =>
      this.saveSystem?.isClueDiscovered(clueId),
    ).length
    this.dictionaryBridge?.setClueProgress?.({
      found: foundCount,
      total: MAIN_CLUE_IDS.length,
    })
  }

  private arePreFinalCluesDiscovered(): boolean {
    return PRE_FINAL_CLUE_IDS.every((clueId) =>
      this.saveSystem.isClueDiscovered(clueId),
    )
  }

  private refreshFinalYanUnlock(): void {
    if (!this.finalYanUnlocked && this.arePreFinalCluesDiscovered()) {
      this.finalYanUnlocked = true
    }

    if (this.canTriggerFinalYanDialogue() && !this.finalYanPromptShown) {
      this.finalYanPromptShown = true
      this.showFinalYanPrompt()
    }

    if (
      this.saveSystem.isSceneCompleted(EMBROIDERY_YAN_RESOLVED_FLAG) &&
      !this.saveSystem.isSceneCompleted(EMBROIDERY_ROOM_COMPLETION_FLAG) &&
      !this.dialogueOpen
    ) {
      this.startSummaryDialogue()
    }
  }

  private canTriggerFinalYanDialogue(): boolean {
    return (
      this.finalYanUnlocked &&
      !this.saveSystem.isClueDiscovered(FINAL_YAN_CLUE_ID) &&
      !this.saveSystem.isSceneCompleted(EMBROIDERY_ROOM_COMPLETION_FLAG)
    )
  }

  private showToast(message: string): void {
    this.toastGlyphContainer.setVisible(false)
    this.toastText.setText(message).setVisible(true)
    this.scheduleToastHide()
  }

  private showFinalYanPrompt(): void {
    if (this.toastGlyphContainer.visible) {
      this.finalYanPromptQueued = true
      return
    }

    this.finalYanPromptQueued = false
    this.showToast(`${npcConfig.name}似乎还有话想对你说。`)
  }

  private showNewGlyphToast(nushuTextureKeys: readonly string[]): void {
    this.toastText.setVisible(false)
    this.toastGlyphContent.removeAll(true)

    const prefixText = this.createToastText('获得新字形：')
    this.toastGlyphContent.add(prefixText)

    const glyphWidth = this.addToastGlyphsToContainer(
      this.toastGlyphContent,
      nushuTextureKeys,
      prefixText.width + 8,
      0,
    )
    const suffixText = this.createToastText(
      '已加入词典',
      prefixText.width + glyphWidth + 22,
    )
    this.toastGlyphContent.add(suffixText)

    const contentWidth = suffixText.x + suffixText.width
    this.toastGlyphContent.setPosition(-contentWidth / 2, 0)
    this.toastGlyphBackground.setSize(
      contentWidth + TOAST_PADDING_X * 2,
      TOAST_HEIGHT,
    )
    this.toastGlyphContainer.setVisible(true)
    this.scheduleToastHide()
  }

  private createToastText(
    text: string,
    x = 0,
  ): Phaser.GameObjects.Text {
    return this.add
      .text(x, 0, text, {
        fontSize: '26px',
        color: '#f7e8ca',
        fontFamily: '"SimSun", "Microsoft YaHei", serif',
      })
      .setOrigin(0, 0.5)
  }

  private addToastGlyphsToContainer(
    container: Phaser.GameObjects.Container,
    sourceTextureKeys: readonly string[],
    x: number,
    centerY: number,
  ): number {
    let glyphX = 0
    sourceTextureKeys.forEach((sourceTextureKey) => {
      const textureKey = this.getDialogueGlyphTextureKey(sourceTextureKey)
      const renderTextureKey = this.textures.exists(textureKey)
        ? textureKey
        : sourceTextureKey
      const glyph = this.add.image(x + glyphX, centerY, renderTextureKey)
      const sourceImage = this.textures.get(renderTextureKey).source[0]?.image
      const sourceWidth =
        sourceImage && 'width' in sourceImage ? Number(sourceImage.width) : 52
      const sourceHeight =
        sourceImage && 'height' in sourceImage
          ? Number(sourceImage.height)
          : 82
      const glyphWidth = TOAST_GLYPH_HEIGHT * (sourceWidth / sourceHeight)

      glyph
        .setDisplaySize(glyphWidth, TOAST_GLYPH_HEIGHT)
        .setOrigin(0, 0.5)
      container.add(glyph)
      glyphX += glyphWidth + TOAST_GLYPH_GAP
    })

    return Math.max(glyphX - TOAST_GLYPH_GAP, 1)
  }

  private scheduleToastHide(): void {
    this.toastHideEvent?.remove(false)
    this.toastHideEvent = this.time.delayedCall(2200, () => {
      if (this.toastText.active) this.toastText.setVisible(false)
      if (this.toastGlyphContainer.active) {
        this.toastGlyphContainer.setVisible(false)
      }
      this.toastHideEvent = undefined
      if (this.finalYanPromptQueued && this.canTriggerFinalYanDialogue()) {
        this.showFinalYanPrompt()
      }
    })
  }

  private completeEmbroideryRoom(): void {
    if (
      this.saveSystem.isSceneCompleted(EMBROIDERY_ROOM_COMPLETION_FLAG)
    ) {
      return
    }

    this.saveSystem.markSceneCompleted(EMBROIDERY_ROOM_COMPLETION_FLAG)
    this.saveSystem.markSceneCompleted(EMBROIDERY_SCENE_ID)
    this.showToast(
      '女红空间词条已全部解锁。\n三朝书残页恢复了一部分。',
    )
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize
    this.dictionaryButton.setPosition(width / 2, 18)
    this.dictionaryButtonLabel.setPosition(width / 2, 88)
    this.clueProgressText.setPosition(width - 24, 24)
    this.controlsText.setPosition(width / 2, height - 24)
    this.interactHint.setPosition(width / 2, height - 105)
    this.toastText.setPosition(width / 2, 100)
    this.toastGlyphContainer.setPosition(width / 2, 100)
    this.previewContainer.setPosition(width / 2, height / 2)
    this.previewOverlay.setSize(width, height)
    this.previewHint.setPosition(0, height / 2 - 55)
    this.dialogueContainer.setPosition(width / 2, height - 175)
    this.dialogueBox.setDisplaySize(Math.min(width * 0.88, 1500), 300)
    this.fitDialogueNpc()

    if (this.activePreview && this.previewContainer.visible) {
      this.fitPreviewImage(this.activePreview)
      this.layoutCulturePreviewContent()
    }

    if (this.dialogueOpen) this.dialogueNpc.setVisible(true)
  }

  private createCombinedNushuTexture(
    targetKey: string,
    sourceKeys: readonly string[],
  ): void {
    if (this.textures.exists(targetKey)) return

    const canvas = document.createElement('canvas')
    canvas.width = sourceKeys.length * 96
    canvas.height = 128
    const context = canvas.getContext('2d')
    if (!context) return

    context.fillStyle = '#f4e4c4'
    context.fillRect(0, 0, canvas.width, canvas.height)

    sourceKeys.forEach((sourceKey, index) => {
      const source = this.textures.get(sourceKey).source[0]?.image
      if (!source) return
      context.drawImage(source as CanvasImageSource, index * 96, 0, 96, 128)
    })

    this.textures.addCanvas(targetKey, canvas)
  }

  private createDialogueGlyphTexture(
    targetKey: string,
    sourceKey: string,
  ): void {
    if (this.textures.exists(targetKey)) return

    const source = this.textures.get(sourceKey).source[0]?.image
    if (!source) return

    const sourceImage = source as HTMLImageElement
    const canvas = document.createElement('canvas')
    canvas.width = sourceImage.width
    canvas.height = sourceImage.height
    const context = canvas.getContext('2d')
    if (!context) return

    context.drawImage(sourceImage, 0, 0)
    const imageData = context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    )

    for (let index = 0; index < imageData.data.length; index += 4) {
      const red = imageData.data[index]
      const green = imageData.data[index + 1]
      const blue = imageData.data[index + 2]

      if (red > 225 && green > 225 && blue > 225) {
        imageData.data[index + 3] = 0
      } else {
        imageData.data[index] = 244
        imageData.data[index + 1] = 221
        imageData.data[index + 2] = 191
      }
    }

    context.putImageData(imageData, 0, 0)
    this.textures.addCanvas(targetKey, canvas)
  }

  private shutdown(): void {
    this.dictionaryBridge?.setFreeExplorationActive?.(false)
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this)
    if (this.bgmVolumeHandler) {
      window.removeEventListener(BGM_VOLUME_CHANGE_EVENT, this.bgmVolumeHandler)
      this.bgmVolumeHandler = null
    }
    this.sound.stopAll()
    this.restoreNpcAfterDialogue()
  }
}
