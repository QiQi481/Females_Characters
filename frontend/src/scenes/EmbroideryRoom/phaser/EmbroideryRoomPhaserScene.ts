import Phaser from 'phaser'
import { SaveSystem } from '../../../game/systems'
import { finalYanPuzzle, npcConfig } from '../embroideryRoomData'
import type { EmbroideryDictionaryBridge } from './EmbroideryDictionaryBridge'
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
const DIALOGUE_BOX_KEY = 'embroidery_dialogue_box'
const DIALOGUE_BOX_PATH = '/assets/ui/dialogue-box.png'
const DICTIONARY_ICON_KEY = 'open_book_icon'
const NUSHU_TOKEN = '{{nushu}}'
const EXPLORATION_CONTROLS_LABEL =
  'WASD 移动 | E 交互 | Tab 词典 | Q / ESC 返回'
const DIALOGUE_CONTROLS_LABEL = 'E / 点击继续 | Q / ESC 返回'
const DIALOGUE_TEXT_X = -390
const DIALOGUE_TEXT_Y = -55
const DIALOGUE_GLYPH_HEIGHT = 64
const DIALOGUE_GLYPH_GAP = 6
const CULTURE_PREVIEW_TEXT_WIDTH = 620
const CULTURE_PREVIEW_GAP = 48
const CULTURE_PREVIEW_IMAGE_LAYOUT_WIDTH_RATIO = 0.56
const CULTURE_PREVIEW_MAX_IMAGE_WIDTH_RATIO = 0.52
const CULTURE_PREVIEW_MAX_IMAGE_HEIGHT_RATIO = 0.72
const CULTURE_PREVIEW_IMAGE_OFFSET_X = -90
const CULTURE_PREVIEW_IMAGE_OFFSET_Y = 0
const CULTURE_PREVIEW_TITLE_BODY_GAP = 42
const PLAYER_START_POSITION = { x: 400, y: 400 } as const
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
  private interactionLabels = new Map<string, Phaser.GameObjects.Text>()
  private interactionBaseScales = new Map<
    string,
    { scaleX: number; scaleY: number }
  >()
  private interactionTweens = new Map<string, Phaser.Tweens.Tween>()
  private nearestInteraction: EmbroideryInteraction | null = null

  private interactHint!: Phaser.GameObjects.Container
  private interactHintText!: Phaser.GameObjects.Text
  private clueProgressText!: Phaser.GameObjects.Text
  private controlsText!: Phaser.GameObjects.Text
  private dictionaryButton!: Phaser.GameObjects.Image
  private toastText!: Phaser.GameObjects.Text

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
  private dialogueBox!: Phaser.GameObjects.Image
  private dialogueName!: Phaser.GameObjects.Text
  private dialogueBefore!: Phaser.GameObjects.Text
  private dialoguePrefix!: Phaser.GameObjects.Text
  private dialogueSuffix!: Phaser.GameObjects.Text
  private dialogueSolvedText!: Phaser.GameObjects.Text
  private dialogueGlyphContainer!: Phaser.GameObjects.Container
  private dialogueHint!: Phaser.GameObjects.Text
  private dialogueOpen = false
  private npcDialogueMode: NpcDialogueMode = 'none'
  private npcDialogueLineIndex = 0
  private finalYanUnlocked = false
  private finalYanPromptShown = false
  private introDialogueState: IntroDialogueState = 'pending'
  private focusedNpc?: Phaser.GameObjects.Image
  private focusedNpcState?: {
    x: number
    y: number
    displayWidth: number
    displayHeight: number
    depth: number
    alpha: number
  }

  constructor() {
    super({ key: EMBROIDERY_ROOM_SCENE_KEY })
  }

  preload(): void {
    this.load.image(BACKGROUND_KEY, BACKGROUND_PATH)
    this.load.image(DIALOGUE_BOX_KEY, DIALOGUE_BOX_PATH)

    EMBROIDERY_INTERACTIONS.forEach((interaction) => {
      this.load.image(interaction.textureKey, interaction.imagePath)
    })

    EMBROIDERY_NUSHU_ASSETS.forEach(([key, path]) => {
      this.load.image(key, path)
    })
  }

  create(): void {
    this.introDialogueState = 'pending'

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

    this.createInteractionObjects()
    this.createPlayer()
    this.createHud()
    this.createPreviewPanel()
    this.createDialogueBox()

    this.bindKeys()
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this)
    this.startIntroDialogue()
  }

  update(): void {
    this.refreshFinalYanUnlock()

    if (this.isGlobalDictionaryOpen) {
      this.player.setVelocity(0, 0)
      return
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyTab)) {
      if (!this.dialogueOpen) this.openGlobalDictionary()
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

      const label = this.add.text(
        interaction.x,
        interaction.y + image.displayHeight / 2 - 16,
        interaction.title,
        {
          fontSize: '28px',
          color: '#6f2926',
          backgroundColor: 'rgba(244, 226, 191, 0.88)',
          padding: { x: 12, y: 6 },
          fontFamily: '"SimSun", "Microsoft YaHei", serif',
        },
      )
      label.setOrigin(0.5)
      label.setDepth(9)
      label.setVisible(false)
      this.interactionLabels.set(interaction.id, label)
    })
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

    this.controlsText = this.add.text(
      width / 2,
      height - 24,
      EXPLORATION_CONTROLS_LABEL,
      {
        fontSize: '22px',
        color: '#4d3b34',
        backgroundColor: 'rgba(244, 226, 191, 0.82)',
        padding: { x: 14, y: 7 },
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
    this.interactHint = this.add.container(width / 2, height - 105, [
      hintBackground,
      this.interactHintText,
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

    this.dialoguePrefix = this.add.text(DIALOGUE_TEXT_X, DIALOGUE_TEXT_Y, '', {
      fontSize: '29px',
      color: '#f1f1ee',
      fontFamily: '"SimSun", "Microsoft YaHei", serif',
    })

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
      .setVisible(true)
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
      this.interactHintText.setText(this.getInteractionHintText(nearest))
    }
  }

  private getInteractionHintText(interaction: EmbroideryInteraction): string {
    if (interaction.category !== 'npc') {
      return `E 交互 · ${interaction.title}`
    }

    return this.introDialogueState !== 'complete'
      ? `E 交互 · 与${npcConfig.name}交谈`
      : `E 交互 · ${npcConfig.name}似乎还有话想对你说`
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

    const phase = this.activePreview.phases[this.previewPhase]
    if (phase.display === 'culture' && !this.culturePreviewTextVisible) {
      this.culturePreviewTextVisible = true
      this.showCulturePreviewText()
      return
    }

    this.advanceInteractionPhase()
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
        this.showToast('获得新字形：？？？\n已加入词典')
      }
    }

    this.updateClueProgress()
    this.closePreview()
  }

  private advanceInteractionPhase(): void {
    if (!this.activePreview) return

    if (this.previewPhase < this.activePreview.phases.length - 1) {
      this.previewPhase += 1
      this.showCurrentInteractionPhase()
      return
    }

    this.completeActiveInteraction()
  }

  private showCurrentInteractionPhase(): void {
    if (!this.activePreview) return

    const phase = this.activePreview.phases[this.previewPhase]
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

    const phase = this.activePreview.phases[this.previewPhase]
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

    return this.previewPhase === this.activePreview.phases.length - 1
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

  private closePreview(): void {
    this.activePreview = null
    this.culturePreviewTextVisible = false
    this.previewContainer.setVisible(false)
    this.setCulturePreviewTextVisible(false)
    this.showExplorationControls()
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
  }

  private finishIntroDialogue(): void {
    if (this.introDialogueState === 'complete') return

    this.introDialogueState = 'complete'
    this.dialogueOpen = false
    this.npcDialogueMode = 'none'
    this.dialogueContainer.setVisible(false)
    this.restoreNpcAfterDialogue()
    this.setIntroInteractionVisibility(true)
    this.dictionaryButton.setVisible(true)
    this.showExplorationControls()
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
      return
    }
    this.showExplorationControls()
    if (closedMode === 'summary') this.completeEmbroideryRoom()
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
    }

    const { width, height } = this.scale.gameSize
    const targetHeight = Math.min(height * 1.6, 1800)
    const targetWidth = targetHeight * (npc.width / npc.height)

    npc
      .setScrollFactor(0)
      .setPosition(width / 2, height * 0.9)
      .setDisplaySize(targetWidth, targetHeight)
      .setDepth(84)
      .setBlendMode(Phaser.BlendModes.NORMAL)
      .setAlpha(1)
    this.interactionLabels.get(npcInteraction.id)?.setVisible(false)
  }

  private restoreNpcAfterDialogue(): void {
    if (!this.focusedNpc || !this.focusedNpcState) return

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

    const [prefix, suffix] = line.split(NUSHU_TOKEN)
    this.dialogueBefore.setVisible(false)

    if (suffix === undefined) {
      this.dialoguePrefix.setVisible(false)
      this.dialogueSuffix.setVisible(false)
      this.clearDialogueGlyphs()
      this.dialogueSolvedText.setText(line).setVisible(true)
    } else {
      this.dialogueSolvedText.setVisible(false)
      this.dialoguePrefix.setText(prefix).setVisible(true)
      const prefixWidth = this.dialoguePrefix.width
      const glyphWidth = this.renderDialogueGlyphs(
        this.getDialogueGlyphTextureKeys(),
      )
      this.dialogueGlyphContainer
        .setPosition(
          DIALOGUE_TEXT_X + prefixWidth + 10,
          DIALOGUE_TEXT_Y + DIALOGUE_GLYPH_HEIGHT / 2,
        )
        .setVisible(true)
      this.dialogueSuffix
        .setText(suffix)
        .setPosition(
          DIALOGUE_TEXT_X + prefixWidth + glyphWidth + 20,
          DIALOGUE_TEXT_Y,
        )
        .setVisible(true)
    }

    this.controlsText.setText(
      `${this.npcDialogueLineIndex + 1} / ${lines.length}  |  ${DIALOGUE_CONTROLS_LABEL}`,
    )
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
    return this.activePreview?.phases[this.previewPhase]
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

  private renderDialogueGlyphs(sourceTextureKeys: readonly string[]): number {
    this.dialogueGlyphContainer.removeAll(true)

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
        .setDisplaySize(glyphWidth, DIALOGUE_GLYPH_HEIGHT)
        .setOrigin(0, 0.5)
      this.dialogueGlyphContainer.add(glyph)
      glyphX += glyphWidth + DIALOGUE_GLYPH_GAP
    })

    const totalWidth = Math.max(glyphX - DIALOGUE_GLYPH_GAP, 1)
    this.dialogueGlyphContainer.setSize(totalWidth, DIALOGUE_GLYPH_HEIGHT)
    const hitArea = this.dialogueGlyphContainer.input
      ?.hitArea as Phaser.Geom.Rectangle | undefined
    hitArea?.setTo(
      0,
      -DIALOGUE_GLYPH_HEIGHT / 2,
      totalWidth,
      DIALOGUE_GLYPH_HEIGHT,
    )

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
      this.showToast('获得新字形：？？？\n已加入词典')
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
  }

  setGlobalDictionaryOpen(isOpen: boolean): void {
    this.isGlobalDictionaryOpen = isOpen
    if (isOpen) this.player?.setVelocity(0, 0)
  }

  private getClueProgressLabel(): string {
    const foundCount = MAIN_CLUE_IDS.filter((clueId) =>
      this.saveSystem?.isClueDiscovered(clueId),
    ).length
    return `线索 ${foundCount}/${MAIN_CLUE_IDS.length}`
  }

  private updateClueProgress(): void {
    this.clueProgressText.setText(this.getClueProgressLabel())
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
      this.showToast(`${npcConfig.name}似乎还有话想对你说。`)
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
    this.toastText.setText(message).setVisible(true)
    this.time.delayedCall(2200, () => {
      if (this.toastText.active) this.toastText.setVisible(false)
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
    this.clueProgressText.setPosition(width - 24, 24)
    this.controlsText.setPosition(width / 2, height - 24)
    this.interactHint.setPosition(width / 2, height - 105)
    this.toastText.setPosition(width / 2, 100)
    this.previewContainer.setPosition(width / 2, height / 2)
    this.previewOverlay.setSize(width, height)
    this.previewHint.setPosition(0, height / 2 - 55)
    this.dialogueContainer.setPosition(width / 2, height - 175)
    this.dialogueBox.setDisplaySize(Math.min(width * 0.88, 1500), 300)

    if (this.activePreview && this.previewContainer.visible) {
      this.fitPreviewImage(this.activePreview)
      this.layoutCulturePreviewContent()
    }

    if (this.dialogueOpen && this.focusedNpc) {
      const targetHeight = Math.min(height * 1.6, 1800)
      const targetWidth =
        targetHeight * (this.focusedNpc.width / this.focusedNpc.height)
      this.focusedNpc
        .setPosition(width / 2, height * 0.9)
        .setDisplaySize(targetWidth, targetHeight)
    }
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
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this)
    this.restoreNpcAfterDialogue()
  }
}
