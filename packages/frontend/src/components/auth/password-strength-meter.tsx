import { checkPasswordStrength } from '@exam-portal/shared';
import { cn } from '@/lib/utils';

interface PasswordStrengthMeterProps {
  password: string;
}

const STRENGTH_COLORS = ['bg-destructive', 'bg-destructive', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
const STRENGTH_WIDTHS = ['w-1/5', 'w-2/5', 'w-3/5', 'w-4/5', 'w-full'];

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const strength = checkPasswordStrength(password);

  return (
    <div className="space-y-2">
      <div className="h-1.5 w-full rounded-full bg-secondary">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            STRENGTH_COLORS[strength.score],
            STRENGTH_WIDTHS[strength.score],
          )}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Password strength:</span>
        <span
          className={cn('text-xs font-medium', {
            'text-destructive': strength.score <= 1,
            'text-orange-500': strength.score === 2,
            'text-yellow-600': strength.score === 3,
            'text-green-600': strength.score === 4,
          })}
        >
          {strength.label}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
        <li className={cn(strength.checks.minLength && 'text-green-600')}>
          {strength.checks.minLength ? '\u2713' : '\u2717'} 8+ characters
        </li>
        <li className={cn(strength.checks.hasUppercase && 'text-green-600')}>
          {strength.checks.hasUppercase ? '\u2713' : '\u2717'} Uppercase letter
        </li>
        <li className={cn(strength.checks.hasLowercase && 'text-green-600')}>
          {strength.checks.hasLowercase ? '\u2713' : '\u2717'} Lowercase letter
        </li>
        <li className={cn(strength.checks.hasNumber && 'text-green-600')}>
          {strength.checks.hasNumber ? '\u2713' : '\u2717'} Number
        </li>
        <li className={cn(strength.checks.hasSpecialChar && 'text-green-600')}>
          {strength.checks.hasSpecialChar ? '\u2713' : '\u2717'} Special character
        </li>
      </ul>
    </div>
  );
}
