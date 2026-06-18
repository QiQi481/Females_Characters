import { useCallback, useState, useRef, useEffect } from 'react'
import './Chapter1.css'
import { ProgressStage } from '../../utils/gameSave'
import {
  dictionaryPoemLines,
  entries,
} from '../../systems/dictionary/dictionaryData'

const MOVE_SPEED = 400 // 像素/秒，与 Phaser 场景对齐

/** 场景缩放因子 — 图片会放大到视口的 N 倍，越大探索空间越多 */
const SCENE_SCALE = 2

const SCENE_IMG = '/assets/FirstLevel/mainscene.png'
const INTRO_BG_IMG = '/assets/FirstLevel/jiangyong_intro_bg.png'
const AHE_DIALOGUE_IMG = '/assets/FirstLevel/ahe-dialogue.png'
const DANIANG_DIALOGUE_IMG = '/assets/FirstLevel/daniang.png'
const CHAPTER1_INTERACT_DISTANCE = 150
const INTRO_LOADING_DELAY_MS = 500

type Chapter1InteractionId =
  | 'boundary'
  | 'mailbox'
  | 'letter'
  | 'swallow'
  | 'snow'
  | 'winejar'
  | 'label'

const CHAPTER1_INTERACTION_LABELS: Record<Chapter1InteractionId, string> = {
  boundary: '石碑',
  mailbox: '信箱',
  letter: '信件',
  swallow: '燕子',
  snow: '大娘',
  winejar: '酒坛',
  label: '标签',
}

/** 开场旁白，逐句展示 */
const NARRATION_LINES = [
  '1985年的某一天，你作为一名文字研究学生来到江永。',
  '阿禾带来一册残缺的三朝书，希望你帮她读懂阿姐留下的最后一句话。',
]

interface DialogLine {
  speaker: string
  text: string
}

/** 阿禾对话 — 旁白结束后自动触发 */
const DIALOG_LINES: DialogLine[] = [
  { speaker: '阿禾', text: '您就是来江永研究女书的学生吧？' },
  { speaker: '我',    text: '是。我还在学习，不敢说懂。' },
  { speaker: '阿禾', text: '那也请您帮我看看这本书。它是我阿姐留下的。' },
  { speaker: '我',    text: '这是……三朝书？' },
  { speaker: '阿禾', text: '嗯。不是阿姐写的，是当年姐妹送给她的。我跟祖母学过一点，只译出了几页铅笔字。' },
  { speaker: '我',    text: '大部分还能慢慢推，可最后一句对不上。' },
  { speaker: '阿禾', text: '阿姐临走前一直指着这本书。我想，她还有话留在里面。' },
  { speaker: '我',    text: '我会帮你把它读完。' },
  { speaker: '阿禾', text: '我认得几个字，却不敢确定。您能帮我一起辨一辨吗？' },
]

/** 第二段旁白 — 对话结束后触发 */
const NARRATION2_LINES = [
  '请在村落、女红房与歌堂中寻找线索，辨认字形，补全这段被尘封的女书故事。',
]

/** Quiz 题目数据 */

const QUIZ_Q1_DIALOG = '这一个女书字，我知道是指人，但是到底指的是谁呢'
const QUIZ_Q1_CHOICES = ['你', '我', '她', '他']
const QUIZ_Q1_CORRECT = 'A'

const QUIZ_Q2_DIALOG = '这四个字，我知道分别是"忘记"和"记得"的意思，可是到底谁是谁呢？'
const QUIZ_Q2_CHOICES = ['忘记、记得', '记得、忘记', '忘得、记记', '记记、忘得']
const QUIZ_Q2_CORRECT = 'A'

const QUIZ_Q3_DIALOG = '关于这个词，记忆中的信息很混乱，你能帮我梳理清楚吗？'

/** Q3 匹配游戏 — 上方左右两列词条 */
const MATCH_LEFT_ITEMS  = ['丝带笔触', '燕子', '冻僵的手', '读音']
const MATCH_RIGHT_ITEMS = ['柳条', '温暖的风', '诗', '雪']

/** Q3 匹配游戏 — 下方分类盒 */
const MATCH_CATEGORIES = ['燕子', '大娘', '酒坛']

/** Q3 匹配游戏 — 每个词条放置后阿禾的补充对话 */
const MATCH_COMMENTARY: Record<string, string> = {
  '柳条': '柳枝',
  '温暖的风': '温暖的风',
  '诗': '料X□□XX醒',
  '雪': '那天下雪...',
  '丝带笔触': '先生写这个字时，笔画像丝带',
  '燕子': '窗外有燕子叫',
  '冻僵的手': '我手冻僵了，写不稳',
  '读音': '好像有一个字念"纯"？',
}

/** Q3 匹配游戏 — 每个词条的正确分类 */
const MATCH_CORRECT: Record<string, string> = {
  '丝带笔触': '燕子',
  '燕子': '燕子',
  '柳条': '燕子',
  '冻僵的手': '大娘',
  '温暖的风': '大娘',
  '雪': '大娘',
  '读音': '酒坛',
  '诗': '酒坛',
}

/** Q3 匹配游戏 — 全部分类词条 */
const MATCH_ALL_ITEMS = [...MATCH_LEFT_ITEMS, ...MATCH_RIGHT_ITEMS]

/** Q3 匹配游戏 — 分类完成时阿禾的补充对话 */
const CATEGORY_COMPLETION: Record<string, { correct: string[]; commentary: string }> = {
  '燕子': {
    correct: ['丝带笔触', '燕子', '柳条'],
    commentary: '丝带飘起来的样子……像柳条，窗外的燕子叽叽喳喳',
  },
  '大娘': {
    correct: ['冻僵的手', '温暖的风', '雪'],
    commentary: '那天好像下雪？我的手冻僵了写不稳，先生说它是微冷的',
  },
  '酒坛': {
    correct: ['读音', '诗'],
    commentary: '我填错过很多次……',
  },
}

/** Q4 最终问答 */
const QUIZ_Q4_DIALOG = '现在你知道他们是什么意思了吗？'
const QUIZ_Q4_CHOICES = ['春风', '冬风', '春雪', '冬雪']
const QUIZ_Q4_CORRECT = 'A'

/** 获取 Quiz 错误反馈文本 */
const getQuizWrongFeedback = (question: number, choice: string): string => {
  if (question === 1) return '一般来讲，信的语法是先称呼对方。'
  if (choice === 'B') return '嗯，我不太确定'
  return '......真的有这种词存在吗？'
}

interface Chapter1Props {
  resumeProgress: number
  isDictionaryOpen: boolean
  openDictionary: () => void
  unlockEntry: (entryId: string) => void
  placedSlots: Record<string, string>
  onLeave: (progress: ProgressStage) => void
  onProgressChange: (progress: ProgressStage) => void
  onComplete: () => void
}

function Chapter1({
  resumeProgress,
  isDictionaryOpen,
  openDictionary,
  unlockEntry,
  placedSlots,
  onLeave,
  onProgressChange,
  onComplete,
}: Chapter1Props) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  // 红点在世界空间中的位置、摄影机中心在世界空间的位置（ref 用于动画帧，state 用于渲染）
  const playerWorldRef = useRef({ x: 0, y: 0 })
  const cameraRef = useRef({ x: 0, y: 0 })
  const [playerScreenDelta, setPlayerScreenDelta] = useState({ dx: 0, dy: 0 })
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 })
  const [imgReady, setImgReady] = useState(false)
  const [showBoundaryInfo, setShowBoundaryInfo] = useState(false)
  const [letterDropped, setLetterDropped] = useState(false)
  const [letterDropAnimDone, setLetterDropAnimDone] = useState(false)
  const [showLetterPopup, setShowLetterPopup] = useState(false)
  // 玩家靠近可交互物体时，只高亮最近的一个目标
  const [nearestInteractionId, setNearestInteractionId] = useState<Chapter1InteractionId | null>(null)
  const nearestInteractionRef = useRef<Chapter1InteractionId | null>(null)
  const [showSwallowInfo, setShowSwallowInfo] = useState(false)
  const [showSnowInfo, setShowSnowInfo] = useState(false)
  const [showWinejarInfo, setShowWinejarInfo] = useState(false)
  const [showLabelInfo, setShowLabelInfo] = useState(false)
  const boundaryRef = useRef<HTMLImageElement>(null)
  const mailboxRef = useRef<HTMLImageElement>(null)
  const droppedLetterRef = useRef<HTMLDivElement>(null)
  const swallowRef = useRef<HTMLImageElement>(null)
  const snowRef = useRef<HTMLImageElement>(null)
  const winejarRef = useRef<HTMLImageElement>(null)
  const labelRef = useRef<HTMLImageElement>(null)
  const [showBookPopup, setShowBookPopup] = useState(false)
  const [narrationIndex, setNarrationIndex] = useState(0)
  const [narrationDone, setNarrationDone] = useState(false)
  const [dialogIndex, setDialogIndex] = useState(0)
  const [dialogActive, setDialogActive] = useState(false)
  const [dialogFinished, setDialogFinished] = useState(false)
  const [introLoading, setIntroLoading] = useState(false)
  const [narration2Index, setNarration2Index] = useState(0)
  const [narration2Active, setNarration2Active] = useState(false)
  const [narration2Done, setNarration2Done] = useState(false)
  // 自由探索教程（narration2 结束后自动触发）
  const [tutorialPhase, setTutorialPhase] = useState<'none' | 'ahe-dialogue' | 'narration' | 'done'>('none')
  // Quiz 状态
  const [quizActive, setQuizActive] = useState(false)
  const [quizQuestion, setQuizQuestion] = useState(1) // 当前题目序号 1/2
  const [quizImageOpen, setQuizImageOpen] = useState(false)
  const [quizImageStep, setQuizImageStep] = useState(0) // 0=阿禾说话, 1=展示图片
  const [quizChoicesOpen, setQuizChoicesOpen] = useState(false)
  const [quizFeedback, setQuizFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [quizFeedbackStep, setQuizFeedbackStep] = useState(0)
  const [showGuideBookPreview, setShowGuideBookPreview] = useState(false)
  const [quizLastChoice, setQuizLastChoice] = useState('')
  const [quizDone, setQuizDone] = useState(false)
  const [quizDismissed, setQuizDismissed] = useState(false) // Q1/Q2 关闭后是否可重开
  const [quizQ1Done, setQuizQ1Done] = useState(false) // Q1 已正确完成，等待 label 触发 Q2
  const [quizQ2Done, setQuizQ2Done] = useState(false) // Q2 已正确完成，防止 label 重复触发
  const [labelStep, setLabelStep] = useState(0) // label 多段对话步骤 0-3
  // 线索发现追踪 — 7 个可交互对象
  const [clueFoundIds, setClueFoundIds] = useState<Set<string>>(new Set())
  const markClueFound = useCallback((id: string) => {
    setClueFoundIds((prev) => {
      if (prev.has(id)) return prev
      return new Set([...prev, id])
    })
  }, [])
  const [postQ1DialogueStep, setPostQ1DialogueStep] = useState(-1) // Q1正确后额外对话：-1=未激活, 0/1=阿禾, 2=旁白
  const [guideDictDone, setGuideDictDone] = useState(false) // 新手引导字典匹配已完成
  const [guideDictDismissed, setGuideDictDismissed] = useState(false) // 台词是否已关闭
  const placedSlotCountAtStartRef = useRef(Object.keys(placedSlots).length) // 进入引导时已放置的槽位数
  // Q3 匹配游戏
  const [matchActive, setMatchActive] = useState(false)
  const [matchStep, setMatchStep] = useState(0) // 0=阿禾说话, 1=阿禾提示, 2=匹配界面
  const [matchPlacements, setMatchPlacements] = useState<Record<string, string>>({})
  const [draggingItem, setDraggingItem] = useState<string | null>(null)
  const [dragOverCat, setDragOverCat] = useState<string | null>(null)
  const [matchCommentary, setMatchCommentary] = useState<string | null>(null) // 当前展示的阿禾补充对话
  const [, setMatchCategoryDone] = useState<Set<string>>(new Set()) // 已触发完成对话的分类
  const [matchCatCommentary, setMatchCatCommentary] = useState<string | null>(null) // 当前展示的分类完成对话
  const [matchAllWrong, setMatchAllWrong] = useState(false) // 全部放置但错误
  const [matchFinalStage, setMatchFinalStage] = useState(0) // Q4: 0=none, 1=阿禾提问, 2=展示图片, 3=选项
  const [matchFinalFeedback, setMatchFinalFeedback] = useState<string | null>(null) // Q4 反馈
  const [matchEverStarted, setMatchEverStarted] = useState(false) // Q3 是否已启动过
  const [matchQ3Transition, setMatchQ3Transition] = useState(false) // Q3 全部正确 → 过渡对话"去女红房"
  // 获得新字形提示
  const [glyphToast, setGlyphToast] = useState<string | null>(null)
  const glyphToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const introLoadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Quiz 相关弹窗是否开启（用于暂停 WASD）
  const isQuizBusy = showGuideBookPreview || matchQ3Transition || matchFinalStage > 0 || matchAllWrong || matchCatCommentary !== null || matchCommentary !== null || matchActive || quizImageOpen || quizChoicesOpen || quizFeedback !== null || quizActive
  const keysRef = useRef<Set<string>>(new Set())
  const animRef = useRef<number>(0)
  const vpRef = useRef({ w: window.innerWidth, h: window.innerHeight })
  const isGuideStage =
    (narration2Active && !narration2Done) ||
    (narration2Done && !guideDictDismissed)

  const getNearestInteractionId = useCallback((playerX: number, playerY: number): Chapter1InteractionId | null => {
    const fullExplorationUnlocked = guideDictDone && guideDictDismissed
    const interactions: Array<{
      id: Chapter1InteractionId
      el: HTMLElement | null
      enabled: boolean
    }> = [
      { id: 'winejar', el: winejarRef.current, enabled: fullExplorationUnlocked },
      { id: 'snow', el: snowRef.current, enabled: fullExplorationUnlocked },
      { id: 'swallow', el: swallowRef.current, enabled: fullExplorationUnlocked },
      { id: 'letter', el: droppedLetterRef.current, enabled: letterDropped },
      { id: 'mailbox', el: mailboxRef.current, enabled: !letterDropped },
      { id: 'boundary', el: boundaryRef.current, enabled: fullExplorationUnlocked },
      { id: 'label', el: labelRef.current, enabled: fullExplorationUnlocked },
    ]

    let nearestId: Chapter1InteractionId | null = null
    let nearestDistance = CHAPTER1_INTERACT_DISTANCE

    interactions.forEach(({ id, el, enabled }) => {
      if (!enabled || !el) return
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const distance = Math.hypot(cx - playerX, cy - playerY)
      if (distance < nearestDistance) {
        nearestId = id
        nearestDistance = distance
      }
    })

    return nearestId
  }, [letterDropped, guideDictDone, guideDictDismissed])

  // 预加载图片
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setImgNatural({ w: img.naturalWidth, h: img.naturalHeight })
      setImgReady(true)
    }
    img.onerror = () => console.error('场景图片加载失败:', SCENE_IMG)
    img.src = SCENE_IMG
    return () => { img.onload = null; img.onerror = null }
  }, [])

  // 缩放后的场景尺寸
  const sceneW = imgNatural.w * SCENE_SCALE
  const sceneH = imgNatural.h * SCENE_SCALE

  // 最大可平移范围
  const maxX = Math.max(0, sceneW - vpRef.current.w)
  const maxY = Math.max(0, sceneH - vpRef.current.h)

  // 键盘监听
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (isDictionaryOpen) return
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
      }
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [isDictionaryOpen])

  useEffect(() => {
    if (isDictionaryOpen) keysRef.current.clear()
  }, [isDictionaryOpen])

  useEffect(() => {
    return () => {
      if (introLoadingTimerRef.current) {
        clearTimeout(introLoadingTimerRef.current)
      }
    }
  }, [])

  // 窗口 resize
  useEffect(() => {
    const onResize = () => {
      vpRef.current = { w: window.innerWidth, h: window.innerHeight }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // 动画帧 — WASD 平移（旁白/对话/弹窗期间暂停）
  useEffect(() => {
    if (!imgReady || isDictionaryOpen || showBoundaryInfo || showLetterPopup || showSwallowInfo || showSnowInfo || showWinejarInfo || showBookPopup || isQuizBusy || !narrationDone || (dialogActive && !dialogFinished) || (narration2Active && !narration2Done) || tutorialPhase !== 'done' || postQ1DialogueStep >= 0 || (guideDictDone && !guideDictDismissed)) return

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

      // 1. 移动玩家世界坐标
      playerWorldRef.current.x += dx * speed
      playerWorldRef.current.y += dy * speed

      // 2. 摄像机跟随玩家，但限定在场景边界内
      const camX = clamp(playerWorldRef.current.x, halfW, sceneW - halfW)
      const camY = clamp(playerWorldRef.current.y, halfH, sceneH - halfH)
      cameraRef.current = { x: camX, y: camY }

      // 3. 场景偏移 = 摄像机 - 半视口
      setOffset({ x: camX - halfW, y: camY - halfH })

      // 4. 红点在屏幕上的偏移 = 玩家世界坐标 - 摄像机世界坐标
      let screenDx = playerWorldRef.current.x - camX
      let screenDy = playerWorldRef.current.y - camY

      // 5. 限制红点不超出视口
      const maxDx = halfW - 20
      const maxDy = halfH - 20
      screenDx = clamp(screenDx, -maxDx, maxDx)
      screenDy = clamp(screenDy, -maxDy, maxDy)

      // 若被钳制则同步拉回世界坐标
      if (playerWorldRef.current.x - camX !== screenDx) {
        playerWorldRef.current.x = camX + screenDx
      }
      if (playerWorldRef.current.y - camY !== screenDy) {
        playerWorldRef.current.y = camY + screenDy
      }

      setPlayerScreenDelta({ dx: screenDx, dy: screenDy })

      // 6. 高亮检测 — 使用红点的实际屏幕坐标
      const playerScrX = halfW + screenDx
      const playerScrY = halfH + screenDy
      const nearestId = getNearestInteractionId(playerScrX, playerScrY)
      nearestInteractionRef.current = nearestId
      setNearestInteractionId(nearestId)

      animRef.current = requestAnimationFrame(loop)
    }

    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [imgReady, maxX, maxY, isDictionaryOpen, showBoundaryInfo, showLetterPopup, showSwallowInfo, showSnowInfo, showWinejarInfo, showLabelInfo, showBookPopup, isQuizBusy, narrationDone, dialogActive, dialogFinished, narration2Active, narration2Done, tutorialPhase, postQ1DialogueStep, guideDictDone, guideDictDismissed, sceneW, sceneH, getNearestInteractionId])

  // 图片加载后把初始位置对齐 Phaser 场景的出生点
  useEffect(() => {
    if (!imgReady) return
    const hw = vpRef.current.w / 2
    const hh = vpRef.current.h / 2
    const startX = 400
    const startY = 750
    const clamp = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(max, v))
    const camX = clamp(startX, hw, sceneW - hw)
    const camY = clamp(startY, hh, sceneH - hh)

    cameraRef.current = { x: camX, y: camY }
    playerWorldRef.current = { x: startX, y: startY }
    setOffset({ x: camX - hw, y: camY - hh })
    setPlayerScreenDelta({ dx: startX - camX, dy: startY - camY })
  }, [imgReady, sceneW, sceneH])

  // 计算当前进度（存档用）
  const getSaveProgress = useCallback((): ProgressStage => {
    if (matchFinalStage > 0) return ProgressStage.IN_Q4
    if (matchActive) return ProgressStage.IN_MATCH
    if (quizDone) return ProgressStage.MATCH_Q3
    if (quizActive) return ProgressStage.QUIZ
    if (narration2Done) return ProgressStage.QUIZ
    if (narration2Active) return ProgressStage.NARRATION2
    if (dialogFinished) return ProgressStage.NARRATION2
    if (dialogActive || narrationDone) return ProgressStage.DIALOG
    return ProgressStage.NOT_STARTED
  }, [
    dialogActive,
    dialogFinished,
    matchActive,
    matchFinalStage,
    narration2Active,
    narration2Done,
    narrationDone,
    quizActive,
    quizDone,
    tutorialPhase,
  ])

  useEffect(() => {
    onProgressChange(getSaveProgress())
  }, [getSaveProgress, onProgressChange])

  // 新手引导：监测玩家在 post-Q1 后打开字典完成匹配并关闭
  const prevDictOpenRef = useRef(false)
  useEffect(() => {
    if (guideDictDone) return
    // 仅在 post-Q1 对话已结束、Q1已完成 的阶段才监听
    if (!quizQ1Done || postQ1DialogueStep >= 0) {
      prevDictOpenRef.current = isDictionaryOpen
      return
    }
    const placedCount = Object.keys(placedSlots).length
    // 字典从打开→关闭 且 有新的放置
    if (prevDictOpenRef.current && !isDictionaryOpen && placedCount > placedSlotCountAtStartRef.current) {
      setGuideDictDone(true)
    }
    prevDictOpenRef.current = isDictionaryOpen
  }, [isDictionaryOpen, quizQ1Done, postQ1DialogueStep, placedSlots, guideDictDone])

  const finishIntroDialog = useCallback(() => {
    setDialogFinished(true)
    setDialogActive(false)
    setIntroLoading(true)

    if (introLoadingTimerRef.current) {
      clearTimeout(introLoadingTimerRef.current)
    }

    introLoadingTimerRef.current = setTimeout(() => {
      setIntroLoading(false)
      setNarration2Active(true)
      introLoadingTimerRef.current = null
    }, INTRO_LOADING_DELAY_MS)
  }, [])

  // Tab 键捕获阶段拦截 — 教程/Q1 完成前禁止切换焦点
  useEffect(() => {
    const captureTab = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && (!narration2Done || tutorialPhase !== 'done' || !quizQ1Done)) {
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', captureTab, true) // capture phase, 最早拦截
    return () => window.removeEventListener('keydown', captureTab, true)
  }, [narration2Done, tutorialPhase, quizQ1Done])

  useEffect(() => {
    const handleHudKeyDown = (event: KeyboardEvent) => {
      if (isDictionaryOpen) return
      if (introLoading) return

      // ========== Q/ESC — 关闭当前弹窗/对话 ==========
      if (event.key === 'Escape' || event.key.toLowerCase() === 'q') {
        event.preventDefault()
        if (isGuideStage) return

        if (quizFeedback !== null) { closeQuizFeedback(); return }
        if (matchQ3Transition) { closeQ3Transition(); return }
        if (matchFinalFeedback !== null) { closeQ4Feedback(); return }
        if (matchAllWrong) { closeMatchAllWrong(); return }
        if (matchCommentary !== null) { closeMatchCommentary(); return }
        if (matchCatCommentary !== null) { closeMatchCatCommentary(); return }
        if (matchActive && matchStep <= 1) { advanceMatchStep(); return }
        if (matchActive && matchStep === 2) { closeMatchGame(); return }
        if (showBoundaryInfo) { setShowBoundaryInfo(false); return }
        if (showLetterPopup) { closeLetterPopup(); return }
        if (showSwallowInfo) { setShowSwallowInfo(false); return }
        if (showSnowInfo) { setShowSnowInfo(false); return }
        if (showWinejarInfo) { setShowWinejarInfo(false); return }
        if (showBookPopup) { handleBookPopupClose(); return }
        if (showLabelInfo) { setShowLabelInfo(false); setLabelStep(0); return }
        if (postQ1DialogueStep >= 0) { setPostQ1DialogueStep(-1); setQuizQ1Done(true); return }
        if (guideDictDone && !guideDictDismissed) { setGuideDictDismissed(true); return }

        return
      }
      // ========== E 键 — 全局推进对话/旁白/探索 ==========
      if (event.key === 'e' || event.key === 'E') {
        // Q1/Q2：反馈（正确/错误）的 阿禾回应 → 关闭
        if (quizFeedback !== null) {
          event.preventDefault()
          closeQuizFeedback()
          return
        }
        // Quiz 期间：阿禾说话 → 推进到图片展示
        if (quizImageOpen && quizImageStep === 0) {
          event.preventDefault()
          closeQuizImage()
          return
        }
        // Q3 过渡对话"去女红房" → 关闭并完成章节
        if (matchQ3Transition) {
          event.preventDefault()
          closeQ3Transition()
          return
        }
        // Q4 反馈（正确/错误）的 阿禾回应 → 关闭
        if (matchFinalFeedback !== null) {
          event.preventDefault()
          closeQ4Feedback()
          return
        }
        // Q4 阿禾提问 → 进入展示图片
        if (matchFinalStage === 1) {
          event.preventDefault()
          advanceQ4ToImages()
          return
        }
        // Q3 全错重置对话 → 关闭
        if (matchAllWrong) {
          event.preventDefault()
          closeMatchAllWrong()
          return
        }
        // Q3 匹配：阿禾说话 / 阿禾提示 → 推进
        if (matchActive && matchStep <= 1) {
          event.preventDefault()
          advanceMatchStep()
          return
        }
        // Q3 匹配：阿禾补充对话 → 关闭
        if (matchCommentary !== null) {
          event.preventDefault()
          closeMatchCommentary()
          return
        }
        // Q3 匹配：分类完成对话 → 关闭
        if (matchCatCommentary !== null) {
          event.preventDefault()
          closeMatchCatCommentary()
          return
        }
        if (showBookPopup) {
          event.preventDefault()
          handleBookPopupClose()
          return
        }
        if (showGuideBookPreview) {
          event.preventDefault()
          setShowGuideBookPreview(false)
          setPostQ1DialogueStep(0)
          return
        }
        if (showBoundaryInfo) {
          event.preventDefault()
          setShowBoundaryInfo(false)
          return
        }
        if (showLetterPopup) {
          event.preventDefault()
          closeLetterPopup()
          return
        }
        if (showSwallowInfo) {
          event.preventDefault()
          setShowSwallowInfo(false)
          return
        }
        if (showSnowInfo) {
          event.preventDefault()
          setShowSnowInfo(false)
          return
        }
        if (showWinejarInfo) {
          event.preventDefault()
          setShowWinejarInfo(false)
          return
        }
        if (showLabelInfo) {
          event.preventDefault()
          advanceLabelDialogue()
          return
        }
        if (postQ1DialogueStep >= 0) {
          event.preventDefault()
          advancePostQ1Dialogue()
          return
        }
        if (guideDictDone && !guideDictDismissed) {
          event.preventDefault()
          setGuideDictDismissed(true)
          return
        }
        if (isQuizBusy) return
        event.preventDefault()

        // 1. 开场旁白阶段
        if (!narrationDone) {
          if (narrationIndex < NARRATION_LINES.length - 1) {
            setNarrationIndex((i) => i + 1)
          } else {
            setNarrationDone(true)
            setDialogActive(true)
          }
          return
        }

        // 2. 阿禾对话阶段
        if (dialogActive && !dialogFinished) {
          if (dialogIndex === 2) {
            setShowBookPopup(true)
          } else if (dialogIndex < DIALOG_LINES.length - 1) {
            setDialogIndex((i) => i + 1)
          } else {
            finishIntroDialog()
          }
          return
        }

        // 3. 第二段旁白阶段
        if (narration2Active && !narration2Done) {
          if (narration2Index < NARRATION2_LINES.length - 1) {
            setNarration2Index((i) => i + 1)
          } else {
            setNarration2Done(true)
            setTutorialPhase('ahe-dialogue')
          }
          return
        }

        // 3.5 自由探索教程 — 阿禾对话
        if (tutorialPhase === 'ahe-dialogue') {
          setTutorialPhase('narration')
          return
        }

        // 3.6 自由探索教程 — 操作提示旁白
        if (tutorialPhase === 'narration') {
          setTutorialPhase('done')
          return
        }

        // 4. 自由探索阶段 — 触发最近的可交互物体
        if (narration2Done && !showBoundaryInfo && !showLetterPopup && !showLabelInfo) {
          const screenDx = playerWorldRef.current.x - cameraRef.current.x
          const screenDy = playerWorldRef.current.y - cameraRef.current.y
          const playerX = vpRef.current.w / 2 + screenDx
          const playerY = vpRef.current.h / 2 + screenDy

          const nearestId = getNearestInteractionId(playerX, playerY)
          nearestInteractionRef.current = nearestId
          setNearestInteractionId(nearestId)

          if (nearestId === 'winejar') {
            markClueFound('winejar')
            setShowWinejarInfo(true)
          } else if (nearestId === 'snow') {
            markClueFound('snow')
            setShowSnowInfo(true)
          } else if (nearestId === 'swallow') {
            markClueFound('swallow')
            setShowSwallowInfo(true)
          } else if (nearestId === 'letter') {
            markClueFound('letter')
            setShowLetterPopup(true)
          } else if (nearestId === 'mailbox') {
            markClueFound('mailbox')
            setLetterDropped(true)
            setLetterDropAnimDone(false) // 触发下落动画
          } else if (nearestId === 'boundary') {
            markClueFound('boundary')
            setShowBoundaryInfo(true)
          } else if (nearestId === 'label') {
            if (quizQ2Done) return // Q2 已完成，禁止重复触发
            markClueFound('label')
            setShowLabelInfo(true)
            setLabelStep(0)
          }
        }
        return
      }

      // ========== 探索阶段专属按键 ==========
      // Tab 键：教程阶段和 Q1 结束前完全禁用
      if (event.key === 'Tab') {
        event.preventDefault() // 阻止浏览器默认焦点切换
        if (!narration2Done || tutorialPhase !== 'done' || !quizQ1Done) return // 旁白提示"按 Tab"前禁止打开字典
        openDictionary()
        return
      }

      if (!narration2Done || tutorialPhase !== 'done') return

      if (event.key === 'Escape' || event.key.toLowerCase() === 'q') {
        event.preventDefault()
        if (showBookPopup) {
          handleBookPopupClose()
          return
        }
        if (showBoundaryInfo) {
          setShowBoundaryInfo(false)
          return
        }
        if (showLetterPopup) {
          closeLetterPopup()
          return
        }
        onLeave(getSaveProgress())
      }
    }

    window.addEventListener('keydown', handleHudKeyDown)
    return () => window.removeEventListener('keydown', handleHudKeyDown)
  }, [
    getSaveProgress,
    getNearestInteractionId,
    isDictionaryOpen,
    narration2Done,
    onLeave,
    openDictionary,
    showBoundaryInfo,
    showLetterPopup,
    showSwallowInfo,
    showSnowInfo,
    showWinejarInfo,
    showBookPopup,
    showGuideBookPreview,
    isQuizBusy,
    letterDropped,
    narrationDone,
    narrationIndex,
    dialogActive,
    dialogFinished,
    dialogIndex,
    narration2Active,
    narration2Index,
    quizImageOpen,
    quizImageStep,
    quizFeedback,
    quizFeedbackStep,
    quizQuestion,
    matchActive,
    matchStep,
    matchCommentary,
    matchCatCommentary,
    matchAllWrong,
    matchFinalStage,
    matchFinalFeedback,
    matchQ3Transition,
    matchEverStarted,
    showLabelInfo,
    labelStep,
    postQ1DialogueStep,
    guideDictDone,
    guideDictDismissed,
    isGuideStage,
    introLoading,
    finishIntroDialog,
    tutorialPhase,
    quizQ1Done,
  ])

  // 若已有字典放置记录（存档恢复），跳过引导对话
  useEffect(() => {
    if (Object.keys(placedSlots).length > 0) {
      setGuideDictDone(true)
      setGuideDictDismissed(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 恢复存档进度：快进到对应阶段
  useEffect(() => {
    if (resumeProgress <= ProgressStage.NOT_STARTED) return
    // 按阶段依次快进
    if (resumeProgress >= ProgressStage.DIALOG) {
      setNarrationDone(true)
      setDialogActive(true)
    }
    if (resumeProgress >= ProgressStage.NARRATION2) {
      setDialogFinished(true)
      setDialogActive(false)
      setNarration2Active(true)
    }
    if (resumeProgress >= ProgressStage.QUIZ) {
      setNarration2Done(true)
      setNarration2Active(false)
      setTutorialPhase('done')
    }
    if (resumeProgress >= ProgressStage.MATCH_Q3) {
      setQuizDone(true)
      setQuizActive(false)
      setQuizQ1Done(true)
      setQuizQ2Done(true)
    }
    if (resumeProgress >= ProgressStage.IN_MATCH) {
      // 直接打开匹配游戏
      setQuizDone(true)
      setQuizActive(false)
      setQuizQ1Done(true)
      setQuizQ2Done(true)
      setMatchActive(true)
      setMatchStep(2)
    }
    // IN_Q4 / DONE 难以精确恢复，从匹配游戏开始即可
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 仅在挂载时执行一次

  // 旁白点击：下一句 / 结束并开启对话
  const handleNarrationClick = () => {
    if (narrationIndex < NARRATION_LINES.length - 1) {
      setNarrationIndex((i) => i + 1)
    } else {
      setNarrationDone(true)
      setDialogActive(true)
    }
  }

  // 对话点击：下一句 / 弹出三朝书 / 结束并开启第二段旁白
  const handleDialogClick = () => {
    if (dialogIndex === 2) {
      // 阿禾说完"您帮我看看这个" → 弹出三朝书
      setShowBookPopup(true)
    } else if (dialogIndex < DIALOG_LINES.length - 1) {
      setDialogIndex((i) => i + 1)
    } else {
      finishIntroDialog()
    }
  }

  // 关闭三朝书，继续对话
  const handleBookPopupClose = () => {
    setShowBookPopup(false)
    setDialogIndex((i) => i + 1)
  }

  // 第二段旁白点击：下一句 / 结束
  const handleNarration2Click = () => {
    if (narration2Index < NARRATION2_LINES.length - 1) {
      setNarration2Index((i) => i + 1)
    } else {
      setNarration2Done(true)
      setTutorialPhase('ahe-dialogue')
    }
  }

  // 自由探索教程：narration2 结束后自动触发阿禾对话
  useEffect(() => {
    if (narration2Done && tutorialPhase === 'none') {
      setTutorialPhase('ahe-dialogue')
    }
  }, [narration2Done, tutorialPhase])

  // 教程阿禾对话点击
  const handleTutorialAheClick = () => {
    setTutorialPhase('narration')
  }

  // 教程旁白点击
  const handleTutorialNarrationClick = () => {
    setTutorialPhase('done')
  }

  // 关闭信件弹窗 — 首次关闭触发 Quiz
  const closeLetterPopup = () => {
    setShowLetterPopup(false)
    if (!quizActive && !quizDone && !quizDismissed && !quizQ1Done) {
      startQuizImage(1, 1)
    }
  }

  // 关闭 Quiz 图片弹窗
  const closeQuizImage = () => {
    if (quizImageStep === 0) {
      setQuizImageStep(1)
    } else {
      setQuizImageOpen(false)
      setQuizImageStep(0)
      // Q2 选项已在图片弹窗内同屏展示，无需单独打开
      if (quizQuestion !== 2) {
        setQuizChoicesOpen(true)
      } else {
        // Q2 关闭后标记可重开，退出 quiz 状态放行 WASD
        setQuizDismissed(true)
        setQuizActive(false)
      }
    }
  }

  // 重新打开 Q2 答题（关闭后重开）
  const reopenQuiz = () => {
    setQuizDismissed(false)
    setQuizActive(true)
    setQuizImageOpen(true)
    setQuizImageStep(1)
  }

  // 开始 Quiz 图片阶段
  const startQuizImage = (q: number, initialStep = 0) => {
    setQuizQuestion(q)
    setQuizActive(true)
    setQuizImageOpen(true)
    setQuizImageStep(initialStep)
  }

  // 显示"获得新字形"提示
  const showGlyphToast = (word: string) => {
    if (glyphToastTimerRef.current) clearTimeout(glyphToastTimerRef.current)
    setGlyphToast(word)
    glyphToastTimerRef.current = setTimeout(() => setGlyphToast(null), 2500)
  }

  // 获取当前题目的正确选项
  const currentCorrect = quizQuestion === 1 ? QUIZ_Q1_CORRECT : QUIZ_Q2_CORRECT

  // 选择答案
  const handleQuizChoice = (choice: string) => {
    setQuizChoicesOpen(false)
    setQuizImageOpen(false)
    setQuizImageStep(0)
    setQuizDismissed(false)
    setQuizFeedbackStep(0)
    setQuizLastChoice(choice)
    if (choice === currentCorrect) {
      setQuizFeedback('correct')
      // 解锁对应词条
      if (quizQuestion === 1) {
        unlockEntry('jun')
        unlockEntry('jun-2')
        showGlyphToast('君')
      } else {
        unlockEntry('wang')
        unlockEntry('ji')
        showGlyphToast('忘记·记得')
      }
    } else {
      setQuizFeedback('wrong')
    }
  }

  // 关闭反馈 → Q1 正确则开始 Q2，Q2 正确则结束，错误则重试
  const closeQuizFeedback = () => {
    const isCorrect = quizFeedback === 'correct'
    if (isCorrect && quizQuestion === 1 && quizFeedbackStep === 0) {
      setQuizFeedbackStep(1)
      return
    }

    setQuizFeedback(null)
    setQuizFeedbackStep(0)
    if (isCorrect) {
      if (quizQuestion === 1) {
        // Q1 正确 → 预览三朝书残卷 → 阿禾对话 + 字典教程旁白
        setQuizActive(false)
        setShowGuideBookPreview(true)
      } else {
        // Q2 正确 → 阿禾发言 → 匹配题界面 → 阿禾提示
        setQuizActive(false)
        setQuizQ2Done(true)
        setMatchEverStarted(true)
        setMatchPlacements({})
        setMatchCategoryDone(new Set())
        setMatchActive(true)
        setMatchStep(0)
      }
    } else if (quizQuestion === 1) {
      // Q1 错误：阿禾提示后直接回到同屏选择题
      setQuizQuestion(1)
      setQuizActive(true)
      setQuizImageOpen(true)
      setQuizImageStep(1)
    } else {
      // Q2 错误：重新展示四张图，看完后再选
      setQuizImageOpen(true)
      setQuizImageStep(1)
    }
  }

  // Q1 正确后的额外对话推进：阿禾两句 → 旁白 → 完成
  const advancePostQ1Dialogue = () => {
    if (postQ1DialogueStep === 0) {
      setPostQ1DialogueStep(1)
    } else if (postQ1DialogueStep === 1) {
      setPostQ1DialogueStep(2) // 进入旁白
    } else {
      setPostQ1DialogueStep(-1)
      setQuizQ1Done(true)
    }
  }

  // label 多段对话推进 → 最后一步触发 Q2
  const advanceLabelDialogue = () => {
    if (labelStep < 3) {
      setLabelStep((s) => s + 1)
    } else {
      setShowLabelInfo(false)
      setLabelStep(0)
      startQuizImage(2, 1) // 跳过 step 0 阿禾对话，因为 labelStep 3 已说过
    }
  }

  // Q3 匹配游戏 — 阿禾说完话 → 提示 → 匹配界面
  const advanceMatchStep = () => {
    if (matchStep === 0) {
      // 展示提示对话
      setMatchStep(1)
    } else if (matchStep === 1) {
      // 展示匹配界面
      setMatchPlacements({})
      setDraggingItem(null)
      setDragOverCat(null)
      setMatchCommentary(null)
      setMatchCatCommentary(null)
      setMatchCategoryDone(new Set())
      setMatchAllWrong(false)
      setMatchFinalStage(0)
      setMatchFinalFeedback(null)
      setMatchQ3Transition(false)
      setMatchStep(2)
    }
  }

  // Q3 拖拽处理
  const handleMatchDragStart = (item: string, e: React.DragEvent) => {
    setDraggingItem(item)
    e.dataTransfer.setData('text/plain', item)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleMatchDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleMatchDrop = (category: string, e: React.DragEvent) => {
    e.preventDefault()
    const item = e.dataTransfer.getData('text/plain')
    if (item) {
      setMatchPlacements((prev) => ({ ...prev, [item]: category }))
      // 放置后展示阿禾补充对话
      setMatchCommentary(item)
    }
    setDraggingItem(null)
    setDragOverCat(null)
  }

  const handleMatchDragEnd = () => {
    setDraggingItem(null)
    setDragOverCat(null)
  }

  const handleMatchDragEnter = (cat: string) => {
    setDragOverCat(cat)
  }

  const handleMatchDragLeave = (cat: string) => {
    setDragOverCat((prev) => (prev === cat ? null : prev))
  }

  // Q3 匹配游戏 — 从分类盒中移除某个已放置的词条
  const removeMatchPlacement = (item: string) => {
    setMatchPlacements((prev) => {
      const next = { ...prev }
      delete next[item]
      return next
    })
  }

  // Q3 匹配游戏 — 检查进度（分类完成 / 全部完成 / 全部错误）
  const checkMatchProgress = () => {
    // 使用函数式更新获取最新 placements
    setMatchPlacements((prev) => {
      const allPlaced = MATCH_ALL_ITEMS.every((item) => prev[item] !== undefined)
      const allCorrect = MATCH_ALL_ITEMS.every((item) => prev[item] === MATCH_CORRECT[item])

      if (allPlaced) {
        if (allCorrect) {
          // 全部正确 → 进入 Q4
          setTimeout(() => setMatchFinalStage(1), 0)
        } else {
          // 全部放置但错误 → 重置
          setTimeout(() => {
            setMatchAllWrong(true)
          }, 0)
        }
        return prev
      }

      // 检查分类是否刚完成
      setMatchCategoryDone((done) => {
        const newDone = new Set(done)
        for (const cat of MATCH_CATEGORIES) {
          if (newDone.has(cat)) continue
          const { correct } = CATEGORY_COMPLETION[cat]
          const catItems = MATCH_ALL_ITEMS.filter((item) => prev[item] === cat)
          const allCorrectInCat = correct.every((c) => catItems.includes(c))
          const noExtra = catItems.every((item) => correct.includes(item))
          if (allCorrectInCat && noExtra) {
            newDone.add(cat)
            setTimeout(() => setMatchCatCommentary(cat), 0)
            break // 一次只弹一个分类对话
          }
        }
        return newDone
      })
      return prev
    })
  }

  // Q3 匹配游戏 — 关闭阿禾补充对话
  const closeMatchCommentary = () => {
    setMatchCommentary(null)
    checkMatchProgress()
  }

  // Q3 匹配游戏 — 关闭分类完成对话
  const closeMatchCatCommentary = () => {
    setMatchCatCommentary(null)
    checkMatchProgress()
  }

  // Q3 匹配游戏 — 全错，重置
  const closeMatchAllWrong = () => {
    setMatchAllWrong(false)
    setMatchPlacements({})
    setMatchCategoryDone(new Set())
    setMatchCommentary(null)
    setMatchCatCommentary(null)
    setMatchQ3Transition(false)
  }

  // Q3 过渡对话 — 关闭并完成章节
  const closeQ3Transition = () => {
    setMatchQ3Transition(false)
    // 全部完成，清除存档
    onComplete()
    setMatchFinalFeedback(null)
    setMatchFinalStage(0)
    setMatchActive(false)
    setMatchStep(0)
    setMatchPlacements({})
    setDraggingItem(null)
    setDragOverCat(null)
    setMatchCommentary(null)
    setMatchCatCommentary(null)
    setMatchCategoryDone(new Set())
    setQuizDone(true)
  }

  // Q4 — 从提问进入展示图片
  const advanceQ4ToImages = () => {
    setMatchFinalStage(2)
  }

  // Q4 — 从图片进入选项
  const advanceQ4ToChoices = () => {
    setMatchFinalStage(3)
  }

  // Q4 — 选择答案
  const handleQ4Choice = (choiceIndex: number) => {
    const label = String.fromCharCode(65 + choiceIndex) // A/B/C/D
    if (label === QUIZ_Q4_CORRECT) {
      setMatchFinalFeedback('correct')
      unlockEntry('chunfeng')
      showGlyphToast('春风')
    } else {
      setMatchFinalFeedback('wrong')
    }
  }

  // Q4 — 关闭反馈
  const closeQ4Feedback = () => {
    if (matchFinalFeedback === 'correct') {
      // 答对春风 → 过渡对话
      setMatchFinalFeedback(null)
      setMatchFinalStage(0)
      setMatchQ3Transition(true)
    } else {
      // 答错 → 回到选项
      setMatchFinalFeedback(null)
      setMatchFinalStage(3)
    }
  }

  // Q3 匹配游戏 — 关闭匹配界面（保留已拖拽的词条状态）
  const closeMatchGame = () => {
    setMatchActive(false)
    setMatchStep(0)
    setDraggingItem(null)
    setDragOverCat(null)
    setMatchCommentary(null)
    setMatchCatCommentary(null)
    setMatchAllWrong(false)
    setMatchFinalStage(0)
    setMatchFinalFeedback(null)
    setMatchQ3Transition(false)
  }

  // 重新打开Q3匹配游戏（恢复之前已拖拽的词条）
  const reopenMatchGame = () => {
    setMatchActive(true)
    setMatchStep(2)
    setDraggingItem(null)
    setDragOverCat(null)
    setMatchCommentary(null)
    setMatchCatCommentary(null)
    setMatchAllWrong(false)
    setMatchFinalStage(0)
    setMatchFinalFeedback(null)
    setMatchQ3Transition(false)
  }

  // 线索计数：玩家交互过的线索数，达到 7/7 的完成条件为全部交互或完成 Q3
  const clueFoundCount = quizDone || matchQ3Transition
    ? 7
    : clueFoundIds.size

  const renderCharacterDialogue = ({
    speaker,
    text,
    onClick,
    portraitSrc = AHE_DIALOGUE_IMG,
    zIndex = 85,
    children,
    controlsText = 'E / 点击继续 | Q / ESC 返回',
  }: {
    speaker: string
    text?: string
    onClick: () => void
    portraitSrc?: string
    zIndex?: number
    children?: React.ReactNode
    controlsText?: string
  }) => (
    <div
      className="chapter1-dialog-layer"
      style={zIndex === 85 ? undefined : { zIndex }}
      onClick={onClick}
    >
      <img
        src={portraitSrc}
        alt={speaker}
        className="chapter1-dialog-portrait"
        draggable={false}
      />
      <section
        className="chapter1-dialog-box"
        role="dialog"
        aria-label={`${speaker}对话`}
      >
        <div className="chapter1-dialog-name">{speaker}</div>
        {children ? (
          <div className="chapter1-dialog-text">{children}</div>
        ) : text ? (
          <p className="chapter1-dialog-text" key={text}>{text}</p>
        ) : null}
      </section>
      <div className="chapter1-dialog-controls">
        {controlsText}
      </div>
    </div>
  )

  const showIntroBackdrop =
    !introLoading && (!narrationDone || (dialogActive && !dialogFinished))
  const closeGuideBookPreview = () => {
    setShowGuideBookPreview(false)
    setPostQ1DialogueStep(0)
  }

  return (
    <div className="chapter1">
      {/* 加载中 */}
      {!imgReady && (
        <div className="chapter1-loading">
          <p>场景加载中…</p>
        </div>
      )}

      {/* 场景 — 缩放后的大图 */}
      {imgReady && (
        <div
          className="chapter1-scene"
          style={{
            width: sceneW,
            height: sceneH,
            transform: `translate(${-offset.x}px, ${-offset.y}px)`,
          }}
        >
          <img
            src={SCENE_IMG}
            alt="第一关场景"
            className="chapter1-bg"
            draggable={false}
          />

          {/* 石碑装饰 — 仅 E 键交互 */}
          {!isGuideStage && (
            <img
              ref={boundaryRef}
              src="/assets/FirstLevel/boundary.png"
              alt="石碑"
              className={`chapter1-boundary${nearestInteractionId === 'boundary' ? ' boundary-near' : ''}`}
              draggable={false}
            />
          )}

          {/* 信箱装饰 — 仅 E 键交互 */}
          <img
            ref={mailboxRef}
            src="/assets/FirstLevel/letter.png"
            alt="信箱"
            className={`chapter1-mailbox${letterDropped ? ' mailbox-open' : ''}${nearestInteractionId === 'mailbox' ? ' mailbox-near' : ''}`}
            draggable={false}
          />

          {/* 燕子 — 仅 E 键交互 */}
          {!isGuideStage && (
            <img
              ref={swallowRef}
              src="/assets/FirstLevel/swallow.png"
              alt="燕子"
              className={`chapter1-swallow${nearestInteractionId === 'swallow' ? ' swallow-near' : ''}`}
              draggable={false}
            />
          )}

          {/* 雪人 — 仅 E 键交互，对话时隐藏 */}
          {!isGuideStage && !showSnowInfo && (
            <img
              ref={snowRef}
              src="/assets/FirstLevel/daniang.png"
              alt="大娘"
              className={`chapter1-snow${nearestInteractionId === 'snow' ? ' snow-near' : ''}`}
              draggable={false}
            />
          )}

          {/* 酒坛 — 仅 E 键交互 */}
          {!isGuideStage && (
            <img
              ref={winejarRef}
              src="/assets/FirstLevel/Winejar.png"
              alt="酒坛"
              className={`chapter1-winejar${nearestInteractionId === 'winejar' ? ' winejar-near' : ''}`}
              draggable={false}
            />
          )}

          {/* 标签 — 仅 E 键交互 */}
          {!isGuideStage && (
            <img
              ref={labelRef}
              src="/assets/FirstLevel/label.png"
              alt="标签"
              className={`chapter1-label${nearestInteractionId === 'label' ? ' label-near' : ''}`}
              draggable={false}
            />
          )}

          {/* 掉落的信件 — 替代图 */}
          {letterDropped && (
            <div
              ref={droppedLetterRef}
              className={`dropped-letter${!letterDropAnimDone ? ' letter-drop-anim' : ''}${nearestInteractionId === 'letter' ? ' dropped-letter-near' : ''}`}
              onAnimationEnd={() => setLetterDropAnimDone(true)}
            >
              <img src="/assets/FirstLevel/envelope.png" alt="信件" className="dropped-letter-img" />
            </div>
          )}
        </div>
      )}

      {showIntroBackdrop && (
        <div
          className="chapter1-intro-bg"
          style={{ backgroundImage: `url(${INTRO_BG_IMG})` }}
          aria-hidden="true"
        />
      )}

      {introLoading && (
        <div className="chapter1-intro-loading" role="status" aria-live="polite">
          <p className="chapter1-intro-loading-title">女书·江永</p>
          <p className="chapter1-intro-loading-subtitle">加载中……</p>
        </div>
      )}

      {showGuideBookPreview && (
        <div className="chapter1-guide-book-overlay" onClick={closeGuideBookPreview}>
          <div className="chapter1-guide-book-stage">
            <section
              className="chapter1-guide-book"
              aria-label="三朝书残卷预览"
            >
              <div className="chapter1-guide-book-meta">
                <span>三朝书残卷</span>
                <span>待补之字 14</span>
                <span>已识之字 1</span>
              </div>
              <div className="chapter1-guide-book-poem">
                {dictionaryPoemLines.map((line) => (
                  <p key={line.id}>
                    {line.segments.map((segment, index) => {
                      if (segment.type === 'text') {
                        return (
                          <span key={`${line.id}-text-${index}`}>
                            {segment.value}
                          </span>
                        )
                      }

                      const placedEntryId = placedSlots[segment.slotId]
                      const placedEntry = placedEntryId
                        ? entries.find((entry) => entry.id === placedEntryId)
                        : null
                      const isJunTarget = segment.slotId === 'line-1-lord'

                      return (
                        <span
                          className={`chapter1-guide-book-slot${
                            placedEntry ? ' is-placed' : ''
                          }${isJunTarget ? ' is-current' : ''}`}
                          key={segment.slotId}
                        >
                          {placedEntry?.label ?? segment.placeholder}
                        </span>
                      )
                    })}
                  </p>
                ))}
              </div>
            </section>
          </div>
          <div className="chapter1-object-preview-hint">
            E / 点击 继续
          </div>
        </div>
      )}



      {/* 底部操作指南 — 仅在纯自由探索时显示（无对话/弹窗/Quiz） */}
      {narration2Done &&
       tutorialPhase === 'done' &&
       postQ1DialogueStep < 0 &&
       !(guideDictDone && !guideDictDismissed) &&
       !showBoundaryInfo &&
       !showLetterPopup &&
       !showSwallowInfo &&
       !showSnowInfo &&
       !showWinejarInfo &&
       !showLabelInfo &&
       !showBookPopup &&
       !isQuizBusy && (
        <div className="chapter1-hint">
          {isGuideStage
            ? `WASD 移动 | E 交互${quizQ1Done ? ' | Tab 词典' : ''}`
            : `WASD 移动 | E 交互${quizQ1Done ? ' | Tab 词典' : ''} | Q / ESC 返回`}
        </div>
      )}

      {/* 线索交互提示 — 仅在纯自由探索时显示 */}
      {narration2Done &&
       tutorialPhase === 'done' &&
       postQ1DialogueStep < 0 &&
       !(guideDictDone && !guideDictDismissed) &&
       !showBoundaryInfo &&
       !showLetterPopup &&
       !showSwallowInfo &&
       !showSnowInfo &&
       !showWinejarInfo &&
       !showLabelInfo &&
       !showBookPopup &&
       !isQuizBusy &&
       nearestInteractionId && (
        <div className="chapter1-interact-hint">
          E 交互 · {CHAPTER1_INTERACTION_LABELS[nearestInteractionId]}
        </div>
      )}

      {/* HUD — 教程结束后进入自由探索才显示，词典按钮在 Q1 完成后才出现 */}
      {narration2Done && tutorialPhase === 'done' && postQ1DialogueStep < 0 && !(guideDictDone && !guideDictDismissed) && (
        <>
          {quizQ1Done && (
            <button
              className="chapter1-dictionary-btn"
              type="button"
              aria-label="打开词典"
              onClick={openDictionary}
            >
              <img src="/assets/ui/open_book_icon.png" alt="" />
              <span>词典</span>
            </button>
          )}
          <div className="chapter1-clue-progress">
            线索 {clueFoundCount}/7
          </div>
          <div
            className="chapter1-player-marker"
            aria-hidden="true"
            style={{
              transform: `translate(calc(-50% + ${playerScreenDelta.dx}px), calc(-50% + ${playerScreenDelta.dy}px))`,
            }}
          />
        </>
      )}

      {/* Q3 匹配游戏重开按钮 — 关闭匹配游戏后显示 */}
      {matchEverStarted && !matchActive && matchFinalStage === 0 && !quizDone && (
        <button
          className="chapter1-reopen-btn"
          onClick={reopenMatchGame}
        >
          继续回忆
        </button>
      )}

      {/* Q2 答题重开按钮 — 关闭图片弹窗后显示 */}
      {quizDismissed && !quizDone && !quizActive && (
        <button
          className="chapter1-reopen-btn"
          onClick={reopenQuiz}
        >
          继续思考
        </button>
      )}

      {/* 开场旁白 */}
      {!narrationDone && (
        <div className="narration-overlay" onClick={handleNarrationClick}>
          <div className="narration-box">
            <p className="narration-line" key={narrationIndex}>
              {NARRATION_LINES[narrationIndex]}
            </p>
            <span className="narration-click-hint">E / 点击继续</span>
          </div>
        </div>
      )}

      {/* 对话 — 旁白结束后显示 */}
      {dialogActive && !dialogFinished && renderCharacterDialogue({
        speaker: DIALOG_LINES[dialogIndex].speaker,
        text: DIALOG_LINES[dialogIndex].text,
        onClick: handleDialogClick,
        controlsText: 'E / 点击继续',
      })}

      {/* 第二段旁白 — 对话结束后显示 */}
      {narration2Active && !narration2Done && (
        <div className="narration-overlay" onClick={handleNarration2Click}>
          <div className="narration-box">
            <p className="narration-line" key={narration2Index}>
              {NARRATION2_LINES[narration2Index]}
            </p>
            <span className="narration-click-hint">E / 点击继续</span>
          </div>
        </div>
      )}

      {/* 自由探索教程 — 阿禾对话 */}
      {tutorialPhase === 'ahe-dialogue' && renderCharacterDialogue({
        speaker: '阿禾',
        text: '让我们先来看看门口这个信箱吧。',
        onClick: handleTutorialAheClick,
        controlsText: 'E / 点击继续',
      })}

      {/* 自由探索教程 — 操作提示旁白 */}
      {tutorialPhase === 'narration' && (
        <div className="narration-overlay" onClick={handleTutorialNarrationClick}>
          <div className="narration-box">
            <p className="narration-line">
              请使用 WSAD 控制小红球瞄准信箱，然后按 E 进行交互。
            </p>
            <span className="narration-click-hint">E / 点击继续</span>
          </div>
        </div>
      )}

      {/* 三朝书弹窗 — 对话中阿禾展示三朝书时触发 */}
      {showBookPopup && (
        <div className="chapter1-object-preview-overlay" onClick={handleBookPopupClose}>
          <div className="chapter1-object-preview-stage">
            <img
              src="/assets/FirstLevel/sanchaoshu.png"
              alt="三朝书"
              className="chapter1-object-preview-image chapter1-object-preview-book"
            />
          </div>
          <div className="chapter1-object-preview-hint">
            E / 点击 继续
          </div>
        </div>
      )}

      {/* 燕子信息弹窗 */}
      {showSwallowInfo && renderCharacterDialogue({
        speaker: '阿禾',
        text: '一只燕子停在柳枝上，旁边系了一根红色的丝带。这个丝带让我回想起了它的形状。',
        onClick: () => setShowSwallowInfo(false),
      })}

      {/* 雪人信息弹窗 */}
      {showSnowInfo && renderCharacterDialogue({
        speaker: '大娘',
        text: '明明已经过了2月，但这化雪的寒气，还是把手都冻僵了，天气真冷啊，要是有一阵暖风就好了',
        onClick: () => setShowSnowInfo(false),
        portraitSrc: DANIANG_DIALOGUE_IMG,
      })}

      {/* 酒坛信息弹窗 */}
      {showWinejarInfo && renderCharacterDialogue({
        speaker: '阿禾',
        text: '这是一坛纯酒，上面似乎还有一些字，料峭X风吹酒醒，看起来像是一首诗。',
        onClick: () => setShowWinejarInfo(false),
      })}

      {/* 标签多段对话 — 最后一段触发 Q2 */}
      {showLabelInfo && labelStep === 0 && renderCharacterDialogue({
        speaker: '阿禾',
        text: '这棵树下，以前有人挂小木牌。',
        onClick: advanceLabelDialogue,
      })}
      {showLabelInfo && labelStep === 1 && renderCharacterDialogue({
        speaker: '阿禾',
        text: '不是为了求什么大事，只是怕有些人、有些话，被日子冲走。',
        onClick: advanceLabelDialogue,
      })}
      {showLabelInfo && labelStep === 2 && renderCharacterDialogue({
        speaker: '阿禾',
        onClick: advanceLabelDialogue,
        children: (
          <>
            写下来，挂在这里，就是想让人
            <img
              src="/assets/FirstLevel/remember1.png"
              alt="记"
              className="chapter1-dialog-inline-img"
              draggable={false}
            />
            得。
          </>
        ),
      })}
      {showLabelInfo && labelStep === 3 && renderCharacterDialogue({
        speaker: '阿禾',
        text: '这四个字，我知道分别是忘记和记得的意思，可是到底谁是谁呢？',
        onClick: advanceLabelDialogue,
      })}

      {/* 石碑信息弹窗 */}
      {showBoundaryInfo && (
        <div className="chapter1-object-preview-overlay" onClick={() => setShowBoundaryInfo(false)}>
          <div className="chapter1-object-preview-stage">
            <div className="chapter1-object-preview-card">
              <img
                src="/assets/FirstLevel/location.png"
                alt="江永县"
                className="chapter1-object-preview-location"
              />
              <p className="chapter1-object-preview-text">
                江永县位于湖南省南部，隶属永州市，地处湘桂交界一带，拥有"女书文化"、"中国香柚之乡"的称号，古称永明，秦时立县，历史悠久。
              </p>
            </div>
          </div>
          <div className="chapter1-object-preview-hint">
            E / 点击 返回主场景 | Q / ESC 返回
          </div>
        </div>
      )}

      {/* 信件内容弹窗 */}
      {showLetterPopup && (
        <div className="chapter1-object-preview-overlay" onClick={closeLetterPopup}>
          <div className="chapter1-object-preview-stage">
            <img
              src="/assets/FirstLevel/jun.png"
              alt="信件"
              className="chapter1-object-preview-image chapter1-object-preview-jun"
            />
          </div>
          <div className="chapter1-object-preview-hint">
            E / 点击 继续
          </div>
        </div>
      )}

      {/* ===== Quiz 流程 ===== */}

      {/* Quiz 图片弹窗 — 阿禾说话 */}
      {quizImageOpen && quizImageStep === 0 && renderCharacterDialogue({
        speaker: '阿禾',
        text: quizQuestion === 1 ? QUIZ_Q1_DIALOG : QUIZ_Q2_DIALOG,
        onClick: closeQuizImage,
        controlsText: isGuideStage ? 'E / 点击继续' : undefined,
      })}

      {/* Quiz 图片弹窗 — Q1 信件同屏选择 */}
      {quizImageOpen && quizImageStep === 1 && quizQuestion === 1 && (
        <div className="quiz-context-overlay">
          <div className="quiz-context-stage">
            <div className="quiz-context-image-panel">
              <img
                src="/assets/FirstLevel/jun.png"
                alt="信件"
                className="quiz-context-letter"
              />
            </div>
            <div className="quiz-context-panel">
              <p className="quiz-context-title">
                <img
                  src="/assets/FirstLevel/Q1.png"
                  alt="女书字"
                  className="quiz-context-glyph"
                />
                <span>这个字在信中指的是谁呢？</span>
              </p>
              <div className="quiz-context-choices">
                {QUIZ_Q1_CHOICES.map((label, i) => {
                  const key = String.fromCharCode(65 + i)
                  return (
                    <button key={key} className="quiz-choice-btn" onClick={() => handleQuizChoice(key)}>
                      <span className="quiz-choice-key">{key}</span>
                      <span className="quiz-choice-label">{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quiz 图片弹窗 — Q2 四图 + 选项同屏显示 */}
      {quizImageOpen && quizImageStep === 1 && quizQuestion === 2 && (
        <div className="quiz-image-overlay">
          <div className="quiz-image-popup quiz-q2-popup" onClick={(e) => e.stopPropagation()}>
            <button className="quiz-image-close" onClick={closeQuizImage}>关闭</button>
            <div className="quiz-image-grid">
              <img src="/assets/FirstLevel/forget1.png" alt="忘记·字1" className="quiz-grid-img" />
              <img src="/assets/FirstLevel/forget2.png" alt="忘记·字2" className="quiz-grid-img" />
              <img src="/assets/FirstLevel/remember1.png" alt="记得·字1" className="quiz-grid-img" />
              <img src="/assets/FirstLevel/remember2.png" alt="记得·字2" className="quiz-grid-img" />
            </div>
            <p className="quiz-choices-title">请选择正确的含义：</p>
            <div className="quiz-choices-grid">
              {QUIZ_Q2_CHOICES.map((label, i) => {
                const key = String.fromCharCode(65 + i)
                return (
                  <button key={key} className="quiz-choice-btn" onClick={() => handleQuizChoice(key)}>
                    <span className="quiz-choice-key">{key}</span>
                    <span className="quiz-choice-label">{label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quiz 选择题 */}
      {quizChoicesOpen && (
        <div className="quiz-choices-overlay">
          <div className="quiz-choices-panel">
            <p className="quiz-choices-title">请选择正确的含义：</p>
            <div className="quiz-choices-grid">
              {(quizQuestion === 1 ? QUIZ_Q1_CHOICES : QUIZ_Q2_CHOICES).map((label, i) => {
                const key = String.fromCharCode(65 + i) // A B C D
                return (
                  <button key={key} className="quiz-choice-btn" onClick={() => handleQuizChoice(key)}>
                    <span className="quiz-choice-key">{key}</span>
                    <span className="quiz-choice-label">{label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quiz 反馈 — 阿禾回应（统一对话界面） */}
      {quizFeedback !== null && quizFeedback === 'correct' && quizQuestion === 1 && renderCharacterDialogue({
        speaker: '阿禾',
        onClick: closeQuizFeedback,
        controlsText: isGuideStage ? 'E / 点击继续' : undefined,
        children: (
          <>
            <p className="chapter1-dialog-text-line">这个字像是在称呼收信的人，也就是“你”。</p>
            {quizFeedbackStep > 0 && (
              <p className="chapter1-dialog-text-line">我们把它放回三朝书里试试吧。</p>
            )}
          </>
        ),
      })}
      {quizFeedback !== null && !(quizFeedback === 'correct' && quizQuestion === 1) && renderCharacterDialogue({
        speaker: '阿禾',
        text: quizFeedback === 'correct'
          ? '嗯，确实是这个'
          : getQuizWrongFeedback(quizQuestion, quizLastChoice),
        onClick: closeQuizFeedback,
        controlsText: isGuideStage ? 'E / 点击继续' : undefined,
      })}

      {/* Q1 正确后 — 阿禾额外对话："你"字放到字典 */}
      {(postQ1DialogueStep === 0 || postQ1DialogueStep === 1) && renderCharacterDialogue({
        speaker: '阿禾',
        onClick: advancePostQ1Dialogue,
        controlsText: 'E / 点击继续',
        children: (
          <>
            <p className="chapter1-dialog-text-line">
              它应该放在这句话里“为谁而成”的位置。
            </p>
            {postQ1DialogueStep === 1 && (
              <p className="chapter1-dialog-text-line">
                你看，空着的这一处，正好在“已为”和“成”之间。
              </p>
            )}
          </>
        ),
      })}

      {/* Q1 正确后 — 旁白：字典教程 */}
      {postQ1DialogueStep === 2 && (
        <div className="narration-overlay" onClick={advancePostQ1Dialogue}>
          <div className="narration-box">
            <p className="narration-line">
              按 Tab 键，或点击上方的
              <img
                src="/assets/ui/open_book_icon.png"
                alt="书本图标"
                className="narration-inline-book-icon"
              />
              ，可以打开词典。将解锁的字拖到三朝书残卷的方框里，位置正确即可完成解读。
            </p>
            <span className="narration-click-hint">E / 点击继续</span>
          </div>
        </div>
      )}

      {/* 新手引导：字典匹配完成后，阿禾总结 */}
      {guideDictDone && !guideDictDismissed && renderCharacterDialogue({
        speaker: '阿禾',
        text: '接下来我和您继续寻找其他线索',
        onClick: () => setGuideDictDismissed(true),
        controlsText: 'E / 点击继续',
      })}

      {/* Q3 阿禾提示 — 引导玩家去探索场景（匹配题之前） */}
      {matchActive && matchStep === 1 && renderCharacterDialogue({
        speaker: '阿禾',
        text: '如果你觉得困难，周围的环境应该还有其他的线索',
        onClick: advanceMatchStep,
        zIndex: 105,
      })}

      {/* ===== Q3 匹配游戏 ===== */}

      {/* Q3 阿禾说话 */}
      {matchActive && matchStep === 0 && renderCharacterDialogue({
        speaker: '阿禾',
        text: QUIZ_Q3_DIALOG,
        onClick: advanceMatchStep,
      })}

      {/* Q3 匹配界面 */}
      {matchActive && matchStep === 2 && (
        <div className="match-overlay">
          <div className="match-panel">
            <button className="match-close-btn" onClick={closeMatchGame}>关闭</button>

            {/* 上半部分 — 左右两列词条 */}
            <div className="match-upper">
              {/* 左列 */}
              <div className="match-column">
                {MATCH_LEFT_ITEMS.map((item, i) => (
                  <div
                    key={`L${i}`}
                    className={`match-item${draggingItem === item ? ' dragging' : ''}${matchPlacements[item] ? ' placed' : ''}`}
                    draggable
                    onDragStart={(e) => handleMatchDragStart(item, e)}
                    onDragEnd={handleMatchDragEnd}
                  >
                    {item}
                  </div>
                ))}
              </div>
              {/* 右列 */}
              <div className="match-column">
                {MATCH_RIGHT_ITEMS.map((item, i) => (
                  <div
                    key={`R${i}`}
                    className={`match-item${draggingItem === item ? ' dragging' : ''}${matchPlacements[item] ? ' placed' : ''}`}
                    draggable
                    onDragStart={(e) => handleMatchDragStart(item, e)}
                    onDragEnd={handleMatchDragEnd}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* 下半部分 — 三个分类盒 */}
            <div className="match-lower">
              {MATCH_CATEGORIES.map((cat, i) => {
                const catItems = [...MATCH_LEFT_ITEMS, ...MATCH_RIGHT_ITEMS].filter(
                  (item) => matchPlacements[item] === cat
                )
                return (
                  <div
                    key={`C${i}`}
                    className={`match-category${dragOverCat === cat ? ' drag-over' : ''}`}
                    onDragOver={handleMatchDragOver}
                    onDragEnter={() => handleMatchDragEnter(cat)}
                    onDragLeave={() => handleMatchDragLeave(cat)}
                    onDrop={(e) => handleMatchDrop(cat, e)}
                  >
                    <span className="match-cat-label">{cat}</span>
                    {catItems.length > 0 && (
                      <div className="match-cat-items">
                        {catItems.map((item, j) => (
                          <span
                            key={j}
                            className={`match-cat-chip${draggingItem === item ? ' dragging' : ''}`}
                            title="点击移除，或拖入其他盒子"
                            draggable
                            onDragStart={(e) => handleMatchDragStart(item, e)}
                            onDragEnd={handleMatchDragEnd}
                            onClick={() => removeMatchPlacement(item)}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Q3 阿禾补充对话 — 放置词条后弹出 */}
      {matchCommentary !== null && renderCharacterDialogue({
        speaker: '阿禾',
        text: MATCH_COMMENTARY[matchCommentary] || '……',
        onClick: closeMatchCommentary,
        zIndex: 105,
      })}

      {/* Q3 分类完成对话 — 某分类正确集齐 */}
      {matchCatCommentary !== null && renderCharacterDialogue({
        speaker: '阿禾',
        text: CATEGORY_COMPLETION[matchCatCommentary]?.commentary || '',
        onClick: closeMatchCatCommentary,
        zIndex: 106,
      })}

      {/* Q3 全错重置对话 */}
      {matchAllWrong && renderCharacterDialogue({
        speaker: '阿禾',
        text: '好像不太对，再试试吧',
        onClick: closeMatchAllWrong,
        zIndex: 106,
      })}

      {/* ===== Q4 最终问答 ===== */}

      {/* Q4 阿禾提问 */}
      {matchFinalStage === 1 && renderCharacterDialogue({
        speaker: '阿禾',
        text: QUIZ_Q4_DIALOG,
        onClick: advanceQ4ToImages,
        zIndex: 107,
      })}

      {/* Q4 展示两张图片 */}
      {matchFinalStage === 2 && (
        <div className="narration-overlay" style={{ zIndex: 107 }} onClick={advanceQ4ToChoices}>
          <div className="quiz-image-gallery">
            <div className="quiz-image-card">
              <img src="/assets/FirstLevel/spring1.png" alt="图1" />
            </div>
            <div className="quiz-image-card">
              <img src="/assets/FirstLevel/spring2.png" alt="图2" />
            </div>
          </div>
          <span className="quiz-click-hint">点击继续</span>
        </div>
      )}

      {/* Q4 选项 */}
      {matchFinalStage === 3 && (
        <div className="quiz-choices-overlay" style={{ zIndex: 107 }}>
          <div className="quiz-choices-panel">
            <p className="quiz-choices-title">{QUIZ_Q4_DIALOG}</p>
            <div className="quiz-choices-grid">
              {QUIZ_Q4_CHOICES.map((choice, i) => {
                const key = String.fromCharCode(65 + i)
                return (
                  <button
                    key={key}
                    className="quiz-choice-btn"
                    onClick={() => handleQ4Choice(i)}
                  >
                    <span className="quiz-choice-key">{key}</span>
                    <span className="quiz-choice-label">{choice}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Q4 反馈 */}
      {matchFinalFeedback !== null && renderCharacterDialogue({
        speaker: '阿禾',
        text: matchFinalFeedback === 'correct'
          ? '嗯，确实是这个'
          : '嗯，我觉得不太对',
        onClick: closeQ4Feedback,
        zIndex: 108,
      })}

      {/* Q3 过渡对话：答对"春风"后，阿禾说"去女红房" */}
      {matchQ3Transition && renderCharacterDialogue({
        speaker: '阿禾',
        text: '接下来让我们去女红房看看吧，那里说不定有线索',
        onClick: closeQ3Transition,
        zIndex: 108,
      })}

      {/* 获得新字形提示 */}
      {glyphToast && (
        <div className="glyph-toast" key={glyphToast}>
          <span className="glyph-toast-icon">&#10022;</span>
          <span className="glyph-toast-text">获得新字形：{glyphToast} 已加入词典</span>
        </div>
      )}

      {/* 返回主菜单按钮 */}
      {narration2Done && tutorialPhase === 'done' && postQ1DialogueStep < 0 && !isGuideStage && (
        <button
          className="chapter1-return-btn"
          type="button"
          onClick={() => onLeave(getSaveProgress())}
        >
          返回主菜单
        </button>
      )}

    </div>
  )
}

export default Chapter1

