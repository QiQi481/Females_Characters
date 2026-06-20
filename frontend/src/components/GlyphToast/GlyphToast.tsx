import './GlyphToast.css'

export type GlyphToastState = {
  label: string
  nushuImages: readonly string[]
}

type GlyphToastProps = {
  toast: GlyphToastState | null
}

function GlyphToast({ toast }: GlyphToastProps) {
  if (!toast) return null

  return (
    <div className="glyph-toast" key={toast.label} role="status">
      <span className="glyph-toast-text">获得新字形：</span>
      <span
        className={`glyph-toast-images${
          toast.nushuImages.length > 1 ? ' is-compound' : ''
        }`}
        aria-label={toast.label}
      >
        {toast.nushuImages.map((image, index) => (
          <span
            className="glyph-toast-image"
            style={{
              WebkitMaskImage: `url("${image}")`,
              maskImage: `url("${image}")`,
            }}
            aria-hidden="true"
            key={`${toast.label}-${index}`}
          />
        ))}
      </span>
      <span className="glyph-toast-text">已加入词典</span>
    </div>
  )
}

export default GlyphToast
