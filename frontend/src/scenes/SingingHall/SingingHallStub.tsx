import type {
  DictionaryEntry,
  DictionaryPuzzle,
} from '../../systems/dictionary'

type SingingHallProps = {
  isDictionaryOpen: boolean
  openDictionary: (puzzle?: DictionaryPuzzle) => void
  unlockEntry: (entryId: DictionaryEntry['id']) => void
}

function SingingHallStub(_props: SingingHallProps) {
  return (
    <section className="singing-hall" aria-label="坐歌堂 / 歌扇空间" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      color: '#c9a87c',
      fontSize: '1.5rem',
      background: '#1a1410',
    }}>
      <p>坐歌堂 — 请先运行 <code>npm install</code> 安装 phaser 依赖</p>
    </section>
  )
}

export default SingingHallStub
