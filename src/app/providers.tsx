'use client';
import { Theme } from '@astryxdesign/core/theme';
import { DbProvider } from '@tanstack/react-db';
import { type ReactNode, useState } from 'react';
import { createProcivDb } from '../lib/collections';
import { loadSnapshot } from '../sdk/occurrences';
import { procivTheme } from '../themes/prociv/generated/prociv';
export function Providers({ children }: { children: ReactNode }) {
  const [scope] = useState(() => createProcivDb(loadSnapshot));
  return (
    <DbProvider client={scope.db}>
      <Theme theme={procivTheme} mode="light">
        {children}
      </Theme>
    </DbProvider>
  );
}
