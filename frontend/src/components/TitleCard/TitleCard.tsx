import { useCallback, useState, useEffect } from 'react'
import './TitleCard.css'

interface TitleCardProps {
  title: string
  subtitle?: string
  backgroundImage?: string
  onContinue: () => void
}

function TitleCard({ title, subtitle, backgroundImage, onContinue }: TitleCardProps) {
  const [visible, setVisible] = useState(false)
  const handleContinue = useCallback(() => {
    onContinue()
  }, [onContinue])

  useEffect(() => {
    // 延迟一帧触发淡入
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'e') return
      event.preventDefault()
      event.stopImmediatePropagation()
      handleContinue()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleContinue])

  return (
    <div className="titlecard" onClick={handleContinue}>
      <div
        className="titlecard-bg"
        style={
          backgroundImage
            ? { backgroundImage: `url(${backgroundImage})` }
            : undefined
        }
      />
      <div className={`titlecard-content ${visible ? 'in' : ''}`}>
        <h1 className="titlecard-title">{title}</h1>
        {subtitle && <p className="titlecard-subtitle">{subtitle}</p>}
        <span className="titlecard-hint">E / 点击继续</span>
      </div>
    </div>
  )
}

export default TitleCard
