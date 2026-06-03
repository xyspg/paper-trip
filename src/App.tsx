import './App.css'
import { useActiveRoute } from './useHashRoute'
import { PageNav } from './components/PageNav'

function App() {
  const route = useActiveRoute()
  const { Component } = route

  return (
    <main className="ax-page">
      <div className={`wrap ${route.narrow ? 'wrap-narrow' : ''}`}>
        <PageNav activeId={route.id} />
        <Component />
      </div>
    </main>
  )
}

export default App
