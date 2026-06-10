/**
 * NAVIGATION CONFIGURATION
 * 
 * Defines the navigation structure for headers, bottom nav, and menus.
 */

import {
  MapPin,
  Users,
  Map,
  GraduationCap,
  Calendar,
  Zap,
  Trophy,
  Target,
  Award,
  Settings,
  PlusCircle,
  LucideIcon,
} from 'lucide-react';
import { ROUTES } from './routes';

export interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  divider?: boolean;
}

export const bottomNavItems: NavItem[] = [
  { icon: MapPin, label: 'Places', path: ROUTES.places },
  { icon: Users, label: 'Teams', path: ROUTES.teams },
  { icon: Map, label: 'Map', path: ROUTES.map },
  { icon: GraduationCap, label: 'Coaches', path: ROUTES.coaches },
  { icon: Calendar, label: 'Events', path: ROUTES.events },
];

export const quickActionItems: NavItem[] = [
  { icon: Zap, label: 'Activity', path: ROUTES.performance },
  { icon: Calendar, label: 'Schedule', path: ROUTES.schedule },
  { icon: Trophy, label: 'Rewards', path: ROUTES.rewards },
  { icon: Target, label: 'Goals', path: ROUTES.goals },
  { icon: Award, label: 'Stats', path: ROUTES.analytics },
];

export const menuItems: NavItem[] = [
  { icon: Settings, label: 'Settings', path: ROUTES.settings },
  { icon: Award, label: 'Leaderboards', path: ROUTES.leaderboards },
  { icon: Target, label: 'Challenges', path: ROUTES.challenges },
  { icon: PlusCircle, label: 'Create', path: ROUTES.create },
];
