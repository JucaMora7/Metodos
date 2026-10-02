import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:opacity-90',
        secondary: 'bg-secondary text-secondary-foreground hover:opacity-80',
        outline: 'border bg-transparent hover:bg-muted',
        ghost: 'hover:bg-muted',
      },
      size: { default: 'h-9 px-4', sm: 'h-8 px-3 text-xs', icon: 'h-9 w-9' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, ...p }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...p} />
})
Button.displayName = 'Button'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input
    ref={ref}
    className={cn('flex h-9 w-full rounded-md border bg-transparent px-3 py-1 font-mono text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50', className)}
    {...p}
  />
))
Input.displayName = 'Input'

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, ref) => (
  <select
    ref={ref}
    className={cn('flex h-9 w-full rounded-md border bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', className)}
    {...p}
  />
))
Select.displayName = 'Select'

export const Label = ({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn('mb-1.5 block text-xs font-medium text-muted-foreground', className)} {...p} />
)

export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-lg border bg-card text-foreground shadow-sm', className)} {...p} />
)

export const Badge = ({ className, tone = 'muted', ...p }: React.HTMLAttributes<HTMLSpanElement> & { tone?: 'success' | 'warning' | 'destructive' | 'muted' }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
      tone === 'success' && 'border-success/40 bg-success/10 text-success',
      tone === 'warning' && 'border-warning/40 bg-warning/10 text-warning',
      tone === 'destructive' && 'border-destructive/40 bg-destructive/10 text-destructive',
      tone === 'muted' && 'bg-muted text-muted-foreground',
      className,
    )}
    {...p}
  />
)
