export type EmbroideryRoomPropLayer = 'front' | 'mid' | 'back'

export type EmbroideryRoomPropId =
  | 'sewing-basket'
  | 'handkerchief'
  | 'red-makeup'
  | 'lamp'
  | 'needlework'
  | 'mirror-box'

export type EmbroideryRoomEntryId =
  | 'embroidery_jin'
  | 'embroidery_nugong'
  | 'embroidery_deng'
  | 'embroidery_hongzhuang'
  | 'embroidery_ming'
  | 'embroidery_yan'

type EmbroideryRoomPropBase = {
  id: EmbroideryRoomPropId
  name: string
  src: string
  x: number
  y: number
  width: number
  layer: EmbroideryRoomPropLayer
  zIndex: number
}

type EmbroideryRoomCluePropConfig = EmbroideryRoomPropBase & {
  kind: 'clue'
  unlockEntryId: Exclude<EmbroideryRoomEntryId, 'embroidery_yan'>
}

type EmbroideryRoomCulturePropConfig = EmbroideryRoomPropBase & {
  kind: 'culture'
  unlockEntryId?: never
}

export type EmbroideryRoomPropConfig =
  | EmbroideryRoomCluePropConfig
  | EmbroideryRoomCulturePropConfig

export type EmbroideryRoomClueContent = {
  title: string
  description: string
}

export const embroideryRoomBackground =
  '/assets/scenes/embroidery-room/background.png'

export const embroideryRoomProps: readonly EmbroideryRoomPropConfig[] = [
  {
    id: 'sewing-basket',
    name: '女红篮',
    kind: 'clue',
    unlockEntryId: 'embroidery_nugong',
    src: '/assets/embroidery-room/items/needle-basket.png',
    x: 83,
    y: 72,
    width: 18,
    layer: 'front',
    zIndex: 30,
  },
  {
    id: 'handkerchief',
    name: '绣帕',
    kind: 'clue',
    unlockEntryId: 'embroidery_jin',
    src: '/assets/embroidery-room/items/xiupa.png',
    x: 24,
    y: 76,
    width: 15,
    layer: 'front',
    zIndex: 28,
  },
  {
    id: 'red-makeup',
    name: '红妆盒',
    kind: 'clue',
    unlockEntryId: 'embroidery_hongzhuang',
    src: '/assets/embroidery-room/clues/hongzhuang.png',
    x: 12,
    y: 62,
    width: 13,
    layer: 'front',
    zIndex: 26,
  },
  {
    id: 'lamp',
    name: '灯',
    kind: 'clue',
    unlockEntryId: 'embroidery_deng',
    src: '/assets/embroidery-room/clues/deng.png',
    x: 64,
    y: 47,
    width: 7,
    layer: 'mid',
    zIndex: 20,
  },
  {
    id: 'needlework',
    name: '女红',
    kind: 'clue',
    unlockEntryId: 'embroidery_ming',
    src: '/assets/embroidery-room/clues/nugong.png',
    x: 73,
    y: 48,
    width: 13,
    layer: 'mid',
    zIndex: 21,
  },
  {
    id: 'mirror-box',
    name: '梳妆盒',
    kind: 'culture',
    src: '/assets/embroidery-room/items/comb-mirror.png',
    x: 91,
    y: 50,
    width: 8,
    layer: 'back',
    zIndex: 12,
  },
]

export const clueContent = {
  'sewing-basket': {
    title: '女红篮',
    description: '篮中的针线与布片，记录着女性日常手作的痕迹。',
  },
  handkerchief: {
    title: '绣帕',
    description:
      '绣帕不仅是织物，也可能承载赠送、记忆与未说出口的话。',
  },
  'red-makeup': {
    title: '红妆盒',
    description:
      '红妆与婚嫁礼俗相关，提示玩家关注女性生命阶段中的仪式语境。',
  },
  lamp: {
    title: '灯',
    description:
      '灯光暗示夜间缝制与等待，也指向女红房中的时间感。',
  },
  needlework: {
    title: '女红',
    description: '针线、布面与绣架共同构成女红劳动的核心场景。',
  },
  'mirror-box': {
    title: '梳妆盒',
    description:
      '木梳与镜匣组成的梳妆盒，提示玩家继续观察女性日常空间中的细节。',
  },
} as const satisfies Record<
  EmbroideryRoomPropId,
  EmbroideryRoomClueContent
>
