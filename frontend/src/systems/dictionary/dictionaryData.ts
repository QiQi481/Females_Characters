export type DictionarySceneId = 'scene-1' | 'scene-2' | 'scene-3'

export type DictionaryEntryStatus = 'locked' | 'discovered' | 'unlocked'

export type DictionaryEntryPosition = {
  x: number
  y: number
}

export type DictionaryEntry = {
  id: string
  label: string
  sceneId: DictionarySceneId
  status: DictionaryEntryStatus
  isUnlocked?: boolean
  nushuImages: readonly string[]
  targetSlots: readonly string[]
  meaning: string
  clueTitle?: string
  clueImage?: string
  clueLines?: readonly string[]
  position: DictionaryEntryPosition
  size: number
}

export type DictionaryPuzzle = {
  puzzleId: string
  activeEntryId: DictionaryEntry['id']
  contextSentence: string
  correctEntryId: DictionaryEntry['id']
  onSuccess: () => void
}

export type DictionaryPoemSegment =
  | {
      type: 'text'
      value: string
    }
  | {
      type: 'slot'
      slotId: string
      entryId: DictionaryEntry['id']
      requiredEntryId?: DictionaryEntry['id']
      placeholder: string
    }

export type DictionaryPoemLine = {
  id: string
  segments: readonly DictionaryPoemSegment[]
}

const nushuAsset = (fileName: string) =>
  `/assets/nushu/${fileName}.png`

export const entries: readonly DictionaryEntry[] = [
  {
    id: 'jun',
    label: '君',
    sceneId: 'scene-1',
    status: 'locked',
    nushuImages: [nushuAsset('jun')],
    targetSlots: ['line-1-lord'],
    meaning: '对所思、所赠之人的敬称，也寄托着书写者的牵念。',
    position: { x: 18, y: 17 },
    size: 68,
  },
  {
    id: 'jun-2',
    label: '君',
    sceneId: 'scene-1',
    status: 'locked',
    nushuImages: [nushuAsset('jun')],
    targetSlots: ['line-3-lord'],
    meaning: '对所思、所赠之人的敬称，也寄托着书写者的牵念。',
    position: { x: 10, y: 27 },
    size: 68,
  },
  {
    id: 'chunfeng',
    label: '春风',
    sceneId: 'scene-1',
    status: 'locked',
    nushuImages: [nushuAsset('chun'), nushuAsset('feng')],
    targetSlots: ['line-1-spring-breeze'],
    meaning: '温暖和煦的风，在诗中也象征顺遂的新程。',
    position: { x: 46, y: 13 },
    size: 82,
  },
  {
    id: 'wang',
    label: '忘',
    sceneId: 'scene-1',
    status: 'locked',
    nushuImages: [nushuAsset('wang')],
    targetSlots: ['line-3-forget'],
    meaning: '不再记得。此处以反问写离别之后仍不会忘却。',
    position: { x: 76, y: 18 },
    size: 64,
  },
  {
    id: 'ji',
    label: '记',
    sceneId: 'scene-1',
    status: 'locked',
    nushuImages: [nushuAsset('ji')],
    targetSlots: ['line-3-remember'],
    meaning: '记取、留存，让姓名与情谊在岁月中仍可追寻。',
    position: { x: 88, y: 34 },
    size: 58,
  },
  {
    id: 'shenxiao',
    label: '深宵',
    sceneId: 'scene-1',
    status: 'locked',
    nushuImages: [nushuAsset('shen'), nushuAsset('xiao')],
    targetSlots: ['line-4-deep-night'],
    meaning: '夜色最深之时，常与独坐、思念和私语相连。',
    position: { x: 64, y: 38 },
    size: 78,
  },
  {
    id: 'yusheng',
    label: '雨声',
    sceneId: 'scene-1',
    status: 'locked',
    nushuImages: [nushuAsset('yu'), nushuAsset('sheng')],
    targetSlots: ['line-4-rain-sound'],
    meaning: '雨落的声音，在末句中承接未尽的话语与余情。',
    position: { x: 28, y: 43 },
    size: 72,
  },
  {
    id: 'hongzhuang',
    label: '红妆',
    sceneId: 'scene-2',
    status: 'discovered',
    nushuImages: [nushuAsset('hong'), nushuAsset('zhuang')],
    targetSlots: ['line-1-red-makeup'],
    meaning: '女子出嫁时的妆饰与衣装，也承载祝愿和情谊。',
    clueTitle: '{{nushu}}',
    clueImage: '/assets/embroidery-room/clues/hongzhuang.png',
    clueLines: [
      '出门那日，镜匣要合上，木梳也要收好。',
      '这一身{{nushu}}，不是只为好看。',
      '它提醒人，今日之后，她要去很远的地方。',
    ],
    position: { x: 13, y: 62 },
    size: 84,
  },
  {
    id: 'nugong',
    label: '女红',
    sceneId: 'scene-2',
    status: 'discovered',
    nushuImages: [nushuAsset('nv'), nushuAsset('hong')],
    targetSlots: ['line-2-needlework'],
    meaning: '纺织、缝纫、刺绣等传统技艺的统称。',
    clueTitle: '{{nushu}}',
    clueImage: '/assets/embroidery-room/items/needle-basket.png',
    clueLines: [
      '从前学字，不一定是在书桌前。',
      '手里做着针线，耳边听着别人读。',
      '一边绣，一边念，一边记，这就叫{{nushu}}。',
    ],
    position: { x: 43, y: 61 },
    size: 78,
  },
  {
    id: 'jin',
    label: '今',
    sceneId: 'scene-2',
    status: 'discovered',
    nushuImages: [nushuAsset('jin')],
    targetSlots: ['line-1-today'],
    meaning: '今日',
    clueTitle: '{{nushu}}',
    clueImage: '/assets/embroidery-room/items/xiupa.png',
    clueLines: [
      '这方帕，不能拖到明日了。',
      '我{{nushu}}日就要把它绣完。',
    ],
    position: { x: 76, y: 58 },
    size: 66,
  },
  {
    id: 'yan',
    label: '言',
    sceneId: 'scene-2',
    status: 'locked',
    nushuImages: [nushuAsset('yan')],
    targetSlots: ['line-4-words'],
    meaning: '说话',
    clueTitle: '{{nushu}}',
    clueImage: '/assets/embroidery-room/npc/xiuniang-dialogue.png',
    clueLines: [
      '有些话，到了出门那日，反倒说不出口。',
      '口中不能{{nushu}}，就让针线替她写。',
      '所以帕上的字，不只是字。',
    ],
    position: { x: 88, y: 71 },
    size: 62,
  },
  {
    id: 'ming',
    label: '名',
    sceneId: 'scene-2',
    status: 'discovered',
    nushuImages: [nushuAsset('ming')],
    targetSlots: ['line-3-name'],
    meaning: '名字',
    clueTitle: '{{nushu}}',
    clueImage: '/assets/embroidery-room/clues/nugong.png',
    clueLines: [
      '送人的帕，不能只绣花。',
      '帕角要留她的{{nushu}}。',
      '这样多年以后，也还记得是谁送的。',
    ],
    position: { x: 61, y: 78 },
    size: 70,
  },
  {
    id: 'deng',
    label: '灯',
    sceneId: 'scene-2',
    status: 'discovered',
    nushuImages: [nushuAsset('deng')],
    targetSlots: ['line-2-lamp'],
    meaning: '灯下赶绣、读写，是女红房常见的生活图景。',
    clueTitle: '{{nushu}}',
    clueImage: '/assets/embroidery-room/clues/deng.png',
    clueLines: [
      '白日人多，有些话不好写。',
      '到了夜里，只剩这一盏{{nushu}}。',
      '她们便坐下来，一边绣，一边轻声读。',
    ],
    position: { x: 27, y: 84 },
    size: 64,
  },
  {
    id: 'geshan',
    label: '歌扇',
    sceneId: 'scene-3',
    status: 'locked',
    nushuImages: [nushuAsset('ge'), nushuAsset('shan')],
    targetSlots: ['line-2-song-fan'],
    meaning: '题写歌辞的扇面，既可传情，也可保存共同记忆。',
    position: { x: 12, y: 36 },
    size: 68,
  },
  {
    id: 'zhi',
    label: '纸',
    sceneId: 'scene-3',
    status: 'locked',
    nushuImages: [nushuAsset('zhi')],
    targetSlots: ['line-2-paper'],
    meaning: '承载文字的纸面，与绣面一同成为女性书写的所在。',
    position: { x: 46, y: 35 },
    size: 56,
  },
  {
    id: 'yuanxing',
    label: '远行',
    sceneId: 'scene-3',
    status: 'locked',
    nushuImages: [nushuAsset('yuan'), nushuAsset('xing')],
    targetSlots: ['line-3-journey'],
    meaning: '离开熟悉之地去往远方，也开启离别后的新生活。',
    position: { x: 82, y: 87 },
    size: 80,
  },
]

export const sceneLabels: Record<DictionarySceneId, string> = {
  'scene-1': '场景一',
  'scene-2': '场景二',
  'scene-3': '场景三',
}

export const dictionaryPoemLines: readonly DictionaryPoemLine[] = [
  {
    id: 'line-1',
    segments: [
      {
        type: 'slot',
        slotId: 'line-1-red-makeup',
        entryId: 'hongzhuang',
        requiredEntryId: 'hongzhuang',
        placeholder: 'XX',
      },
      {
        type: 'slot',
        slotId: 'line-1-today',
        entryId: 'jin',
        requiredEntryId: 'jin',
        placeholder: 'X',
      },
      { type: 'text', value: '已为' },
      {
        type: 'slot',
        slotId: 'line-1-lord',
        entryId: 'jun',
        requiredEntryId: 'jun',
        placeholder: 'X',
      },
      { type: 'text', value: '成，此后' },
      {
        type: 'slot',
        slotId: 'line-1-spring-breeze',
        entryId: 'chunfeng',
        requiredEntryId: 'chunfeng',
        placeholder: 'XX',
      },
      { type: 'text', value: '伴锦程。' },
    ],
  },
  {
    id: 'line-2',
    segments: [
      {
        type: 'slot',
        slotId: 'line-2-needlework',
        entryId: 'nugong',
        requiredEntryId: 'nugong',
        placeholder: 'XX',
      },
      { type: 'text', value: '曾共' },
      {
        type: 'slot',
        slotId: 'line-2-lamp',
        entryId: 'deng',
        requiredEntryId: 'deng',
        placeholder: 'X',
      },
      { type: 'text', value: '前密，' },
      {
        type: 'slot',
        slotId: 'line-2-song-fan',
        entryId: 'geshan',
        requiredEntryId: 'geshan',
        placeholder: 'XX',
      },
      { type: 'text', value: '还从' },
      {
        type: 'slot',
        slotId: 'line-2-paper',
        entryId: 'zhi',
        requiredEntryId: 'zhi',
        placeholder: 'X',
      },
      { type: 'text', value: '上轻。' },
    ],
  },
  {
    id: 'line-3',
    segments: [
      { type: 'text', value: '莫道' },
      {
        type: 'slot',
        slotId: 'line-3-journey',
        entryId: 'yuanxing',
        requiredEntryId: 'yuanxing',
        placeholder: 'XX',
      },
      { type: 'text', value: '人易' },
      {
        type: 'slot',
        slotId: 'line-3-forget',
        entryId: 'wang',
        requiredEntryId: 'wang',
        placeholder: 'X',
      },
      { type: 'text', value: '，人间自有' },
      {
        type: 'slot',
        slotId: 'line-3-remember',
        entryId: 'ji',
        requiredEntryId: 'ji',
        placeholder: 'X',
      },
      {
        type: 'slot',
        slotId: 'line-3-lord',
        entryId: 'jun-2',
        requiredEntryId: 'jun-2',
        placeholder: 'X',
      },
      {
        type: 'slot',
        slotId: 'line-3-name',
        entryId: 'ming',
        requiredEntryId: 'ming',
        placeholder: 'X',
      },
      { type: 'text', value: '。' },
    ],
  },
  {
    id: 'line-4',
    segments: [
      { type: 'text', value: '千' },
      {
        type: 'slot',
        slotId: 'line-4-words',
        entryId: 'yan',
        requiredEntryId: 'yan',
        placeholder: 'X',
      },
      { type: 'text', value: '写尽犹余半，留与' },
      {
        type: 'slot',
        slotId: 'line-4-deep-night',
        entryId: 'shenxiao',
        requiredEntryId: 'shenxiao',
        placeholder: 'XX',
      },
      { type: 'text', value: '作' },
      {
        type: 'slot',
        slotId: 'line-4-rain-sound',
        entryId: 'yusheng',
        requiredEntryId: 'yusheng',
        placeholder: 'XX',
      },
      { type: 'text', value: '。' },
    ],
  },
]

export const completeDictionaryText = [
  '红妆今已为君成，此后春风伴锦程。',
  '女红曾共灯前密，歌扇还从纸上轻。',
  '莫道远行人易忘，人间自有记君名。',
  '千言写尽犹余半，留与深宵作雨声。',
] as const
