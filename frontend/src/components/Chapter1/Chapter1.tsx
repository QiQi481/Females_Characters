import { useCallback, useState, useRef, useEffect } from 'react'
import './Chapter1.css'
import { ProgressStage } from '../../utils/gameSave'

const MOVE_SPEED = 500 // 像素/秒

/** 场景缩放因子 — 图片会放大到视口的 N 倍，越大探索空间越多 */
const SCENE_SCALE = 2.5

const SCENE_IMG = '/assets/FirstLevel/mainscene.png'

/** 开场旁白，逐句展示 */
const NARRATION_LINES = [
  '1985年的某一天',
  '你来到了江永做田野调查，考察学习女书文字',
  '一名叫阿禾的女人听说村里来了"专家"，迫切地将一份资料带到了你的身前',
  '你不是什么专家，你只是一个研究字的学生',
  '你在书本上见过女书的拓片，但从未真正阅读过一份活的三朝书',
  '你认得它的形状，却不认得它的语言',
]

interface DialogLine {
  speaker: string
  text: string
}

/** 阿禾对话 — 旁白结束后自动触发 */
const DIALOG_LINES: DialogLine[] = [
  { speaker: '阿禾', text: '您就是村里说的那个专家吧？' },
  { speaker: '我',    text: '不是专家，只是个学生，来学女书的。' },
  { speaker: '阿禾', text: '学生也是文化人……您就是我最后一根稻草了。您帮我看看这个。' },
  { speaker: '我',    text: '这是……三朝书？' },
  { speaker: '阿禾', text: '嗯。我阿姐去世后留下的。不是她写的，是当年别人送给她的。我跟祖母学过点女书皮毛，这几页铅笔字是我自己试着译的，译得乱七八糟。' },
  { speaker: '我',    text: '（接过书，纸页泛黄）我在书上见过拓片，但从没读过活的三朝书。我试试看。' },
  { speaker: '阿禾', text: '阿姐临走前话都说不清了，还一直比划这本书……我想，她是想让人知道这里面写了什么。' },
  { speaker: '我',    text: '（翻了一阵，皱眉）大部分我能慢慢琢磨……但这最后一句话，我完全看不懂，跟我学过的任何范本都对不上。' },
  { speaker: '阿禾', text: '（凑过来看，摇头）我也卡在这里好久。' },
  { speaker: '我',    text: '这本书交给我吧。我帮你把剩下的工作完成。' },
  { speaker: '阿禾', text: '您愿意？' },
  { speaker: '我',    text: '我答应你。' },
  { speaker: '阿禾', text: '有一些字 我有一些想法，但是我不太确定，也许您能够识别正确的选项' },
]

/** 第二段旁白 — 对话结束后触发 */
const NARRATION2_LINES = [
  '这正是你此行的目的。然而这本书中的一些文字，你也无法理解——尤其是最后一句话，它和你所学过的任何范本都对不上。',
  '你还需要一些线索，或者是帮助。',
  '或许这个村落本身就蕴含了一些线索。',
  '你和阿禾开始在村口转悠。信箱、老树、石墙……每一处都像藏着话，又都沉默不语。你知道答案可能就在某个最不起眼的角落，只是还没找到读懂它的方式。',
]

/** Quiz 题目数据 */

const QUIZ_Q1_DIALOG = '这一个女书字，我知道是指人，但是到底指的是谁呢'
const QUIZ_Q1_CHOICES = ['你', '我', '她', '他']
const QUIZ_Q1_CORRECT = 'A'

const QUIZ_Q2_DIALOG = '这四个字，我知道分别是"忘记"和"记得"的意思，可是到底谁是谁呢？'
const QUIZ_Q2_CHOICES = ['忘记、记得', '记得、忘记', '忘得、记记', '记记、忘得']
const QUIZ_Q2_CORRECT = 'A'

const QUIZ_Q3_DIALOG = '下一组词，我只有一些零碎的记忆了'

/** Q3 匹配游戏 — 上方左右两列词条 */
const MATCH_LEFT_ITEMS  = ['丝带笔触', '燕子', '冻僵的手', '读音']
const MATCH_RIGHT_ITEMS = ['柳条', '温暖的风', '诗', '雪']

/** Q3 匹配游戏 — 下方分类盒 */
const MATCH_CATEGORIES = ['形与景', '触与候', '音与字']

/** Q3 匹配游戏 — 每个词条放置后阿禾的补充对话 */
const MATCH_COMMENTARY: Record<string, string> = {
  '柳条': '柳枝',
  '温暖的风': '温暖的风',
  '诗': '料X□□XX醒',
  '雪': '那天下雪？不对……',
  '丝带笔触': '先生写这个字时，笔画像丝带',
  '燕子': '窗外有燕子叫',
  '冻僵的手': '我手冻僵了，写不稳',
  '读音': '好像有一个字念"纯"？',
}

/** Q3 匹配游戏 — 每个词条的正确分类 */
const MATCH_CORRECT: Record<string, string> = {
  '丝带笔触': '形与景',
  '燕子': '形与景',
  '柳条': '形与景',
  '冻僵的手': '触与候',
  '温暖的风': '触与候',
  '雪': '触与候',
  '读音': '音与字',
  '诗': '音与字',
}

/** Q3 匹配游戏 — 全部分类词条 */
const MATCH_ALL_ITEMS = [...MATCH_LEFT_ITEMS, ...MATCH_RIGHT_ITEMS]

/** Q3 匹配游戏 — 分类完成时阿禾的补充对话 */
const CATEGORY_COMPLETION: Record<string, { correct: string[]; commentary: string }> = {
  '形与景': {
    correct: ['丝带笔触', '燕子', '柳条'],
    commentary: '丝带飘起来的样子……像柳条，窗外的燕子叽叽喳喳',
  },
  '触与候': {
    correct: ['冻僵的手', '温暖的风', '雪'],
    commentary: '那天好像下雪？我的手冻僵了写不稳，先生说它是微冷的',
  },
  '音与字': {
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
  if (question === 1) return '嗯，我不太确定'
  if (choice === 'B') return '嗯，我不太确定'
  return '......真的有这种词存在吗？'
}

interface Chapter1Props {
  resumeProgress: number
  isDictionaryOpen: boolean
  openDictionary: () => void
  unlockEntry: (entryId: string) => void
  onLeave: (progress: ProgressStage) => void
  onProgressChange: (progress: ProgressStage) => void
  onComplete: () => void
}

function Chapter1({
  resumeProgress,
  isDictionaryOpen,
  openDictionary,
  unlockEntry,
  onLeave,
  onProgressChange,
  onComplete,
}: Chapter1Props) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 })
  const [imgReady, setImgReady] = useState(false)
  const [showBoundaryInfo, setShowBoundaryInfo] = useState(false)
  const [letterDropped, setLetterDropped] = useState(false)
  const [showLetterPopup, setShowLetterPopup] = useState(false)
  // 玩家靠近可交互物体的高亮状态
  const [isNearBoundary, setIsNearBoundary] = useState(false)
  const [isNearMailbox, setIsNearMailbox] = useState(false)
  const [isNearDroppedLetter, setIsNearDroppedLetter] = useState(false)
  const boundaryRef = useRef<HTMLImageElement>(null)
  const mailboxRef = useRef<HTMLImageElement>(null)
  const droppedLetterRef = useRef<HTMLDivElement>(null)
  const [showBookPopup, setShowBookPopup] = useState(false)
  const [bookPopupShown, setBookPopupShown] = useState(false)
  const [narrationIndex, setNarrationIndex] = useState(0)
  const [narrationDone, setNarrationDone] = useState(false)
  const [dialogIndex, setDialogIndex] = useState(0)
  const [dialogActive, setDialogActive] = useState(false)
  const [dialogFinished, setDialogFinished] = useState(false)
  const [narration2Index, setNarration2Index] = useState(0)
  const [narration2Active, setNarration2Active] = useState(false)
  const [narration2Done, setNarration2Done] = useState(false)
  // Quiz 状态
  const [quizActive, setQuizActive] = useState(false)
  const [quizQuestion, setQuizQuestion] = useState(1) // 当前题目序号 1/2
  const [quizImageOpen, setQuizImageOpen] = useState(false)
  const [quizImageStep, setQuizImageStep] = useState(0) // 0=阿禾说话, 1=展示图片
  const [quizChoicesOpen, setQuizChoicesOpen] = useState(false)
  const [quizFeedback, setQuizFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [quizLastChoice, setQuizLastChoice] = useState('')
  const [quizNarrationOpen, setQuizNarrationOpen] = useState(false)
  const [quizLetterMode, setQuizLetterMode] = useState(false)
  const [quizDone, setQuizDone] = useState(false)
  const [quizDismissed, setQuizDismissed] = useState(false) // Q1/Q2 关闭后是否可重开
  // Q3 匹配游戏
  const [matchActive, setMatchActive] = useState(false)
  const [matchStep, setMatchStep] = useState(0) // 0=阿禾说话, 1=匹配界面
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
  // 获得新字形提示
  const [glyphToast, setGlyphToast] = useState<string | null>(null)
  const glyphToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Quiz 相关弹窗是否开启（用于暂停 WASD）
  const isQuizBusy = matchFinalStage > 0 || matchAllWrong || matchCatCommentary !== null || matchCommentary !== null || matchActive || quizImageOpen || quizChoicesOpen || quizFeedback !== null || quizNarrationOpen || quizActive
  const keysRef = useRef<Set<string>>(new Set())
  const animRef = useRef<number>(0)
  const vpRef = useRef({ w: window.innerWidth, h: window.innerHeight })

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
    if (!imgReady || isDictionaryOpen || showBoundaryInfo || showLetterPopup || showBookPopup || isQuizBusy || !narrationDone || (dialogActive && !dialogFinished) || (narration2Active && !narration2Done)) return

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

      const step = MOVE_SPEED * dt

      setOffset((prev) => ({
        x: clamp(prev.x + dx * step, 0, maxX),
        y: clamp(prev.y + dy * step, 0, maxY),
      }))

      // 检测玩家是否靠近可交互物体（高亮效果）
      const playerX = vpRef.current.w / 2
      const playerY = vpRef.current.h / 2
      const threshold = 150
      const isNear = (el: HTMLElement | null): boolean => {
        if (!el) return false
        const rect = el.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        return Math.hypot(cx - playerX, cy - playerY) < threshold
      }
      setIsNearBoundary(isNear(boundaryRef.current))
      setIsNearMailbox(isNear(mailboxRef.current))
      setIsNearDroppedLetter(isNear(droppedLetterRef.current))

      animRef.current = requestAnimationFrame(loop)
    }

    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [imgReady, maxX, maxY, isDictionaryOpen, showBoundaryInfo, showLetterPopup, showBookPopup, isQuizBusy, narrationDone, dialogActive, dialogFinished, narration2Active, narration2Done])

  // 图片加载后把初始位置定在画面右下角
  useEffect(() => {
    if (!imgReady) return
    setOffset({
      x: maxX,
      y: maxY,
    })
  }, [imgReady, maxX, maxY])

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
  ])

  useEffect(() => {
    onProgressChange(getSaveProgress())
  }, [getSaveProgress, onProgressChange])

  useEffect(() => {
    const handleHudKeyDown = (event: KeyboardEvent) => {
      if (isDictionaryOpen) return

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
        // Q3 匹配：阿禾说话 → 推进到匹配界面
        if (matchActive && matchStep === 0) {
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
        if (showBookPopup) return
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
            setDialogFinished(true)
            setNarration2Active(true)
          }
          return
        }

        // 3. 第二段旁白阶段
        if (narration2Active && !narration2Done) {
          if (narration2Index < NARRATION2_LINES.length - 1) {
            setNarration2Index((i) => i + 1)
          } else {
            setNarration2Done(true)
          }
          return
        }

        // 4. 自由探索阶段 — 检测玩家是否靠近可交互物体
        if (narration2Done && !showBoundaryInfo && !showLetterPopup) {
          const playerX = vpRef.current.w / 2
          const playerY = vpRef.current.h / 2
          const threshold = 150

          const isNear = (el: HTMLElement | null): boolean => {
            if (!el) return false
            const rect = el.getBoundingClientRect()
            const cx = rect.left + rect.width / 2
            const cy = rect.top + rect.height / 2
            return Math.hypot(cx - playerX, cy - playerY) < threshold
          }

          // 优先级：掉落的信件 > 信箱 > 界碑
          if (isNear(droppedLetterRef.current)) {
            setShowLetterPopup(true)
          } else if (isNear(mailboxRef.current)) {
            setLetterDropped(true)
          } else if (isNear(boundaryRef.current)) {
            setShowBoundaryInfo(true)
          }
        }
        return
      }

      // ========== 探索阶段专属按键 ==========
      if (!narration2Done) return

      if (event.key === 'Tab') {
        event.preventDefault()
        openDictionary()
        return
      }

      if (event.key === 'Escape' || event.key.toLowerCase() === 'q') {
        event.preventDefault()
        onLeave(getSaveProgress())
      }
    }

    window.addEventListener('keydown', handleHudKeyDown)
    return () => window.removeEventListener('keydown', handleHudKeyDown)
  }, [
    getSaveProgress,
    isDictionaryOpen,
    narration2Done,
    onLeave,
    openDictionary,
    showBoundaryInfo,
    showLetterPopup,
    showBookPopup,
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
    matchActive,
    matchStep,
    matchCommentary,
    matchCatCommentary,
    matchAllWrong,
    matchFinalStage,
    matchFinalFeedback,
  ])

  // 恢复存档进度：快进到对应阶段
  useEffect(() => {
    if (resumeProgress <= ProgressStage.NOT_STARTED) return
    // 按阶段依次快进
    if (resumeProgress >= ProgressStage.DIALOG) {
      setNarrationDone(true)
      setDialogActive(true)
      setBookPopupShown(true)
    }
    if (resumeProgress >= ProgressStage.NARRATION2) {
      setDialogFinished(true)
      setDialogActive(false)
      setNarration2Active(true)
    }
    if (resumeProgress >= ProgressStage.QUIZ) {
      setNarration2Done(true)
      setNarration2Active(false)
    }
    if (resumeProgress >= ProgressStage.MATCH_Q3) {
      setQuizDone(true)
      setQuizActive(false)
    }
    if (resumeProgress >= ProgressStage.IN_MATCH) {
      // 直接打开匹配游戏
      setQuizDone(true)
      setQuizActive(false)
      setMatchActive(true)
      setMatchStep(1)
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
      setDialogFinished(true)
      setNarration2Active(true)
    }
  }

  // 关闭三朝书，继续对话
  const handleBookPopupClose = () => {
    setShowBookPopup(false)
    setBookPopupShown(true)
    setDialogIndex((i) => i + 1)
  }

  // 第二段旁白点击：下一句 / 结束
  const handleNarration2Click = () => {
    if (narration2Index < NARRATION2_LINES.length - 1) {
      setNarration2Index((i) => i + 1)
    } else {
      setNarration2Done(true)
    }
  }

  // 关闭信件弹窗 — 首次关闭触发 Quiz，Quiz 内错误后关闭则继续流程
  const closeLetterPopup = () => {
    setShowLetterPopup(false)
    if (quizLetterMode) {
      setQuizLetterMode(false)
      setQuizNarrationOpen(true)
    } else if (!quizActive && !quizDone) {
      startQuizImage(1)
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
  const startQuizImage = (q: number) => {
    setQuizQuestion(q)
    setQuizActive(true)
    setQuizImageOpen(true)
    setQuizImageStep(0)
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
    setQuizDismissed(false)
    // Q2 选项在图片弹窗内，关闭图片弹窗
    if (quizQuestion === 2) {
      setQuizImageOpen(false)
      setQuizImageStep(0)
    }
    setQuizLastChoice(choice)
    if (choice === currentCorrect) {
      setQuizFeedback('correct')
      // 解锁对应词条
      if (quizQuestion === 1) {
        unlockEntry('jun')
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
    setQuizFeedback(null)
    if (isCorrect) {
      if (quizQuestion === 1) {
        startQuizImage(2)
      } else {
        // Q2 正确 → 进入 Q3 匹配游戏
        setQuizActive(false)
        setMatchEverStarted(true)
        setMatchActive(true)
        setMatchStep(0)
      }
    } else if (quizQuestion === 1) {
      // Q1 错误：展示信件 + 旁白提示
      setQuizLetterMode(true)
      setShowLetterPopup(true)
    } else {
      // Q2 错误：重新展示四张图，看完后再选
      setQuizImageOpen(true)
      setQuizImageStep(1)
    }
  }

  // 关闭 Quiz 旁白 → 回到 Q1 选择题
  const closeQuizNarration = () => {
    setQuizNarrationOpen(false)
    setQuizChoicesOpen(true)
  }

  // Q3 匹配游戏 — 阿禾说完话 → 展示匹配界面
  const advanceMatchStep = () => {
    if (matchStep === 0) {
      setMatchPlacements({})
      setDraggingItem(null)
      setDragOverCat(null)
      setMatchCommentary(null)
      setMatchCatCommentary(null)
      setMatchCategoryDone(new Set())
      setMatchAllWrong(false)
      setMatchFinalStage(0)
      setMatchFinalFeedback(null)
      setMatchStep(1)
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
    } else {
      // 答错 → 回到选项
      setMatchFinalFeedback(null)
      setMatchFinalStage(3)
    }
  }

  // Q3 匹配游戏 — 关闭匹配界面（保留状态，添加重开按钮）
  const closeMatchGame = () => {
    setMatchActive(false)
    setMatchStep(0)
    setMatchPlacements({})
    setDraggingItem(null)
    setDragOverCat(null)
    setMatchCommentary(null)
    setMatchCatCommentary(null)
    setMatchCategoryDone(new Set())
    setMatchAllWrong(false)
    setMatchFinalStage(0)
    setMatchFinalFeedback(null)
  }

  // 重新打开Q3匹配游戏
  const reopenMatchGame = () => {
    setMatchActive(true)
    setMatchStep(1)
    setMatchPlacements({})
    setDraggingItem(null)
    setDragOverCat(null)
    setMatchCommentary(null)
    setMatchCatCommentary(null)
    setMatchCategoryDone(new Set())
    setMatchAllWrong(false)
    setMatchFinalStage(0)
    setMatchFinalFeedback(null)
  }

  const clueFoundCount = [
    bookPopupShown ||
      letterDropped ||
      showLetterPopup ||
      quizActive ||
      quizDone ||
      matchActive ||
      matchFinalStage > 0,
    matchActive || matchFinalStage > 0 || quizDone,
    matchFinalStage > 0 || (quizDone && !matchActive),
  ].filter(Boolean).length

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

          {/* 石碑装饰 */}
          <img
            ref={boundaryRef}
            src="/assets/FirstLevel/boundary.png"
            alt="石碑"
            className={`chapter1-boundary${isNearBoundary ? ' boundary-near' : ''}`}
            draggable={false}
            onClick={() => setShowBoundaryInfo(true)}
          />

          {/* 信箱装饰 */}
          <img
            ref={mailboxRef}
            src="/assets/FirstLevel/letter.png"
            alt="信箱"
            className={`chapter1-mailbox${letterDropped ? ' mailbox-open' : ''}${isNearMailbox ? ' mailbox-near' : ''}`}
            draggable={false}
            onClick={() => setLetterDropped(true)}
          />

          {/* 掉落的信件 — 替代图 */}
          {letterDropped && (
            <div ref={droppedLetterRef} className={`dropped-letter${isNearDroppedLetter ? ' dropped-letter-near' : ''}`} onClick={() => setShowLetterPopup(true)}>
              <span className="dropped-letter-icon">&#9993;</span>
            </div>
          )}
        </div>
      )}

      {/* 操作提示 — 全局显示 */}
      <div className="chapter1-hint">
        WASD 移动 | E 交互 | Tab 词典 | Q / ESC 返回
      </div>

      {/* HUD — 第二段旁白结束后进入自由探索才显示 */}
      {narration2Done && (
        <>
          <button
            className="chapter1-dictionary-btn"
            type="button"
            aria-label="打开词典"
            onClick={openDictionary}
          >
            <img src="/assets/ui/open_book_icon.png" alt="" />
            <span>词典</span>
          </button>
          <div className="chapter1-clue-progress">
            线索 {clueFoundCount}/3
          </div>
          <div className="chapter1-player-marker" aria-hidden="true" />
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
            <span className="narration-click-hint">点击继续</span>
          </div>
        </div>
      )}

      {/* 对话 — 旁白结束后显示 */}
      {dialogActive && !dialogFinished && (
        <div className="dialog-overlay" onClick={handleDialogClick}>
          {/* 阿禾立绘 */}
          <img
            src="/assets/FirstLevel/AHe.png"
            alt="阿禾"
            className="dialog-portrait"
          />

          <div className="dialog-box">
            {/* 名字行 */}
            <div className="dialog-name-row">
              <span className="dialog-speaker">{DIALOG_LINES[dialogIndex].speaker}</span>
              {DIALOG_LINES[dialogIndex].speaker === '阿禾' && (
                <span className="dialog-flower">&#10047;</span>
              )}
            </div>

            {/* 对话文本 */}
            <p className="dialog-text" key={dialogIndex}>
              {DIALOG_LINES[dialogIndex].text}
            </p>

            {/* 继续提示 */}
            <span className="dialog-next-icon">&#9660;</span>
          </div>
        </div>
      )}

      {/* 第二段旁白 — 对话结束后显示 */}
      {narration2Active && !narration2Done && (
        <div className="narration-overlay" onClick={handleNarration2Click}>
          <div className="narration-box">
            <p className="narration-line" key={narration2Index}>
              {NARRATION2_LINES[narration2Index]}
            </p>
            <span className="narration-click-hint">点击继续</span>
          </div>
        </div>
      )}

      {/* 三朝书弹窗 — 对话中阿禾展示三朝书时触发 */}
      {showBookPopup && (
        <div className="book-popup-overlay" onClick={handleBookPopupClose}>
          <div className="book-popup" onClick={(e) => e.stopPropagation()}>
            <button className="book-popup-close" onClick={handleBookPopupClose}>
              关闭
            </button>
            <div className="book-popup-content">
              <img
                src="/assets/FirstLevel/sanchaoshu.png"
                alt="三朝书"
                className="book-placeholder-img"
              />
            </div>
          </div>
        </div>
      )}

      {/* 石碑信息弹窗 */}
      {showBoundaryInfo && (
        <div className="boundary-overlay" onClick={() => setShowBoundaryInfo(false)}>
          <div className="boundary-popup" onClick={(e) => e.stopPropagation()}>
            <button className="boundary-close" onClick={() => setShowBoundaryInfo(false)}>
              关闭
            </button>

            <div className="boundary-content">
              <img
                src="/assets/FirstLevel/location.png"
                alt="江永县"
                className="boundary-location-img"
              />

              <p className="boundary-text">
                江永县位于湖南省南部，隶属永州市，地处湘桂交界一带，拥有"女书文化"、"中国香柚之乡"的称号，古称永明，秦时立县，历史悠久。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 信件内容弹窗 */}
      {showLetterPopup && (
        <div className="letter-popup-overlay" onClick={closeLetterPopup}>
          <div className="letter-popup" onClick={(e) => e.stopPropagation()}>
            <button className="letter-popup-close" onClick={closeLetterPopup}>
              关闭
            </button>

            <div className="letter-popup-content">
              <p className="letter-text">
                XXXXX：<br />
                <span className="letter-text-indent">
                  <span className="letter-image-slot">
                    <img
                      src="/assets/FirstLevel/letterclue1.png"
                      alt="线索图1"
                      className="letter-clue-img"
                    />
                  </span>
                  <span className="letter-image-slot">
                    <img
                      src="/assets/FirstLevel/letterclue2.png"
                      alt="线索图2"
                      className="letter-clue-img"
                    />
                  </span>
                  ！XXX...
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===== Quiz 流程 ===== */}

      {/* Quiz 图片弹窗 — 阿禾说话 */}
      {quizImageOpen && quizImageStep === 0 && (
        <div className="dialog-overlay" onClick={closeQuizImage}>
          <img
            src="/assets/FirstLevel/AHe.png"
            alt="阿禾"
            className="dialog-portrait"
          />
          <div className="dialog-box">
            <div className="dialog-name-row">
              <span className="dialog-speaker">阿禾</span>
              <span className="dialog-flower">&#10047;</span>
            </div>
            <p className="dialog-text">
              {quizQuestion === 1 ? QUIZ_Q1_DIALOG : QUIZ_Q2_DIALOG}
            </p>
            <span className="dialog-next-icon">&#9660;</span>
          </div>
        </div>
      )}

      {/* Quiz 图片弹窗 — Q1 单图 */}
      {quizImageOpen && quizImageStep === 1 && quizQuestion === 1 && (
        <div className="quiz-image-overlay" onClick={closeQuizImage}>
          <div className="quiz-image-popup" onClick={(e) => e.stopPropagation()}>
            <button className="quiz-image-close" onClick={closeQuizImage}>关闭</button>
            <div className="quiz-image-wrapper">
              <img
                src="/assets/FirstLevel/Q1.png"
                alt="女书字"
                className="quiz-image-placeholder"
              />
            </div>
            <span className="quiz-click-hint">点击任意处继续</span>
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
      {quizFeedback !== null && (
        <div className="dialog-overlay" onClick={closeQuizFeedback}>
          <img
            src="/assets/FirstLevel/AHe.png"
            alt="阿禾"
            className="dialog-portrait"
          />
          <div className="dialog-box">
            <div className="dialog-name-row">
              <span className="dialog-speaker">阿禾</span>
              <span className="dialog-flower">&#10047;</span>
            </div>
            <p className="dialog-text">
              {quizFeedback === 'correct'
                ? '嗯，也许您是对的'
                : getQuizWrongFeedback(quizQuestion, quizLastChoice)}
            </p>
            <span className="dialog-next-icon">&#9660;</span>
          </div>
        </div>
      )}

      {/* Quiz 旁白 — 错误后提示重新思考 */}
      {quizNarrationOpen && (
        <div className="narration-overlay" onClick={closeQuizNarration}>
          <div className="narration-box">
            <p className="narration-line">
              一般来讲，信的语法是怎样的呢？
            </p>
            <span className="narration-click-hint">点击继续</span>
          </div>
        </div>
      )}

      {/* ===== Q3 匹配游戏 ===== */}

      {/* Q3 阿禾说话 */}
      {matchActive && matchStep === 0 && (
        <div className="dialog-overlay" onClick={advanceMatchStep}>
          <img
            src="/assets/FirstLevel/AHe.png"
            alt="阿禾"
            className="dialog-portrait"
          />
          <div className="dialog-box">
            <div className="dialog-name-row">
              <span className="dialog-speaker">阿禾</span>
              <span className="dialog-flower">&#10047;</span>
            </div>
            <p className="dialog-text">{QUIZ_Q3_DIALOG}</p>
            <span className="dialog-next-icon">&#9660;</span>
          </div>
        </div>
      )}

      {/* Q3 匹配界面 */}
      {matchActive && matchStep === 1 && (
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
      {matchCommentary !== null && (
        <div className="dialog-overlay" style={{ zIndex: 105 }} onClick={closeMatchCommentary}>
          <img
            src="/assets/FirstLevel/AHe.png"
            alt="阿禾"
            className="dialog-portrait"
          />
          <div className="dialog-box">
            <div className="dialog-name-row">
              <span className="dialog-speaker">阿禾</span>
              <span className="dialog-flower">&#10047;</span>
            </div>
            <p className="dialog-text">{MATCH_COMMENTARY[matchCommentary] || '……'}</p>
            <span className="dialog-next-icon">&#9660;</span>
          </div>
        </div>
      )}

      {/* Q3 分类完成对话 — 某分类正确集齐 */}
      {matchCatCommentary !== null && (
        <div className="dialog-overlay" style={{ zIndex: 106 }} onClick={closeMatchCatCommentary}>
          <img
            src="/assets/FirstLevel/AHe.png"
            alt="阿禾"
            className="dialog-portrait"
          />
          <div className="dialog-box">
            <div className="dialog-name-row">
              <span className="dialog-speaker">阿禾</span>
              <span className="dialog-flower">&#10047;</span>
            </div>
            <p className="dialog-text">{CATEGORY_COMPLETION[matchCatCommentary]?.commentary || ''}</p>
            <span className="dialog-next-icon">&#9660;</span>
          </div>
        </div>
      )}

      {/* Q3 全错重置对话 */}
      {matchAllWrong && (
        <div className="dialog-overlay" style={{ zIndex: 106 }} onClick={closeMatchAllWrong}>
          <img
            src="/assets/FirstLevel/AHe.png"
            alt="阿禾"
            className="dialog-portrait"
          />
          <div className="dialog-box">
            <div className="dialog-name-row">
              <span className="dialog-speaker">阿禾</span>
              <span className="dialog-flower">&#10047;</span>
            </div>
            <p className="dialog-text">好像不太对，再试试吧</p>
            <span className="dialog-next-icon">&#9660;</span>
          </div>
        </div>
      )}

      {/* ===== Q4 最终问答 ===== */}

      {/* Q4 阿禾提问 */}
      {matchFinalStage === 1 && (
        <div className="dialog-overlay" style={{ zIndex: 107 }} onClick={advanceQ4ToImages}>
          <img
            src="/assets/FirstLevel/AHe.png"
            alt="阿禾"
            className="dialog-portrait"
          />
          <div className="dialog-box">
            <div className="dialog-name-row">
              <span className="dialog-speaker">阿禾</span>
              <span className="dialog-flower">&#10047;</span>
            </div>
            <p className="dialog-text">{QUIZ_Q4_DIALOG}</p>
            <span className="dialog-next-icon">&#9660;</span>
          </div>
        </div>
      )}

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
      {matchFinalFeedback !== null && (
        <div className="dialog-overlay" style={{ zIndex: 108 }} onClick={closeQ4Feedback}>
          <img
            src="/assets/FirstLevel/AHe.png"
            alt="阿禾"
            className="dialog-portrait"
          />
          <div className="dialog-box">
            <div className="dialog-name-row">
              <span className="dialog-speaker">阿禾</span>
              <span className="dialog-flower">&#10047;</span>
            </div>
            <p className="dialog-text">
              {matchFinalFeedback === 'correct'
                ? '嗯，确实是这个'
                : '嗯，我觉得不太对'}
            </p>
            <span className="dialog-next-icon">&#9660;</span>
          </div>
        </div>
      )}

      {/* 获得新字形提示 */}
      {glyphToast && (
        <div className="glyph-toast" key={glyphToast}>
          <span className="glyph-toast-icon">&#10022;</span>
          <span className="glyph-toast-text">获得新字形：{glyphToast} 已加入词典</span>
        </div>
      )}

    </div>
  )
}

export default Chapter1
