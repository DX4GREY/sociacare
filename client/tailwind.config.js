/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        socia: {
          canvas: '#F5F8FC',
          ink: '#0C2340',
          inkSub: '#3E5771',
          inkMuted: '#64748B',
          primary: '#1B5299',
          primaryHover: '#133E75',
          primaryLight: '#EBF3FC',
          card: '#FFFFFF',
          cardSubtle: '#F8FBFE',
          border: '#D3E2F2',
          borderSubtle: '#E5EFF9',
          amberWarm: '#FFF8EE',
          amberBorder: '#FDE68A',
          amberText: '#92400E',
          sageBg: '#F0F9F4',
          sageBorder: '#BBF7D0',
          sageText: '#166534',
          // Compatibility aliases
          bg: '#F5F8FC',
          badge: '#1B5299',
          bubbleAi: '#F0F6FD',
          bubbleUser: '#1B5299',
          textMain: '#0C2340',
          textSub: '#3E5771',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        hand: ['"Caveat"', '"Plus Jakarta Sans"', 'cursive', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 10px -2px rgba(12, 35, 64, 0.05), 0 1px 3px -1px rgba(12, 35, 64, 0.03)',
        'float': '0 12px 30px -4px rgba(12, 35, 64, 0.08), 0 4px 12px -2px rgba(12, 35, 64, 0.04)',
        'elevated': '0 20px 40px -8px rgba(12, 35, 64, 0.12), 0 8px 16px -4px rgba(12, 35, 64, 0.06)',
      },
    },
  },
  plugins: [],
};
