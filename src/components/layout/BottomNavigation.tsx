import { CircleUserRound, Layers3, Radio } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const items = [
  { label: 'Groups', to: '/', icon: Layers3, end: true },
  { label: 'Activity', to: '/activity', icon: Radio, end: false },
  { label: 'Profile', to: '/profile', icon: CircleUserRound, end: false },
] as const;

export function BottomNavigation() {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      <div className="bottom-nav__inner">
        {items.map(({ label, to, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              isActive ? 'bottom-nav__item bottom-nav__item--active' : 'bottom-nav__item'
            }
          >
            <span className="bottom-nav__icon" aria-hidden="true">
              <Icon size={21} strokeWidth={2.15} />
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
