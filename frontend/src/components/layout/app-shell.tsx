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
    <div className='min-h-screen bg-[#edf3fb]'>
      <header className='builder-topbar sticky top-0 z-30'>
        <div className='flex h-14 items-center justify-between px-5'>
          <Link href='/dashboard' className='flex min-w-0 items-center gap-3'>
            <span className='grid h-9 w-9 place-items-center rounded-full bg-[#8bd15f] text-sm font-black text-[#104a83]'>
              EQ
            </span>
            <span className='text-xl font-bold'>EnviroQuant</span>
            <span className='h-7 border-l border-white/35' />
            <span className='truncate text-base font-medium text-blue-50'>
              EIA Builder
            </span>
          </Link>

          <div className='hidden items-center gap-3 md:flex'>
            <div className='flex min-w-0 items-center gap-2 rounded-md bg-white/10 px-3 py-1.5'>
              <UserCircle className='size-5' />
              <div className='min-w-0 leading-tight'>
                <p className='truncate text-sm font-semibold'>
                  {user?.full_name ?? 'User'}
                </p>
                <p className='text-xs text-blue-100'>{displayRole(user)}</p>
              </div>
            </div>
            <Button variant='secondary' size='sm' onClick={logout}>
              <LogOut />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className='flex min-h-[calc(100vh-3.5rem)]'>
        <aside className='hidden w-60 shrink-0 border-r border-slate-300 bg-white/90 shadow-sm lg:block'>
          <nav className='pt-5' aria-label='Workspace navigation'>
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

        <main className='min-w-0 flex-1 px-4 pb-20 pt-5 md:px-6 lg:px-7 lg:pb-5'>
          {children}
        </main>
      </div>

      <div className='fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-300 bg-white lg:hidden'>
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
          className='flex flex-1 flex-col items-center gap-1 py-2 text-xs font-semibold text-blue-800'
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
        'flex flex-1 flex-col items-center gap-1 py-2 text-xs font-semibold text-blue-800',
        active && 'bg-blue-50 text-blue-950'
      )}
      href={href}
    >
      <span className='[&_svg]:size-4'>{icon}</span>
      {children}
    </Link>
  )
}
