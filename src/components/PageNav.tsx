import { routes } from '../routes'

export function PageNav({ activeId }: { activeId: string }) {
  return (
    <nav className="pagenav" aria-label="页面导航">
      {routes.map((route) => (
        <a
          key={route.id}
          href={`#/${route.id}`}
          className={activeId === route.id ? 'active' : ''}
          aria-current={activeId === route.id ? 'page' : undefined}
        >
          {route.label}
        </a>
      ))}
    </nav>
  )
}
