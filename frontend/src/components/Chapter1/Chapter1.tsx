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
]

function Chapter1() {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 })
  const [imgReady, setImgReady] = useState(false)
  const [showBoundaryInfo, setShowBoundaryInfo] = useState(false)
  const [narrationIndex, setNarrationIndex] = useState(0)
  const [narrationDone, setNarrationDone] = useState(false)
  const [dialogIndex, setDialogIndex] = useState(0)
  const [dialogActive, setDialogActive] = useState(false)
  const [dialogFinished, setDialogFinished] = useState(false)
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
    if (!imgReady || showBoundaryInfo || !narrationDone || (dialogActive && !dialogFinished)) return

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
  }, [imgReady, maxX, maxY, showBoundaryInfo, narrationDone, dialogActive, dialogFinished])

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

  // 对话点击：下一句 / 结束
  const handleDialogClick = () => {
    if (dialogIndex < DIALOG_LINES.length - 1) {
      setDialogIndex((i) => i + 1)
    } else {
      setDialogFinished(true)
    }
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
        </div>
      )}

      {/* WASD 提示 — 对话结束后才显示 */}
      {dialogFinished && (
        <div className="chapter1-hint">
          <span>W A S D</span> 移动视角
        </div>
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
    </div>
  )
}

export default Chapter1
