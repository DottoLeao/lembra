import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dottoleao.lembra',
  appName: 'Lembra',
  webDir: 'dist',
  // fixa a origem do WebView (padrões atuais): mudar isso apagaria os dados do IndexedDB
  server: { androidScheme: 'https', hostname: 'localhost' },
};

export default config;
