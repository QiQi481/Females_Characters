import { useState, useEffect } from 'react'
import './TitleCard.css'

interface TitleCardProps {
  title: string
  subtitle?: string
  onContinue: () => void
}

function TitleCard({ title, subtitle, onContinue }: TitleCardProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // 延迟一帧触发淡入
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  return (
    <div className="titlecard" onClick={onContinue}>
      <div className="titlecard-bg" />
      <div className={`titlecard-content ${visible ? 'in' : ''}`}>
        <h1 className="titlecard-title">{title}</h1>
        {subtitle && <p className="titlecard-subtitle">{subtitle}</p>}
        <span className="titlecard-hint">点击继续</span>
      </div>
    </div>
  )
}

export default TitleCard
