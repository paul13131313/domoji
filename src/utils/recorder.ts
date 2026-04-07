import type { Speed } from '../App'
import { kanaData } from '../data/kana-strokes'

const SPEED_MAP: Record<Speed, { strokeDuration: number; strokeGap: number; charGap: number }> = {
  slow: { strokeDuration: 0.6, strokeGap: 0.15, charGap: 0.3 },
  normal: { strokeDuration: 0.4, strokeGap: 0.08, charGap: 0.15 },
  fast: { strokeDuration: 0.2, strokeGap: 0.04, charGap: 0.08 },
}

function calcTotalDuration(text: string, speed: Speed): number {
  const timing = SPEED_MAP[speed]
  const chars = [...text].slice(0, 20)
  let total = 0
  for (const char of chars) {
    const data = kanaData[char]
    if (data) {
      total += data.strokes.length * (timing.strokeDuration + timing.strokeGap) + timing.charGap
    } else {
      total += timing.strokeDuration + timing.charGap
    }
  }
  // Add 0.5s padding at the end
  return total + 0.5
}

export async function recordAnimation(
  container: HTMLDivElement,
  text: string,
  speed: Speed
): Promise<Blob> {
  const duration = calcTotalDuration(text, speed) * 1000

  // Create a canvas to capture frames
  const svg = container.querySelector('svg')
  if (!svg) throw new Error('SVG not found')

  const rect = svg.getBoundingClientRect()
  const scale = 2 // hi-res
  const width = Math.round(rect.width * scale)
  const height = Math.round(rect.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  const stream = canvas.captureStream(30)
  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 2_000_000,
  })

  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/webm' }))
    }
  })

  recorder.start()

  // Render frames
  const fps = 30
  const totalFrames = Math.ceil((duration / 1000) * fps)
  const frameInterval = 1000 / fps

  for (let i = 0; i <= totalFrames; i++) {
    // Serialize SVG to image
    const svgData = new XMLSerializer().serializeToString(svg)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.width = width
    img.height = height

    await new Promise<void>((resolve) => {
      img.onload = () => {
        // Fill background
        const bgColor = document.body.classList.contains('theme-dark') ? '#0D0D0D' : '#F5F0E8'
        ctx.fillStyle = bgColor
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)
        URL.revokeObjectURL(url)
        resolve()
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve()
      }
      img.src = url
    })

    await new Promise((r) => setTimeout(r, frameInterval))
  }

  recorder.stop()
  return done
}
