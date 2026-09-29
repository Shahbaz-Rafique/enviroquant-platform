'use client'

import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  FolderOpen,
  GraduationCap,
  LogOut,
  Settings,
  ShieldCheck,
  UserCircle,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

import { BrandMark } from '@/components/site/brand-mark'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { clearSession } from '@/lib/auth'
import { displayRole, hasPermission, PERMISSIONS, portalName } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import type { User } from '@/lib/types'

type AppShellProps = {
  children: ReactNode
  user: User | null
}

const sectionLinks = [
  { href: '/dashboard', label: 'Overview', icon: BarChart3, match: ['/dashboard'] },
  { href: '/projects', label: 'Projects', icon: FolderOpen, match: ['/projects'] },
  {
    href: '/quality-review',
    label: 'EIA Quality Review',
    icon: ShieldCheck,
    permission: PERMISSIONS.DOCUMENT_READ,
    match: ['/quality-review']
  },
  {
    href: '/library',
    label: 'Evidence library',
    icon: BookOpen,
    permission: PERMISSIONS.DOCUMENT_READ,
    match: ['/library']
  },
  {
    href: '/team',
    label: 'Team',
    icon: Users,
    permission: PERMISSIONS.USER_READ,
    match: ['/team']
  },
  {
    href: '/guide',
    label: 'Platform guide',
    icon: GraduationCap,
    match: ['/guide']
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
    <div className='workspace-theme min-h-screen'>
      <header className='builder-topbar sticky top-0 z-30 lg:ml-64'>
        <div className='flex h-16 items-center justify-between px-4 lg:px-6'>
          <Link href='/dashboard' className='flex min-w-0 items-center gap-4'>
            <BrandMark
              href={null}
              className='rounded-md bg-[#123f2e] px-2 py-1 lg:hidden'
              imageClassName='h-auto w-[138px]'
            />
            <span className='hidden truncate text-xs font-bold uppercase tracking-[0.16em] text-[#6c7d75] lg:block'>
              {portalName(user)}
            </span>
          </Link>

          <div className='hidden md:block'>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className='flex items-center gap-2 rounded-lg border border-[#dce6e1] bg-[#f7faf8] px-2.5 py-1.5 transition-colors hover:border-[#c4d4cc] hover:bg-[#eef5f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f7d57]/25'>
                  <span className='grid size-8 place-items-center rounded-full bg-[#e7f3ec] text-[#287451]'>
                    <UserCircle className='size-4' />
                  </span>
                  <div className='min-w-0 text-left leading-tight'>
                    <p className='truncate text-sm font-semibold text-[#18372c]'>
                      {user?.full_name ?? 'User'}
                    </p>
                    <p className='text-xs text-[#6c7d75]'>{displayRole(user)}</p>
                  </div>
                  <ChevronDown className='ml-1 size-3.5 shrink-0 text-[#9aaba3]' />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-56'>
                <DropdownMenuLabel>
                  <p className='truncate text-sm font-semibold text-[#18372c]'>{user?.full_name ?? 'User'}</p>
                  <p className='truncate text-xs font-normal text-[#6c7d75]'>{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onSelect={() => router.push('/dashboard')}>
                    <BarChart3 />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => router.push('/team')}>
                    <Settings />
                    Team settings
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={logout}>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className='min-h-[calc(100vh-4rem)]'>
        <aside className='fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-[#174b37] bg-[#123f2e] text-white lg:flex lg:flex-col'>
          <div className='flex h-16 shrink-0 items-center border-b border-white/10 px-5'>
            <BrandMark href='/dashboard' imageClassName='h-auto w-[174px]' />
          </div>
          {/* <div className='border-b border-white/10 px-5 py-5'>
            <p className='text-[11px] font-bold uppercase tracking-[0.18em] text-[#a8cdbb]'>Current capability</p>
            <p className='mt-1 text-sm font-semibold text-white'>EIA workspace</p>
            <p className='mt-1 text-xs leading-5 text-white/60'>Evidence-led authoring and review</p>
          </div> */}
          <nav className='flex-1 overflow-y-auto px-3 py-4 space-y-1' aria-label='Workspace navigation'>
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
                    className={cn(
                      'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-white/70 transition-colors hover:bg-white/8 hover:text-white',
                      active && 'bg-white text-[#174b37] shadow-sm hover:bg-white hover:text-[#174b37]'
                    )}
                  >
                    <Icon className='size-4' />
                    {item.label}
                  </Link>
                )
              })}
          </nav>
          <div className='border-t border-white/10 p-4'>
            <div className='rounded-lg bg-white/[0.07] p-3'>
              <p className='text-xs font-semibold text-white'>Evidence Before Conclusions™</p>
              <p className='mt-1 text-[11px] leading-4 text-white/55'>Developed toward an Environmental Intelligence Operating System™</p>
              <div className='mt-3 flex gap-3 text-xs font-semibold text-[#b9dfca]'>
                <Link className='inline-flex items-center gap-1 hover:text-white' href='/contact'><CalendarDays className='size-3.5' /> Book demo</Link>
                <Link className='inline-flex items-center gap-1 hover:text-white' href='/contact'>Contact <ExternalLink className='size-3.5' /></Link>
              </div>
            </div>
          </div>
        </aside>

        <main className='workspace-main min-w-0 px-4 pb-24 pt-5 md:px-6 lg:ml-64 lg:px-8 lg:pb-8 lg:pt-7'>
          {children}
        </main>
      </div>

      <div className='fixed inset-x-0 bottom-0 z-20 flex border-t border-[#dce6e1] bg-white text-[#66766f] shadow-[0_-4px_20px_rgba(15,45,34,0.08)] lg:hidden'>
        <MobileNavLink active={isPathActive(pathname, '/dashboard', true)} href='/dashboard' icon={<BarChart3 />}>
          Home
        </MobileNavLink>
        <MobileNavLink
          active={pathname.startsWith('/projects')}
          href='/projects'
          icon={<FolderOpen />}
        >
          Projects
        </MobileNavLink>
        {hasPermission(user, PERMISSIONS.DOCUMENT_READ) ? (
          <MobileNavLink active={isPathActive(pathname, '/library')} href='/library' icon={<BookOpen />}>
            Library
          </MobileNavLink>
        ) : null}
        {hasPermission(user, PERMISSIONS.DOCUMENT_READ) ? (
          <MobileNavLink active={isPathActive(pathname, '/quality-review')} href='/quality-review' icon={<ShieldCheck />}>
            Review
          </MobileNavLink>
        ) : null}
        <button
          className='flex flex-1 flex-col items-center gap-1 py-3 text-xs font-semibold text-[#66766f]'
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
  return item.match.some(path => isPathActive(pathname, path))
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
        'flex flex-1 flex-col items-center gap-1 py-3 text-xs font-semibold text-[#66766f] transition-colors',
        active && 'bg-[#eef6f1] text-[#236c4a]'
      )}
      href={href}
    >
      <span className='[&_svg]:size-4'>{icon}</span>
      {children}
    </Link>
  )
}
