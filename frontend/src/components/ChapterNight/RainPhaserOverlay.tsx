import { useRef, useEffect, useCallback } from 'react'
import Phaser from 'phaser'

// ── 雨滴数据结构 ──
interface RainDrop {
  x: number
  y: number
  speed: number      // px/s
  length: number     // 雨丝长度
  alpha: number      // 透明度
  width: number      // 线宽
  wind: number       // 横向风偏
}

// ── Phaser 雨效场景（含程序化雨声） ──
class RainScene extends Phaser.Scene {
  private drops: RainDrop[] = []
  private graphics!: Phaser.GameObjects.Graphics
  private fadeAlpha = 0
  private targetAlpha = 0

  // ── Web Audio 雨声 ──
  private audioCtx: AudioContext | null = null
  private rainGain: GainNode | null = null
  private noiseSources: AudioBufferSourceNode[] = []
  private soundPlaying = false
  private soundInitializing = false

  constructor() {
    super({ key: 'RainScene' })
  }

  create(): void {
    this.graphics = this.add.graphics()
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)')

    const w = this.cameras.main.width
    const h = this.cameras.main.height

    const dropCount = 120
    this.drops = []

    for (let i = 0; i < dropCount; i++) {
      const layer = Math.random()
      let speed: number, length: number, alpha: number, width: number, wind: number

      if (layer < 0.4) {
        speed = 250 + Math.random() * 200
        length = 10 + Math.random() * 20
        alpha = 0.04 + Math.random() * 0.14
        width = 0.6 + Math.random() * 0.6
        wind = 1 + Math.random() * 1
      } else if (layer < 0.8) {
        speed = 400 + Math.random() * 350
        length = 18 + Math.random() * 35
        alpha = 0.10 + Math.random() * 0.20
        width = 1.0 + Math.random() * 1.2
        wind = 2 + Math.random() * 2
      } else {
        speed = 550 + Math.random() * 400
        length = 28 + Math.random() * 50
        alpha = 0.16 + Math.random() * 0.24
        width = 1.4 + Math.random() * 1.8
        wind = 2.5 + Math.random() * 3
      }

      this.drops.push({
        x: Math.random() * w,
        y: Math.random() * h,
        speed,
        length,
        alpha,
        width,
        wind,
      })
    }

    this.updateDropBounds()
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this)
    // 监听场景销毁事件（game.destroy 触发的是 destroy 而非 shutdown）
    this.events.on('destroy', this.onSceneDestroy, this)
  }

  // ── 延迟初始化 + 启动雨声（在用户手势后调用） ──
  private async ensureAudioContext(): Promise<boolean> {
    if (this.audioCtx && this.audioCtx.state === 'running') return true
    if (this.soundInitializing) return false

    this.soundInitializing = true
    try {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext()
      }
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume()
      }
      if (this.audioCtx.state !== 'running') {
        this.soundInitializing = false
        return false
      }

      // 首次初始化音频图
      if (!this.rainGain) {
        this.rainGain = this.audioCtx.createGain()
        this.rainGain.gain.value = 0
        this.rainGain.connect(this.audioCtx.destination)
      }

      this.soundInitializing = false
      return true
    } catch {
      this.soundInitializing = false
      return false
    }
  }

  private async startRainSound(): Promise<void> {
    if (this.soundPlaying || this.soundInitializing) return

    const ok = await this.ensureAudioContext()
    if (!ok || !this.audioCtx || !this.rainGain) return

    this.soundPlaying = true
    const sr = this.audioCtx.sampleRate

    for (let ch = 0; ch < 2; ch++) {
      const duration = 3
      const buffer = this.audioCtx.createBuffer(1, sr * duration, sr)
      const data = buffer.getChannelData(0)

      // 布朗噪声，然后经带通滤波 → 模拟淅淅沥沥的雨声
      let last = 0
      for (let i = 0; i < data.length; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
        data[i] = last * 0.45 // 大幅提升振幅
      }

      const source = this.audioCtx.createBufferSource()
      source.buffer = buffer
      source.loop = true

      // 单层带通，Q 宽一些避免过度衰减
      const bpFilter = this.audioCtx.createBiquadFilter()
      bpFilter.type = 'bandpass'
      bpFilter.frequency.value = 500 + ch * 300 // 500Hz / 800Hz
      bpFilter.Q.value = 1.2

      source.connect(bpFilter)
      bpFilter.connect(this.rainGain)
      source.start()
      this.noiseSources.push(source)
    }

    // 音量平滑渐入
    this.rainGain.gain.setTargetAtTime(0.55, this.audioCtx.currentTime, 0.8)
  }

  private stopRainSound(): void {
    this.soundPlaying = false
    if (this.rainGain && this.audioCtx) {
      this.rainGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.8)
    }
    setTimeout(() => {
      for (const src of this.noiseSources) {
        try { src.stop() } catch { /* 已停止 */ }
      }
      this.noiseSources = []
    }, 900)
  }

  private handleResize = (): void => {
    this.updateDropBounds()
  }

  private updateDropBounds(): void {
    const w = this.cameras.main.width
    const h = this.cameras.main.height
    for (const d of this.drops) {
      if (d.x > w) d.x = Math.random() * w
      if (d.y > h) d.y = -d.length
    }
  }

  /** 外部调用：设置目标透明度，同时控制雨声 */
  setRainAlpha(a: number): void {
    this.targetAlpha = a
    if (a > 0.5 && !this.soundPlaying) {
      this.startRainSound()
    } else if (a < 0.1 && this.soundPlaying) {
      this.stopRainSound()
    }
  }

  /** 外部调用：设置雨声音量 (0~1) */
  setRainVolume(vol: number): void {
    if (this.rainGain && this.audioCtx && this.soundPlaying) {
      this.rainGain.gain.setTargetAtTime(vol, this.audioCtx.currentTime, 0.6)
    }
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000

    const lerpSpeed = 2.5
    this.fadeAlpha += (this.targetAlpha - this.fadeAlpha) * Math.min(lerpSpeed * dt, 1)

    if (this.fadeAlpha <= 0.002 && this.targetAlpha <= 0.002) {
      this.graphics.clear()
      return
    }

    const w = this.cameras.main.width
    const h = this.cameras.main.height
    this.graphics.clear()

    for (const d of this.drops) {
      d.y += d.speed * dt
      d.x -= d.wind * dt * 0.5

      if (d.y > h + d.length) {
        d.y = -d.length
        d.x = Math.random() * (w + 60) - 30
      }
      if (d.x < -20) d.x = w + 10

      const a = d.alpha * this.fadeAlpha
      this.graphics.lineStyle(d.width, 0xaac8e6, a)
      this.graphics.beginPath()
      this.graphics.moveTo(d.x, d.y)
      this.graphics.lineTo(d.x - d.wind * 0.5, d.y + d.length)
      this.graphics.strokePath()
    }
  }

  private onSceneDestroy = (): void => {
    this.stopRainSound()
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {})
      this.audioCtx = null
    }
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this)
  }
}

// ── Game 配置工厂 ──
function createRainGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent,
    transparent: true,
    scene: [RainScene],
    scale: {
      mode: Phaser.Scale.NONE,
    },
    // 不需要 Phaser 内置音频、物理、输入子系统
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
  }
}

// ── React 包装组件 ──
interface RainPhaserOverlayProps {
  active: boolean
  volume?: number
  zIndex?: number
}

function RainPhaserOverlay({ active, volume, zIndex = 4 }: RainPhaserOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const sceneRef = useRef<RainScene | null>(null)
  const audioUnlockDoneRef = useRef(false)
  const destroyingRef = useRef(false)

  // 获取当前场景实例
  const getScene = useCallback((): RainScene | null => {
    if (!gameRef.current) return null
    try {
      const s = gameRef.current.scene.getScene('RainScene') as RainScene
      return s?.scene?.isActive() ? s : null
    } catch {
      return null
    }
  }, [])

  // 组件卸载时强制销毁 Phaser Game（防止 active=true 时卸载导致雨声残留）
  useEffect(() => {
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
        sceneRef.current = null
      }
    }
  }, [])

  // 统一的创建/销毁生命周期
  useEffect(() => {
    // ── 关闭路径：先淡出雨声，再销毁 Phaser ──
    if (!active) {
      destroyingRef.current = true
      if (sceneRef.current) {
        sceneRef.current.setRainAlpha(0) // 触发淡出 + stopRainSound
      }
      // 短暂延迟后销毁 Game（触发 scene 'destroy' 事件做最终清理）
      const destroyTimer = setTimeout(() => {
        if (gameRef.current) {
          gameRef.current.destroy(true)
          gameRef.current = null
          sceneRef.current = null
        }
      }, 200)
      return () => clearTimeout(destroyTimer)
    }

    // ── 打开路径：创建 Phaser Game ──
    destroyingRef.current = false
    if (!containerRef.current || gameRef.current) return

    const game = new Phaser.Game(createRainGameConfig(containerRef.current))
    gameRef.current = game

    const onResize = () => {
      if (gameRef.current) {
        gameRef.current.scale.resize(window.innerWidth, window.innerHeight)
      }
    }
    window.addEventListener('resize', onResize)

    // 等场景 ready 后注入引用
    const checkScene = setInterval(() => {
      const s = getScene()
      if (s) {
        sceneRef.current = s
        s.setRainAlpha(1)
        clearInterval(checkScene)
      }
    }, 50)

    return () => {
      clearInterval(checkScene)
      window.removeEventListener('resize', onResize)
    }
  }, [active, getScene])

  // 用户手势监听：在 AudioContext 被挂起时提供重试机会
  useEffect(() => {
    if (!active || destroyingRef.current) return

    const unlockAudio = () => {
      if (audioUnlockDoneRef.current || destroyingRef.current) return
      const s = sceneRef.current || getScene()
      if (s) {
        s.setRainAlpha(1)
      }
    }

    window.addEventListener('click', unlockAudio)
    window.addEventListener('keydown', unlockAudio)

    const retryTimer = setTimeout(() => {
      unlockAudio()
      audioUnlockDoneRef.current = true
    }, 1500)

    return () => {
      window.removeEventListener('click', unlockAudio)
      window.removeEventListener('keydown', unlockAudio)
      clearTimeout(retryTimer)
    }
  }, [active, getScene])

  // 雨声音量同步
  useEffect(() => {
    if (volume === undefined) return
    const s = sceneRef.current || getScene()
    if (s) {
      s.setRainVolume(volume)
    }
  }, [volume, getScene])

  if (!active && !destroyingRef.current) return null

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', inset: 0, zIndex, pointerEvents: 'none' }}
    />
  )
}

export default RainPhaserOverlay
