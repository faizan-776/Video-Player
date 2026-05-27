import { defineConfig, type PluginOption } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig(async () => {
  const plugins: PluginOption[] = [react()];
  
  const electronPlugins = await electron({
    main: {
      entry: 'electron/main.ts',
    },
    preload: {
      input: path.join(__dirname, 'electron/preload.ts'),
      vite: {
        build: {
          rollupOptions: {
            output: {
              format: 'cjs',
              entryFileNames: '[name].js',
            },
          },
        },
      },
    },
    renderer: {},
  });
  
  // The plugin returns an array of plugins at runtime
  if (Array.isArray(electronPlugins)) {
    plugins.push(...(electronPlugins as PluginOption[]));
  } else {
    plugins.push(electronPlugins as PluginOption);
  }

  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    plugins,
  };
})
