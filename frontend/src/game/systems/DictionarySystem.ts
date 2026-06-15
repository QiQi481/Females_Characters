import type {
  DictionaryEntry,
  DictionaryEntryId,
  SceneId,
} from '../types'
import { SaveSystem } from './SaveSystem'

export class DictionarySystem {
  private readonly saveSystem: SaveSystem

  constructor(saveSystem: SaveSystem, entries: readonly DictionaryEntry[] = []) {
    this.saveSystem = saveSystem

    const entriesByScene = new Map<SceneId, DictionaryEntry[]>()

    entries.forEach((entry) => {
      const sceneEntries = entriesByScene.get(entry.sceneId) ?? []
      sceneEntries.push(entry)
      entriesByScene.set(entry.sceneId, sceneEntries)
    })

    entriesByScene.forEach((sceneEntries, sceneId) => {
      this.registerEntries(sceneId, sceneEntries)
    })
  }

  registerEntries(
    sceneId: SceneId,
    entries: readonly DictionaryEntry[],
  ): void {
    this.saveSystem.registerEntries(sceneId, entries)
  }

  unlock(entry: DictionaryEntry): void {
    this.saveSystem.unlockEntry(entry)
  }

  getUnlocked(sceneId?: SceneId): DictionaryEntry[] {
    return this.saveSystem.getUnlockedEntries(sceneId)
  }

  getMatched(sceneId?: SceneId): DictionaryEntry[] {
    return this.saveSystem.getMatchedEntries(sceneId)
  }

  getUnmatched(sceneId?: SceneId): DictionaryEntry[] {
    return this.saveSystem.getUnmatchedEntries(sceneId)
  }

  tryMatch(entryId: DictionaryEntryId, meaning: string): boolean {
    const entry = this.saveSystem.getEntry(entryId)
    if (!entry || entry.meaning !== meaning) return false

    this.saveSystem.matchEntry(entryId)
    return true
  }

  isMatched(entryId: DictionaryEntryId): boolean {
    return this.saveSystem.isEntryMatched(entryId)
  }

  discoverClue(clueId: string): void {
    this.saveSystem.discoverClue(clueId)
  }

  isClueDiscovered(clueId: string): boolean {
    return this.saveSystem.isClueDiscovered(clueId)
  }

  verifySentence(entries: string[], expected: string[]): boolean {
    if (entries.length !== expected.length) return false
    return entries.every((id, index) => id === expected[index])
  }

  buildChineseSentence(entryIds: string[]): string {
    return entryIds
      .map((id) => this.saveSystem.getEntry(id)?.meaning ?? '?')
      .join('')
  }

  areAllMatched(entryIds: string[]): boolean {
    return entryIds.every((id) => this.saveSystem.isEntryMatched(id))
  }

  completeScene(sceneId: SceneId): void {
    this.saveSystem.setSceneFlag(sceneId, true)
  }

  isSceneComplete(sceneId: SceneId): boolean {
    return this.saveSystem.isSceneCompleted(sceneId)
  }
}
