import type {
  DictionaryEntry,
  DictionaryPuzzle,
} from '../../systems/dictionary'

type EmbroideryRoomPhaserProps = {
  isDictionaryOpen: boolean
  openDictionary: (puzzle?: DictionaryPuzzle) => void
  unlockEntry: (entryId: DictionaryEntry['id']) => void
}

function EmbroideryRoomPhaserStub(_props: EmbroideryRoomPhaserProps) {
  return (
    <section aria-label="女红房" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      color: '#c9a87c',
      fontSize: '1.5rem',
      background: '#1a1410',
    }}>
      <p>女红房 — 请先运行 <code>npm install</code> 安装 phaser 依赖</p>
    </section>
  )
}

export default EmbroideryRoomPhaserStub
