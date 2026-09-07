import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import type { PageAnnotation, KonvaLine, KonvaShape } from '../types'

export class AnnotationExporter {
  static async exportPdfWithAnnotations(
    pdfBytes: Uint8Array,
    annotations: PageAnnotation[],
    pageWidth: number,
    pageHeight: number
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()

    for (const annotation of annotations) {
      const page = pages[annotation.pageNumber - 1]
      if (!page) continue

      const { width: pdfWidth, height: pdfHeight } = page.getSize()
      const scaleX = pdfWidth / pageWidth
      const scaleY = pdfHeight / pageHeight

      for (const line of annotation.lines) {
        await this.drawLine(page, line, scaleX, scaleY, pdfHeight)
      }

      for (const shape of annotation.shapes) {
        await this.drawShape(page, shape, scaleX, scaleY, pdfHeight)
      }
    }

    return await pdfDoc.save()
  }

  private static async drawLine(
    page: any,
    line: KonvaLine,
    scaleX: number,
    scaleY: number,
    pdfHeight: number
  ): Promise<void> {
    if (line.points.length < 4) return

    const color = this.hexToRgb(line.stroke)

    for (let i = 0; i < line.points.length - 2; i += 2) {
      const x1 = line.points[i] * scaleX
      const y1 = pdfHeight - line.points[i + 1] * scaleY
      const x2 = line.points[i + 2] * scaleX
      const y2 = pdfHeight - line.points[i + 3] * scaleY

      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: line.strokeWidth,
        color: rgb(color.r, color.g, color.b)
      })
    }
  }

  private static async drawShape(
    page: any,
    shape: KonvaShape,
    scaleX: number,
    scaleY: number,
    pdfHeight: number
  ): Promise<void> {
    if (shape.type === 'rect') {
      const strokeColor = this.hexToRgb(shape.stroke)
      const fillColor = shape.fill && shape.fill !== 'transparent'
        ? this.hexToRgb(shape.fill)
        : null

      const x = shape.x * scaleX
      const y = pdfHeight - (shape.y + shape.height) * scaleY
      const width = shape.width * scaleX
      const height = shape.height * scaleY

      page.drawRectangle({
        x,
        y,
        width,
        height,
        borderColor: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
        borderWidth: shape.strokeWidth,
        color: fillColor ? rgb(fillColor.r, fillColor.g, fillColor.b) : undefined
      })
    } else if (shape.type === 'ellipse') {
      const strokeColor = this.hexToRgb(shape.stroke)
      const fillColor = shape.fill && shape.fill !== 'transparent'
        ? this.hexToRgb(shape.fill)
        : null

      const x = shape.x * scaleX
      const y = pdfHeight - shape.y * scaleY
      const xScale = shape.radiusX * scaleX
      const yScale = shape.radiusY * scaleY

      page.drawEllipse({
        x,
        y,
        xScale,
        yScale,
        borderColor: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
        borderWidth: shape.strokeWidth,
        color: fillColor ? rgb(fillColor.r, fillColor.g, fillColor.b) : undefined
      })
    } else if (shape.type === 'text') {
      const font = await page.doc.embedFont(StandardFonts.Helvetica)
      const fillColor = this.hexToRgb(shape.fill)
      const x = shape.x * scaleX
      const y = pdfHeight - shape.y * scaleY

      page.drawText(shape.text, {
        x,
        y,
        size: shape.fontSize * scaleY,
        font,
        color: rgb(fillColor.r, fillColor.g, fillColor.b)
      })
    }
  }

  private static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255
        }
      : { r: 0, g: 0, b: 0 }
  }
}
