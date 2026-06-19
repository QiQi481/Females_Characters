import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  dictionaryPoemLines,
  entries,
  type DictionaryEntry,
  type DictionaryPuzzle,
} from './dictionaryData'

type DictionaryEntryId = DictionaryEntry['id']
type DictionarySlotId = string
type PlacedSlots = Record<DictionarySlotId, DictionaryEntryId>

export type DictionaryFeedback =
  | {
      type: 'error' | 'success'
      message: string
      slotId?: DictionarySlotId
    }
  | null

const SUCCESS_CLOSE_DELAY = 1100
const DICTIONARY_STORAGE_KEY = 'san-chaoshu-global-dictionary'
const DICTIONARY_STORAGE_VERSION = 2
const EMBROIDERY_ENTRY_IDS = new Set([
  'hongzhuang',
  'nugong',
  'jin',
  'yan',
  'ming',
  'deng',
])

const validEntryIds = new Set(entries.map((entry) => entry.id))
const slotRequiredEntryIds = new Map<DictionarySlotId, DictionaryEntryId>(
  dictionaryPoemLines.flatMap((line) =>
    line.segments.flatMap((segment) =>
      segment.type === 'slot'
        ? [[segment.slotId, segment.requiredEntryId ?? segment.entryId]]
        : [],
    ),
  ),
)

type DictionaryStorageData = {
  version?: number
  unlockedEntryIds?: string[]
  placedSlots?: Record<string, string>
  hasSeenGuide?: boolean
}

type LoadedDictionaryState = {
  unlockedEntryIds: readonly DictionaryEntryId[]
  placedSlots: PlacedSlots
  hasSeenGuide: boolean
}

function loadDictionaryState(
  fallbackEntries: readonly DictionaryEntryId[],
): LoadedDictionaryState {
  try {
    const raw = window.localStorage.getItem(DICTIONARY_STORAGE_KEY)
    if (!raw) {
      return {
        unlockedEntryIds: fallbackEntries,
        placedSlots: {},
        hasSeenGuide: false,
      }
    }

    const parsed = JSON.parse(raw) as DictionaryStorageData
    const unlockedEntryIds = (parsed.unlockedEntryIds ?? []).filter(
      (entryId): entryId is DictionaryEntryId => validEntryIds.has(entryId),
    )
    const migratedUnlockedEntryIds = parsed.version === DICTIONARY_STORAGE_VERSION
      ? unlockedEntryIds
      : unlockedEntryIds.filter(
          (entryId) => !EMBROIDERY_ENTRY_IDS.has(entryId),
        )

    const placedSlots = Object.fromEntries(
      Object.entries(parsed.placedSlots ?? {}).filter(([slotId, entryId]) => {
        const requiredEntryId = slotRequiredEntryIds.get(slotId)
        return Boolean(
          requiredEntryId &&
            requiredEntryId === entryId &&
            validEntryIds.has(entryId),
        )
      }),
    ) as PlacedSlots

    return {
      unlockedEntryIds: migratedUnlockedEntryIds,
      placedSlots,
      hasSeenGuide: parsed.hasSeenGuide === true,
    }
  } catch {
    return {
      unlockedEntryIds: fallbackEntries,
      placedSlots: {},
      hasSeenGuide: false,
    }
  }
}

export function useDictionary() {
  const successTimerRef = useRef<number | null>(null)
  const initiallyUnlocked = useMemo(
    () =>
      entries
        .filter((entry) => entry.isUnlocked || entry.status === 'unlocked')
        .map((entry) => entry.id),
    [],
  )
  const loadedState = useMemo(
    () => loadDictionaryState(initiallyUnlocked),
    [initiallyUnlocked],
  )
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false)
  const [activeEntryId, setActiveEntryId] =
    useState<DictionaryEntryId | null>(null)
  const [activePuzzle, setActivePuzzle] =
    useState<DictionaryPuzzle | null>(null)
  const [activeClueEntryId, setActiveClueEntryId] =
    useState<DictionaryEntryId | null>(null)
  const [feedback, setFeedback] = useState<DictionaryFeedback>(null)
  const [failedSlotId, setFailedSlotId] =
    useState<DictionarySlotId | null>(null)
  const [isResolvingPuzzle, setIsResolvingPuzzle] = useState(false)
  const [unlockedEntryIds, setUnlockedEntryIds] =
    useState<readonly DictionaryEntryId[]>(() =>
      loadedState.unlockedEntryIds,
    )
  const [placedSlots, setPlacedSlots] = useState<PlacedSlots>(
    () => loadedState.placedSlots,
  )
  const [hasSeenGuide, setHasSeenGuide] = useState(
    () => loadedState.hasSeenGuide,
  )

  const clearSuccessTimer = useCallback(() => {
    if (successTimerRef.current === null) return
    window.clearTimeout(successTimerRef.current)
    successTimerRef.current = null
  }, [])

  useEffect(() => clearSuccessTimer, [clearSuccessTimer])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        DICTIONARY_STORAGE_KEY,
        JSON.stringify({
          version: DICTIONARY_STORAGE_VERSION,
          unlockedEntryIds,
          placedSlots,
          hasSeenGuide,
        }),
      )
    } catch {
      // Keep the in-memory dictionary usable when storage is unavailable.
    }
  }, [hasSeenGuide, placedSlots, unlockedEntryIds])

  const dismissGuide = useCallback(() => {
    setHasSeenGuide(true)
  }, [])

  const openDictionary = useCallback((puzzle?: DictionaryPuzzle) => {
    clearSuccessTimer()
    if (puzzle) {
      setUnlockedEntryIds((current) =>
        current.includes(puzzle.activeEntryId)
          ? current
          : [...current, puzzle.activeEntryId],
      )
    }
    setActivePuzzle(puzzle ?? null)
    setActiveEntryId(puzzle?.activeEntryId ?? null)
    setActiveClueEntryId(null)
    setFeedback(null)
    setFailedSlotId(null)
    setIsResolvingPuzzle(false)
    setIsDictionaryOpen(true)
  }, [clearSuccessTimer])

  const closeDictionary = useCallback(() => {
    if (isResolvingPuzzle) return
    clearSuccessTimer()
    setIsDictionaryOpen(false)
    setActivePuzzle(null)
    setActiveClueEntryId(null)
    setFeedback(null)
    setFailedSlotId(null)
    setIsResolvingPuzzle(false)
  }, [clearSuccessTimer, isResolvingPuzzle])

  const unlockEntry = useCallback((entryId: DictionaryEntryId) => {
    setUnlockedEntryIds((current) =>
      current.includes(entryId) ? current : [...current, entryId],
    )
    setActiveEntryId(entryId)
  }, [])

  const lockEntry = useCallback((entryId: DictionaryEntryId) => {
    setUnlockedEntryIds((current) =>
      current.includes(entryId)
        ? current.filter((unlockedEntryId) => unlockedEntryId !== entryId)
        : current,
    )
    setActiveEntryId((current) => (current === entryId ? null : current))
    setActiveClueEntryId((current) => (current === entryId ? null : current))
  }, [])

  const openClue = useCallback(
    (entryId: DictionaryEntryId) => {
      const entry = entries.find((candidate) => candidate.id === entryId)
      if (!entry) {
        setFeedback({
          type: 'error',
          message: '词条数据缺失，暂时无法查看线索。',
        })
        return
      }

      if (!unlockedEntryIds.includes(entryId)) {
        setFeedback({
          type: 'error',
          message: '尚未获得这个字的线索',
        })
        return
      }

      setActiveEntryId(entryId)
      setActiveClueEntryId(entryId)
      setFeedback(null)
      setFailedSlotId(null)
    },
    [unlockedEntryIds],
  )

  const closeClue = useCallback(() => {
    setActiveClueEntryId(null)
  }, [])

  const placeEntryToSlot = useCallback(
    (entryId: DictionaryEntryId, slotId: DictionarySlotId) => {
      if (isResolvingPuzzle) return false

      const requiredEntryId = slotRequiredEntryIds.get(slotId)
      if (!requiredEntryId) {
        setFailedSlotId(slotId)
        setFeedback({
          type: 'error',
          message: '三朝书槽位数据缺失，暂时无法补全。',
          slotId,
        })
        return false
      }

      if (!unlockedEntryIds.includes(entryId)) {
        setFailedSlotId(slotId)
        setFeedback({
          type: 'error',
          message: '尚未获得这个字的线索',
          slotId,
        })
        return false
      }

      const entry = entries.find((candidate) => candidate.id === entryId)
      if (!entry || entryId !== requiredEntryId || !entry.targetSlots.includes(slotId)) {
        setFailedSlotId(slotId)
        setFeedback({
          type: 'error',
          message: '这个字放在这里好像不对。',
          slotId,
        })
        return false
      }

      const requiredEntryDef = entries.find(
        (candidate) => candidate.id === requiredEntryId,
      )
      // 允许相同 label 的条目互相替换（如两个"君"可互换）
      const isLabelEquivalent =
        entry?.label !== undefined &&
        entry.label === requiredEntryDef?.label
      if (!entry || (entryId !== requiredEntryId && !isLabelEquivalent)) {
        setFailedSlotId(slotId)
        setFeedback({
          type: 'error',
          message: '这个字放在这里好像不对。',
          slotId,
        })
        return false
      }

      setPlacedSlots((current) =>
        current[slotId] === entryId
          ? current
          : {
              ...current,
              [slotId]: entryId,
            },
      )
      setActiveEntryId(entryId)
      setFailedSlotId(null)
      setFeedback({
        type: 'success',
        message: `已补全：${entry.label}`,
        slotId,
      })

      return true
    },
    [isResolvingPuzzle, unlockedEntryIds],
  )

  const resetDictionary = useCallback(() => {
    clearSuccessTimer()
    setIsDictionaryOpen(false)
    setActiveEntryId(null)
    setActivePuzzle(null)
    setActiveClueEntryId(null)
    setFeedback(null)
    setFailedSlotId(null)
    setIsResolvingPuzzle(false)
    setUnlockedEntryIds(initiallyUnlocked)
    setPlacedSlots({})
    setHasSeenGuide(false)
  }, [clearSuccessTimer, initiallyUnlocked])

  const selectEntry = useCallback(
    (entryId: DictionaryEntryId) => {
      if (!activePuzzle) {
        setActiveEntryId(entryId)
        setFeedback(null)
        return
      }

      if (isResolvingPuzzle) return

      if (entryId !== activePuzzle.correctEntryId) {
        setFeedback({
          type: 'error',
          message: '这个意思好像对不上这句话。',
        })
        return
      }

      const matchedEntry = entries.find((entry) => entry.id === entryId)
      if (!matchedEntry) {
        setFeedback({
          type: 'error',
          message: '词条数据缺失，暂时无法完成解锁。',
        })
        return
      }

      unlockEntry(entryId)
      setIsResolvingPuzzle(true)
      setFeedback({
        type: 'success',
        message: `已解锁：${matchedEntry.label} / ${matchedEntry.meaning}`,
      })

      successTimerRef.current = window.setTimeout(() => {
        setIsDictionaryOpen(false)
        setActivePuzzle(null)
        setFeedback(null)
        setIsResolvingPuzzle(false)
        successTimerRef.current = null
        activePuzzle.onSuccess()
      }, SUCCESS_CLOSE_DELAY)
    },
    [activePuzzle, isResolvingPuzzle, unlockEntry],
  )

  return {
    isDictionaryOpen,
    openDictionary,
    closeDictionary,
    unlockEntry,
    lockEntry,
    resetDictionary,
    activeEntryId,
    setActiveEntryId,
    activeClueEntryId,
    activePuzzle,
    feedback,
    failedSlotId,
    isResolvingPuzzle,
    hasSeenGuide,
    dismissGuide,
    selectEntry,
    openClue,
    closeClue,
    placeEntryToSlot,
    unlockedEntryIds,
    placedSlots,
  }
}
