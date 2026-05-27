import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Continuum',
    description:
      'Pick up where Claude left off. Continuum quietly saves long Claude tasks and generates handoff prompts.',
    permissions: ['storage', 'notifications', 'scripting', 'clipboardWrite'],
    host_permissions: ['https://claude.ai/*'],
    action: {
      default_title: 'Continuum',
    },
    web_accessible_resources: [
      {
        resources: ['inject.js'],
        matches: ['https://claude.ai/*'],
      },
    ],
  },
});
