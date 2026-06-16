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
  EMBROIDERY: 'EmbroideryRoomScene',
} as const

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys]
