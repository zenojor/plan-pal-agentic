import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Link,
  Outlet,
  redirect,
  useRouterState,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { GearSixIcon as GearSix } from '@phosphor-icons/react/GearSix'
import { HomePage } from './routes/HomePage'
import { appClasses } from './lib/appClasses'
import { loadModelConfig } from './lib/modelConfig'

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
  component: lazyRouteComponent(
    () => import('./routes/ModelSettingsPage'),
    'ModelSettingsPage',
  ),
})

const planRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/plans/$planId',
  beforeLoad: () => {
    if (!loadModelConfig()) throw redirect({ to: '/settings/model' })
  },
  component: lazyRouteComponent(
    () => import('./routes/PlanWorkspacePage'),
    'PlanWorkspacePage',
  ),
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
          <div className={appClasses.topbarInner}>
            <Link to="/" className={appClasses.brand}>
              <span className={appClasses.brandMark}>P</span>
              <strong className={appClasses.brandTitle}>PlanPal</strong>
            </Link>
            <nav className={appClasses.topnav} aria-label="主导航">
              <Link to="/settings/model" className={appClasses.topnavLink()} activeProps={{ className: appClasses.topnavLink(true) }}>
                <GearSix aria-hidden="true" size={19} weight="bold" />
                模型设置
              </Link>
            </nav>
          </div>
        </header>
      )}
      <Outlet />
    </div>
  )
}
