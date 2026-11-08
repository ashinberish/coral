import { Link } from 'expo-router';

import { ComingSoon } from '@/components/ComingSoon';
import { ChunkyButton } from '@/components/ui';

export default function RemindersScreen() {
  return (
    <ComingSoon title="Reminders" message="Smart reminders and settings arrive in M5 and M6.">
      <Link href="/account" asChild>
        <ChunkyButton tone="coral">Account</ChunkyButton>
      </Link>
    </ComingSoon>
  );
}
