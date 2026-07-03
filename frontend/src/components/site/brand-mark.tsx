import Image from 'next/image'
import Link from 'next/link'

import { cn } from '@/lib/utils'

export function BrandMark ({
  href = '/',
  className,
  imageClassName
}: Readonly<{
  href?: string
  className?: string
  imageClassName?: string
}>) {
  return (
    <Link
      href={href}
      aria-label='EnviroQuant home'
      className={cn('group inline-flex items-center', className)}
    >
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
    </Link>
  )
}
