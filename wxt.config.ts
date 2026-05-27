import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Claude Task Safety',
    description:
      'Local-first protection and handoff recovery for long Claude.ai tasks.',
    permissions: ['storage', 'notifications', 'scripting', 'clipboardWrite'],
    host_permissions: ['https://claude.ai/*'],
    action: {
      default_title: 'Claude Task Safety',
    },
    web_accessible_resources: [
      {
        resources: ['inject.js'],
        matches: ['https://claude.ai/*'],
      },
    ],
  },
});
