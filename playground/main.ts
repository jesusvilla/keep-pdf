import { createApp } from 'vue'
import naive from 'naive-ui'
import VueKonva from 'vue-konva'
import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'
import KeepPdfPlugin from '../src/index'
import App from './App.vue'

hljs.registerLanguage('json', json)

const app = createApp(App)
app.use(naive)
app.use(VueKonva)
app.use(KeepPdfPlugin)

app.config.globalProperties.$hljs = hljs

app.mount('#app')
