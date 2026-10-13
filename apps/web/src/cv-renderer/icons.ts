import {
  Award,
  Handshake,
  Heart,
  Lightbulb,
  Rocket,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react'

/** Icons offered for Key Achievements; the key is stored in the item's `icon` field. */
export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  star: Star,
  rocket: Rocket,
  trophy: Trophy,
  handshake: Handshake,
  lightbulb: Lightbulb,
  target: Target,
  award: Award,
  users: Users,
  'trending-up': TrendingUp,
  heart: Heart,
}
