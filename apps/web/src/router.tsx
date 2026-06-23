import { createRootRouteWithContext, createRoute, createRouter, Link, Outlet, useRouterState } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { HomePage } from './routes/HomePage'
import { ModelSettingsPage } from './routes/ModelSettingsPage'
import { PlanWorkspacePage } from './routes/PlanWorkspacePage'
import { appClasses } from './lib/appClasses'

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
    <div className={appClasses.shell(isWorkspaceRoute)}>
      {!isWorkspaceRoute && (
        <header className={appClasses.topbar}>
          <Link to="/" className={appClasses.brand}>
            <span className={appClasses.brandMark}>P</span>
            <span>PlanPal</span>
          </Link>
          <nav className={appClasses.topnav}>
            <Link to="/" className={appClasses.topnavLink()} activeProps={{ className: appClasses.topnavLink(true) }}>开始</Link>
            <Link to="/settings/model" className={appClasses.topnavLink()} activeProps={{ className: appClasses.topnavLink(true) }}>模型设置</Link>
          </nav>
        </header>
      )}
      <Outlet />
    </div>
  )
}
