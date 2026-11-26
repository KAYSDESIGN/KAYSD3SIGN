import { lazy, Suspense, useEffect } from 'react'
import { Bike, Heart, House, LayoutGrid, Search } from 'lucide-react'
import { useApp } from './store/app'
import { useNav, type Tab } from './store/nav'
import { Glass } from './ui/Glass'
import { cx } from './ui/kit'
import Home from './screens/Home'
import Garage, { AddBike } from './screens/Garage'
import Catalog from './screens/Catalog'
import Product from './screens/Product'
import Projects from './screens/Projects'
import { Budget, ShoppingList } from './screens/Budget'
import Menu from './screens/Menu'

// The workshop pulls in three.js: loaded only when opened.
const Workshop = lazy(() => import('./screens/Workshop'))

const TABS: { id: Tab; label: string; Icon: typeof House }[] = [
  { id: 'home', label: 'Accueil', Icon: House }, { id: 'garage', label: 'Garage', Icon: Bike },
  { id: 'catalog', label: 'Catalogue', Icon: Search }, { id: 'projects', label: 'Projets et favoris', Icon: Heart },
  { id: 'menu', label: 'Menu', Icon: LayoutGrid },
]

function Dock() {
  const { tab, setTab, stack } = useNav()
  const top = stack[stack.length - 1]
  if (top && (top.name === 'workshop' || top.name === 'addBike')) return null
  return (
    <nav className="dock-wrap" aria-label="Navigation principale">
      <Glass radius={30} className="pointer-events-auto flex gap-1 p-1.5 w-[min(92vw,380px)]">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} aria-label={label} aria-current={tab === id && !stack.length ? 'page' : undefined} onClick={() => setTab(id)}
            className={cx('press flex-1 h-11 rounded-full grid place-items-center transition-colors', tab === id ? 'bg-accent text-white' : 'text-ink')}>
            <Icon size={21} strokeWidth={2.1} />
          </button>
        ))}
      </Glass>
    </nav>
  )
}

export default function App() {
  const { ready, load } = useApp()
  const { tab, stack } = useNav()
  useEffect(() => { load() }, [load])
  const route = stack[stack.length - 1]

  let screen
  if (!ready) screen = <div className="h-[60dvh] grid place-items-center text-ink-2">Chargement…</div>
  else if (route?.name === 'workshop') screen = <Suspense fallback={<div className="h-dvh grid place-items-center text-ink-2">Préparation de l'atelier…</div>}><Workshop projectID={route.projectID} /></Suspense>
  else if (route?.name === 'product') screen = <Product accessoryID={route.accessoryID} />
  else if (route?.name === 'budget') screen = <Budget projectID={route.projectID} />
  else if (route?.name === 'list') screen = <ShoppingList projectID={route.projectID} />
  else if (route?.name === 'addBike') screen = <AddBike />
  else screen = { home: <Home />, garage: <Garage />, catalog: <Catalog />, projects: <Projects />, menu: <Menu /> }[tab]

  return (
    <div className="app">
      <main key={route ? JSON.stringify(route) : tab} className="sheet-enter">{screen}</main>
      <Dock />
    </div>
  )
}
