import { useState, useRef, useEffect } from 'react'
import TitleCard from '../TitleCard/TitleCard'
import RainPhaserOverlay from './RainPhaserOverlay'
import type { DictionaryPuzzle } from '../../systems/dictionary/dictionaryData'
import { dictionaryPoemLines, entries } from '../../systems/dictionary/dictionaryData'
import type { DictionaryPoemSegment } from '../../systems/dictionary/dictionaryData'
import './ChapterNight.css'

const MOVE_SPEED = 500
const SCENE_SCALE = 1.8
const SCENE_IMG = '/assets/FirstLevel/mainscene.png'

interface ChapterNightProps {
  onReturnToMenu: () => void
  isDictionaryOpen: boolean
  openDictionary: (puzzle?: DictionaryPuzzle) => void
  unlockEntry: (entryId: string) => void
  unlockedEntryCount: number
  placedSlots: Record<string, string>
}

function ChapterNight({ onReturnToMenu, isDictionaryOpen, openDictionary, unlockEntry, unlockedEntryCount, placedSlots }: ChapterNightProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const playerWorldRef = useRef({ x: 0, y: 0 })
  const cameraRef = useRef({ x: 0, y: 0 })
  const [playerScreenDelta, setPlayerScreenDelta] = useState({ dx: 0, dy: 0 })
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 })
  const [imgReady, setImgReady] = useState(false)
  const [titleDone, setTitleDone] = useState(false)
  const keysRef = useRef<Set<string>>(new Set())
  const animRef = useRef<number>(0)
  const vpRef = useRef({ w: window.innerWidth, h: window.innerHeight })

  // 深夜阿禾对话
  const [nightDialogueStep, setNightDialogueStep] = useState(-1) // -1=不活跃, 0..n=对话步数
  const nightDialogueLinesRef = useRef<string[]>([])
  const [showRain, setShowRain] = useState(false)
  const dialogueStartedRef = useRef(false)

  // ── 结尾演出 ──
  // midnightTitle(5s,雨声渐大) → unlock 深宵+雨声 → poemHint(3s) → fillPuzzle(填词) → poemReveal(3s) → sanChaoBook → blackout → credits
  type EndingPhase = 'none' | 'midnightTitle' | 'poemHint' | 'fillPuzzle' | 'poemReveal' | 'sanChaoBook' | 'blackout' | 'credits'
  type FillPuzzleStep = 'dialogue1' | 'waitingForFill' | 'dialogue2'
  const [endingPhase, setEndingPhase] = useState<EndingPhase>('none')
  const [fillPuzzleStep, setFillPuzzleStep] = useState<FillPuzzleStep>('dialogue1')
  const [sanChaoBookDone, setSanChaoBookDone] = useState(false)
  const [rainVolume, setRainVolume] = useState(0.55)
  const endingTriggeredRef = useRef(false)
  const rainDelayRef = useRef(false)
  // 是否启用雨声（仅线索达标时启用完整对话流程）
  const rainEnabledRef = useRef(false)
  // 获得新字形提示
  const [glyphToast, setGlyphToast] = useState<string | null>(null)
  const glyphToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showGlyphToast = (word: string) => {
    if (glyphToastTimerRef.current) clearTimeout(glyphToastTimerRef.current)
    setGlyphToast(word)
    glyphToastTimerRef.current = setTimeout(() => setGlyphToast(null), 2200)
  }

  // 报幕关闭后短暂屏蔽 E 键，防止 key-repeat / 长按残留触发对话
  const eCooldownRef = useRef(false)

  // titleCard 结束后触发阿禾对话
  useEffect(() => {
    if (!titleDone) return
    const lines =
      unlockedEntryCount < 5
        ? ['夜已深了，还有一些词语没有破解，让我们继续加油吧', '其他地方的线索好像漏掉了一些']
        : [
            '已经到深夜了呢，今天真是辛苦您了，可惜我们还剩下两个字没有解开',
            '下雨了呢，淅淅沥沥的',
            '我还是想不出来',
            '千言写尽犹余半，千万句语言写到最后仍然不能写完',
            '留与XX作XX，留至什么，当作什么呢？',
            '你有答案了吗？',
          ]
    nightDialogueLinesRef.current = lines
    rainEnabledRef.current = unlockedEntryCount >= 5
    setNightDialogueStep(0)
    // 冷却期：阻止报幕关闭瞬间的 E 键残留
    eCooldownRef.current = true
    const cooldownTimer = setTimeout(() => {
      eCooldownRef.current = false
    }, 500)
    return () => clearTimeout(cooldownTimer)
  }, [titleDone, unlockedEntryCount])

  // 追踪对话是否已开始
  useEffect(() => {
    if (nightDialogueStep >= 0) {
      dialogueStartedRef.current = true
    }
  }, [nightDialogueStep])

  // 完整对话结束后触发结尾演出（雨声延迟期间不算真正结束）
  useEffect(() => {
    if (
      nightDialogueStep === -1 &&
      dialogueStartedRef.current &&
      rainEnabledRef.current &&
      !endingTriggeredRef.current &&
      !rainDelayRef.current
    ) {
      endingTriggeredRef.current = true
      dialogueStartedRef.current = false
      setEndingPhase('midnightTitle')
      setShowRain(true) // 确保雨还在下
      setRainVolume(0.55)
    }
  }, [nightDialogueStep])

  // 第二次报幕（midnightTitle）：雨声渐大 5 秒 → 解锁词条 → 自动切到第三次报幕
  useEffect(() => {
    if (endingPhase !== 'midnightTitle') return
    const startVol = 0.55
    const endVol = 1.0
    const duration = 5000
    const startTime = Date.now()

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const t = Math.min(elapsed / duration, 1)
      const vol = startVol + (endVol - startVol) * t
      setRainVolume(vol)
      if (t >= 1) {
        clearInterval(interval)
        // 解锁词条「深宵」和「雨声」
        unlockEntry('shenxiao')
        unlockEntry('yusheng')
        showGlyphToast('深宵、雨声')
        setEndingPhase('poemHint')
      }
    }, 100)

    return () => clearInterval(interval)
  }, [endingPhase, unlockEntry])

  // 第三次报幕第一段（poemHint）：停顿 3 秒 → 先展示阿禾对话，用户交互后再打开词典
  useEffect(() => {
    if (endingPhase !== 'poemHint') return
    const timer = setTimeout(() => {
      setFillPuzzleStep('dialogue1')
      setEndingPhase('fillPuzzle')
    }, 3000)
    return () => clearTimeout(timer)
  }, [endingPhase])

  // 填词阶段（fillPuzzle）：
  //   dialogue1 → 阿禾说"看起来你已经有答案了…" → 点击进 waitingForFill
  //   waitingForFill → 监听 placedSlots，两个槽都填好 → 进 dialogue2
  //   dialogue2 → 阿禾说"原来是这样…" → 点击进 poemReveal
  const advanceFillPuzzleDialogue = () => {
    if (endingPhase !== 'fillPuzzle') return
    if (fillPuzzleStep === 'dialogue1') {
      setFillPuzzleStep('waitingForFill')
      // 用户交互后才打开词典
      openDictionary()
    } else if (fillPuzzleStep === 'dialogue2') {
      setEndingPhase('poemReveal')
    }
  }

  // 监听填词进度
  useEffect(() => {
    if (endingPhase !== 'fillPuzzle' || fillPuzzleStep !== 'waitingForFill') return
    const slotsMatch =
      placedSlots['line-4-deep-night'] === 'shenxiao' &&
      placedSlots['line-4-rain-sound'] === 'yusheng'
    if (slotsMatch) {
      setFillPuzzleStep('dialogue2')
    }
  }, [endingPhase, fillPuzzleStep, placedSlots])

  // 第三次报幕第二段（poemReveal）：停顿 3 秒 → 进入三朝书补全
  useEffect(() => {
    if (endingPhase !== 'poemReveal') return
    const timer = setTimeout(() => {
      setEndingPhase('sanChaoBook')
    }, 3000)
    return () => clearTimeout(timer)
  }, [endingPhase])

  // 黑屏后进入致谢名单
  useEffect(() => {
    if (endingPhase !== 'blackout') return
    const timer = setTimeout(() => {
      setShowRain(false)
      setEndingPhase('credits')
    }, 2000)
    return () => clearTimeout(timer)
  }, [endingPhase])

  // 致谢名单：点击任意位置跳过，返回主菜单
  const skipCredits = () => {
    if (endingPhase !== 'credits') return
    onReturnToMenu()
  }

  // credits 阶段 E 键跳过
  useEffect(() => {
    if (endingPhase !== 'credits') return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onReturnToMenu()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [endingPhase, onReturnToMenu])

  // fillPuzzle 阶段 E 键推进对话
  useEffect(() => {
    if (endingPhase !== 'fillPuzzle') return
    if (fillPuzzleStep === 'waitingForFill') return // 等待填词时不拦截 E 键
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault()
        advanceFillPuzzleDialogue()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [endingPhase, fillPuzzleStep])

  // sanChaoBook 阶段：E 键 / 点击补全三朝书
  const completeSanChaoBook = () => {
    if (endingPhase !== 'sanChaoBook' || sanChaoBookDone) return
    setSanChaoBookDone(true)
  }

  const goToBlackout = () => {
    if (endingPhase !== 'sanChaoBook' || !sanChaoBookDone) return
    setEndingPhase('blackout')
  }

  useEffect(() => {
    if (endingPhase !== 'sanChaoBook') return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault()
        completeSanChaoBook()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [endingPhase, sanChaoBookDone])

  // 将诗句的 segments 展平为逐字单元格数组（供竖排渲染）
  interface VerseCell {
    char: string
    isSlot: boolean
  }

  const flattenSegments = (segments: readonly DictionaryPoemSegment[], filled: boolean, hideNonSlot = false): VerseCell[] => {
    const cells: VerseCell[] = []
    for (const seg of segments) {
      if (seg.type === 'text') {
        for (const ch of seg.value) {
          cells.push({ char: (filled || !hideNonSlot) ? ch : '○', isSlot: false })
        }
      } else {
        const entry = entries.find((e) => e.id === seg.entryId)
        const label = entry?.label ?? seg.placeholder
        for (const ch of label) {
          cells.push({ char: filled ? ch : '○', isSlot: true })
        }
      }
    }
    return cells
  }

  const isEnding = endingPhase !== 'none'

  // 阿禾说完第一条对话后开始下雨 + 1.5s 雨声先导
  const advanceNightDialogue = () => {
    if (nightDialogueStep < 0) return
    if (rainDelayRef.current) return // 雨声先导期间阻塞输入

    // 完整对话（线索达标）中，推进第一条后先播雨声，延迟再出阿禾的话
    if (nightDialogueStep === 0 && rainEnabledRef.current && !showRain) {
      setShowRain(true)
      rainDelayRef.current = true
      setNightDialogueStep(-1) // 暂时隐藏对话框
      setTimeout(() => {
        rainDelayRef.current = false
        setNightDialogueStep(1) // 1.5s 后展示"下雨了呢，淅淅沥沥的"
      }, 1500)
      return
    }

    setNightDialogueStep((prev) => {
      if (prev < 0) return prev
      if (prev + 1 >= nightDialogueLinesRef.current.length) return -1
      return prev + 1
    })
  }

  const isNightDialogueActive = nightDialogueStep >= 0

  // 预加载图片
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setImgNatural({ w: img.naturalWidth, h: img.naturalHeight })
      setImgReady(true)
    }
    img.src = SCENE_IMG
    return () => { img.onload = null }
  }, [])

  const sceneW = imgNatural.w * SCENE_SCALE
  const sceneH = imgNatural.h * SCENE_SCALE
  const maxX = Math.max(0, sceneW - vpRef.current.w)
  const maxY = Math.max(0, sceneH - vpRef.current.h)

  // 键盘监听
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (isDictionaryOpen || !titleDone || isNightDialogueActive || isEnding) return
      const k = e.key.toLowerCase()
      if (['w', 'a', 's', 'd'].includes(k)) {
        e.preventDefault()
        keysRef.current.add(k)
      }
    }
    const onUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (['w', 'a', 's', 'd'].includes(k)) {
        keysRef.current.delete(k)
        if (k === 'a') keysRef.current.delete('a')
        if (k === 'd') keysRef.current.delete('d')
        if (k === 'w') keysRef.current.delete('w')
        if (k === 's') keysRef.current.delete('s')
      }
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [isDictionaryOpen, titleDone, isNightDialogueActive, isEnding])

  useEffect(() => {
    if (isDictionaryOpen) keysRef.current.clear()
  }, [isDictionaryOpen])

  // HUD 按键（Tab 词典 / E 交互 / Q 关闭）
  useEffect(() => {
    const handleHudKeyDown = (event: KeyboardEvent) => {
      if (isDictionaryOpen || !titleDone || isEnding) return

      // 深夜对话中：E 推进对话（冷却期内忽略）
      if (isNightDialogueActive) {
        if (event.key === 'e' || event.key === 'E') {
          if (eCooldownRef.current) return
          event.preventDefault()
          advanceNightDialogue()
        }
        return
      }

      // Tab — 打开词典
      if (event.key === 'Tab') {
        event.preventDefault()
        openDictionary()
        return
      }

      // Q / ESC — 暂无弹窗可关闭，预留
      if (event.key === 'Escape' || event.key.toLowerCase() === 'q') {
        event.preventDefault()
        return
      }

      // E — 交互（暂无可交互物品，预留）
      if (event.key === 'e' || event.key === 'E') {
        event.preventDefault()
        return
      }
    }

    window.addEventListener('keydown', handleHudKeyDown)
    return () => window.removeEventListener('keydown', handleHudKeyDown)
  }, [isDictionaryOpen, titleDone, openDictionary, isNightDialogueActive, isEnding])

  // 窗口 resize
  useEffect(() => {
    const onResize = () => {
      vpRef.current = { w: window.innerWidth, h: window.innerHeight }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // 动画帧 — WASD 平移
  useEffect(() => {
    if (!imgReady || isDictionaryOpen || !titleDone || isNightDialogueActive || isEnding) return

    let lastTime = performance.now()
    const clamp = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(max, v))

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000
      lastTime = now

      let dx = 0, dy = 0
      const keys = keysRef.current
      if (keys.has('a')) dx -= 1
      if (keys.has('d')) dx += 1
      if (keys.has('w')) dy -= 1
      if (keys.has('s')) dy += 1

      if (dx !== 0 && dy !== 0) {
        dx /= Math.SQRT2
        dy /= Math.SQRT2
      }

      const speed = MOVE_SPEED * dt
      const halfW = vpRef.current.w / 2
      const halfH = vpRef.current.h / 2

      playerWorldRef.current.x += dx * speed
      playerWorldRef.current.y += dy * speed

      const camX = clamp(playerWorldRef.current.x, halfW, sceneW - halfW)
      const camY = clamp(playerWorldRef.current.y, halfH, sceneH - halfH)
      cameraRef.current = { x: camX, y: camY }

      setOffset({ x: camX - halfW, y: camY - halfH })

      let screenDx = playerWorldRef.current.x - camX
      let screenDy = playerWorldRef.current.y - camY

      const maxDx = halfW - 20
      const maxDy = halfH - 20
      screenDx = clamp(screenDx, -maxDx, maxDx)
      screenDy = clamp(screenDy, -maxDy, maxDy)

      if (playerWorldRef.current.x - camX !== screenDx) {
        playerWorldRef.current.x = camX + screenDx
      }
      if (playerWorldRef.current.y - camY !== screenDy) {
        playerWorldRef.current.y = camY + screenDy
      }

      setPlayerScreenDelta({ dx: screenDx, dy: screenDy })
      animRef.current = requestAnimationFrame(loop)
    }

    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [imgReady, maxX, maxY, isDictionaryOpen, titleDone, sceneW, sceneH, isNightDialogueActive, isEnding])

  // 初始位置：画面右下角
  useEffect(() => {
    if (!imgReady) return
    const hw = vpRef.current.w / 2
    const hh = vpRef.current.h / 2
    cameraRef.current = { x: maxX + hw, y: maxY + hh }
    playerWorldRef.current = { x: cameraRef.current.x, y: cameraRef.current.y }
    setOffset({ x: maxX, y: maxY })
    setPlayerScreenDelta({ dx: 0, dy: 0 })
  }, [imgReady, maxX, maxY])

  const handleTitleContinue = () => setTitleDone(true)

  return (
    <div className="chapter-night">
      {/* 报幕卡片 */}
      {!titleDone && (
        <TitleCard
          title="江永村：深宵"
          subtitle="夜色笼罩的江永村，似乎隐藏着结局的线索"
          onContinue={handleTitleContinue}
        />
      )}

      {/* 加载中 */}
      {!imgReady && (
        <div className="chapter-night-loading">
          <p>场景加载中…</p>
        </div>
      )}

      {/* 场景 */}
      {imgReady && titleDone && (
        <div
          className="chapter-night-scene"
          style={{
            width: sceneW,
            height: sceneH,
            transform: `translate(${-offset.x}px, ${-offset.y}px)`,
          }}
        >
          <img
            src={SCENE_IMG}
            alt="江永村夜景"
            className="chapter-night-bg"
            draggable={false}
          />
        </div>
      )}

      {/* 黑夜滤镜遮罩 */}
      {imgReady && titleDone && (
        <div className="chapter-night-overlay" />
      )}

      {/* 雨滴效果 — Phaser WebGL 渲染 */}
      <RainPhaserOverlay active={showRain} volume={rainVolume} />

      {/* 词典按钮 — 结尾演出时隐藏 */}
      {titleDone && !isEnding && (
        <button
          className="chapter-night-dictionary-btn"
          type="button"
          aria-label="打开词典"
          onClick={openDictionary}
        >
          <img src="/assets/ui/open_book_icon.png" alt="" />
          <span>词典</span>
        </button>
      )}

      {/* 操作提示 — 结尾演出时隐藏 */}
      {titleDone && !isEnding && (
        <div className="chapter-night-hint">
          WASD 移动 | E 交互 | Q/ESC 关闭 | Tab 词典
        </div>
      )}

      {/* 返回主菜单按钮 — 结尾演出时隐藏 */}
      {titleDone && !isEnding && (
        <button
          className="chapter-night-return-btn"
          type="button"
          onClick={onReturnToMenu}
        >
          返回主菜单
        </button>
      )}

      {/* 玩家标记点 — 结尾演出时隐藏 */}
      {titleDone && !isEnding && (
        <div
          className="chapter-night-player-marker"
          aria-hidden="true"
          style={{
            transform: `translate(calc(-50% + ${playerScreenDelta.dx}px), calc(-50% + ${playerScreenDelta.dy}px))`,
          }}
        />
      )}

      {/* 深夜阿禾对话 */}
      {isNightDialogueActive && (
        <div className="chapter-night-dialog-layer" onClick={advanceNightDialogue}>
          <img
            src="/assets/FirstLevel/ahe-dialogue.png"
            alt="阿禾"
            className="chapter-night-dialog-portrait"
            draggable={false}
          />
          <section
            className="chapter-night-dialog-box"
            role="dialog"
            aria-label="阿禾对话"
          >
            <div className="chapter-night-dialog-name">阿禾</div>
            <p className="chapter-night-dialog-text" key={nightDialogueStep}>
              {nightDialogueLinesRef.current[nightDialogueStep]}
            </p>
          </section>
          <div className="chapter-night-dialog-controls">
            E / 点击继续 | Q / ESC 返回
          </div>
        </div>
      )}

      {/* ────── 结尾演出 ────── */}

      {/* 第二次报幕：江永村：[midnight1][midnight2] — 不可跳过，5s 自动转场 */}
      {endingPhase === 'midnightTitle' && (
        <div className="chapter-night-ending chapter-night-ending--locked">
          <div className="chapter-night-ending-bg" />
          <div className="chapter-night-ending-content">
            <h1 className="chapter-night-ending-title">
              江永村：
              <img
                src="/assets/FirstLevel/midnight1.png"
                alt=""
                className="chapter-night-ending-char"
                draggable={false}
              />
              <img
                src="/assets/FirstLevel/midnight2.png"
                alt=""
                className="chapter-night-ending-char"
                draggable={false}
              />
            </h1>
          </div>
        </div>
      )}

      {/* 第三次报幕第一段：千言写尽犹余半，留与XX作XX — 3s 自动进入填词 */} 
      {endingPhase === 'poemHint' && (
        <div className="chapter-night-ending chapter-night-ending--locked">
          <div className="chapter-night-ending-bg" />
          <div className="chapter-night-ending-content">
            <h1 className="chapter-night-ending-title chapter-night-ending-title--poem">
              千言写尽犹余半，留与XX作XX
            </h1>
          </div>
        </div>
      )}

      {/* 填词阶段：阿禾对话 + 词典拖放 */}
      {endingPhase === 'fillPuzzle' && (
        <>
          {/* 阿禾对话 — dialogue1 */}
          {fillPuzzleStep === 'dialogue1' && (
            <div className="chapter-night-dialog-layer" style={{ zIndex: 2000 }} onClick={advanceFillPuzzleDialogue}>
              <img
                src="/assets/FirstLevel/ahe-dialogue.png"
                alt="阿禾"
                className="chapter-night-dialog-portrait"
                draggable={false}
              />
              <section className="chapter-night-dialog-box" role="dialog" aria-label="阿禾对话">
                <div className="chapter-night-dialog-name">阿禾</div>
                <p className="chapter-night-dialog-text">
                  看起来你已经有答案了，让我们填完最后这两个空吧
                </p>
              </section>
              <div className="chapter-night-dialog-controls">
                E / 点击继续
              </div>
            </div>
          )}

          {/* 等待填词 — 提示文字 */}
          {fillPuzzleStep === 'waitingForFill' && (
            <div className="chapter-night-fill-puzzle-waiting">
              将词典中的「深宵」与「雨声」拖放到诗句对应位置
            </div>
          )}

          {/* 阿禾对话 — dialogue2 */}
          {fillPuzzleStep === 'dialogue2' && (
            <div className="chapter-night-dialog-layer" style={{ zIndex: 2000 }} onClick={advanceFillPuzzleDialogue}>
              <img
                src="/assets/FirstLevel/ahe-dialogue.png"
                alt="阿禾"
                className="chapter-night-dialog-portrait"
                draggable={false}
              />
              <section className="chapter-night-dialog-box" role="dialog" aria-label="阿禾对话">
                <div className="chapter-night-dialog-name">阿禾</div>
                <p className="chapter-night-dialog-text">
                  原来是这样，千言万语写在纸上仍然没有办法写完，就让深夜的雨声替我诉说...
                </p>
              </section>
              <div className="chapter-night-dialog-controls">
                E / 点击继续
              </div>
            </div>
          )}
        </>
      )}

      {/* 第三次报幕第二段：揭示完整诗句 — 3s 后进入三朝书补全 */}
      {endingPhase === 'poemReveal' && (
        <div className="chapter-night-ending chapter-night-ending--locked">
          <div className="chapter-night-ending-bg" />
          <div className="chapter-night-ending-content">
            <h1 className="chapter-night-ending-title chapter-night-ending-title--poem">
              千言写尽犹余半，留与深宵作雨声
            </h1>
          </div>
        </div>
      )}

      {/* 三朝书补全 — 摊开书页，竖排诗句 + 空格填充 */}
      {endingPhase === 'sanChaoBook' && (
        <div
          className={`chapter-night-sanchaoshu-stage${sanChaoBookDone ? ' is-done' : ''}`}
          onClick={sanChaoBookDone ? undefined : completeSanChaoBook}
        >
          <div className="chapter-night-ending-bg" />

          {/* 摊开的三朝书 */}
          <div className={`chapter-night-sanchaoshu-book${sanChaoBookDone ? ' is-done' : ''}`}>
            {/* 左页 — 空白页面 */}
            <div className="chapter-night-sanchaoshu-page is-left">
              <div className="chapter-night-sanchaoshu-page-label">三朝书</div>
            </div>

            {/* 右页 — 全部诗句内容，E前隐藏 E后发光补全 */}
            <div className="chapter-night-sanchaoshu-page is-right">
              <div className="chapter-night-sanchaoshu-page-label">三朝书</div>
              <div className="chapter-night-sanchaoshu-poem">
                {dictionaryPoemLines.map((line) => {
                  const cells = flattenSegments(line.segments, sanChaoBookDone, true)
                  return (
                    <div className="chapter-night-sanchaoshu-poem-col" key={line.id}>
                      {cells.map((cell, ci) => {
                        const cls = sanChaoBookDone ? 'is-revealed' : 'is-hidden'
                        return (
                          <span
                            className={`chapter-night-sanchaoshu-char ${cls}`}
                            key={ci}
                            style={{ animationDelay: sanChaoBookDone ? `${ci * 0.05}s` : undefined }}
                          >
                            {cell.char}
                          </span>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 未补全时：操作提示 */}
          {!sanChaoBookDone && (
            <p className="chapter-night-sanchaoshu-hint">
              按 E 或点击补全
            </p>
          )}

          {/* 补全后：文案 + 下一页按钮 */}
          {sanChaoBookDone && (
            <div className="chapter-night-sanchaoshu-complete">
              <p className="chapter-night-sanchaoshu-text">
                三朝书上的空白，终于被补上了。
              </p>
              <p className="chapter-night-sanchaoshu-text">
                那些曾经读不懂的字，慢慢有了声音。
              </p>
              <button
                className="chapter-night-sanchaoshu-next-btn"
                type="button"
                onClick={(e) => { e.stopPropagation(); goToBlackout() }}
              >
                下一页
              </button>
            </div>
          )}
        </div>
      )}

      {/* 黑屏 */}
      {endingPhase === 'blackout' && (
        <div className="chapter-night-blackout" />
      )}

      {/* 致谢名单滚动 */}
      {endingPhase === 'credits' && (
        <div className="chapter-night-credits" onClick={skipCredits}>
          <div className="chapter-night-credits-scroll">
            <div className="chapter-night-credits-content">
              <h2 className="chapter-night-credits-title">女书：世界上唯一属于女性的文字</h2>
              <p className="chapter-night-credits-desc">女书是迄今为止世界上发现的唯一一种由女性创造、只在女性中流传和使用、并记录女性生活的文字系统。</p>

              <h3>一、什么是女书？</h3>
              <p>女书记录的是湖南江永县一带的"永明土话"，字形呈斜体修长，右高左低，纤细娟秀，与方块汉字截然不同。用不过四百余个字符，便可写出千余字的七言韵文。当地人称它"长脚蚊字"或"蚂蚁字"，学者则称之为——世界上唯一的性别文字。</p>
              <p>女书的载体也别具一格。它极少被雕刻或印刷，而是由妇女一针一线、一笔一画地书写在：精制布面手抄本（称"三朝书"，是婚嫁时的珍贵礼物）、扇面（称"歌扇"）、布帕（称"帕书"）和纸片（称"纸文"）之上。有的妇女还将女书字符绣在帕子上，称之为"绣字"。</p>

              <h3>二、她们如何传承？</h3>
              <p>女书的传习方式，本身就是一部女性相扶相助的生活史：家传式——母亲教女儿，祖母教孙女，在灶台边、油灯下代代相传。私塾式——花钱拜水平较高的专职妇女为师，系统学习。歌堂式——妇女们聚在一起做女红，一边读纸、读扇，一边互教互学。这是最常见也最富生命力的传承方式。自学式——借来或买来女书文本，照着抄写摹习。因为当地妇女几乎人人会唱女书歌，自学起来并不困难。</p>

              <h3>三、她们写了什么？</h3>
              <p>女书作品的内容，主要有：贺三朝书与婚嫁歌——新娘出嫁第三日，闺蜜姊妹以女书相赠，既是祝福也是不舍。结交老同书——"老同"即同龄结拜姊妹，她们用女书写下最深的情谊，有时胜过夫妻。自传诉苦歌——这是女书作品中最动人的部分。妇女们用女书写下自己一生的苦楚——被买卖的婚姻、婆家的苛待、丧夫失子的痛楚。这些文字从不示于男子，是她们仅有的倾诉角落。以及纪事叙事歌、祭祀祈神歌、往来书信、翻译改写传统汉文故事、耍歌民谣……</p>
              <p>可以说，女书是一种自娱自乐的苦情文学。她们在歌声中哭，在哭声中唱，在字里行间找到了与自己和解的方式。</p>

              <h3>四、它有多古老？</h3>
              <p>关于女书的起源，至今仍是谜。最早的文献记载，仅出现在民国二十年（1931年）的《湖南各县调查笔记》中："每岁五月，各乡妇女焚香膜拜，持歌扇同声高唱……其歌扇所书蝇头细字，似蒙古文。全县男子能识此种字者，余之未见。"</p>
              <p>而在当地妇女的口碑传说中，关于女书的起源有这样几种说法：九斤姑娘女红造字说——上江圩一位才华出众的九斤姑娘，为了让女子们能互相通信，创造了这种文字。荆田胡氏皇妃传书说——相传古时荆田村胡家姑娘被选入宫为妃，在宫中备受冷遇，便创造女书向家人诉苦。至今荆田村仍有"御书楼"遗址。神台买书说——相传女书是从庙里神台上"花钱买书"而来，最早的版本是用丝线绣在绸子上的。这些传说虽不可考，却共同指向一个事实：女书的诞生，是女性维护自身权益的迫切需求。</p>

              <h3>五、她们去哪了？</h3>
              <p>女书的主人去世后，人们会把她的女书作品作为殉葬品一同埋葬或焚烧——"人死书亡"。加上历次政治运动中女书被当作"妖书""妖字"屡遭批判、整筐烧毁，留存至今的古老女书文本极为稀少。现存最早的女书传本，仅可追溯到明末清初。</p>

              <h3>六、今天</h3>
              <p>20世纪80年代，学者重新"发现"了女书，这一濒临消失的文字瑰宝得以抢救和保护。2006年，女书被列入中国首批国家级非物质文化遗产名录。如今，最后一批自然传承的女书老人已然凋零。但女书的字符还在——在博物馆的展柜里，在学者的论文中，在越来越多年轻女性的笔下。</p>
              <p>她们留下的不只是一套文字，而是一个从未被倾听的世界。</p>
              <p>感谢你完成这段旅程。</p>
              <p>如果你对女书有了更多好奇——那是它最大的幸运。</p>
            </div>
          </div>
          <div className="chapter-night-credits-hint">点击任意位置继续</div>
        </div>
      )}

      {/* 获得新字形提示（对齐女工房 Phaser Toast 样式） */}
      {glyphToast && (
        <div className="chapter-night-glyph-toast" key={glyphToast}>
          <span className="chapter-night-glyph-toast-icon">&#10022;</span>
          <span className="chapter-night-glyph-toast-text">获得新字形：{glyphToast} 已加入词典</span>
        </div>
      )}
    </div>
  )
}

export default ChapterNight

