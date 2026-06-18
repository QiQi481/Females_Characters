export type {
  Clue,
  ClueId,
  ClueInteractionType,
  ClueType,
  CoreSceneId,
  DictionaryEntry,
  DictionaryEntryId,
  NPC,
  PlayerPosition,
  SanChaoBookSlotId,
  SaveData,
  SceneId,
} from '../../../game/types'

export const SceneKeys = {
  BOOT: 'SingingHallBootScene',
  MAIN: 'SingingHallMainScene',
  SCENE5: 'Scene5',
  EMBROIDERY: 'EmbroideryRoomScene',
} as const

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys]
