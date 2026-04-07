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

interface FallbackChar {
  char: string
  x: number
  y: number
  startTime: number
  duration: number
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
  const canvasW = (contentW + padding * 2) * scale
  const canvasH = (contentH + padding * 2) * scale

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
        const path = new Path2D()
        const m = new DOMMatrix().translate(ox, oy)
        path.addPath(new Path2D(stroke.d), m)

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

  const totalDuration = cumTime + 0.8

  // Canvas を DOM に追加（非表示だが存在させる）
  const canvas = document.createElement('canvas')
  canvas.width = canvasW
  canvas.height = canvasH
  canvas.style.position = 'fixed'
  canvas.style.top = '-9999px'
  canvas.style.left = '-9999px'
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')!

  const isDark = document.body.classList.contains('theme-dark')
  const bgColor = isDark ? '#0D0D0D' : '#F5F0E8'
  const strokeColor = isDark ? '#e8e4dc' : '#1a1a1a'

  // 描画関数
  function drawFrame(elapsed: number) {
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, canvasW, canvasH)

    ctx.save()
    ctx.scale(scale, scale)

    ctx.strokeStyle = strokeColor
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (const job of jobs) {
      if (elapsed < job.startTime) continue
      const progress = Math.min((elapsed - job.startTime) / job.duration, 1)
      const dashOffset = job.length * (1 - easeOut(progress))
      ctx.setLineDash([job.length])
      ctx.lineDashOffset = dashOffset
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
      const progress = Math.min((elapsed - fc.startTime) / fc.duration, 1)
      ctx.globalAlpha = easeOut(progress)
      ctx.fillText(fc.char, fc.x, fc.y)
    }
    ctx.globalAlpha = 1
    ctx.restore()
  }

  // MediaRecorder セットアップ
  const stream = canvas.captureStream(0) // 0 = manual frame capture
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm'
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 3_000_000,
  })

  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      document.body.removeChild(canvas)
      resolve(new Blob(chunks, { type: 'video/webm' }))
    }
  })

  recorder.start(100) // 100ms ごとにデータをフラッシュ

  // フレームを固定間隔で描画
  const fps = 30
  const frameInterval = 1000 / fps
  const totalFrames = Math.ceil(totalDuration * fps)
  const track = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void }

  for (let i = 0; i <= totalFrames; i++) {
    const elapsed = i / fps
    drawFrame(elapsed)

    // Manual frame request (if supported)
    if (track.requestFrame) {
      track.requestFrame()
    }

    await new Promise((r) => setTimeout(r, frameInterval))
  }

  // 最後のフレームを少し保持
  await new Promise((r) => setTimeout(r, 300))
  recorder.stop()
  return done
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t)
}
