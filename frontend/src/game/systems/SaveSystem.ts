import type {
  DictionaryEntry,
  DictionaryEntryId,
  PlayerPosition,
  SaveData,
  SceneId,
} from '../types'

export const GLOBAL_SAVE_KEY = 'womenbook_singing_hall_save'
const CURRENT_SAVE_VERSION = 3
const EMBROIDERY_ENTRY_IDS = new Set([
  'hongzhuang',
  'nugong',
  'jin',
  'yan',
  'ming',
  'deng',
])
const EMBROIDERY_COMPLETION_FLAGS = new Set([
  'embroidery',
  'embroideryRoomCompleted',
  'embroideryYanResolved',
])

type LegacySaveData = {
  version?: number
  dictionary?: Record<string, Partial<DictionaryEntry>>
  sceneFlags?: Record<string, boolean>
  lastScene?: string
  lastPosition?: PlayerPosition
}

const unique = <Value>(values: readonly Value[]): Value[] =>
  [...new Set(values)]

const normalizeSceneId = (sceneId: string): SceneId =>
  sceneId === 'song' ? 'singingHall' : sceneId

function createEmptySave(): SaveData {
  return {
    version: CURRENT_SAVE_VERSION,
    entryDefinitions: {},
    unlockedEntries: [],
    matchedEntries: [],
    discoveredClues: [],
    completedScenes: [],
    playerPositions: {},
    filledSanChaoBookSlots: {},
  }
}

function normalizeEntry(
  entry: Partial<DictionaryEntry>,
  fallbackId: string,
  sceneId?: SceneId,
): DictionaryEntry {
  const nushuText =
    entry.nushuText ?? entry.symbol ?? entry.nvshuChar ?? fallbackId
  const meaning = entry.meaning ?? entry.chinese ?? fallbackId

  return {
    id: entry.id ?? fallbackId,
    sceneId: normalizeSceneId(sceneId ?? entry.sceneId ?? 'singingHall'),
    nushuText,
    meaning,
    symbol: entry.symbol,
    imageKey: entry.imageKey,
    imagePath: entry.imagePath,
    clueIds: entry.clueIds ?? [],
    sanChaoBookSlotId: entry.sanChaoBookSlotId,
    isMainEntry: entry.isMainEntry ?? true,
    hint: entry.hint,
    nvshuChar: entry.nvshuChar ?? nushuText,
    chinese: entry.chinese ?? meaning,
  }
}

function normalizeSave(value: unknown): SaveData {
  const emptySave = createEmptySave()
  if (!value || typeof value !== 'object') return emptySave

  const candidate = value as Omit<Partial<SaveData>, 'version'> &
    LegacySaveData

  if (candidate.version === 2 || candidate.version === CURRENT_SAVE_VERSION) {
    const entryDefinitions = Object.fromEntries(
      Object.entries(candidate.entryDefinitions ?? {}).map(([id, entry]) => [
        id,
        normalizeEntry(entry, id),
      ]),
    )

    const normalized: SaveData = {
      version: CURRENT_SAVE_VERSION,
      entryDefinitions,
      unlockedEntries: unique(candidate.unlockedEntries ?? []),
      matchedEntries: unique(candidate.matchedEntries ?? []),
      discoveredClues: unique(candidate.discoveredClues ?? []),
      completedScenes: unique(
        (candidate.completedScenes ?? []).map(normalizeSceneId),
      ),
      playerPositions: candidate.playerPositions ?? {},
      filledSanChaoBookSlots: candidate.filledSanChaoBookSlots ?? {},
    }

    if (candidate.version === 2) {
      normalized.unlockedEntries = normalized.unlockedEntries.filter(
        (entryId) => !EMBROIDERY_ENTRY_IDS.has(entryId),
      )
      normalized.matchedEntries = normalized.matchedEntries.filter(
        (entryId) => !EMBROIDERY_ENTRY_IDS.has(entryId),
      )
      normalized.discoveredClues = normalized.discoveredClues.filter(
        (clueId) => !clueId.startsWith('embroidery_'),
      )
      normalized.completedScenes = normalized.completedScenes.filter(
        (sceneId) => !EMBROIDERY_COMPLETION_FLAGS.has(sceneId),
      )
      delete normalized.playerPositions.embroidery
    }

    return normalized
  }

  const legacyDictionary = candidate.dictionary ?? {}
  const entryDefinitions = Object.fromEntries(
    Object.entries(legacyDictionary).map(([id, entry]) => [
      id,
      normalizeEntry(entry, id),
    ]),
  )
  const unlockedEntries = Object.entries(legacyDictionary)
    .filter(([, entry]) => entry.unlocked === true)
    .map(([id]) => id)
  const matchedEntries = Object.entries(legacyDictionary)
    .filter(([, entry]) => entry.matched === true)
    .map(([id]) => id)
  const completedScenes = Object.entries(candidate.sceneFlags ?? {})
    .filter(([, completed]) => completed)
    .map(([sceneId]) => normalizeSceneId(sceneId))
  const playerPositions =
    candidate.lastScene && candidate.lastPosition
      ? { [candidate.lastScene]: candidate.lastPosition }
      : {}

  return {
    ...emptySave,
    entryDefinitions,
    unlockedEntries,
    matchedEntries,
    completedScenes,
    playerPositions,
  }
}

export class SaveSystem {
  private data: SaveData
  private readonly storageKey: string

  constructor(storageKey = GLOBAL_SAVE_KEY) {
    this.storageKey = storageKey
    this.data = this.load()
  }

  load(): SaveData {
    try {
      const raw = localStorage.getItem(this.storageKey)
      if (!raw) return createEmptySave()

      const normalized = normalizeSave(JSON.parse(raw))
      localStorage.setItem(this.storageKey, JSON.stringify(normalized))
      return normalized
    } catch (error) {
      console.warn('存档读取失败，使用新存档', error)
      return createEmptySave()
    }
  }

  save(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data))
    } catch (error) {
      console.warn('存档保存失败', error)
    }
  }

  reset(): void {
    this.data = createEmptySave()
    this.save()
  }

  getSaveData(): SaveData {
    return structuredClone(this.data)
  }

  registerEntries(sceneId: SceneId, entries: readonly DictionaryEntry[]): void {
    let changed = false

    entries.forEach((entry) => {
      const normalized = normalizeEntry(entry, entry.id, sceneId)
      const existing = this.data.entryDefinitions[entry.id]
      const next = { ...existing, ...normalized }

      if (JSON.stringify(existing) !== JSON.stringify(next)) {
        this.data.entryDefinitions[entry.id] = next
        changed = true
      }
    })

    if (changed) this.save()
  }

  getDictionary(): Record<string, DictionaryEntry> {
    return Object.fromEntries(
      Object.entries(this.data.entryDefinitions).map(([id, entry]) => [
        id,
        {
          ...entry,
          unlocked: this.isEntryUnlocked(id),
          matched: this.isEntryMatched(id),
        },
      ]),
    )
  }

  getEntry(id: DictionaryEntryId): DictionaryEntry | undefined {
    const entry = this.data.entryDefinitions[id]
    if (!entry) return undefined

    return {
      ...entry,
      unlocked: this.isEntryUnlocked(id),
      matched: this.isEntryMatched(id),
    }
  }

  unlockEntry(entry: DictionaryEntry): void {
    this.registerEntries(entry.sceneId, [entry])

    if (!this.data.unlockedEntries.includes(entry.id)) {
      this.data.unlockedEntries.push(entry.id)
      this.save()
    }
  }

  matchEntry(id: DictionaryEntryId): void {
    if (!this.data.entryDefinitions[id]) return

    this.data.unlockedEntries = unique([...this.data.unlockedEntries, id])
    this.data.matchedEntries = unique([...this.data.matchedEntries, id])
    this.save()
  }

  isEntryUnlocked(id: DictionaryEntryId): boolean {
    return this.data.unlockedEntries.includes(id)
  }

  isEntryMatched(id: DictionaryEntryId): boolean {
    return this.data.matchedEntries.includes(id)
  }

  getUnlockedEntries(sceneId?: SceneId): DictionaryEntry[] {
    return this.data.unlockedEntries
      .map((id) => this.getEntry(id))
      .filter((entry): entry is DictionaryEntry =>
        Boolean(entry && (!sceneId || entry.sceneId === sceneId)),
      )
  }

  getUnmatchedEntries(sceneId?: SceneId): DictionaryEntry[] {
    return this.getUnlockedEntries(sceneId).filter(
      (entry) => !this.isEntryMatched(entry.id),
    )
  }

  getMatchedEntries(sceneId?: SceneId): DictionaryEntry[] {
    return this.data.matchedEntries
      .map((id) => this.getEntry(id))
      .filter((entry): entry is DictionaryEntry =>
        Boolean(entry && (!sceneId || entry.sceneId === sceneId)),
      )
  }

  discoverClue(clueId: string): void {
    if (this.data.discoveredClues.includes(clueId)) return
    this.data.discoveredClues.push(clueId)
    this.save()
  }

  isClueDiscovered(clueId: string): boolean {
    return this.data.discoveredClues.includes(clueId)
  }

  getDiscoveredClues(): string[] {
    return [...this.data.discoveredClues]
  }

  setSceneFlag(sceneId: SceneId, completed: boolean): void {
    this.data.completedScenes = completed
      ? unique([...this.data.completedScenes, sceneId])
      : this.data.completedScenes.filter((id) => id !== sceneId)
    this.save()
  }

  isSceneCompleted(sceneId: SceneId): boolean {
    return this.data.completedScenes.includes(sceneId)
  }

  markSceneCompleted(sceneId: SceneId): void {
    this.setSceneFlag(sceneId, true)
  }

  setPlayerPosition(sceneId: SceneId, x: number, y: number): void {
    this.data.playerPositions[sceneId] = { x, y }
    this.save()
  }

  getPlayerPosition(sceneId: SceneId): PlayerPosition | undefined {
    return this.data.playerPositions[sceneId]
  }

  savePlayerPosition(sceneId: SceneId, position: PlayerPosition): void {
    this.setPlayerPosition(sceneId, position.x, position.y)
  }

  /** Compatibility alias for the current SingingHall API. */
  setLastPosition(sceneId: SceneId, x: number, y: number): void {
    this.setPlayerPosition(sceneId, x, y)
  }

  /** Compatibility alias for the current SingingHall API. */
  getLastPosition(): { scene: string; x: number; y: number } {
    const [scene, position] =
      Object.entries(this.data.playerPositions).at(-1) ??
      ['singingHall', { x: 400, y: 300 }]

    return { scene, x: position.x, y: position.y }
  }

  fillSanChaoBookSlot(slotId: string, entryId: DictionaryEntryId): void {
    this.data.filledSanChaoBookSlots[slotId] = entryId
    this.save()
  }

  getFilledSanChaoBookSlots(): Record<string, DictionaryEntryId> {
    return { ...this.data.filledSanChaoBookSlots }
  }
}
