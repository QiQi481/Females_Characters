/**
 * SongUI - 场景2专属UI组件
 * 包含：线索查看弹窗、对话气泡、推测面板
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../../config';

export class SongUI {
  private scene: Phaser.Scene;

  /** 弹窗容器 */
  private popupContainer!: Phaser.GameObjects.Container;
  private popupBg!: Phaser.GameObjects.Rectangle;
  private popupTitle!: Phaser.GameObjects.Text;
  private popupText!: Phaser.GameObjects.Text;
  private popupCloseBtn!: Phaser.GameObjects.Text;

  /** 对话气泡 */
  private dialogueContainer!: Phaser.GameObjects.Container;
  private dialogueText!: Phaser.GameObjects.Text;
  private dialogueNextHint!: Phaser.GameObjects.Text;
  private dialogueIndex = 0;
  private dialogues: string[] = [];

  /** 推测面板 */
  private guessContainer!: Phaser.GameObjects.Container;
  private guessSlots: Phaser.GameObjects.Text[] = [];
  private guessEntryIds: (string | null)[] = [];
  private guessOnConfirm: ((ids: string[]) => void) | null = null;
  private guessAvailable: { id: string; char: string }[] = [];
  private guessSelectedIndex = 0;

  /** 回调：线索查看后解锁词条 */
  private onClueViewed: ((entryIds: string[]) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createPopup();
    this.createDialogueBubble();
    this.createGuessPanel();
  }

  // ==================== 线索查看弹窗 ====================

  private createPopup(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.popupContainer = this.scene.add.container(0, 0);
    this.popupContainer.setDepth(90);
    this.popupContainer.setVisible(false);

    // 遮罩
    const overlay = this.scene.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);
    overlay.setInteractive();
    this.popupContainer.add(overlay);

    // 弹窗背景
    this.popupBg = this.scene.add.rectangle(cx, cy, 560, 400, 0x2a1f14, 0.95);
    this.popupBg.setStrokeStyle(2, 0xc8a96e);
    this.popupContainer.add(this.popupBg);

    // 标题
    this.popupTitle = this.scene.add.text(cx, cy - 175, '', {
      fontSize: '20px',
      color: '#e8d5b7',
      fontFamily: 'serif',
      wordWrap: { width: 500 },
    });
    this.popupTitle.setOrigin(0.5, 0);
    this.popupContainer.add(this.popupTitle);

    // 内容
    this.popupText = this.scene.add.text(cx - 250, cy - 130, '', {
      fontSize: '15px',
      color: '#d4c5a9',
      fontFamily: 'serif',
      wordWrap: { width: 500 },
      lineSpacing: 8,
    });
    this.popupContainer.add(this.popupText);

    // 关闭按钮
    this.popupCloseBtn = this.scene.add.text(cx + 250, cy - 185, '✕ 关闭 [Q]', {
      fontSize: '14px',
      color: '#c8a96e',
      backgroundColor: '#3d2e1f',
      padding: { x: 8, y: 3 },
    });
    this.popupCloseBtn.setOrigin(1, 0);
    this.popupCloseBtn.setInteractive({ useHandCursor: true });
    this.popupCloseBtn.on('pointerdown', () => this.closePopup());
    this.popupContainer.add(this.popupCloseBtn);

    // Q键关闭弹窗
    this.scene.input.keyboard?.on('keydown-Q', () => {
      if (this.popupContainer.visible) {
        this.closePopup();
      }
    });
  }

  /** 显示线索查看弹窗 */
  showCluePopup(title: string, text: string, entryIds: string[]): void {
    this.popupTitle.setText(title);
    this.popupText.setText(text);
    this.popupContainer.setVisible(true);

    // 保存回调
    this._pendingEntryIds = entryIds;

    this.scene.scene.pause();
  }

  private _pendingEntryIds: string[] = [];

  /** 设置线索查看回调 */
  setOnClueViewed(cb: (entryIds: string[]) => void): void {
    this.onClueViewed = cb;
  }

  /** 关闭弹窗 */
  private closePopup(): void {
    this.popupContainer.setVisible(false);
    this.scene.scene.resume();

    // 触发解锁回调
    if (this.onClueViewed && this._pendingEntryIds.length > 0) {
      this.onClueViewed(this._pendingEntryIds);
      this._pendingEntryIds = [];
    }
  }

  /** 弹窗是否打开 */
  isPopupOpen(): boolean {
    return this.popupContainer.visible;
  }

  // ==================== 对话气泡 ====================

  private createDialogueBubble(): void {
    this.dialogueContainer = this.scene.add.container(0, 0);
    this.dialogueContainer.setDepth(85);
    this.dialogueContainer.setVisible(false);

    // 气泡背景
    const bubbleBg = this.scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 100, 600, 80, 0x1a1210, 0.9);
    bubbleBg.setStrokeStyle(2, 0xc8a96e);
    this.dialogueContainer.add(bubbleBg);

    // 对话文字
    this.dialogueText = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 115, '', {
      fontSize: '15px',
      color: '#e8d5b7',
      fontFamily: 'serif',
      wordWrap: { width: 560 },
      align: 'center',
    });
    this.dialogueText.setOrigin(0.5, 0);
    this.dialogueContainer.add(this.dialogueText);

    // 继续提示
    this.dialogueNextHint = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 35, '按 E 继续 | 按 Q 退出', {
      fontSize: '12px',
      color: '#a89984',
    });
    this.dialogueNextHint.setOrigin(0.5);
    this.dialogueContainer.add(this.dialogueNextHint);

    // E键翻页对话
    this.scene.input.keyboard?.on('keydown-E', () => {
      if (this.dialogueContainer.visible) {
        this.nextDialogue();
      }
    });

    // Q键退出对话
    this.scene.input.keyboard?.on('keydown-Q', () => {
      if (this.dialogueContainer.visible) {
        this.dialogueContainer.setVisible(false);
        this.scene.scene.resume();
      }
    });
  }

  /** 显示NPC对话 */
  showDialogue(dialogues: string[]): void {
    this.dialogues = dialogues;
    this.dialogueIndex = 0;
    this.dialogueContainer.setVisible(true);
    this.showCurrentDialogue();
    this.scene.scene.pause();
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
      // 对话结束
      this.dialogueContainer.setVisible(false);
      this.scene.scene.resume();
    }
  }

  /** 对话是否显示中 */
  isDialogueOpen(): boolean {
    return this.dialogueContainer.visible;
  }

  // ==================== 推测面板 ====================

  private createGuessPanel(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.guessContainer = this.scene.add.container(0, 0);
    this.guessContainer.setDepth(95);
    this.guessContainer.setVisible(false);

    // 遮罩
    const overlay = this.scene.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.75);
    overlay.setInteractive();
    this.guessContainer.add(overlay);

    // 面板背景
    const bg = this.scene.add.rectangle(cx, cy, 500, 350, 0x2a1f14, 0.95);
    bg.setStrokeStyle(2, 0xc8a96e);
    this.guessContainer.add(bg);

    // 标题
    const title = this.scene.add.text(cx, cy - 150, '🔍 推测句子含义', {
      fontSize: '22px',
      color: '#e8d5b7',
      fontFamily: 'serif',
    });
    title.setOrigin(0.5);
    this.guessContainer.add(title);

    // 说明
    const desc = this.scene.add.text(cx, cy - 110, '你已经解锁了所有词条，请推测这句话的含义：', {
      fontSize: '14px',
      color: '#a89984',
      fontFamily: 'serif',
    });
    desc.setOrigin(0.5);
    this.guessContainer.add(desc);

    // 句子槽位（4个空位）
    for (let i = 0; i < 4; i++) {
      const slotX = cx - 135 + i * 90;
      const slotY = cy - 20;

      // 槽位背景
      const slotBg = this.scene.add.rectangle(slotX, slotY, 70, 50, 0x3d2e1f);
      slotBg.setStrokeStyle(2, 0xc8a96e);
      slotBg.setInteractive({ useHandCursor: true });
      slotBg.setData('slotIndex', i);
      slotBg.on('pointerdown', () => this.onGuessSlotClick(i));
      this.guessContainer.add(slotBg);

      // 槽位文字
      const slotText = this.scene.add.text(slotX, slotY, '?', {
        fontSize: '24px',
        color: '#666',
        fontFamily: 'serif',
      });
      slotText.setOrigin(0.5);
      this.guessContainer.add(slotText);
      this.guessSlots.push(slotText);
    }

    // 可选词条区域
    const availLabel = this.scene.add.text(cx, cy + 60, '点击下方词条填入上方空位：', {
      fontSize: '13px',
      color: '#a89984',
      fontFamily: 'serif',
    });
    availLabel.setOrigin(0.5);
    this.guessContainer.add(availLabel);

    // 确认按钮
    const confirmBtn = this.scene.add.text(cx + 180, cy + 140, '✓ 确认', {
      fontSize: '16px',
      color: '#7ec87e',
      backgroundColor: '#2d3d1f',
      padding: { x: 16, y: 8 },
    });
    confirmBtn.setOrigin(0.5);
    confirmBtn.setInteractive({ useHandCursor: true });
    confirmBtn.on('pointerdown', () => this.confirmGuess());
    this.guessContainer.add(confirmBtn);

    // 取消按钮
    const cancelBtn = this.scene.add.text(cx - 180, cy + 140, '✕ 取消 [Q]', {
      fontSize: '16px',
      color: '#e07070',
      backgroundColor: '#3d1f1f',
      padding: { x: 16, y: 8 },
    });
    cancelBtn.setOrigin(0.5);
    cancelBtn.setInteractive({ useHandCursor: true });
    cancelBtn.on('pointerdown', () => this.closeGuessPanel());
    this.guessContainer.add(cancelBtn);

    this.guessEntryIds = [null, null, null, null];

    // Q键关闭推测面板
    this.scene.input.keyboard?.on('keydown-Q', () => {
      if (this.guessContainer.visible) {
        this.closeGuessPanel();
      }
    });
  }

  /**
   * 显示推测面板
   * @param available 可选的词条列表
   * @param onConfirm 确认回调
   */
  showGuessPanel(
    available: { id: string; char: string }[],
    onConfirm: (ids: string[]) => void
  ): void {
    this.guessAvailable = available;
    this.guessOnConfirm = onConfirm;
    this.guessEntryIds = [null, null, null, null];
    this.guessSelectedIndex = 0;

    // 重置槽位显示
    this.guessSlots.forEach((slot) => {
      slot.setText('?');
      slot.setColor('#666');
    });

    // 显示可选词条
    this.refreshAvailableButtons();

    this.guessContainer.setVisible(true);
    this.scene.scene.pause();
  }

  /** 刷新可选词条按钮 */
  private refreshAvailableButtons(): void {
    // 清除旧按钮（通过遍历容器子元素）
    this.guessContainer.each((child: Phaser.GameObjects.GameObject) => {
      if (child.getData && child.getData('availBtn') === true) {
        child.destroy();
      }
    });

    const cx = GAME_WIDTH / 2;
    const startX = cx - (this.guessAvailable.length * 45) / 2;

    this.guessAvailable.forEach((entry, i) => {
      const btnX = startX + i * 50;
      const btnY = GAME_HEIGHT / 2 + 90;

      const btn = this.scene.add.text(btnX, btnY, entry.char, {
        fontSize: '24px',
        color: '#ffd700',
        backgroundColor: '#3d2e1f',
        padding: { x: 10, y: 6 },
      });
      btn.setOrigin(0.5);
      btn.setInteractive({ useHandCursor: true });
      btn.setData('availBtn', true);
      btn.setData('entryId', entry.id);
      btn.on('pointerdown', () => {
        this.fillGuessSlot(entry.id, entry.char);
      });
      this.guessContainer.add(btn);
    });
  }

  /** 点击槽位填入 */
  private onGuessSlotClick(index: number): void {
    this.guessSelectedIndex = index;
  }

  /** 填入推测槽位 */
  private fillGuessSlot(entryId: string, char: string): void {
    const idx = this.guessSelectedIndex;
    this.guessEntryIds[idx] = entryId;
    this.guessSlots[idx].setText(char);
    this.guessSlots[idx].setColor('#ffd700');

    // 移到下一个空位
    for (let i = 0; i < 4; i++) {
      if (this.guessEntryIds[i] === null) {
        this.guessSelectedIndex = i;
        return;
      }
    }
    // 全部填满
    this.guessSelectedIndex = 0;
  }

  /** 确认推测 */
  private confirmGuess(): void {
    const ids = this.guessEntryIds.filter((id): id is string => id !== null);
    if (ids.length < 4) {
      // 没填满
      return;
    }
    if (this.guessOnConfirm) {
      this.guessOnConfirm(ids);
    }
    this.closeGuessPanel();
  }

  /** 关闭推测面板 */
  closeGuessPanel(): void {
    this.guessContainer.setVisible(false);
    this.scene.scene.resume();
  }

  // ==================== 销毁 ====================

  destroy(): void {
    this.popupContainer.destroy();
    this.dialogueContainer.destroy();
    this.guessContainer.destroy();
  }
}
