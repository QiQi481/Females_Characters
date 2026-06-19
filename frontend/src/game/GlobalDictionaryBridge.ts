import type { DictionaryPuzzle } from '../systems/dictionary'

export type GlobalDictionaryBridge = {
  openDictionary: (puzzle?: DictionaryPuzzle) => void
  closeDictionary: () => void
  unlockEntry: (entryId: string) => void
  returnToMenu: () => void
}
