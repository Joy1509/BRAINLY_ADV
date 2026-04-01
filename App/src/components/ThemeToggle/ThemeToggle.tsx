import { useTheme } from '../../context/ThemeContext';

const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={(e) => toggleTheme(e)}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-200
        ${isDark
          ? 'bg-white/5 hover:bg-white/10 border-white/10'
          : 'bg-gray-100 hover:bg-gray-200 border-gray-200'
        }`}
    >
      {/* Sun */}
      <svg xmlns="http://www.w3.org/2000/svg"
        className={`w-5 h-5 absolute transition-all duration-300 text-yellow-400 ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
      </svg>

      {/* Moon */}
      <svg xmlns="http://www.w3.org/2000/svg"
        className={`w-5 h-5 absolute transition-all duration-300 text-indigo-500 ${isDark ? 'opacity-0 -rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    </button>
  );
};

export default ThemeToggle;
