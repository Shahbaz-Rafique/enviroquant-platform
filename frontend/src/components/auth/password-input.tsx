'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useState, type InputHTMLAttributes } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function PasswordInput ({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false)

  return (
    <div className='relative'>
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        className={cn('pr-12', className)}
      />
      <button
        type='button'
        aria-label={visible ? 'Hide password' : 'Show password'}
        onClick={() => setVisible(current => !current)}
        className='absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/58 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#67E8F9]/60'
      >
        {visible ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
      </button>
    </div>
  )
}
