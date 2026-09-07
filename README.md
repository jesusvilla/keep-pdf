# keep-pdf

Visor de PDF con anotaciones interactivas para Vue 3, basado en pdf.js, Konva.js y Naive UI.

## ✨ Características

- 📄 **Renderizado de PDF** — Motor propio basado en la API pública de pdf.js, con renderizado de alta calidad (2x)
- ✏️ **Herramientas de anotación** — Lápiz, rectángulo, elipse y texto
- 🖱️ **Selección avanzada** — Individual por clic, múltiple por región de arrastre
- 🔄 **Transformación** — Mover, rotar y escalar cualquier anotación
- 🎨 **Popover de acciones** — Selector de color y eliminación contextual al seleccionar objetos
- 📝 **Texto nativo del PDF** — Modo para seleccionar y copiar texto extraíble del documento
- 💾 **Exportación** — Descarga del PDF con las anotaciones incrustadas usando pdf-lib
- 🎯 **Sincronización JSON** — Estado de anotaciones serializable y editable en tiempo real

## 🚀 Instalación

```bash
npm install keep-pdf
```

### Dependencias peer requeridas

```bash
npm install vue naive-ui konva vue-konva pdfjs-dist pdf-lib
```

## 📖 Uso básico

```vue
<template>
  <PdfViewer
    :src="pdfUrl"
    :initial-annotations="annotations"
    @annotations-change="handleAnnotationsChange"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { PdfViewer } from 'keep-pdf'
import 'keep-pdf/style.css'
import type { PageAnnotation } from 'keep-pdf'

const pdfUrl = ref('https://ejemplo.com/documento.pdf')
const annotations = ref<PageAnnotation[]>([])

const handleAnnotationsChange = (data: PageAnnotation[]) => {
  annotations.value = data
}
</script>
```

### Registro global como plugin

```typescript
import { createApp } from 'vue'
import KeepPdf from 'keep-pdf'
import 'keep-pdf/style.css'

const app = createApp(App)
app.use(KeepPdf)
app.mount('#app')
```

## 🎮 Playground

El proyecto incluye un playground de desarrollo con visor, carga de archivos locales y editor JSON en vivo.

### Ejecutar en local

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/keep-pdf.git
cd keep-pdf

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abre tu navegador en `http://localhost:5173`

### Funcionalidades del playground

| Acción | Descripción |
|--------|-------------|
| **Subir PDF** | Carga un archivo PDF local desde tu equipo |
| **Volver al ejemplo** | Regresa al PDF de demostración remoto |
| **Editor JSON** | Edita las anotaciones manualmente y aplica cambios |
| **Formatear** | Indenta el JSON correctamente |
| **Reset** | Limpia todas las anotaciones |
| **Aplicar cambios** | Sincroniza el JSON editado con el visor |

## 🛠️ Herramientas del visor

| Botón | Función |
|-------|---------|
| 🖱️ Selección | Selecciona, mueve, rota y escala objetos. Soporta selección por región |
| Aa Texto PDF | Activa la selección de texto nativo del documento |
| ✎ Lápiz | Dibujo a mano alzada |
| ▢ Rectángulo | Dibuja rectángulos con arrastre |
| ◯ Elipse | Dibuja elipses con arrastre |
| Aa Texto | Inserta texto editable con doble clic |
| ● Color | Cambia el color de dibujo o de objetos seleccionados |
| ⬇ Descargar | Exporta el PDF con las anotaciones incrustadas |

## 📐 API

### Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `src` | `string` | — | URL del documento PDF a cargar |
| `initialAnnotations` | `PageAnnotation[]` | `[]` | Anotaciones iniciales para precargar |

### Eventos

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `annotations-change` | `PageAnnotation[]` | Se emite cuando las anotaciones cambian |

### Métodos expuestos

| Método | Descripción |
|--------|-------------|
| `setAnnotations(annotations)` | Reemplaza todas las anotaciones del visor |

## 📁 Estructura del proyecto

```
keep-pdf/
├── src/
│   ├── index.ts                 # Entry point de la librería
│   ├── components/
│   │   ├── PdfViewer.vue        # Contenedor principal
│   │   ├── PdfToolbar.vue       # Barra de herramientas
│   │   └── AnnotationStage.vue  # Lienzo de anotaciones Konva
│   ├── core/
│   │   ├── PdfCore.ts           # Motor de renderizado pdf.js
│   │   ├── AnnotationExporter.ts # Exportación con pdf-lib
│   │   └── pdfWorker.ts         # Configuración del worker
│   └── types/
│       └── index.ts             # Tipos TypeScript
├── playground/                  # Entorno de desarrollo
│   ├── index.html
│   ├── main.ts
│   └── App.vue
├── vite.config.ts
├── package.json
└── tsconfig.json
```

## 🧩 Tecnologías

| Tecnología | Uso |
|------------|-----|
| Vue 3 | Framework de UI |
| Vite | Build tool y dev server |
| TypeScript | Tipado estático |
| pdf.js | Renderizado de PDF |
| Konva.js | Lienzo de anotaciones 2D |
| Naive UI | Componentes de interfaz |
| pdf-lib | Manipulación y exportación de PDF |
| unplugin-icons | Iconos de Ant Design bajo demanda |

## 📦 Scripts disponibles

```bash
npm run dev          # Inicia el playground en desarrollo
npm run build        # Compila la librería para producción
npm run preview      # Previsualiza el build de producción
npm run typecheck    # Verificación de tipos TypeScript
```

## 📄 Licencia

[GPL-3.0](https://www.gnu.org/licenses/gpl-3.0.html)

Este proyecto es software libre: puedes redistribuirlo y/o modificarlo bajo los términos de la **GNU General Public License v3.0** publicada por la Free Software Foundation.

Esto significa que:

| Permiso | Condición |
|---------|-----------|
| ✅ Uso comercial | El código fuente debe estar disponible |
| ✅ Modificación | Las modificaciones deben mantener la misma licencia |
| ✅ Distribución | Debes incluir el código fuente completo |
| ✅ Uso privado | Sin restricciones para uso interno |
| ⚠️ Proyectos derivados | Deben ser también GPL-3.0 (licencia copyleft) |

> **Nota importante para consumidores de la librería:** Cualquier aplicación que integre `keep-pdf` como dependencia y sea distribuida a terceros debe cumplir con los términos de la GPL-3.0. Si necesitas una licencia más permisiva para uso en software propietario, contacta al autor del proyecto.
