import type { DictionaryPuzzle } from '../../systems/dictionary'
import {
  clueContent,
  type EmbroideryRoomEntryId,
  type EmbroideryRoomPropId,
} from './embroideryRoomSceneData'

export const clueOrder = ['今', '女红', '灯', '红妆', '名', '言'] as const

export type ClueName = (typeof clueOrder)[number]
export type DialogueClueName = Extract<ClueName, '今' | '名' | '言'>
export type ObjectUnlockEntryId = Exclude<
  EmbroideryRoomEntryId,
  'embroidery_yan'
>

export const embroideryEntryLabels: Record<
  EmbroideryRoomEntryId,
  ClueName
> = {
  embroidery_jin: '今',
  embroidery_nugong: '女红',
  embroidery_deng: '灯',
  embroidery_hongzhuang: '红妆',
  embroidery_ming: '名',
  embroidery_yan: '言',
}

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
  id: EmbroideryRoomPropId
  title: string
  description: string
  image: string
  imagePosition: PercentRect
  hotspotPosition: PercentRect
  ariaLabel: string
}

export type ClueSceneObjectConfig = SceneObjectBase & {
  kind: 'clue'
  unlockEntryId: ObjectUnlockEntryId
  nushuImages: readonly string[]
}

export type CultureSceneObjectConfig = SceneObjectBase & {
  kind: 'culture'
  unlockEntryId?: never
}

export type SceneObjectConfig =
  | ClueSceneObjectConfig
  | CultureSceneObjectConfig

export type DialoguePuzzleConfig = Pick<
  DictionaryPuzzle,
  'activeEntryId' | 'contextSentence' | 'correctEntryId'
> & {
  id: string
  label: DialogueClueName
  nushuImage: string
  beforeLines: readonly string[]
  puzzleLine: string
  solvedLine: string
  afterLines: readonly string[]
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

export const nushuImages: Record<
  EmbroideryRoomEntryId,
  readonly string[]
> = {
  embroidery_hongzhuang: [
    '/assets/nushu/hong.png',
    '/assets/nushu/zhuang.png',
  ],
  embroidery_nugong: [
    '/assets/nushu/nv.png',
    '/assets/nushu/hong.png',
  ],
  embroidery_deng: ['/assets/nushu/deng.png'],
  embroidery_jin: ['/assets/nushu/jin.png'],
  embroidery_ming: ['/assets/nushu/ming.png'],
  embroidery_yan: ['/assets/nushu/yan.png'],
}

export const sceneObjects: readonly SceneObjectConfig[] = [
  {
    id: 'red-makeup',
    kind: 'clue',
    title: clueContent['red-makeup'].title,
    description: clueContent['red-makeup'].description,
    unlockEntryId: 'embroidery_hongzhuang',
    image: '/assets/embroidery-room/clues/hongzhuang.png',
    nushuImages: nushuImages.embroidery_hongzhuang,
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
    title: clueContent.needlework.title,
    description: clueContent.needlework.description,
    unlockEntryId: 'embroidery_ming',
    image: '/assets/embroidery-room/clues/nugong.png',
    nushuImages: nushuImages.embroidery_ming,
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
    title: clueContent.lamp.title,
    description: clueContent.lamp.description,
    unlockEntryId: 'embroidery_deng',
    image: '/assets/embroidery-room/clues/deng.png',
    nushuImages: nushuImages.embroidery_deng,
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
    kind: 'clue',
    title: clueContent.handkerchief.title,
    description: clueContent.handkerchief.description,
    unlockEntryId: 'embroidery_jin',
    image: '/assets/embroidery-room/items/xiupa.png',
    nushuImages: nushuImages.embroidery_jin,
    imagePosition: { left: '61%', top: '62%', width: '13.5%' },
    hotspotPosition: {
      left: '63%',
      top: '68%',
      width: '10%',
      height: '20%',
    },
    ariaLabel: '查看主线线索绣帕',
  },
  {
    id: 'sewing-basket',
    kind: 'clue',
    title: clueContent['sewing-basket'].title,
    description: clueContent['sewing-basket'].description,
    unlockEntryId: 'embroidery_nugong',
    image: '/assets/embroidery-room/items/needle-basket.png',
    nushuImages: nushuImages.embroidery_nugong,
    imagePosition: { left: '76%', top: '58%', width: '14%' },
    hotspotPosition: {
      left: '77%',
      top: '64%',
      width: '13%',
      height: '25%',
    },
    ariaLabel: '查看主线线索女红篮和针线',
  },
  {
    id: 'mirror-box',
    kind: 'culture',
    title: clueContent['mirror-box'].title,
    description: clueContent['mirror-box'].description,
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

export const finalYanPuzzle: DialoguePuzzleConfig = {
  id: 'embroiderer-yan',
  label: '言',
  activeEntryId: 'yan',
  correctEntryId: 'yan',
  nushuImage: '/assets/nushu/yan.png',
  beforeLines: ['有些话，到了出门那日，反倒说不出口。'],
  puzzleLine: '口中不能{{nushu}}，就让针线替她写。',
  solvedLine: '口中不能言，就让针线替她写。',
  afterLines: ['所以帕上的字，不只是字。'],
  contextSentence: '千 {{nushu}} 写尽犹余半',
}

export const dialoguePuzzles: readonly DialoguePuzzleConfig[] = [
  finalYanPuzzle,
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
