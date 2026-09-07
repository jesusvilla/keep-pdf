import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Components from 'unplugin-vue-components/vite'
import dts from 'vite-plugin-dts'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ command, mode }) => {
  const isBuild = command === 'build'

  return {
    root: isBuild ? undefined : 'playground',
    plugins: [
      vue(),
      Icons({
        compiler: 'vue3',
        autoInstall: false
      }),
      Components({
        dts: 'src/components.d.ts',
        resolvers: [
          IconsResolver({
            prefix: 'i',
            enabledCollections: ['ant-design']
          })
        ]
      }),
      ...(isBuild ? [dts({
        insertTypesEntry: true,
        include: ['src/**/*.ts', 'src/**/*.vue'],
        exclude: ['playground/**/*'],
        rollupTypes: true
      })] : [])
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    build: isBuild ? {
      lib: {
        entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
        name: 'KeepPdf',
        formats: ['es', 'umd'],
        fileName: (format) => `keep-pdf.${format === 'es' ? 'js' : 'umd.cjs'}`,
        outDir: 'dist'
      },
      rollupOptions: {
        external: ['vue', 'naive-ui', 'konva', 'vue-konva', 'pdfjs-dist', 'pdf-lib'],
        output: {
          globals: {
            vue: 'Vue',
            'naive-ui': 'NaiveUI',
            konva: 'Konva',
            'vue-konva': 'VueKonva',
            'pdfjs-dist': 'pdfjsLib',
            'pdf-lib': 'PDFLib'
          }
        }
      },
      cssCodeSplit: false,
      sourcemap: true,
      outDir: 'dist'
    } : {
      outDir: 'playground/dist'
    },
    server: {
      port: 5173,
      open: true
    }
  }
})
