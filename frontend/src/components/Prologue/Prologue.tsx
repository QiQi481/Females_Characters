import './Prologue.css'

interface PrologueProps {
  onContinue: () => void
}

function Prologue({ onContinue }: PrologueProps) {
  return (
    <div className="prologue">
      {/* 背景 */}
      <div className="prologue-bg" />

      {/* 卷轴内容 */}
      <div className="prologue-scroll">
        <div className="scroll-inner">
          <div className="prologue-text">
            <p>在湖南江永的群山深处，有一种文字，只属于女人。</p>

            <p>当地妇女用这种斜体修长、形似柳叶的字符，在布面手抄本上、在扇面上、在帕子上，写下她们的一生——她们的欢喜、她们的苦楚、她们对姊妹密友的倾诉。</p>

            <p>这种文字，叫女书。</p>

            <p>当她们聚在一起，一边做女红，一边唱读这些写在纸扇布帕上的文字，这便是当地人口中的"读纸""读扇""读帕"。在歌声里，她们不再是沉默的母亲、妻子、女儿，而是拥有自己声音和秘密世界的创作者——她们用四百余个字符，唱出千余字的七言韵歌，将一生的悲欢折叠成只有女人能懂的密码。</p>

            <p>现在，一段尘封的女书故事等待你来开启。</p>

            <p>请留意残卷上的字形，解读扇面中的隐语，在歌堂的吟唱中寻找线索，一步步拨开迷雾。</p>

            <p>在这个过程中，那些如柳叶般蜿蜒的字符，会慢慢向你展露它们的含义。</p>
          </div>
        </div>

        {/* 继续按钮 */}
        <div className="prologue-action">
          <button className="prologue-btn" onClick={onContinue}>
            继续
          </button>
        </div>
      </div>
    </div>
  )
}

export default Prologue
