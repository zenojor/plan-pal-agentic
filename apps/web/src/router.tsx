import { createRootRouteWithContext, createRoute, createRouter, Link, Outlet, useRouterState } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { HomePage } from './routes/HomePage'
import { ModelSettingsPage } from './routes/ModelSettingsPage'
import { PlanWorkspacePage } from './routes/PlanWorkspacePage'

type RouterContext = {
  queryClient: QueryClient
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/model',
  component: ModelSettingsPage,
})

const planRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/plans/$planId',
  component: PlanWorkspacePage,
})

const routeTree = rootRoute.addChildren([indexRoute, settingsRoute, planRoute])

export const router = createRouter({
  routeTree,
  context: {} as RouterContext,
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function RootLayout() {
  const isWorkspaceRoute = useRouterState({
    select: (state) => state.location.pathname.startsWith('/plans/'),
  })

  return (
    <div className={`app-shell ${isWorkspaceRoute ? 'is-workspace' : ''}`}>
      {!isWorkspaceRoute && (
        <header className="topbar">
          <Link to="/" className="brand">
            <span className="brand-mark">P</span>
            <span>PlanPal</span>
          </Link>
          <nav className="topnav">
            <Link to="/" activeProps={{ className: 'active' }}>开始</Link>
            <Link to="/settings/model" activeProps={{ className: 'active' }}>模型设置</Link>
          </nav>
        </header>
      )}
      <Outlet />
    </div>
  )
}
