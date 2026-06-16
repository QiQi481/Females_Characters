/**
 * SongData - 场景2：女伴们一起唱歌场景 的静态数据
 * 包含：词条定义、线索配置、NPC对话、中文槽位
 */
import type { Clue, NPC, DictionaryEntry } from '../../types';

// ==================== 场景2词条定义 ====================

/** 场景2需要解锁的5个女书词条 */
export const SONG_ENTRIES: DictionaryEntry[] = [
  {
    id: 'song_ge',
    nvshuChar: '𛆁', // 女书"歌"（用Unicode女书字符占位）
    chinese: '歌',
    unlocked: false,
    matched: false,
    sceneId: 'song',
    hint: '从唱扇女中发现',
  },
  {
    id: 'song_sheng',
    nvshuChar: '𛆂', // 女书"声"
    chinese: '声',
    unlocked: false,
    matched: false,
    sceneId: 'song',
    hint: '从围坐姐妹处听到',
  },
  {
    id: 'song_shan',
    nvshuChar: '𛆃', // 女书"扇"
    chinese: '扇',
    unlocked: false,
    matched: false,
    sceneId: 'song',
    hint: '从唱扇女中发现',
  },
  {
    id: 'song_chuan',
    nvshuChar: '𛆄', // 女书"传"
    chinese: '传',
    unlocked: false,
    matched: false,
    sceneId: 'song',
    hint: '从传唱纸片中发现',
  },
  {
    id: 'song_ji',
    nvshuChar: '𛆅', // 女书"记"
    chinese: '记',
    unlocked: false,
    matched: false,
    sceneId: 'song',
    hint: '从笔墨中发现',
  },
];

// ==================== 中文槽位配置 ====================

/** 词典中的中文槽位（拖放目标） */
export const SONG_SLOTS = [
  { chinese: '歌', correctEntryId: 'song_ge' },
  { chinese: '声', correctEntryId: 'song_sheng' },
  { chinese: '扇', correctEntryId: 'song_shan' },
  { chinese: '传', correctEntryId: 'song_chuan' },
  { chinese: '记', correctEntryId: 'song_ji' },
];

// ==================== 场景2线索 ====================

/** 场景2中的所有线索（坐标适配 2172×724 底图） */
export const SONG_CLUES: Clue[] = [
  // ----- 正确线索1：唱扇女展开页 -----
  {
    id: 'clue_fan',
    name: '__ __ 展开图',
    x: 1200,
    y: 740,
    type: 'view',
    prompt: '按E键和[__ __ 展开图]交互',
    isFake: false,
    entryIds: ['song_ge', 'song_shan'],
    displayText: `【__ __ 展开图】

一把精致的折扇展开在案上。

扇面上写着两行娟秀的女书文字：

   𛆁 —— 歌
   𛆃 —— 扇

扇骨上刻着细密的花纹，似乎描绘着
姐妹们围坐唱歌的场景。`,
  },

  // ----- 正确线索2：传唱纸片 -----
  {
    id: 'clue_paper',
    name: '__',
    x: 3100,
    y: 1100,
    type: 'view',
    prompt: '按 E 查看纸片',
    isFake: false,
    entryIds: ['song_chuan'],
    displayText: `【传唱纸片】

一张泛黄的纸片，上面抄录着歌谣片段。

女书文字写着：

   𛆄 —— 传

纸片的边角已经磨损，显然被很多人传阅过。
这是姐妹们互相传抄的歌本。`,
  },

  // ----- 错误线索1：笔墨（不给符号） -----
  {
    id: 'clue_basket',
    name: '笔墨',
    x: 640,
    y: 1160,
    type: 'view',
    prompt: '按 E 查看笔墨',
    isFake: true,
    entryIds: [],
    displayText: `【笔墨】

一套精致的文房四宝摆在桌上。

笔架上搁着一支毛笔，旁边是砚台和墨锭。

砚台里还残留着淡淡的墨迹，
似乎有人刚刚用它写过什么字。

但这里并没有你要找的女书符号……`,
  },

  // ----- 错误线索2：唱扇女（不给符号） -----
  {
    id: 'clue_stand',
    name: '唱扇女',
    x: 3500,
    y: 640,
    type: 'view',
    prompt: '按 E 查看唱扇女',
    isFake: true,
    entryIds: [],
    displayText: `【唱扇女】

一个木制的扇架立在案上，旁边放着笔墨。

这里应该是展示唱扇的地方，
但扇子好像被拿到别处去了。

你需要找到那柄唱扇。`,
  },

  // ----- 正确线索3：琵琶 -----
  {
    id: 'clue_pipa',
    name: '琵琶',
    x: 4100,
    y: 750,
    type: 'view',
    prompt: '按 E 查看琵琶',
    isFake: false,
    entryIds: [],
    displayText: `【琵琶】

一把古朴的琵琶静静倚在案边。

琴身木质温润，四根弦上落了些微尘，
琴头雕刻着精致的花纹。

姐妹们唱歌时，有时会用它伴奏。
琵琶声起，歌声便有了更深的韵味。

不过这柄琵琶上似乎没有刻写女书文字……
也许它的意义在于声音本身？`,
  },
];

// ==================== 场景2 NPC ====================

/** 围坐姐妹（听唱读） */
export const SISTERS_NPC: NPC = {
  id: 'npc_sisters',
  name: '__ __ 姐妹',
  x: 2160,
  y: 800,
  prompt: '按 E 听她们唱读',
  dialogues: [
    '（姐妹们围坐一圈，轻声哼唱）',
    '🎵 山上的花开了又谢……',
    '🎵 姐妹的情谊不会变……',
    '她们唱的是女书歌谣，歌声婉转悠长。',
    '你听到歌谣中反复出现"声"这个字……',
    '女书不只用来看，更是用来唱的。',
  ],
};

/** 唱扇女 NPC - 已移除 */
// export const SINGER_NPC: NPC = { ... };  // 已删除，不再使用

// ==================== 推测句子 ====================

/** 最终句子：歌声传记（词条ID顺序） */
export const FINAL_SENTENCE_IDS = ['song_ge', 'song_sheng', 'song_chuan', 'song_ji'];

/** 最终句子中文 */
export const FINAL_SENTENCE_CN = '歌声传记';

/** 完成提示 */
export const COMPLETION_MESSAGE = '「你听懂了唱扇女中被传下来的记忆。」';

// ==================== 场景地图数据（已不需要，由 physics world bounds 处理）====================
