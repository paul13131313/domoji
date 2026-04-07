import type { Speed } from '../App'
import { kanaData } from '../data/kana-strokes'
import { encode } from 'modern-gif'

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

interface FallbackChar {
  char: string
  x: number
  y: number
  startTime: number
  duration: number
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t)
}

export async function recordAnimation(
  _container: HTMLDivElement,
  text: string,
  speed: Speed
): Promise<Blob> {
  const timing = SPEED_MAP[speed]
  const lines = text.split('\n').map((line) => [...line])

  const cellSize = 109
  const gap = 12
  const rowGap = 16
  const maxCols = Math.max(...lines.map((l) => l.length), 1)
  const padding = 40

  const contentW = maxCols * (cellSize + gap) - gap
  const contentH = lines.length * (cellSize + rowGap) - rowGap
  const scale = 2
  const width = (contentW + padding * 2) * scale
  const height = (contentH + padding * 2) * scale

  // Build stroke jobs
  const jobs: StrokeJob[] = []
  const fallbackChars: FallbackChar[] = []
  let cumTime = 0

  for (let row = 0; row < lines.length; row++) {
    for (let col = 0; col < lines[row].length; col++) {
      const char = lines[row][col]
      const ox = col * (cellSize + gap) + padding
      const oy = row * (cellSize + rowGap) + padding
      const data = kanaData[char]

      if (!data) {
        fallbackChars.push({
          char, x: ox + cellSize / 2, y: oy + cellSize / 2 + 16,
          startTime: cumTime, duration: timing.strokeDuration,
        })
        cumTime += timing.strokeDuration + timing.charGap
        continue
      }

      for (const stroke of data.strokes) {
        const path = new Path2D()
        path.addPath(new Path2D(stroke.d), new DOMMatrix().translate(ox, oy))
        jobs.push({ path, length: stroke.length, startTime: cumTime, duration: timing.strokeDuration })
        cumTime += timing.strokeDuration + timing.strokeGap
      }
      cumTime += timing.charGap
    }
  }

  const totalDuration = cumTime + 0.5

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  const isDark = document.body.classList.contains('theme-dark')
  const bgColor = isDark ? '#0D0D0D' : '#F5F0E8'
  const strokeColor = isDark ? '#e8e4dc' : '#1a1a1a'

  function drawFrame(elapsed: number) {
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, width, height)
    ctx.save()
    ctx.scale(scale, scale)
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (const job of jobs) {
      if (elapsed < job.startTime) continue
      const progress = Math.min((elapsed - job.startTime) / job.duration, 1)
      ctx.setLineDash([job.length])
      ctx.lineDashOffset = job.length * (1 - easeOut(progress))
      ctx.stroke(job.path)
    }

    ctx.setLineDash([])
    ctx.lineDashOffset = 0
    ctx.fillStyle = strokeColor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = "70px 'Zen Old Mincho', serif"

    for (const fc of fallbackChars) {
      if (elapsed < fc.startTime) continue
      ctx.globalAlpha = easeOut(Math.min((elapsed - fc.startTime) / fc.duration, 1))
      ctx.fillText(fc.char, fc.x, fc.y)
    }
    ctx.globalAlpha = 1
    ctx.restore()
  }

  // Generate frames
  const fps = 12
  const totalFrames = Math.ceil(totalDuration * fps)
  const delay = Math.round(1000 / fps)

  const frames: { data: ImageData; delay: number }[] = []

  for (let i = 0; i <= totalFrames; i++) {
    drawFrame(i / fps)
    frames.push({
      data: ctx.getImageData(0, 0, width, height),
      delay,
    })
  }

  // Hold last frame
  frames.push({
    data: ctx.getImageData(0, 0, width, height),
    delay: 1500,
  })

  // Encode GIF
  const output = await encode({
    width,
    height,
    frames: frames.map((f) => ({
      data: f.data.data,
      delay: f.delay,
    })),
  })

  return new Blob([output], { type: 'image/gif' })
}
