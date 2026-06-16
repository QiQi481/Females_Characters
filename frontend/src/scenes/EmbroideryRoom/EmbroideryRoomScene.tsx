import type { CSSProperties, MouseEvent } from 'react'
import {
  embroideryRoomBackground,
  embroideryRoomProps,
  type EmbroideryRoomPropId,
} from './embroideryRoomSceneData'
import './EmbroideryRoomScene.css'

type EmbroideryRoomSceneProps = {
  activePropId?: EmbroideryRoomPropId | null
  onSelectProp: (propId: EmbroideryRoomPropId) => void
  onClearSelection: () => void
}

type PropStyle = CSSProperties & {
  '--prop-x': string
  '--prop-y': string
  '--prop-width': string
}

function EmbroideryRoomScene({
  activePropId = null,
  onSelectProp,
  onClearSelection,
}: EmbroideryRoomSceneProps) {
  const clearOnEmptySpace = (event: MouseEvent<HTMLElement>) => {
    if (event.currentTarget === event.target) onClearSelection()
  }

  return (
    <section
      className="embroidery-room-scene"
      aria-label="绣帕女红房线索场景"
      onClick={clearOnEmptySpace}
    >
      <img
        className="embroidery-room-scene-background"
        src={embroideryRoomBackground}
        alt=""
        draggable="false"
      />

      {embroideryRoomProps.map((prop) => {
        const isActive = prop.id === activePropId
        const style: PropStyle = {
          '--prop-x': `${prop.x}%`,
          '--prop-y': `${prop.y}%`,
          '--prop-width': `${prop.width}%`,
          zIndex: prop.zIndex,
        }

        return (
          <button
            className={`embroidery-scene-prop is-${prop.layer}${
              isActive ? ' is-active' : ''
            }`}
            style={style}
            type="button"
            onClick={() => onSelectProp(prop.id)}
            aria-label={`查看线索：${prop.name}`}
            aria-pressed={isActive}
            key={prop.id}
          >
            <img src={prop.src} alt="" draggable="false" />
            <span>{prop.name}</span>
          </button>
        )
      })}
    </section>
  )
}

export default EmbroideryRoomScene
