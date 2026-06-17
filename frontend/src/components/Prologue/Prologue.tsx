import { useCallback, useEffect, useState } from 'react'
import './Prologue.css'

interface PrologueProps {
  onContinue: () => void
}

const PROLOGUE_LINES = [
  '在湖南江永的群山深处，有一种文字，只属于女人。',
  '当地妇女用这种斜体修长、形似柳叶的字符，在布面手抄本上、在扇面上、在帕子上，写下她们的一生。',
  '她们的欢喜，她们的苦楚，她们对姊妹密友的倾诉，都被细细藏进这些字里。',
  '这种文字，叫女书。',
  '当她们聚在一起，一边做女红，一边唱读这些写在纸扇布帕上的文字，这便是当地人口中的“读纸”“读扇”“读帕”。',
  '在歌声里，她们不再只是沉默的母亲、妻子、女儿，而是拥有自己声音和秘密世界的创作者。',
  '现在，一段尘封的女书故事等待你来开启。',
  '请留意残卷上的字形，解读扇面中的隐语，在歌堂的吟唱中寻找线索。',
  '在这个过程中，那些如柳叶般蜿蜒的字符，会慢慢向你展露它们的含义。',
] as const

function Prologue({ onContinue }: PrologueProps) {
  const [lineIndex, setLineIndex] = useState(0)
  const isLastLine = lineIndex === PROLOGUE_LINES.length - 1

  const advance = useCallback(() => {
    if (isLastLine) {
      onContinue()
      return
    }

    setLineIndex((current) => current + 1)
  }, [isLastLine, onContinue])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'e') return
      event.preventDefault()
      advance()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [advance])

  return (
    <div className="prologue">
      <div className="prologue-bg" />
      <div className="prologue-shade" />

      <section
        className="prologue-dialogue"
        aria-label="序言"
        onClick={advance}
      >
        <p className="prologue-dialogue-text" key={lineIndex}>
          {PROLOGUE_LINES[lineIndex]}
        </p>
      </section>

      <div className="prologue-controls-hint" aria-hidden="true">
        E / 点击继续
      </div>
    </div>
  )
}

export default Prologue
