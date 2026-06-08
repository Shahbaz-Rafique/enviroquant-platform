'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  UserCircle,
  X
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { useCurrentUser } from '@/components/auth/auth-gate'
import { BrandMark } from '@/components/site/brand-mark'
import { clearSession } from '@/lib/auth'
import { displayRole } from '@/lib/permissions'
import type { User } from '@/lib/types'
import { cn } from '@/lib/utils'
import { GreenButton } from './marketing-pages'

const navigation = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Services', href: '/services' },
  { label: 'Contact', href: '/contact' }
]

const pageNumbers = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Services', href: '/services' },
  { label: 'Contact', href: '/contact' }
]

function SiteHeaderAuthButtons () {
  return (
    <div className='flex items-center gap-2 sm:gap-3'>
      <GreenButton href='/login'  outline>
        Login
      </GreenButton>
      <GreenButton href='/register'>Get Started</GreenButton>
     
    </div>
  )
}

function SiteHeaderProfileMenu ({
  user,
  onLogout
}: Readonly<{
  user: User
  onLogout: () => void
}>) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handlePointerDown (event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape (event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <div ref={menuRef} className='relative'>
      <button
        type='button'
        aria-haspopup='menu'
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className='flex items-center gap-3 rounded-full border border-white/12 bg-white/8 px-2.5 py-1.5 text-left backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#67E8F9]/70'
      >
        <span className='grid size-9 place-items-center rounded-full border border-white/10 bg-white/12 text-white'>
          <UserCircle className='size-5' />
        </span>
        <div className='hidden min-w-0 leading-tight sm:block'>
          <p className='max-w-32 truncate text-sm font-semibold text-white'>
            {user.full_name || 'User'}
          </p>
          <p className='truncate text-xs text-white/62'>{displayRole(user)}</p>
        </div>
        <ChevronDown
          className={`size-4 text-white/72 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open ? (
        <div
          role='menu'
          className='absolute right-0 top-full mt-3 w-64 overflow-hidden rounded-2xl border border-white/12 bg-[rgba(5,25,20,0.96)] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.34)] backdrop-blur-xl'
        >
          <div className='border-b border-white/10 px-4 py-3'>
            <p className='truncate text-sm font-semibold text-white'>
              {user.full_name || 'User'}
            </p>
            <p className='mt-1 truncate text-xs text-white/58'>{user.email}</p>
          </div>

          <Link
            href='/dashboard'
            role='menuitem'
            onClick={() => setOpen(false)}
            className='mt-2 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white/88 transition-colors hover:bg-white/8 hover:text-white'
          >
            <LayoutDashboard className='size-4' />
            Dashboard
          </Link>

          <button
            type='button'
            role='menuitem'
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
            className='flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-white/72 transition-colors hover:bg-white/8 hover:text-white'
          >
            <LogOut className='size-4' />
            Logout
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function SiteBackground () {
  const reduceMotion = useReducedMotion()

  return (
    <div className='pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-gradient'>
      <div className='absolute inset-0  opacity-15' />
      <motion.div
        className='absolute left-[-8%] top-16 h-80 w-80 rounded-full bg-[#00F5D4]/20 blur-[120px]'
        animate={reduceMotion ? undefined : { x: [0, 18, 0], y: [0, -16, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className='absolute right-[-10%] top-28 h-96 w-96 rounded-full bg-[#67E8F9]/16 blur-[140px]'
        animate={reduceMotion ? undefined : { x: [0, -20, 0], y: [0, 18, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className='absolute bottom-[-12%] left-1/4 h-[28rem] w-[28rem] rounded-full bg-[#0F8F76]/12 blur-[150px]'
        animate={
          reduceMotion
            ? undefined
            : { opacity: [0.32, 0.58, 0.32], scale: [1, 1.08, 1] }
        }
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(1,7,6,0.35)_72%,rgba(1,7,6,0.62)_100%)]' />
      <div className='absolute left-16 top-24 size-2 rounded-full bg-[#00F5D4]/90 shadow-[0_0_18px_rgba(0,245,212,0.9)]' />
      <div className='absolute right-24 top-40 size-1.5 rounded-full bg-[#67E8F9]/90 shadow-[0_0_18px_rgba(103,232,249,0.9)]' />
      <div className='absolute bottom-20 left-1/3 size-1.5 rounded-full bg-white/80 shadow-[0_0_12px_rgba(255,255,255,0.7)]' />
    </div>
  )
}

export function SiteHeader () {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useCurrentUser()
  const [hasHydrated, setHasHydrated] = useState(false)
  const [sessionUser, setSessionUser] = useState<User | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    setHasHydrated(true)
  }, [])

  useEffect(() => {
    if (!hasHydrated) {
      return
    }
    setSessionUser(user)
  }, [hasHydrated, user])

  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isMenuOpen) {
      return
    }

    function handleEscape (event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isMenuOpen])

  function handleLogout () {
    clearSession()
    setSessionUser(null)
    setIsMenuOpen(false)
    router.push('/')
  }

  const showAuthenticatedState = hasHydrated && Boolean(sessionUser)
  const showSessionLoading = !hasHydrated || loading

  return (
    <header className='fixed inset-x-0 top-0 z-50 backdrop-blur-sm'>
      <div className='mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between px-5 sm:px-10 lg:px-12'>
        <BrandMark imageClassName='h-auto w-[11rem] sm:w-[13rem] lg:w-[15.625rem]' />
        <div className='flex items-center gap-4 sm:gap-6 lg:gap-8'>
          <nav className='hidden items-center gap-4 sm:gap-6 lg:flex lg:gap-10'>
            {navigation.map(item => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-semibold text-white/92 transition-all duration-300 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                  pathname === item.href && 'bg-white/10 text-white'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className='hidden lg:block'>
            {showAuthenticatedState && sessionUser ? (
              <SiteHeaderProfileMenu user={sessionUser} onLogout={handleLogout} />
            ) : showSessionLoading ? (
              <div
                aria-label='Checking session'
                className='h-10 w-36 animate-pulse rounded-full border border-white/10 bg-white/8'
              />
            ) : (
              <SiteHeaderAuthButtons />
            )}
          </div>

          <button
            type='button'
            aria-label='Toggle navigation menu'
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(open => !open)}
            className='inline-flex size-11 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 lg:hidden'
          >
            {isMenuOpen ? <X className='size-5' /> : <Menu className='size-5' />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen ? (
          <>
            <motion.button
              type='button'
              aria-label='Close navigation menu'
              onClick={() => setIsMenuOpen(false)}
              className='fixed inset-0 top-20 bg-black/55 lg:hidden'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            />
            <motion.aside
              className='fixed bottom-0 left-0 top-20 z-50 flex w-[min(22rem,86vw)] flex-col border-r border-white/12 bg-[rgba(5,25,20,0.96)] h-fit px-5 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl lg:hidden'
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <nav className='flex flex-col gap-2'>
                {navigation.map(item => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      'rounded-2xl border border-white/10 bg-[rgba(8,34,27,0.86)] px-4 py-3 text-base font-semibold text-white/92 shadow-[0_12px_28px_rgba(0,0,0,0.18)] transition-all duration-300 hover:bg-[rgba(255,255,255,0.12)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                      pathname === item.href &&
                        'border-[#77A63C]/55 bg-[rgba(119,166,60,0.22)] text-white'
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className='mt-6 border-t border-white/10 pt-6'>
                {showAuthenticatedState && sessionUser ? (
                  <div className='overflow-hidden rounded-[1.6rem] border border-white/12 bg-[rgba(8,34,27,0.86)] shadow-[0_12px_28px_rgba(0,0,0,0.18)]'>
                    <div className='border-b border-white/10 px-4 py-4'>
                      <p className='truncate text-base font-semibold text-white'>
                        {sessionUser.full_name || 'User'}
                      </p>
                      <p className='mt-1 truncate text-sm text-white/58'>
                        {sessionUser.email}
                      </p>
                    </div>

                    <Link
                      href='/dashboard'
                      onClick={() => setIsMenuOpen(false)}
                      className='flex items-center gap-3 px-4 py-3 text-sm font-medium text-white/88 transition-colors hover:bg-white/8 hover:text-white'
                    >
                      <LayoutDashboard className='size-4' />
                      Dashboard
                    </Link>

                    <button
                      type='button'
                      onClick={handleLogout}
                      className='flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-white/72 transition-colors hover:bg-white/8 hover:text-white'
                    >
                      <LogOut className='size-4' />
                      Logout
                    </button>
                  </div>
                ) : showSessionLoading ? (
                  <div
                    aria-label='Checking session'
                    className='h-12 w-full animate-pulse rounded-[1.4rem] border border-white/10 bg-white/8'
                  />
                ) : (
                  <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                    <GreenButton href='/login' outline>
                      Login
                    </GreenButton>
                    <GreenButton href='/register'>Get Started</GreenButton>
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </header>
  )
}

export function SiteFooter () {
  return (
    <footer className='bg-[rgba(41,134,104,1)] text-white'>
      <div className='mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-6 py-6 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-12'>
        <p className='text-[0.7rem] font-medium tracking-wide text-white/92'>
          EnviroQuant © {new Date().getFullYear()}. All rights reserved.
        </p>
        <div className='flex flex-wrap items-center justify-center gap-4 sm:gap-5'>
          {pageNumbers.map(item => (
            <Link
              key={item.label}
              href={item.href}
              className='text-[0.72rem] font-medium tracking-wide text-white/95 transition hover:text-white'
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className='flex items-center gap-3 gap-2 text-white/95'>
          {[
            {
              label: 'yt',
              href: '/',
              icon: (
                <svg
                  width='20'
                  height='14'
                  viewBox='0 0 20 14'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M15.812 0.001H4.145C1.855 0.001 0 1.836 0 4.1V9.868C0 12.132 1.856 13.968 4.145 13.968H15.812C18.102 13.968 19.957 12.132 19.957 9.868V4.1C19.957 1.836 18.101 0 15.812 0V0.001ZM13.009 7.264L7.552 9.839C7.51872 9.85503 7.48192 9.86237 7.44503 9.86035C7.40815 9.85834 7.37237 9.84702 7.34103 9.82746C7.3097 9.8079 7.28382 9.78073 7.2658 9.74848C7.24779 9.71622 7.23822 9.67994 7.238 9.643V4.334C7.23867 4.29687 7.24872 4.26052 7.26722 4.22832C7.28573 4.19613 7.31208 4.16914 7.34382 4.14988C7.37556 4.13061 7.41167 4.11969 7.44877 4.11814C7.48587 4.11659 7.52276 4.12445 7.556 4.141L13.014 6.876C13.0504 6.89413 13.0809 6.92214 13.102 6.95683C13.1232 6.99151 13.1341 7.03145 13.1336 7.07207C13.1331 7.11269 13.1211 7.15234 13.0991 7.18646C13.077 7.22059 13.0458 7.24781 13.009 7.265V7.264Z'
                    fill='white'
                  />
                </svg>
              )
            },
            {
              label: 'f',
              href: '/',
              icon: (
                <svg
                  width='24'
                  height='24'
                  viewBox='0 0 24 24'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M9.04598 5.865V8.613H7.03198V11.973H9.04598V21.959H13.18V11.974H15.955C15.955 11.974 16.215 10.363 16.341 8.601H13.197V6.303C13.197 5.96 13.647 5.498 14.093 5.498H16.347V2H13.283C8.94298 2 9.04598 5.363 9.04598 5.865Z'
                    fill='white'
                  />
                </svg>
              )
            },
            {
              label: 't',
              href: '/',
              icon: (
                <svg
                  width='24'
                  height='24'
                  viewBox='0 0 24 24'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M22 5.90692C21.2504 6.2343 20.4565 6.44896 19.644 6.54392C20.4968 6.04315 21.138 5.24903 21.448 4.30992C20.64 4.78025 19.7587 5.11152 18.841 5.28992C18.4545 4.88513 17.9897 4.56331 17.4748 4.3441C16.9598 4.12489 16.4056 4.01289 15.846 4.01492C13.58 4.01492 11.743 5.82492 11.743 8.05492C11.743 8.37092 11.779 8.67992 11.849 8.97492C10.2236 8.89761 8.63212 8.48233 7.17617 7.75556C5.72022 7.02879 4.43176 6.0065 3.393 4.75392C3.02883 5.36832 2.83742 6.0697 2.839 6.78392C2.8397 7.45189 3.00683 8.10915 3.32529 8.69631C3.64375 9.28348 4.1035 9.78203 4.663 10.1469C4.01248 10.1259 3.37602 9.95225 2.805 9.63992V9.68992C2.805 11.6479 4.22 13.2809 6.095 13.6529C5.74261 13.7464 5.37958 13.7938 5.015 13.7939C4.75 13.7939 4.493 13.7689 4.242 13.7189C4.51008 14.5268 5.02311 15.2312 5.70982 15.7343C6.39653 16.2373 7.22284 16.514 8.074 16.5259C6.61407 17.6505 4.82182 18.258 2.979 18.2529C2.647 18.2529 2.321 18.2329 2 18.1969C3.88125 19.3876 6.06259 20.0182 8.289 20.0149C15.836 20.0149 19.962 13.8579 19.962 8.51892L19.948 7.99592C20.7529 7.42959 21.4481 6.72177 22 5.90692Z'
                    fill='white'
                  />
                </svg>
              )
            },
            {
              label: 'ig',
              href: '/',
              icon: (
                <svg
                  width='24'
                  height='24'
                  viewBox='0 0 24 24'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M16.017 2H7.947C6.37015 2.00185 4.85844 2.62914 3.74353 3.74424C2.62862 4.85933 2.00159 6.37115 2 7.948L2 16.018C2.00185 17.5948 2.62914 19.1066 3.74424 20.2215C4.85933 21.3364 6.37115 21.9634 7.948 21.965H16.018C17.5948 21.9631 19.1066 21.3359 20.2215 20.2208C21.3364 19.1057 21.9634 17.5938 21.965 16.017V7.947C21.9631 6.37015 21.3359 4.85844 20.2208 3.74353C19.1057 2.62862 17.5938 2.00159 16.017 2V2ZM19.957 16.017C19.957 16.5344 19.8551 17.0468 19.6571 17.5248C19.4591 18.0028 19.1689 18.4371 18.803 18.803C18.4371 19.1689 18.0028 19.4591 17.5248 19.6571C17.0468 19.8551 16.5344 19.957 16.017 19.957H7.947C6.90222 19.9567 5.90032 19.5415 5.16165 18.8026C4.42297 18.0638 4.008 17.0618 4.008 16.017V7.947C4.00827 6.90222 4.42349 5.90032 5.16235 5.16165C5.90122 4.42297 6.90322 4.008 7.948 4.008H16.018C17.0628 4.00827 18.0647 4.42349 18.8034 5.16235C19.542 5.90122 19.957 6.90322 19.957 7.948V16.018V16.017Z'
                    fill='white'
                  />
                  <path
                    d='M11.9819 6.81909C10.6134 6.82121 9.30148 7.36588 8.33385 8.3337C7.36621 9.30152 6.8218 10.6135 6.81995 11.9821C6.82153 13.351 7.36597 14.6634 8.33385 15.6315C9.30172 16.5996 10.614 17.1442 11.9829 17.1461C13.352 17.1445 14.6646 16.5999 15.6327 15.6318C16.6008 14.6637 17.1454 13.3512 17.1469 11.9821C17.1448 10.6132 16.5999 9.30098 15.6316 8.33329C14.6634 7.3656 13.3509 6.82141 11.9819 6.82009V6.81909ZM11.9819 15.1381C11.1452 15.1381 10.3427 14.8057 9.75102 14.214C9.15935 13.6223 8.82695 12.8198 8.82695 11.9831C8.82695 11.1463 9.15935 10.3438 9.75102 9.75217C10.3427 9.16049 11.1452 8.82809 11.9819 8.82809C12.8187 8.82809 13.6212 9.16049 14.2129 9.75217C14.8045 10.3438 15.1369 11.1463 15.1369 11.9831C15.1369 12.8198 14.8045 13.6223 14.2129 14.214C13.6212 14.8057 12.8187 15.1381 11.9819 15.1381Z'
                    fill='white'
                  />
                  <path
                    d='M17.1559 8.09509C17.8391 8.09509 18.3929 7.54127 18.3929 6.85809C18.3929 6.17492 17.8391 5.62109 17.1559 5.62109C16.4728 5.62109 15.9189 6.17492 15.9189 6.85809C15.9189 7.54127 16.4728 8.09509 17.1559 8.09509Z'
                    fill='white'
                  />
                </svg>
              )
            },
            {
              label: 'in',
              href: '/contact',
              icon: (
                <svg
                  width='24'
                  height='24'
                  viewBox='0 0 24 24'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M21.959 13.7189V21.0979H17.681V14.2129C17.681 12.4829 17.062 11.3029 15.514 11.3029C14.332 11.3029 13.628 12.0989 13.319 12.8679C13.206 13.1429 13.177 13.5259 13.177 13.9109V21.0979H8.897C8.897 21.0979 8.955 9.43788 8.897 8.22888H13.177V10.0529L13.149 10.0949H13.177V10.0529C13.745 9.17788 14.76 7.92688 17.033 7.92688C19.848 7.92688 21.959 9.76688 21.959 13.7189ZM4.421 2.02588C2.958 2.02588 2 2.98588 2 4.24888C2 5.48388 2.93 6.47288 4.365 6.47288H4.393C5.886 6.47288 6.813 5.48388 6.813 4.24888C6.787 2.98588 5.887 2.02588 4.422 2.02588H4.421ZM2.254 21.0979H6.532V8.22888H2.254V21.0979Z'
                    fill='white'
                  />
                </svg>
              )
            }
          ].map(item => (
            <Link
              key={item.label}
              href={item.href}
              aria-label={item.label}
              className='grid size-5 place-items-center aspect-square bg-white/12 text-[0.52rem] font-semibold uppercase tracking-[0.16em] transition-all hover:bg-white/18 hover:translate-y-[-2px]'
            >
              {item.icon}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}

export function SiteShell ({
  children,
  className
}: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <div
      className={cn(
        'relative min-h-screen overflow-hidden  text-white',
        className
      )}
    >
      {/* <SiteBackground /> */}
      <SiteHeader />
      <main className='relative'>{children}</main>
      <SiteFooter />
    </div>
  )
}
