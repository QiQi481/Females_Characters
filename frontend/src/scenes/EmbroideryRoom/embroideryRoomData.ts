export const clueOrder = ['红妆', '女红', '灯', '今', '名', '言'] as const

export type ClueName = (typeof clueOrder)[number]
export type ObjectClueName = Extract<ClueName, '红妆' | '女红' | '灯'>
export type DialogueClueName = Extract<ClueName, '今' | '名' | '言'>

type PercentValue = `${number}%`

export type PercentRect = {
  left?: PercentValue
  right?: PercentValue
  top?: PercentValue
  bottom?: PercentValue
  width: PercentValue
  height?: PercentValue
}

type SceneObjectBase = {
  id: string
  title: string
  description: string
  image: string
  imagePosition: PercentRect
  hotspotPosition: PercentRect
  ariaLabel: string
}

export type ClueSceneObjectConfig = SceneObjectBase & {
  kind: 'clue'
  title: ObjectClueName
  nushuImages: readonly string[]
}

export type CultureSceneObjectConfig = SceneObjectBase & {
  kind: 'culture'
}

export type SceneObjectConfig =
  | ClueSceneObjectConfig
  | CultureSceneObjectConfig

export type DialoguePuzzleOption = {
  id: string
  label: string
}

export type DialoguePuzzleConfig = {
  id: string
  label: DialogueClueName
  meaning: string
  nushuImage: string
  beforeLines: readonly string[]
  puzzleLine: string
  solvedLine: string
  afterLines: readonly string[]
  contextSentence: string
  options: readonly DialoguePuzzleOption[]
  correctOption: string
  unlockedText: string
}

export type NpcConfig = {
  id: string
  name: string
  image: string
  imagePosition: PercentRect
  hotspotPosition: PercentRect
  ariaLabel: string
  completedLine: string
}

export const nushuImages: Record<ClueName, readonly string[]> = {
  红妆: [
    '/assets/embroidery-room/nushu/hong.png',
    '/assets/embroidery-room/nushu/zhuang.png',
  ],
  女红: [
    '/assets/embroidery-room/nushu/nv.png',
    '/assets/embroidery-room/nushu/hong.png',
  ],
  灯: ['/assets/embroidery-room/nushu/deng.png'],
  今: ['/assets/embroidery-room/nushu/jin.png'],
  名: ['/assets/embroidery-room/nushu/ming.png'],
  言: ['/assets/embroidery-room/nushu/yan.png'],
}

export const sceneObjects: readonly SceneObjectConfig[] = [
  {
    id: 'red-makeup',
    kind: 'clue',
    title: '红妆',
    description:
      '旧时女子出嫁时的衣饰与妆奁，也承载着家族祝愿和女性之间的情谊。',
    image: '/assets/embroidery-room/clues/hongzhuang.png',
    nushuImages: nushuImages.红妆,
    imagePosition: { left: '13%', top: '57%', width: '17%' },
    hotspotPosition: {
      left: '16%',
      top: '64%',
      width: '11%',
      height: '23%',
    },
    ariaLabel: '查看主线线索红妆',
  },
  {
    id: 'needlework',
    kind: 'clue',
    title: '女红',
    description:
      '纺织、缝纫、刺绣等传统技艺的统称。针线既是日常劳作，也是表达与记录。',
    image: '/assets/embroidery-room/clues/nugong.png',
    nushuImages: nushuImages.女红,
    imagePosition: { left: '37%', top: '56%', width: '17%' },
    hotspotPosition: {
      left: '40.5%',
      top: '63%',
      width: '11%',
      height: '24%',
    },
    ariaLabel: '查看主线线索女红',
  },
  {
    id: 'lamp',
    kind: 'clue',
    title: '灯',
    description:
      '灯下赶绣，是女红空间常见的生活图景。微光照见针脚，也守着未说完的话。',
    image: '/assets/embroidery-room/clues/deng.png',
    nushuImages: nushuImages.灯,
    imagePosition: { left: '69%', top: '49%', width: '14%' },
    hotspotPosition: {
      left: '72%',
      top: '52%',
      width: '8%',
      height: '31%',
    },
    ariaLabel: '查看主线线索灯',
  },
  {
    id: 'handkerchief',
    kind: 'culture',
    title: '绣帕',
    description:
      '方帕既是贴身日用品，也常作为赠礼。花纹、名字与文字让它成为情感的凭证。',
    image: '/assets/embroidery-room/items/xiupa.png',
    imagePosition: { left: '61%', top: '62%', width: '13.5%' },
    hotspotPosition: {
      left: '63%',
      top: '68%',
      width: '10%',
      height: '20%',
    },
    ariaLabel: '查看文化物件绣帕',
  },
  {
    id: 'needle-basket',
    kind: 'culture',
    title: '女红篮 / 针线',
    description:
      '女红篮收纳布料、绣线、针剪等工具。篮中的针线既服务于日常劳作，也在布面上留下女性的表达。',
    image: '/assets/embroidery-room/items/needle-basket.png',
    imagePosition: { left: '76%', top: '58%', width: '14%' },
    hotspotPosition: {
      left: '77%',
      top: '64%',
      width: '13%',
      height: '25%',
    },
    ariaLabel: '查看文化物件女红篮和针线',
  },
  {
    id: 'comb-mirror',
    kind: 'culture',
    title: '木梳 / 镜匣',
    description:
      '木梳用于日常理发，也寄托顺遂相守的愿望；镜匣收纳铜镜与梳妆小物，保存着女性私密的生活痕迹。',
    image: '/assets/embroidery-room/items/comb-mirror.png',
    imagePosition: { left: '87%', top: '61%', width: '13%' },
    hotspotPosition: {
      left: '87.2%',
      top: '65%',
      width: '11.8%',
      height: '24%',
    },
    ariaLabel: '查看文化物件木梳和镜匣',
  },
]

const dialogueOptions: readonly DialoguePuzzleOption[] = [
  { id: 'today', label: '今日' },
  { id: 'name', label: '名字' },
  { id: 'speak', label: '说话' },
  { id: 'lamplight', label: '灯火' },
]

export const dialoguePuzzles: readonly DialoguePuzzleConfig[] = [
  {
    id: 'today',
    label: '今',
    meaning: '今日',
    nushuImage: '/assets/embroidery-room/nushu/jin.png',
    beforeLines: ['这方帕，不能拖到明日了。'],
    puzzleLine: '我{{nushu}}日就要把它绣完。',
    solvedLine: '我今日就要把它绣完。',
    afterLines: [],
    contextSentence: '我 {{nushu}} 日就要把它绣完。',
    options: dialogueOptions,
    correctOption: 'today',
    unlockedText: '已解锁：今 / 今日',
  },
  {
    id: 'name',
    label: '名',
    meaning: '名字',
    nushuImage: '/assets/embroidery-room/nushu/ming.png',
    beforeLines: ['送人的帕，不能只绣花。'],
    puzzleLine: '帕角要留她的{{nushu}}。',
    solvedLine: '帕角要留她的名。',
    afterLines: ['这样多年以后，也还记得是谁送的。'],
    contextSentence: '帕角要留她的 {{nushu}} 。',
    options: dialogueOptions,
    correctOption: 'name',
    unlockedText: '已解锁：名 / 名字',
  },
  {
    id: 'speak',
    label: '言',
    meaning: '说话',
    nushuImage: '/assets/embroidery-room/nushu/yan.png',
    beforeLines: ['有些话，到了出门那日，反倒说不出口。'],
    puzzleLine: '口中不能{{nushu}}，就让针线替她写。',
    solvedLine: '口中不能言，就让针线替她写。',
    afterLines: ['所以帕上的字，不只是字。'],
    contextSentence: '口中不能 {{nushu}} ，就让针线替她写。',
    options: dialogueOptions,
    correctOption: 'speak',
    unlockedText: '已解锁：言 / 说话',
  },
]

export const npcConfig: NpcConfig = {
  id: 'embroiderer',
  name: '绣娘',
  image: '/assets/embroidery-room/npc/xiuniang.png',
  imagePosition: {
    left: '51.5%',
    bottom: '2%',
    width: '11.8%',
    height: '87%',
  },
  hotspotPosition: {
    left: '51.5%',
    bottom: '2%',
    width: '11.8%',
    height: '87%',
  },
  ariaLabel: '与绣娘交谈',
  completedLine: '这些字，已经都被你认出来了。',
}
