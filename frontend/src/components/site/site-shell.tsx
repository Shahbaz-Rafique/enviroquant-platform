'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Mail } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

const navigation = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Services', href: '/services' },
  { label: 'Contact', href: '/contact' }
]

const pageNumbers = [
  { label: 'Eleven', href: '/' },
  { label: 'Twelve', href: '/about' },
  { label: 'Thirteen', href: '/services' },
  { label: 'Fourteen', href: '/contact' },
  { label: 'Fifteen', href: '/' }
]

function BrandMark () {
  return (
    <Link href='/' aria-label='Home' className='group flex items-center gap-3'>
      <span className='grid size-11 place-items-center rounded-full border border-white/70 bg-white text-sm font-black text-[#06110F] shadow-[0_0_30px_rgba(255,255,255,0.28)] transition-transform duration-300 group-hover:scale-105'>
        <span className='size-2 rounded-full bg-[#00F5D4]' />
      </span>
    </Link>
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
  return (
    <header className='fixed inset-x-0 top-0 z-50 backdrop-blur-sm'>
      <div className='mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between px-7 sm:px-10 lg:px-12'>
        <BrandMark />
        <nav className='flex items-center gap-5 sm:gap-10'>
          {navigation.map(item => (
            <Link
              key={item.label}
              href={item.href}
              className='rounded-full px-1 py-1 text-[0.95rem] font-normal text-white/90 transition-all duration-300 hover:text-white hover:drop-shadow-[0_0_12px_rgba(103,232,249,0.55)]'
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
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
              className='grid size-4 place-items-center rounded-full bg-white/12 text-[0.52rem] font-semibold uppercase tracking-[0.16em] transition hover:bg-white/18'
            >
              <span className='size-4'>{item.icon}</span>
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
