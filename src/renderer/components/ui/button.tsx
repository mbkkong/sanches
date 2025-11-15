import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';

const buttonVariants = cva(
	'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer shadow-md hover:shadow-lg',
	{
		variants: {
			variant: {
				default: 'bg-blue-600 text-white border-2 border-blue-700 hover:bg-blue-700 hover:border-blue-800 active:bg-blue-800 hover:text-white',
				destructive: 'bg-red-600 text-white border-2 border-red-700 hover:bg-red-700 hover:border-red-800 active:bg-red-800 hover:text-white',
				outline: 'border-2 border-slate-400 bg-white text-slate-900 hover:bg-slate-100 hover:border-slate-500 active:bg-slate-200 hover:text-slate-900',
				secondary: 'bg-slate-300 text-slate-900 border-2 border-slate-400 hover:bg-slate-400 hover:border-slate-500 active:bg-slate-500 hover:text-slate-900',
				ghost: 'bg-transparent text-slate-800 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 border-2 border-transparent',
				link: 'text-blue-600 underline-offset-4 hover:underline hover:text-blue-700 shadow-none',
			},
			size: {
				default: 'h-10 px-4 py-2 text-sm',
				sm: 'h-9 rounded-lg px-3 text-xs',
				lg: 'h-12 rounded-lg px-8 text-base',
				icon: 'h-10 w-10',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, ...props }, ref) => {
		const Comp = asChild ? Slot : 'button';
		return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
	},
);
Button.displayName = 'Button';

export { Button, buttonVariants };

