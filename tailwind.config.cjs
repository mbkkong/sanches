/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/renderer/**/*.{ts,tsx,html}', './src/index.html'],
	theme: {
		extend: {
			colors: {
				primary: 'hsl(var(--color-primary))',
				'primary-foreground': 'hsl(var(--color-primary-foreground))',
				success: 'hsl(var(--color-success))',
				warning: 'hsl(var(--color-warning))',
				info: 'hsl(var(--color-info))',
			},
		},
	},
	plugins: [require('tailwindcss-animate')],
};

