import type { DictionaryPuzzle } from '../systems/dictionary'

export type GlobalGlyphToastPayload = {
  label?: string
  nushuImages: readonly string[]
}

export type GlobalDictionaryBridge = {
  openDictionary: (puzzle?: DictionaryPuzzle) => void
  closeDictionary: () => void
  unlockEntry: (entryId: string) => void
  returnToMenu: () => void
  showGlyphToast?: (payload: GlobalGlyphToastPayload) => void
  setClueProgress?: (progress: { found: number; total: number }) => void
  setFreeExplorationActive?: (active: boolean) => void
}
