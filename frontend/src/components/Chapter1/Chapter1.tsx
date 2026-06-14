import { useState, useRef, useEffect } from 'react'
import './Chapter1.css'

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

/** 获取 Quiz 错误反馈文本 */
const getQuizWrongFeedback = (question: number, choice: string): string => {
  if (question === 1) return '嗯，我不太确定'
  if (choice === 'B') return '嗯，我不太确定'
  return '......真的有这种词存在吗？'
}

function Chapter1() {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 })
  const [imgReady, setImgReady] = useState(false)
  const [showBoundaryInfo, setShowBoundaryInfo] = useState(false)
  const [letterDropped, setLetterDropped] = useState(false)
  const [showLetterPopup, setShowLetterPopup] = useState(false)
  const [showBookPopup, setShowBookPopup] = useState(false)
  const [bookPopupShown, setBookPopupShown] = useState(false)
  const [showBookSystem, setShowBookSystem] = useState(false)
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
  // Quiz 相关弹窗是否开启（用于暂停 WASD）
  const isQuizBusy = quizImageOpen || quizChoicesOpen || quizFeedback !== null || quizNarrationOpen || quizActive
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
    if (!imgReady || showBoundaryInfo || showLetterPopup || showBookPopup || showBookSystem || isQuizBusy || !narrationDone || (dialogActive && !dialogFinished) || (narration2Active && !narration2Done)) return

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

      animRef.current = requestAnimationFrame(loop)
    }

    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [imgReady, maxX, maxY, showBoundaryInfo, showLetterPopup, showBookPopup, showBookSystem, isQuizBusy, narrationDone, dialogActive, dialogFinished, narration2Active, narration2Done])

  // 图片加载后把初始位置定在画面正中偏上
  useEffect(() => {
    if (!imgReady) return
    const centerX = maxX / 2
    const centerY = maxY * 0.25 // 偏上一点，因为场景重点通常在偏上位置
    setOffset({
      x: centerX,
      y: Math.max(0, centerY),
    })
  }, [imgReady, maxX, maxY])

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
      setQuizChoicesOpen(true)
    }
  }

  // 开始 Quiz 图片阶段
  const startQuizImage = (q: number) => {
    setQuizQuestion(q)
    setQuizActive(true)
    setQuizImageOpen(true)
    setQuizImageStep(0)
  }

  // 获取当前题目的正确选项
  const currentCorrect = quizQuestion === 1 ? QUIZ_Q1_CORRECT : QUIZ_Q2_CORRECT

  // 选择答案
  const handleQuizChoice = (choice: string) => {
    setQuizChoicesOpen(false)
    setQuizLastChoice(choice)
    if (choice === currentCorrect) {
      setQuizFeedback('correct')
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
        setQuizActive(false)
        setQuizDone(true)
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
            src="/assets/FirstLevel/boundary.png"
            alt="石碑"
            className="chapter1-boundary"
            draggable={false}
            onClick={() => setShowBoundaryInfo(true)}
          />

          {/* 信箱装饰 */}
          <img
            src="/assets/FirstLevel/letter.png"
            alt="信箱"
            className={`chapter1-mailbox${letterDropped ? ' mailbox-open' : ''}`}
            draggable={false}
            onClick={() => setLetterDropped(true)}
          />

          {/* 掉落的信件 — 替代图 */}
          {letterDropped && (
            <div className="dropped-letter" onClick={() => setShowLetterPopup(true)}>
              <span className="dropped-letter-icon">&#9993;</span>
            </div>
          )}
        </div>
      )}

      {/* WASD 提示 — 第二段旁白结束后才显示 */}
      {narration2Done && (
        <div className="chapter1-hint">
          <span>W A S D</span> 移动视角
        </div>
      )}

      {/* 三朝书系统按钮 — 展示过三朝书后固定在顶部中央 */}
      {bookPopupShown && (
        <button
          className="chapter1-book-btn"
          onClick={() => setShowBookSystem(true)}
        >
          三朝书
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

          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
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
              {/* TODO: 替换为实际三朝书图片 */}
              <img
                src="/assets/FirstLevel/location.png"
                alt="三朝书"
                className="book-placeholder-img"
              />
              <p className="book-placeholder-hint">三朝书</p>
            </div>
          </div>
        </div>
      )}

      {/* 三朝书系统弹窗 */}
      {showBookSystem && (
        <div className="book-system-overlay" onClick={() => setShowBookSystem(false)}>
          <div className="book-system-popup" onClick={(e) => e.stopPropagation()}>
            <button className="book-system-close" onClick={() => setShowBookSystem(false)}>
              关闭
            </button>
            <div className="book-system-content">
              <p className="book-system-placeholder">三朝书</p>
              <p className="book-system-hint">系统开发中，敬请期待</p>
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
                    {/* TODO: 替换为实际图片路径 */}
                    <img
                      src="/assets/FirstLevel/letter.png"
                      alt="线索图1"
                      className="letter-clue-img"
                    />
                  </span>
                  <span className="letter-image-slot">
                    {/* TODO: 替换为实际图片路径 */}
                    <img
                      src="/assets/FirstLevel/letter.png"
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
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
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

      {/* Quiz 图片弹窗 — 展示图片（Q1 单图 / Q2 四图） */}
      {quizImageOpen && quizImageStep === 1 && (
        <div className="quiz-image-overlay" onClick={closeQuizImage}>
          <div className="quiz-image-popup" onClick={(e) => e.stopPropagation()}>
            <button className="quiz-image-close" onClick={closeQuizImage}>关闭</button>
            {quizQuestion === 1 ? (
              <div className="quiz-image-wrapper">
                {/* TODO: 替换为实际女书字图片 */}
                <img
                  src="/assets/FirstLevel/location.png"
                  alt="女书字"
                  className="quiz-image-placeholder"
                />
              </div>
            ) : (
              <div className="quiz-image-grid">
                {/* TODO: 替换为实际四字女书图片 */}
                <img src="/assets/FirstLevel/location.png" alt="字1" className="quiz-grid-img" />
                <img src="/assets/FirstLevel/location.png" alt="字2" className="quiz-grid-img" />
                <img src="/assets/FirstLevel/location.png" alt="字3" className="quiz-grid-img" />
                <img src="/assets/FirstLevel/location.png" alt="字4" className="quiz-grid-img" />
              </div>
            )}
            <span className="quiz-click-hint">点击任意处继续</span>
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
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
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

    </div>
  )
}

export default Chapter1
