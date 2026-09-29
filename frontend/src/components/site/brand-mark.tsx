import Image from 'next/image'
import Link from 'next/link'

import { cn } from '@/lib/utils'

export function BrandMark ({
  href = '/',
  className,
  imageClassName
}: Readonly<{
  href?: string | null
  className?: string
  imageClassName?: string
}>) {
  const content = (
    <Image
      src='/images/logo-1.png'
      alt='EnviroQuant Logo'
      width={250}
      height={50}
      className={cn(
        '  transition-transform duration-300 group-hover:scale-[1.01]',
        imageClassName
      )}
      priority
    />
  )

  if (!href) {
    return <span className={cn('group inline-flex items-center', className)}>{content}</span>
  }

  return (
    <Link
      href={href}
      aria-label='EnviroQuant home'
      className={cn('group inline-flex items-center', className)}
    >
      {content}
    </Link>
  )
}
