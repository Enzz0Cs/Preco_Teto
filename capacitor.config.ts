import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.robodevalor.app',
  appName: 'Robo de Valor',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
