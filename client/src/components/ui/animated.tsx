import { motion, AnimatePresence, Variants } from "motion/react";
import { ReactNode } from "react";

// 页面过渡动画
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

export const pageTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30
};

// 卡片动画
export const cardVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  hover: { scale: 1.02, boxShadow: "0 10px 40px rgba(0,0,0,0.12)" }
};

// 列表项动画
export const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

export const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 }
};

// 数据更新闪烁动画
export const dataUpdateVariants: Variants = {
  initial: { backgroundColor: "rgba(34, 197, 94, 0)" },
  flash: { 
    backgroundColor: ["rgba(34, 197, 94, 0.3)", "rgba(34, 197, 94, 0)"],
    transition: { duration: 0.8 }
  }
};

// 脉冲动画
export const pulseVariants: Variants = {
  initial: { scale: 1 },
  pulse: {
    scale: [1, 1.05, 1],
    transition: { duration: 0.5, repeat: Infinity, repeatDelay: 2 }
  }
};

// 动画包装组件
interface AnimatedContainerProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function AnimatedPage({ children, className }: AnimatedContainerProps) {
  return (
    <motion.div
      className={className}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedCard({ children, className, delay = 0 }: AnimatedContainerProps) {
  return (
    <motion.div
      className={className}
      initial="initial"
      animate="animate"
      whileHover="hover"
      variants={cardVariants}
      transition={{ ...pageTransition, delay }}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedList({ children, className }: AnimatedContainerProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={listContainerVariants}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedListItem({ children, className }: AnimatedContainerProps) {
  return (
    <motion.div
      className={className}
      variants={listItemVariants}
    >
      {children}
    </motion.div>
  );
}

// 数值动画组件
interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
}

export function AnimatedNumber({ value, decimals = 0, duration = 0.5, className }: AnimatedNumberProps) {
  return (
    <motion.span
      className={className}
      key={value}
      initial={{ opacity: 0.5, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {value.toFixed(decimals)}
    </motion.span>
  );
}

// 数据更新高亮组件
interface DataHighlightProps {
  children: ReactNode;
  value: any;
  className?: string;
}

export function DataHighlight({ children, value, className }: DataHighlightProps) {
  return (
    <motion.span
      key={value}
      className={className}
      initial={{ backgroundColor: "rgba(34, 197, 94, 0.3)" }}
      animate={{ backgroundColor: "rgba(34, 197, 94, 0)" }}
      transition={{ duration: 1 }}
    >
      {children}
    </motion.span>
  );
}

// 进度条动画
interface AnimatedProgressProps {
  value: number;
  className?: string;
  barClassName?: string;
}

export function AnimatedProgress({ value, className, barClassName }: AnimatedProgressProps) {
  return (
    <div className={className}>
      <motion.div
        className={barClassName}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </div>
  );
}

// 状态指示器动画
interface StatusDotProps {
  status: "active" | "warning" | "error" | "offline";
  size?: "sm" | "md" | "lg";
}

export function AnimatedStatusDot({ status, size = "md" }: StatusDotProps) {
  const colors = {
    active: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500",
    offline: "bg-gray-400"
  };

  const sizes = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4"
  };

  return (
    <motion.div
      className={`${colors[status]} ${sizes[size]} rounded-full`}
      animate={status === "active" ? {
        scale: [1, 1.2, 1],
        opacity: [1, 0.7, 1]
      } : {}}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  );
}

// 淡入动画
export function FadeIn({ children, className, delay = 0 }: AnimatedContainerProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay }}
    >
      {children}
    </motion.div>
  );
}

// 滑入动画
interface SlideInProps extends AnimatedContainerProps {
  direction?: "left" | "right" | "up" | "down";
}

export function SlideIn({ children, className, delay = 0, direction = "up" }: SlideInProps) {
  const directionMap = {
    left: { x: -30, y: 0 },
    right: { x: 30, y: 0 },
    up: { x: 0, y: 30 },
    down: { x: 0, y: -30 }
  };

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...directionMap[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// 缩放动画
export function ScaleIn({ children, className, delay = 0 }: AnimatedContainerProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay, type: "spring" as const, stiffness: 200 }}
    >
      {children}
    </motion.div>
  );
}

// 导出motion组件供直接使用
export { motion, AnimatePresence };
