import { Link } from '@tanstack/react-router'
import { routes } from '../routes'

export function PageNav() {
  return (
    <nav className="pagenav" aria-label="页面导航">
      {routes.map((route) => (
        <Link
          key={route.id}
          to={route.path}
          activeOptions={{ exact: true }}
          activeProps={{ className: 'active' }}
        >
          {route.label}
        </Link>
      ))}
    </nav>
  )
}
