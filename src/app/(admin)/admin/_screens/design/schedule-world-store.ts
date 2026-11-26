import { useSyncExternalStore } from "react"
import { reduce, type Action, type ProtoState } from "./schedule-prototype-model"

// The Schedule's state held outside the screen, so it survives a click on a visit (the job page opens, the Schedule unmounts) and the job page's own Schedule and Move
// reach the same calendar. A store is a snapshot, a subscription and `dispatch` through the pure reducer of `schedule-prototype-model.ts`. Standalone stories make
// their own; the walkthrough holds one for the whole session (`walk-schedule.ts`).

export interface WorldStore {
  getSnapshot: () => ProtoState
  subscribe: (fn: () => void) => () => void
  dispatch: (a: Action) => void
  /** back to the state it started in */
  reset: () => void
}

export function createWorldStore(make: () => ProtoState): WorldStore {
  let state = make()
  const listeners = new Set<() => void>()
  const set = (next: ProtoState) => {
    if (next === state) return
    state = next
    listeners.forEach((l) => l())
  }
  return {
    getSnapshot: () => state,
    subscribe: (fn) => (listeners.add(fn), () => void listeners.delete(fn)),
    dispatch: (a) => set(reduce(state, a)),
    reset: () => set(make()),
  }
}

export const useWorldState = (store: WorldStore): ProtoState => useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
