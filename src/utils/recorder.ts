import type { Speed } from '../App'
import { kanaData } from '../data/kana-strokes'

const SPEED_MAP: Record<Speed, { strokeDuration: number; strokeGap: number; charGap: number }> = {
  slow: { strokeDuration: 0.6, strokeGap: 0.15, charGap: 0.3 },
  normal: { strokeDuration: 0.4, strokeGap: 0.08, charGap: 0.15 },
  fast: { strokeDuration: 0.2, strokeGap: 0.04, charGap: 0.08 },
}

interface StrokeJob {
  path: Path2D
  length: number
  startTime: number
  duration: number
}

// SVG path "d" を Path2D に変換
function makePath2D(d: string): Path2D {
  return new Path2D(d)
}

export async function recordAnimation(
  _container: HTMLDivElement,
  text: string,
  speed: Speed
): Promise<Blob> {
  const timing = SPEED_MAP[speed]
  const lines = text.split('\n').map((line) => [...line])
  const allChars = lines.flat()
  if (allChars.length === 0) throw new Error('No text')

  const cellSize = 109
  const gap = 12
  const rowGap = 16
  const maxCols = Math.max(...lines.map((l) => l.length), 1)
  const padding = 40

  const contentW = maxCols * (cellSize + gap) - gap
  const contentH = lines.length * (cellSize + rowGap) - rowGap
  const scale = 3
  const canvasW = (contentW + padding * 2) * scale
  const canvasH = (contentH + padding * 2) * scale

  // Build stroke jobs with timing
  const jobs: StrokeJob[] = []
  const fallbackChars: { char: string; x: number; y: number; startTime: number; duration: number }[] = []
  let cumTime = 0

  for (let row = 0; row < lines.length; row++) {
    for (let col = 0; col < lines[row].length; col++) {
      const char = lines[row][col]
      const ox = col * (cellSize + gap) + padding
      const oy = row * (cellSize + rowGap) + padding
      const data = kanaData[char]

      if (!data) {
        fallbackChars.push({
          char,
          x: ox + cellSize / 2,
          y: oy + cellSize / 2 + 16,
          startTime: cumTime,
          duration: timing.strokeDuration,
        })
        cumTime += timing.strokeDuration + timing.charGap
        continue
      }

      for (const stroke of data.strokes) {
        // Offset path by cell position
        const path = new Path2D()
        const m = new DOMMatrix().translate(ox, oy)
        path.addPath(makePath2D(stroke.d), m)

        jobs.push({
          path,
          length: stroke.length,
          startTime: cumTime,
          duration: timing.strokeDuration,
        })
        cumTime += timing.strokeDuration + timing.strokeGap
      }
      cumTime += timing.charGap
    }
  }

  const totalDuration = cumTime + 0.5 // 0.5s padding

  // Create canvas
  const canvas = document.createElement('canvas')
  canvas.width = canvasW
  canvas.height = canvasH
  const ctx = canvas.getContext('2d')!

  // MediaRecorder
  const stream = canvas.captureStream(30)
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm'
  const recorder = new MediaRecorder(stream, {
    mimeType,
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

  const isDark = document.body.classList.contains('theme-dark')
  const bgColor = isDark ? '#0D0D0D' : '#F5F0E8'
  const strokeColor = isDark ? '#e8e4dc' : '#1a1a1a'

  // Render loop
  const startMs = performance.now()

  await new Promise<void>((resolve) => {
    function renderFrame() {
      const elapsed = (performance.now() - startMs) / 1000

      // Clear
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, canvasW, canvasH)

      ctx.save()
      ctx.scale(scale, scale)

      // Draw strokes
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      for (const job of jobs) {
        if (elapsed < job.startTime) continue

        const progress = Math.min((elapsed - job.startTime) / job.duration, 1)
        const dashOffset = job.length * (1 - progress)

        ctx.setLineDash([job.length])
        ctx.lineDashOffset = dashOffset
        ctx.stroke(job.path)
      }

      // Reset dash for fallback text
      ctx.setLineDash([])
      ctx.lineDashOffset = 0

      // Draw fallback characters
      ctx.fillStyle = strokeColor
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = "70px 'Zen Old Mincho', serif"

      for (const fc of fallbackChars) {
        if (elapsed < fc.startTime) continue
        const progress = Math.min((elapsed - fc.startTime) / fc.duration, 1)
        ctx.globalAlpha = progress
        ctx.fillText(fc.char, fc.x, fc.y)
      }
      ctx.globalAlpha = 1

      ctx.restore()

      if (elapsed < totalDuration) {
        requestAnimationFrame(renderFrame)
      } else {
        resolve()
      }
    }

    requestAnimationFrame(renderFrame)
  })

  // Small delay to ensure last frame is captured
  await new Promise((r) => setTimeout(r, 200))
  recorder.stop()
  return done
}
