import type { DictionaryEntry } from '../../../game/types'
import type { EmbroideryRoomEntryId } from '../embroideryRoomSceneData'

export const EMBROIDERY_SCENE_ID = 'embroidery' as const

export const EMBROIDERY_WORLD_WIDTH = 4344
export const EMBROIDERY_WORLD_HEIGHT = 1448
export const EMBROIDERY_PLAYER_SPEED = 400
export const EMBROIDERY_INTERACT_DISTANCE = 160

export type EmbroideryPreviewPhase = {
  display: 'dialogue' | 'culture'
  title?: string
  text: string
  imageTextureKey?: string
  nushuTextureKeys?: readonly string[]
}

export type EmbroideryUnlockConfig = {
  id: Exclude<EmbroideryRoomEntryId, 'embroidery_yan'>
  dictionaryEntryId: 'jin' | 'nugong' | 'deng' | 'hongzhuang' | 'ming'
  nushuImages: readonly string[]
  nushuTextureKeys: readonly string[]
}

export type EmbroideryInteraction = {
  id: string
  title: string
  category: 'main' | 'culture' | 'npc'
  unlock?: EmbroideryUnlockConfig
  textureKey: string
  imagePath: string
  x: number
  y: number
  displayWidth: number
  phases: readonly EmbroideryPreviewPhase[]
}

export const EMBROIDERY_ENTRIES: DictionaryEntry[] = [
  {
    id: 'hongzhuang',
    sceneId: EMBROIDERY_SCENE_ID,
    nushuText: '女书·红妆',
    meaning: '红妆',
    imageKey: 'embroidery_nushu_hongzhuang',
    clueIds: ['embroidery_red_makeup'],
    isMainEntry: true,
    hint: '婚嫁梳妆与赠书语境',
    nvshuChar: '女书·红妆',
    chinese: '红妆',
    unlocked: false,
    matched: false,
  },
  {
    id: 'nugong',
    sceneId: EMBROIDERY_SCENE_ID,
    nushuText: '女书·女红',
    meaning: '女红',
    imageKey: 'embroidery_nushu_nugong',
    clueIds: ['embroidery_sewing_basket'],
    isMainEntry: true,
    hint: '针线与女性书写',
    nvshuChar: '女书·女红',
    chinese: '女红',
    unlocked: false,
    matched: false,
  },
  {
    id: 'jin',
    sceneId: EMBROIDERY_SCENE_ID,
    nushuText: '女书·今',
    meaning: '今',
    imageKey: 'embroidery_nushu_jin',
    clueIds: ['embroidery_handkerchief'],
    isMainEntry: true,
    hint: '绣娘说起今日要完成的帕',
    nvshuChar: '女书·今',
    chinese: '今',
    unlocked: false,
    matched: false,
  },
  {
    id: 'yan',
    sceneId: EMBROIDERY_SCENE_ID,
    nushuText: '女书·言',
    meaning: '言',
    imageKey: 'embroidery_nushu_yan',
    clueIds: ['embroidery_handkerchief', 'embroidery_embroiderer'],
    isMainEntry: true,
    hint: '不能说出口的话由针线写下',
    nvshuChar: '女书·言',
    chinese: '言',
    unlocked: false,
    matched: false,
  },
  {
    id: 'ming',
    sceneId: EMBROIDERY_SCENE_ID,
    nushuText: '女书·名',
    meaning: '名',
    imageKey: 'embroidery_nushu_ming',
    clueIds: ['embroidery_needlework'],
    isMainEntry: true,
    hint: '帕角留下赠送者的名字',
    nvshuChar: '女书·名',
    chinese: '名',
    unlocked: false,
    matched: false,
  },
  {
    id: 'deng',
    sceneId: EMBROIDERY_SCENE_ID,
    nushuText: '女书·灯',
    meaning: '灯',
    imageKey: 'embroidery_nushu_deng',
    clueIds: ['embroidery_lamp'],
    isMainEntry: true,
    hint: '深宵灯下仍在绣作',
    nvshuChar: '女书·灯',
    chinese: '灯',
    unlocked: false,
    matched: false,
  },
]

export const EMBROIDERY_SLOTS = EMBROIDERY_ENTRIES.map((entry) => ({
  chinese: entry.meaning,
  correctEntryId: entry.id,
}))

export const EMBROIDERY_NUSHU_ASSETS = [
  ['embroidery_nushu_hong', '/assets/nushu/hong.png'],
  ['embroidery_nushu_zhuang', '/assets/nushu/zhuang.png'],
  ['embroidery_nushu_nv', '/assets/nushu/nv.png'],
  ['embroidery_nushu_jin', '/assets/nushu/jin.png'],
  ['embroidery_nushu_yan', '/assets/nushu/yan.png'],
  ['embroidery_nushu_ming', '/assets/nushu/ming.png'],
  ['embroidery_nushu_deng', '/assets/nushu/deng.png'],
] as const

export const EMBROIDERY_FINAL_YAN_UNLOCK = {
  id: 'embroidery_yan',
  dictionaryEntryId: 'yan',
  nushuImages: ['/assets/nushu/yan.png'],
  nushuTextureKeys: ['embroidery_nushu_yan'],
} as const satisfies {
  id: EmbroideryRoomEntryId
  dictionaryEntryId: 'yan'
  nushuImages: readonly string[]
  nushuTextureKeys: readonly string[]
}

export const EMBROIDERY_INTERACTIONS: EmbroideryInteraction[] = [
  {
    id: 'embroidery_red_makeup',
    title: '红妆盒',
    category: 'main',
    unlock: {
      id: 'embroidery_hongzhuang',
      dictionaryEntryId: 'hongzhuang',
      nushuImages: [
        '/assets/nushu/hong.png',
        '/assets/nushu/zhuang.png',
      ],
      nushuTextureKeys: [
        'embroidery_nushu_hong',
        'embroidery_nushu_zhuang',
      ],
    },
    textureKey: 'embroidery_red_makeup',
    imagePath: '/assets/embroidery-room/clues/hongzhuang.png',
    x: 300,
    y: 1150,
    displayWidth: 700,
    phases: [
      {
        display: 'dialogue',
        text: [
          '出门那日，镜匣要合上，木梳也要收好。',
          '这一身{{nushu}}，不是只为好看。',
          '它提醒人，今日之后，她要去很远的地方。',
        ].join('\n'),
        nushuTextureKeys: [
          'embroidery_nushu_hong',
          'embroidery_nushu_zhuang',
        ],
      },
    ],
  },
  {
    id: 'embroidery_needlework',
    title: '女红',
    category: 'main',
    unlock: {
      id: 'embroidery_ming',
      dictionaryEntryId: 'ming',
      nushuImages: ['/assets/nushu/ming.png'],
      nushuTextureKeys: ['embroidery_nushu_ming'],
    },
    textureKey: 'embroidery_needlework',
    imagePath: '/assets/embroidery-room/clues/nugong.png',
    x: 2850,
    y: 620,
    displayWidth: 600,
    phases: [
      {
        display: 'dialogue',
        text: [
          '送人的帕，不能只绣花。',
          '帕角要留她的{{nushu}}。',
          '这样多年以后，也还记得是谁送的。',
        ].join('\n'),
        nushuTextureKeys: ['embroidery_nushu_ming'],
      },
    ],
  },
  {
    id: 'embroidery_lamp',
    title: '灯',
    category: 'main',
    unlock: {
      id: 'embroidery_deng',
      dictionaryEntryId: 'deng',
      nushuImages: ['/assets/nushu/deng.png'],
      nushuTextureKeys: ['embroidery_nushu_deng'],
    },
    textureKey: 'embroidery_lamp',
    imagePath: '/assets/embroidery-room/clues/deng.png',
    x: 600,
    y: 570,
    displayWidth: 550,
    phases: [
      {
        display: 'dialogue',
        text: [
          '白日人多，有些话不好写。',
          '到了夜里，只剩这一盏{{nushu}}。',
          '她们便坐下来，一边绣，一边轻声读。',
        ].join('\n'),
        nushuTextureKeys: ['embroidery_nushu_deng'],
      },
    ],
  },
  {
    id: 'embroidery_handkerchief',
    title: '绣帕',
    category: 'main',
    unlock: {
      id: 'embroidery_jin',
      dictionaryEntryId: 'jin',
      nushuImages: ['/assets/nushu/jin.png'],
      nushuTextureKeys: ['embroidery_nushu_jin'],
    },
    textureKey: 'embroidery_handkerchief',
    imagePath: '/assets/embroidery-room/items/xiupa.png',
    x: 3250,
    y: 1200,
    displayWidth: 400,
    phases: [
      {
        display: 'dialogue',
        text: [
          '这方帕，不能拖到明日了。',
          '我{{nushu}}日就要把它绣完。',
        ].join('\n'),
        nushuTextureKeys: ['embroidery_nushu_jin'],
      },
      {
        display: 'culture',
        title: '帕上的字',
        text: [
          '女书不仅写在纸本和扇面上，也会写在布帕上，称为“帕书”。',
          '有些字还会被一针一线绣在帕子上，成为“绣字”。',
          '那些绣下来的字，像是藏在布里的话，被人带走，也被人记住。',
        ].join('\n'),
      },
    ],
  },
  {
    id: 'embroidery_sewing_basket',
    title: '女红篮',
    category: 'main',
    unlock: {
      id: 'embroidery_nugong',
      dictionaryEntryId: 'nugong',
      nushuImages: [
        '/assets/nushu/nv.png',
        '/assets/nushu/hong.png',
      ],
      nushuTextureKeys: [
        'embroidery_nushu_nv',
        'embroidery_nushu_hong',
      ],
    },
    textureKey: 'embroidery_sewing_basket',
    imagePath: '/assets/embroidery-room/items/needle-basket.png',
    x: 3950,
    y: 1170,
    displayWidth: 850,
    phases: [
      {
        display: 'dialogue',
        text: [
          '从前学字，不一定是在书桌前。',
          '手里做着针线，耳边听着别人读。',
          '一边绣，一边念，一边记，这就叫{{nushu}}。',
        ].join('\n'),
        nushuTextureKeys: [
          'embroidery_nushu_nv',
          'embroidery_nushu_hong',
        ],
      },
      {
        display: 'culture',
        title: '一边女红，一边读字',
        text: [
          '女红篮里放着针线、布料，也放着日常里的许多声音。',
          '从前女性常一边做针线，一边听人读字、唱歌、讲故事。',
          '字不是只在书桌前学会的，也是在一针一线之间慢慢记下来的。',
        ].join('\n'),
      },
    ],
  },
  {
    id: 'embroidery_mirror_box',
    title: '梳妆盒',
    category: 'culture',
    textureKey: 'embroidery_mirror_box',
    imagePath: '/assets/embroidery-room/items/comb-mirror.png',
    x: 2400,
    y: 680,
    displayWidth: 450,
    phases: [
      {
        display: 'culture',
        title: '红妆与离家',
        text: [
          '木梳和镜匣常放在妆奁里，也会在出嫁时被收进行囊。',
          '它们不一定写有女书，却和纸页、绣帕一样，是可以被带走的东西。',
          '人离开家时，有些话说不出口，便托给这些贴身之物留下。',
        ].join('\n'),
      },
    ],
  },
  {
    id: 'embroidery_embroiderer',
    title: '绣娘',
    category: 'npc',
    textureKey: 'embroidery_embroiderer',
    imagePath: '/assets/embroidery-room/npc/xiuniang.png',
    x: 1800,
    y: 900,
    displayWidth: 400,
    phases: [],
  },
]
