'use client';

import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <Loader2
      className={`animate-spin text-green-600 ${sizes[size]} ${className}`}
    />
  );
}

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = '로딩 중...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Spinner size="lg" />
      <p className="mt-4 text-sm text-gray-600">{message}</p>
    </div>
  );
}
