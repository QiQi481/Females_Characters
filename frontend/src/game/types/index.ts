export type CoreSceneId = 'embroidery' | 'singingHall' | 'village'
export type SceneId = CoreSceneId | (string & {})

export type DictionaryEntryId = string
export type ClueId = string
export type SanChaoBookSlotId = string

export interface DictionaryEntry {
  id: DictionaryEntryId
  sceneId: SceneId
  nushuText: string
  meaning: string
  symbol?: string
  imageKey?: string
  imagePath?: string
  clueIds: readonly ClueId[]
  sanChaoBookSlotId?: SanChaoBookSlotId
  isMainEntry: boolean
  hint?: string

  /** Transitional aliases retained for the current SingingHall code. */
  nvshuChar: string
  chinese: string
  unlocked?: boolean
  matched?: boolean
}

export type ClueType = 'main' | 'culture' | 'npc'
export type ClueInteractionType = 'view' | 'listen' | 'collect'

export interface Clue {
  id: ClueId
  sceneId: SceneId
  title: string
  description: string
  type: ClueType
  imageKey?: string
  imagePath?: string
  unlockEntryIds: readonly DictionaryEntryId[]

  /** Scene placement and compatibility fields used by SingingHall. */
  x: number
  y: number
  interactionType: ClueInteractionType
  prompt: string
  name: string
  isFake: boolean
  entryIds: string[]
  displayText: string
}

export interface NPC {
  id: string
  sceneId: SceneId
  name: string
  x: number
  y: number
  dialogues: readonly string[]
  prompt: string
  unlockEntryIds?: readonly DictionaryEntryId[]
}

export interface PlayerPosition {
  x: number
  y: number
}

export interface SaveData {
  version: 3
  entryDefinitions: Record<DictionaryEntryId, DictionaryEntry>
  unlockedEntries: DictionaryEntryId[]
  matchedEntries: DictionaryEntryId[]
  discoveredClues: ClueId[]
  completedScenes: SceneId[]
  playerPositions: Record<string, PlayerPosition>
  filledSanChaoBookSlots: Record<SanChaoBookSlotId, DictionaryEntryId>
}
