import type { DictionaryEntry } from '../../../game/types'
import type { EmbroideryRoomEntryId } from '../embroideryRoomSceneData'

export const EMBROIDERY_SCENE_ID = 'embroidery' as const

export const EMBROIDERY_WORLD_WIDTH = 4344
export const EMBROIDERY_WORLD_HEIGHT = 1448
export const EMBROIDERY_PLAYER_SPEED = 400
export const EMBROIDERY_INTERACT_DISTANCE = 160

export type EmbroideryPreviewPhase = {
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
        text: [
          '绣娘：出门那日，镜匣要合上，木梳也要收好。',
          '绣娘：这一身{{nushu}}，不是只为好看。',
          '绣娘：它提醒人，今日之后，她要去很远的地方。',
        ].join('\n'),
        nushuTextureKeys: [
          'embroidery_nushu_hong',
          'embroidery_nushu_zhuang',
        ],
      },
      {
        title: '红妆与离家',
        imageTextureKey: 'embroidery_mirror_box',
        text: [
          '木梳和镜匣属于婚嫁生活中的私人物件。',
          '它们提示这里不是普通的书写空间，而是与出嫁、梳妆、离别有关的女红空间。',
          '三朝书、绣帕和赠物，都与“把话留给某个人、让某个人带走”有关。',
        ].join('\n'),
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
    x: 2600,
    y: 600,
    displayWidth: 600,
    phases: [
      {
        text: [
          '绣娘：送人的帕，不能只绣花。',
          '绣娘：帕角要留她的{{nushu}}。',
          '绣娘：这样多年以后，也还记得是谁送的。',
        ].join('\n'),
        nushuTextureKeys: ['embroidery_nushu_ming'],
      },
      {
        text: [
          '绣娘：留下名字，不是为了让人称赞。',
          '绣娘：是怕日子久了，连这份心意从哪里来，都被忘掉。',
        ].join('\n'),
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
        text: [
          '绣娘：白日人多，有些话不好写。',
          '绣娘：到了夜里，只剩这一盏{{nushu}}。',
          '绣娘：她们就在灯前绣，也在灯前读。',
        ].join('\n'),
        nushuTextureKeys: ['embroidery_nushu_deng'],
      },
      {
        text: [
          '绣娘：灯前的话，常常不是给所有人看的。',
          '绣娘：它只给那个该记得的人。',
        ].join('\n'),
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
    x: 3200,
    y: 1200,
    displayWidth: 400,
    phases: [
      {
        text: [
          '绣娘：这方帕，不能拖到明日了。',
          '绣娘：我{{nushu}}日就要把它绣完。',
        ].join('\n'),
        nushuTextureKeys: ['embroidery_nushu_jin'],
      },
      {
        title: '帕上的字',
        text: [
          '女书不仅写在纸本和扇面上，也会写在布帕上，称为“帕书”。',
          '有些字还会被一针一线绣在帕子上，成为“绣字”。',
          '帕子可以被随身携带，也可以作为赠物留下。',
          '因此，绣帕不只是装饰物，也是女性之间传递话语、保存记忆的载体。',
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
    y: 1150,
    displayWidth: 850,
    phases: [
      {
        text: [
          '绣娘：从前学字，不一定是在书桌前。',
          '绣娘：手里做着针线，耳边听着别人读。',
          '绣娘：一边绣，一边念，一边记，这就叫{{nushu}}。',
        ].join('\n'),
        nushuTextureKeys: [
          'embroidery_nushu_nv',
          'embroidery_nushu_hong',
        ],
      },
      {
        title: '一边女红，一边读字',
        text: [
          '在江永女书文化中，女性常聚在一起做女红，也会读纸、读扇、读帕。',
          '年长女性在缝补、绣花、整理针线时，把字、歌和故事教给年轻女孩。',
          '女红篮因此不只是生活工具，也象征女书在女性日常劳动中的传习方式。',
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
    x: 2850,
    y: 700,
    displayWidth: 450,
    phases: [
      {
        title: '红妆与离家',
        text: [
          '木梳和镜匣属于婚嫁生活中的私人物件。',
          '它们提示这里不是普通的书写空间，而是与出嫁、梳妆、离别有关的女红空间。',
          '三朝书、绣帕和赠物，都与“把话留给某个人、让某个人带走”有关。',
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
