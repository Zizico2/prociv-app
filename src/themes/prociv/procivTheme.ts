import { defineTheme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';

export const procivTheme = defineTheme({
  name: 'prociv',
  extends: neutralTheme,
  typography: {
    scale: { base: 14, ratio: 1.2 },
    body: { family: 'Arial', fallbacks: 'Helvetica, sans-serif' },
    heading: {
      family: 'Arial',
      fallbacks: 'Helvetica, sans-serif',
      weight: 'semibold',
    },
  },
  localTokens: {
    '--pulso-ink': '#153d39',
    '--pulso-paper': '#f6f7f3',
    '--pulso-mint': '#e6efdf',
    '--pulso-fire': '#b94528',
    '--pulso-accident': '#365eaa',
    '--pulso-assist': '#6d56a3',
    '--pulso-other': '#327970',
    '--pulso-amber': '#a66117',
    '--pulso-white': '#ffffff',
    '--pulso-header-height': '4.5rem',
    '--pulso-panel': '24rem',
    '--pulso-shadow': '0 8px 36px #153d391a',
    '--pulso-radius': '1rem',
  },
  tokens: {
    '--color-background-body': ['#f6f7f3', '#172b28'],
    '--color-background-surface': ['#ffffff', '#1c3530'],
    '--color-background-card': ['#ffffff', '#1c3530'],
    '--color-background-popover': ['#ffffff', '#1c3530'],
    '--color-background-muted': ['#edf1e9', '#2b443c'],
    '--color-text-primary': ['#153d39', '#eff3e9'],
    '--color-text-secondary': ['#60736c', '#b4c9bc'],
    '--color-accent': ['#245b48', '#b9d99c'],
    '--color-text-accent': ['#245b48', '#b9d99c'],
    '--color-accent-muted': ['#e6efdf', '#31553b'],
    '--color-on-accent': ['#ffffff', '#183326'],
    '--color-border': ['#dce3d9', '#3c5449'],
    '--radius-container': '16px',
    '--radius-element': '10px',
    '--focus-outline-color': ['#245b48', '#b9d99c'],
  },
  components: {
    heading: { base: { letterSpacing: '-0.035em' } },
  },
});
