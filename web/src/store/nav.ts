import { create } from 'zustand'

export type Tab = 'home' | 'garage' | 'catalog' | 'projects' | 'menu'
export type Route =
  | { name: 'workshop'; projectID: string }
  | { name: 'product'; accessoryID: string }
  | { name: 'budget'; projectID: string }
  | { name: 'list'; projectID: string }
  | { name: 'addBike' }

interface NavState {
  tab: Tab
  stack: Route[]
  catalogCategory?: string
  setTab: (t: Tab) => void
  push: (r: Route) => void
  pop: () => void
  openCatalog: (category?: string) => void
}

/** Tab + stack navigation mirrored in browser history so the iOS back swipe / back button work. */
export const useNav = create<NavState>((set, get) => ({
  tab: 'home',
  stack: [],
  setTab: (tab) => set({ tab, stack: [] }),
  push: (r) => { history.pushState({ depth: get().stack.length + 1 }, ''); set({ stack: [...get().stack, r] }) },
  pop: () => { if (get().stack.length) history.back() },
  openCatalog: (category) => set({ tab: 'catalog', stack: [], catalogCategory: category }),
}))

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    const { stack } = useNav.getState()
    if (stack.length) useNav.setState({ stack: stack.slice(0, -1) })
  })
}
