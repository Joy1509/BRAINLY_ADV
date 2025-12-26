import React from 'react';

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASS: Record<string, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export default function Spinner({ size = 'sm', className = '' }: SpinnerProps) {
  const sizeClass = SIZE_CLASS[size] || SIZE_CLASS.sm;
  return (
    <svg
      className={`${sizeClass} ${className} inline-block animate-spin`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      role="img"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} fill="none" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
