import type { DictionaryPuzzle } from '../systems/dictionary'

export type GlobalDictionaryBridge = {
  openDictionary: (puzzle?: DictionaryPuzzle) => void
  unlockEntry: (entryId: string) => void
}
