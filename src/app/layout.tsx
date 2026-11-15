import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';
export const metadata: Metadata = {
  title: 'Pulso — Portugal, agora',
  description:
    'Uma visão clara das ocorrências de proteção e socorro em Portugal continental. Dados públicos da ANEPC.',
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt" data-theme="light" data-astryx-theme="prociv">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
