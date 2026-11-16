/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        socia: {
          bg: '#DCEBFA',
          card: '#F5FAFF',
          border: '#B8D4F2',
          primary: '#1E5FA8',
          primaryDark: '#164780',
          badge: '#184A78',
          bubbleAi: '#EBF3FC',
          bubbleUser: '#D4E6FA',
          textMain: '#1E2F47',
          textSub: '#4A6382',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        hand: ['"Caveat"', '"Kalam"', 'cursive', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
