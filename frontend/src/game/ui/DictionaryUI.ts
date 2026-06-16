/**
 * DictionaryUI - 女书词典面板
 * 按 Tab 打开/关闭
 * 左侧：已发现的女书符号（可拖放）
 * 右侧：中文含义槽位（拖放目标）
 */
import Phaser from 'phaser';
import type { DictionaryEntry, SceneId } from '../types'
import { DictionarySystem } from '../systems/DictionarySystem'

/** 中文槽位配置 */
interface ChineseSlot {
  /** 中文含义 */
  chinese: string;
  /** 正确对应的词条ID */
  correctEntryId: string;
  /** 玩家已放入的词条ID（null = 空） */
  placedEntryId: string | null;
}

export class DictionaryUI {
  private scene: Phaser.Scene;
  private dictSystem: DictionarySystem;
  private sceneId?: SceneId

  /** 面板容器 */
  private container!: Phaser.GameObjects.Container;
  /** 半透明背景 */
  private overlay!: Phaser.GameObjects.Rectangle;
  private bg!: Phaser.GameObjects.Rectangle;
  /** 是否打开 */
  private isOpen = false;

  /** 左侧女书符号项 */
  private nvshuItems: Phaser.GameObjects.Container[] = [];
  /** 右侧中文槽位 */
  private chineseSlots: ChineseSlot[] = [];
  private slotContainers: Phaser.GameObjects.Container[] = [];

  /** 正在拖拽的对象 */
  private draggingItem: Phaser.GameObjects.Container | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private dragOriginX = 0;
  private dragOriginY = 0;
  private dragEntryId = '';

  /** 关闭按钮 */
  private closeBtn!: Phaser.GameObjects.Text;

  /** 完成提示文字 */
  private completeText!: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    dictSystem: DictionarySystem,
    sceneId?: SceneId,
  ) {
    this.scene = scene;
    this.dictSystem = dictSystem;
    this.sceneId = sceneId
    this.createPanel();
  }

  // ==================== 面板创建 ====================

  /** 创建词典面板 */
  private createPanel(): void {
    const { width, height } = this.scene.scale.gameSize
    const cx = width / 2
    const cy = height / 2

    this.container = this.scene.add.container(cx, cy);
    this.container.setDepth(100);
    this.container.setScrollFactor(0);
    this.container.setVisible(false);
    this.container.setScale(1);

    // 半透明背景遮罩
    this.overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.6);
    this.overlay.setInteractive();
    this.container.add(this.overlay);

    // 面板背景
    this.bg = this.scene.add.rectangle(0, 0, 1360, 880, 0x2a1f14, 0.95);
    this.bg.setStrokeStyle(4, 0xc8a96e);
    this.container.add(this.bg);

    // 标题
    const title = this.scene.add.text(0, -390, '📖 女书词典', {
      fontSize: '48px',
      color: '#e8d5b7',
      fontFamily: 'serif',
    });
    title.setOrigin(0.5);
    this.container.add(title);

    // 左侧标签：发现的女书
    const leftLabel = this.scene.add.text(-440, -310, '— 发现的女书符号 —', {
      fontSize: '28px',
      color: '#a89984',
    });
    leftLabel.setOrigin(0.5);
    this.container.add(leftLabel);

    // 右侧标签：中文含义
    const rightLabel = this.scene.add.text(300, -310, '— 中文含义 —', {
      fontSize: '28px',
      color: '#a89984',
    });
    rightLabel.setOrigin(0.5);
    this.container.add(rightLabel);

    // 分隔线
    const divider = this.scene.add.rectangle(-40, 0, 4, 600, 0xc8a96e, 0.3);
    this.container.add(divider);

    // 关闭按钮
    this.closeBtn = this.scene.add.text(620, -400, '✕ 关闭 [Tab]', {
      fontSize: '28px',
      color: '#c8a96e',
      backgroundColor: '#3d2e1f',
      padding: { x: 20, y: 8 },
    });
    this.closeBtn.setOrigin(1, 0);
    this.closeBtn.setInteractive({ useHandCursor: true });
    this.closeBtn.on('pointerdown', () => this.close());
    this.container.add(this.closeBtn);

    // 完成提示（初始隐藏）
    this.completeText = this.scene.add.text(0, 400, '', {
      fontSize: '32px',
      color: '#7ec87e',
      fontFamily: 'serif',
      wordWrap: { width: 1000 },
      align: 'center',
    });
    this.completeText.setOrigin(0.5);
    this.completeText.setVisible(false);
    this.container.add(this.completeText);

    // 设置 Tab 键监听（打开/关闭）
    this.scene.input.keyboard?.on('keydown-TAB', (event: KeyboardEvent) => {
      event.preventDefault();
      this.toggle();
    });

    // Q键关闭词典
    this.scene.input.keyboard?.on('keydown-Q', () => {
      if (this.isOpen) {
        this.close();
      }
    });
  }

  // ==================== 中文槽位初始化 ====================

  /**
   * 设置词典中的中文槽位
   * @param slots 槽位配置
   */
  setSlots(slots: { chinese: string; correctEntryId: string }[]): void {
    // 清除旧槽位
    this.clearAllItems();

    this.chineseSlots = slots.map((s) => ({
      chinese: s.chinese,
      correctEntryId: s.correctEntryId,
      placedEntryId: null,
    }));

    this.createSlotVisuals();
  }

  /** 创建中文槽位视觉元素 */
  private createSlotVisuals(): void {
    const startY = -240;
    const spacing = this.chineseSlots.length > 5 ? 104 : 130

    this.chineseSlots.forEach((slot, i) => {
      const x = 300;
      const y = startY + i * spacing;

      const slotContainer = this.scene.add.container(x, y);

      // 槽位圆圈背景
      const circle = this.scene.add.circle(0, 0, 44, 0x3d2e1f);
      circle.setStrokeStyle(4, 0xc8a96e);
      slotContainer.add(circle);

      // 中文文字
      const text = this.scene.add.text(80, -16, slot.chinese, {
        fontSize: '40px',
        color: '#e8d5b7',
        fontFamily: 'serif',
      });
      slotContainer.add(text);

      // 槽位放入显示区
      const placedText = this.scene.add.text(0, -16, '', {
        fontSize: '44px',
        color: '#ffd700',
        fontFamily: 'serif',
      });
      placedText.setOrigin(0.5);
      placedText.setName('placedText');
      slotContainer.add(placedText);

      const placedImage = this.scene.add.image(0, 0, '__DEFAULT')
      placedImage.setName('placedImage')
      placedImage.setDisplaySize(44, 62)
      placedImage.setVisible(false)
      slotContainer.add(placedImage)

      this.container.add(slotContainer);
      this.slotContainers.push(slotContainer);
    });
  }

  // ==================== 刷新女书符号列表 ====================

  /** 刷新左侧女书符号列表 */
  private refreshNvshuItems(): void {
    // 清除旧项
    this.clearNvshuItems();

    const unmatched = this.dictSystem.getUnmatched(this.sceneId);
    const startY = -240;
    const spacing = unmatched.length > 5 ? 96 : 110

    unmatched.forEach((entry, i) => {
      const x = -440;
      const y = startY + i * spacing;

      const item = this.createNvshuItem(x, y, entry);
      this.nvshuItems.push(item);
      this.container.add(item);
    });
  }

  /** 创建单个女书符号项 */
  private createNvshuItem(x: number, y: number, entry: DictionaryEntry): Phaser.GameObjects.Container {
    const item = this.scene.add.container(x, y);
    item.setSize(400, 90);
    item.setInteractive({ draggable: true, useHandCursor: true });
    item.setData('entryId', entry.id);

    // 背景
    const itemBg = this.scene.add.rectangle(0, 0, 400, 80, 0x3d2e1f);
    itemBg.setStrokeStyle(2, 0xc8a96e, 0.5);
    itemBg.setOrigin(0);
    item.add(itemBg);

    if (entry.imageKey && this.scene.textures.exists(entry.imageKey)) {
      const nvImage = this.scene.add.image(54, 40, entry.imageKey)
      const scale = Math.min(64 / nvImage.width, 64 / nvImage.height)
      nvImage.setScale(scale)
      item.add(nvImage)
    } else {
      const nvChar = this.scene.add.text(24, 12, entry.nushuText, {
        fontSize: '44px',
        color: '#ffd700',
        fontFamily: 'serif',
      })
      item.add(nvChar)
    }

    // 提示文字
    const hint = this.scene.add.text(104, 20, entry.hint ?? entry.meaning, {
      fontSize: '26px',
      color: '#a89984',
    });
    item.add(hint);

    // 拖拽事件
    item.on('dragstart', (pointer: Phaser.Input.Pointer) => {
      this.onDragStart(item, pointer);
    });
    item.on('drag', (pointer: Phaser.Input.Pointer) => {
      this.onDrag(pointer);
    });
    item.on('dragend', (pointer: Phaser.Input.Pointer) => {
      this.onDragEnd(pointer);
    });

    return item;
  }

  // ==================== 拖拽逻辑 ====================

  private onDragStart(item: Phaser.GameObjects.Container, pointer: Phaser.Input.Pointer): void {
    const localPointer = this.pointerToLocal(pointer);
    this.draggingItem = item;
    this.dragEntryId = item.getData('entryId') as string;
    this.dragOriginX = item.x;
    this.dragOriginY = item.y;
    this.dragOffsetX = item.x - localPointer.x;
    this.dragOffsetY = item.y - localPointer.y;
    item.setDepth(200);
  }

  private onDrag(pointer: Phaser.Input.Pointer): void {
    if (this.draggingItem) {
      const localPointer = this.pointerToLocal(pointer);
      this.draggingItem.x = localPointer.x + this.dragOffsetX;
      this.draggingItem.y = localPointer.y + this.dragOffsetY;
    }
  }

  private onDragEnd(pointer: Phaser.Input.Pointer): void {
    if (!this.draggingItem) return;
    const localPointer = this.pointerToLocal(pointer);

    // 检测是否放在某个中文槽位上
    let matched = false;
    for (let i = 0; i < this.slotContainers.length; i++) {
      const slotContainer = this.slotContainers[i];
      const slot = this.chineseSlots[i];
      const dist = Phaser.Math.Distance.Between(
        localPointer.x,
        localPointer.y,
        slotContainer.x,
        slotContainer.y
      );

      if (dist < 80 && slot.placedEntryId === null) {
        // 验证配对
        const isCorrect = this.dictSystem.tryMatch(this.dragEntryId, slot.chinese);
        if (isCorrect) {
          slot.placedEntryId = this.dragEntryId;
          // 显示女书符号在槽位中
          const placedText = slotContainer.getByName('placedText') as Phaser.GameObjects.Text;
          const placedImage = slotContainer.getByName('placedImage') as Phaser.GameObjects.Image
          const entry = this.dictSystem
            .getUnlocked(this.sceneId)
            .find((e) => e.id === this.dragEntryId);
          if (placedText && entry) {
            if (entry.imageKey && this.scene.textures.exists(entry.imageKey)) {
              placedText.setVisible(false)
              placedImage.setTexture(entry.imageKey).setVisible(true)
            } else {
              placedText.setText(entry.nushuText).setVisible(true)
              placedImage.setVisible(false)
            }
          }
          // 移除已配对的女书符号
          this.draggingItem.destroy();
          matched = true;
          this.showMessage('✓ 正确！', '#7ec87e');
        } else {
          this.showMessage('✗ 不正确，再试试', '#e07070');
        }
        break;
      }
    }

    // 未放入槽位，归位
    if (!matched && this.draggingItem && this.draggingItem.active) {
      this.draggingItem.x = this.dragOriginX;
      this.draggingItem.y = this.dragOriginY;
      this.draggingItem.setDepth(1);
    }

    this.draggingItem = null;
    this.dragEntryId = '';
  }

  private pointerToLocal(pointer: Phaser.Input.Pointer): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      pointer.x - this.container.x,
      pointer.y - this.container.y,
    );
  }

  // ==================== 提示信息 ====================

  private showMessage(text: string, color: string): void {
    this.completeText.setText(text);
    this.completeText.setColor(color);
    this.completeText.setVisible(true);
    this.scene.time.delayedCall(1500, () => {
      this.completeText.setVisible(false);
    });
  }

  // ==================== 清理 ====================

  private clearNvshuItems(): void {
    this.nvshuItems.forEach((item) => {
      if (item.active) item.destroy();
    });
    this.nvshuItems = [];
  }

  private clearAllItems(): void {
    this.clearNvshuItems();
    this.slotContainers.forEach((c) => {
      if (c.active) c.destroy();
    });
    this.slotContainers = [];
    this.chineseSlots = [];
  }

  // ==================== 开关控制 ====================

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.container.setVisible(true);
    this.refreshNvshuItems();

    // 暂停场景（可选）
    this.scene.scene.pause();
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.container.setVisible(false);
    this.clearNvshuItems();

    // 恢复场景
    this.scene.scene.resume();
  }

  isOpened(): boolean {
    return this.isOpen;
  }

  setSceneFilter(sceneId?: SceneId): void {
    this.sceneId = sceneId
    if (this.isOpen) this.refreshNvshuItems()
  }

  resize(width: number, height: number): void {
    this.container.setPosition(width / 2, height / 2);
    this.overlay.setSize(width, height);
  }

  /** 销毁词典面板 */
  destroy(): void {
    this.clearAllItems();
    this.container.destroy();
  }
}
