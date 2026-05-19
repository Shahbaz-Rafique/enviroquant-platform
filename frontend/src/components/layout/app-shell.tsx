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
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  {
    href: '/projects/new',
    label: 'Project Description',
    icon: ClipboardList,
    permission: PERMISSIONS.PROJECT_CREATE
  },
  {
    href: '/team',
    label: 'Team',
    icon: Users,
    permission: PERMISSIONS.USER_READ
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
                const active = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    className={cn(
                      'blue-rail-item',
                      active && 'blue-rail-item-active'
                    )}
                  >
                    <Icon className='size-4' />
                    {item.label}
                  </Link>
                )
              })}
          </nav>
        </aside>

        <main className='min-w-0 flex-1 px-4 py-5 md:px-6 lg:px-7'>
          {children}
        </main>
      </div>

      <div className='fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-300 bg-white lg:hidden'>
        <Link
          className='flex flex-1 flex-col items-center gap-1 py-2 text-xs font-semibold text-blue-800'
          href='/dashboard'
        >
          <BarChart3 className='size-4' />
          Home
        </Link>
        <Link
          className='flex flex-1 flex-col items-center gap-1 py-2 text-xs font-semibold text-blue-800'
          href='/projects'
        >
          <FolderOpen className='size-4' />
          Projects
        </Link>
        {hasPermission(user, PERMISSIONS.PROJECT_CREATE) ? (
          <Link
            className='flex flex-1 flex-col items-center gap-1 py-2 text-xs font-semibold text-blue-800'
            href='/projects/new'
          >
            <UploadCloud className='size-4' />
            New
          </Link>
        ) : null}
        {hasPermission(user, PERMISSIONS.USER_READ) ? (
          <Link
            className='flex flex-1 flex-col items-center gap-1 py-2 text-xs font-semibold text-blue-800'
            href='/team'
          >
            <Users className='size-4' />
            Team
          </Link>
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
