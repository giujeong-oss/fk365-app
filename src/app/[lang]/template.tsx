'use client';

import { motion } from 'framer-motion';
import { useNavigation } from '@/lib/context';
import { useEffect } from 'react';

interface TemplateProps {
  children: React.ReactNode;
}

export default function Template({ children }: TemplateProps) {
  const { direction, resetDirection } = useNavigation();

  // 애니메이션 완료 후 방향 리셋
  useEffect(() => {
    const timer = setTimeout(() => {
      resetDirection();
    }, 300);
    return () => clearTimeout(timer);
  }, [resetDirection]);

  // 방향에 따른 애니메이션 설정
  const getInitialX = () => {
    if (direction === 'right') return 100; // 오른쪽에서 들어옴
    if (direction === 'left') return -100; // 왼쪽에서 들어옴
    return 0;
  };

  return (
    <motion.div
      initial={{ x: getInitialX(), opacity: direction === 'none' ? 1 : 0.8 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{
        type: 'tween',
        ease: 'easeOut',
        duration: 0.25,
      }}
      style={{ minHeight: '100%' }}
    >
      {children}
    </motion.div>
  );
}
