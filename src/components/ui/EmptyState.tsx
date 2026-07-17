import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

type EmptyStateProps = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  children: ReactNode;
  accent?: 'amber' | 'green';
};

export function EmptyState({
  icon: Icon,
  eyebrow,
  title,
  children,
  accent = 'amber',
}: EmptyStateProps) {
  return (
    <motion.section
      className="empty-state"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className={`empty-state__art empty-state__art--${accent}`} aria-hidden="true">
        <span className="empty-state__orb empty-state__orb--one" />
        <span className="empty-state__orb empty-state__orb--two" />
        <span className="empty-state__icon">
          <Icon size={34} strokeWidth={1.8} />
        </span>
      </div>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <div className="empty-state__copy">{children}</div>
    </motion.section>
  );
}
