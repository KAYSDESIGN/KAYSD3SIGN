import { Armchair, Circle, CircleDot, Disc3, Flame, Grip, Hand, Lightbulb, Package, ScanLine, Shield, ShieldHalf, SquareStack, Wind, Footprints, ArrowUpDown, Minus, Navigation, Droplet } from 'lucide-react'
import type { AccessoryCategory } from '../domain/types'

const ICONS: Record<AccessoryCategory, typeof Circle> = {
  mirrors: ScanLine, exhausts: Flame, levers: Hand, shifters: ArrowUpDown, footpegs: Footprints, handlebars: Minus,
  barEnds: CircleDot, grips: Grip, licensePlateHolders: SquareStack, indicators: Navigation, lighting: Lightbulb,
  seats: Armchair, windscreens: Wind, engineProtection: Shield, frameProtection: ShieldHalf, fairings: SquareStack,
  fenders: Droplet, wheels: Disc3, other: Package,
}
export const CategoryIcon = ({ category, size = 24 }: { category: AccessoryCategory; size?: number }) => {
  const I = ICONS[category] ?? Package
  return <I size={size} strokeWidth={1.7} />
}
