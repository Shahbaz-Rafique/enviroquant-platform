'use client'

import {
  BarChart3,
  ClipboardList,
  FolderOpen,
  LogOut,
  UploadCloud,
  UserCircle,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

import { BrandMark } from '@/components/site/brand-mark'
import { Button } from '@/components/ui/button'
import { clearSession } from '@/lib/auth'
import { displayRole, hasPermission, PERMISSIONS } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import type { User } from '@/lib/types'

type AppShellProps = {
  children: ReactNode
  user: User | null
}

const sectionLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3, match: ['/dashboard'] },
  { href: '/projects', label: 'Projects', icon: FolderOpen, match: ['/projects'] },
  {
    href: '/projects/new',
    label: 'Project Description',
    icon: ClipboardList,
    permission: PERMISSIONS.PROJECT_CREATE,
    exact: true,
    match: ['/projects/new']
  },
  {
    href: '/team',
    label: 'Team',
    icon: Users,
    permission: PERMISSIONS.USER_READ,
    match: ['/team']
  }
]

export function AppShell ({ children, user }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()

  function logout () {
    clearSession()
    router.push('/login')
  }

  return (
    <div className='min-h-screen bg-gradient text-white'>
      <header className='builder-topbar sticky top-0 z-30'>
        <div className='flex h-20 items-center justify-between px-5 lg:px-7'>
          <Link href='/dashboard' className='flex min-w-0 items-center gap-4'>
            <BrandMark href={null} />
            <span className='hidden h-8 border-l border-white/12 lg:block' />
            <span className='hidden truncate text-sm font-semibold uppercase tracking-[0.18em] text-white/54 lg:block'>
              Workspace
            </span>
          </Link>

          <div className='hidden items-center gap-3 md:flex'>
            <div className='flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 backdrop-blur-sm'>
              <span className='grid size-8 place-items-center rounded-full border border-white/10 bg-white/[0.08]'>
                <UserCircle className='size-4' />
              </span>
              <div className='min-w-0 leading-tight'>
                <p className='truncate text-sm font-semibold text-white'>
                  {user?.full_name ?? 'User'}
                </p>
                <p className='text-xs text-white/56'>{displayRole(user)}</p>
              </div>
            </div>
            <Button variant='secondary' size='sm' onClick={logout}>
              <LogOut />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className='min-h-[calc(100vh-5rem)]'>
        <aside className='fixed bottom-0 left-0 top-20 z-20 hidden w-64 border-r border-white/10 bg-[rgba(255,255,255,0.03)] backdrop-blur-xl lg:block'>
          <nav className='h-full overflow-y-auto px-0 pt-5 space-y-2' aria-label='Workspace navigation'>
            {sectionLinks
              .filter(
                item => !item.permission || hasPermission(user, item.permission)
              )
              .map(item => {
                const active = isNavItemActive(pathname, item)
                const Icon = item.icon
                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn('blue-rail-item', active && 'blue-rail-item-active')}
                  >
                    <Icon className='size-4' />
                    {item.label}
                  </Link>
                )
              })}
          </nav>
        </aside>

        <main className='min-w-0 px-4 pb-24 pt-5 md:px-6 lg:ml-64 lg:px-7 lg:pb-7'>
          {children}
        </main>
      </div>

      <div className='fixed inset-x-0 bottom-0 z-20 flex border-t border-white/10 bg-[rgba(4,17,14,0.92)] backdrop-blur-xl lg:hidden'>
        <MobileNavLink active={isPathActive(pathname, '/dashboard', true)} href='/dashboard' icon={<BarChart3 />}>
          Home
        </MobileNavLink>
        <MobileNavLink
          active={pathname.startsWith('/projects') && pathname !== '/projects/new'}
          href='/projects'
          icon={<FolderOpen />}
        >
          Projects
        </MobileNavLink>
        {hasPermission(user, PERMISSIONS.PROJECT_CREATE) ? (
          <MobileNavLink active={isPathActive(pathname, '/projects/new', true)} href='/projects/new' icon={<UploadCloud />}>
            New
          </MobileNavLink>
        ) : null}
        {hasPermission(user, PERMISSIONS.USER_READ) ? (
          <MobileNavLink active={isPathActive(pathname, '/team')} href='/team' icon={<Users />}>
            Team
          </MobileNavLink>
        ) : null}
        <button
          className='flex flex-1 flex-col items-center gap-1 py-3 text-xs font-semibold text-white/72'
          onClick={logout}
        >
          <LogOut className='size-4' />
          Logout
        </button>
      </div>
    </div>
  )
}

type NavItem = (typeof sectionLinks)[number]

function isNavItemActive (pathname: string, item: NavItem) {
  if (item.href === '/projects') {
    return pathname.startsWith('/projects') && pathname !== '/projects/new'
  }
  return item.match.some(path => isPathActive(pathname, path, item.exact))
}

function isPathActive (pathname: string, href: string, exact = false) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

function MobileNavLink ({
  active,
  children,
  href,
  icon
}: {
  active: boolean
  children: ReactNode
  href: string
  icon: ReactNode
}) {
  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-1 flex-col items-center gap-1 py-3 text-xs font-semibold text-white/66 transition-colors',
        active && 'bg-white/[0.06] text-white'
      )}
      href={href}
    >
      <span className='[&_svg]:size-4'>{icon}</span>
      {children}
    </Link>
  )
}
