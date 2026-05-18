import { useState, useRef, useCallback, useEffect } from "react"
import { supabase } from "./lib/supabase"
import reshaemLogo from "./assets/reshaem-logo.svg"

// Shared AudioContext — created once, reused across all TTS buttons.
// Calling ctx.resume() synchronously inside a user-gesture handler captures
// the browser's autoplay permission so source.start() works after async gaps.
const getAudioCtx = (() => {
  let ctx = null
  return () => {
    if (!ctx || ctx.state === "closed") {
      ctx = new (window.AudioContext || window.webkitAudioContext)()
    }
    return ctx
  }
})()

// ─── Icons ────────────────────────────────────────────────────────────────────

const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 5l-7 7 7 7" />
  </svg>
)

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
    fill="currentColor" stroke="none">
    <polygon points="5,3 19,12 5,21" />
  </svg>
)

const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
    fill="currentColor" stroke="none">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
)

const SpinnerIcon = ({ size = 20 }) => (
  <svg className="spin" xmlns="http://www.w3.org/2000/svg" width={size} height={size}
    viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
)

const SpeakerIcon = ({ size = 13 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
)

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const GalleryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
)

// ─── Dot Loader ───────────────────────────────────────────────────────────────

function DotLoader({ label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ display: "flex", gap: 7 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 8, height: 8,
            borderRadius: "var(--radius-full)",
            background: "var(--color-accent)",
            animation: `dotPulse 1.2s ${i * 0.2}s ease-in-out infinite`,
          }} />
        ))}
      </div>
      {label && (
        <p style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-sm)",
          color: "var(--color-text-muted)",
          margin: 0,
          letterSpacing: "0.03em",
        }}>
          {label}
        </p>
      )}
    </div>
  )
}

// ─── TTS Play Button ──────────────────────────────────────────────────────────

function PlayButton({ text }) {
  const [status, setStatus] = useState("idle")
  const sourceRef = useRef(null)  // { node: AudioBufferSourceNode, cancel: fn }
  const bufferRef = useRef(null)  // decoded AudioBuffer
  const offsetRef = useRef(0)     // pause position in seconds
  const startRef  = useRef(0)     // ctx.currentTime when playback last began

  useEffect(() => () => {
    sourceRef.current?.cancel()
    try { sourceRef.current?.node.stop() } catch (_) {}
  }, [])

  const startNode = (buffer, offset) => {
    const ctx = getAudioCtx()
    let cancelled = false
    const node = ctx.createBufferSource()
    node.buffer = buffer
    node.connect(ctx.destination)
    node.onended = () => {
      if (!cancelled) { setStatus("idle"); offsetRef.current = 0 }
    }
    sourceRef.current = { node, cancel: () => { cancelled = true } }
    startRef.current = ctx.currentTime
    node.start(0, offset)
    setStatus("playing")
  }

  const handleClick = () => {
    const ctx = getAudioCtx()

    if (status === "playing") {
      const elapsed = ctx.currentTime - startRef.current
      offsetRef.current = Math.min(offsetRef.current + elapsed, bufferRef.current?.duration ?? 0)
      sourceRef.current?.cancel()
      try { sourceRef.current?.node.stop() } catch (_) {}
      setStatus("paused")
      return
    }
    if (status === "paused") {
      ctx.resume().then(() => startNode(bufferRef.current, offsetRef.current))
      return
    }

    // ── Mobile fix: resume AudioContext synchronously inside the tap handler.
    // This captures the browser's autoplay permission so node.start() works
    // after the async fetch without being blocked.
    ctx.resume()
    setStatus("loading")

    fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "tts-1", input: text, voice: "echo" }),
    })
      .then(r => { if (!r.ok) throw new Error("TTS " + r.status); return r.arrayBuffer() })
      .then(buf => ctx.decodeAudioData(buf))
      .then(decoded => { bufferRef.current = decoded; offsetRef.current = 0; startNode(decoded, 0) })
      .catch(err => { console.error("TTS failed:", err); setStatus("idle") })
  }

  return (
    <button
      onClick={handleClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        background: "var(--color-card)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-full)",
        padding: "9px 16px",
        color: "var(--color-text-secondary)",
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-sm)",
        fontWeight: 600,
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 0.18s ease",
      }}
    >
      {status === "loading"
        ? <SpinnerIcon size={14} />
        : status === "playing"
        ? <PauseIcon />
        : <PlayIcon />}
      {status === "playing" ? "Пауза" : "Слушать"}
    </button>
  )
}

// ─── Step / Verdict Play Button ───────────────────────────────────────────────

function StepPlayButton({ text, activeColor = "var(--color-accent)", inactiveColor = "rgba(94,236,216,0.38)" }) {
  const [status, setStatus] = useState("idle")
  const sourceRef = useRef(null)
  const bufferRef = useRef(null)
  const offsetRef = useRef(0)
  const startRef  = useRef(0)

  useEffect(() => () => {
    sourceRef.current?.cancel()
    try { sourceRef.current?.node.stop() } catch (_) {}
  }, [])

  const startNode = (buffer, offset) => {
    const ctx = getAudioCtx()
    let cancelled = false
    const node = ctx.createBufferSource()
    node.buffer = buffer
    node.connect(ctx.destination)
    node.onended = () => {
      if (!cancelled) { setStatus("idle"); offsetRef.current = 0 }
    }
    sourceRef.current = { node, cancel: () => { cancelled = true } }
    startRef.current = ctx.currentTime
    node.start(0, offset)
    setStatus("playing")
  }

  const handleClick = () => {
    const ctx = getAudioCtx()

    if (status === "playing") {
      const elapsed = ctx.currentTime - startRef.current
      offsetRef.current = Math.min(offsetRef.current + elapsed, bufferRef.current?.duration ?? 0)
      sourceRef.current?.cancel()
      try { sourceRef.current?.node.stop() } catch (_) {}
      setStatus("paused")
      return
    }
    if (status === "paused") {
      ctx.resume().then(() => startNode(bufferRef.current, offsetRef.current))
      return
    }

    ctx.resume() // synchronous gesture capture — same fix as PlayButton
    setStatus("loading")

    fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "tts-1", input: text, voice: "echo" }),
    })
      .then(r => { if (!r.ok) throw new Error("TTS " + r.status); return r.arrayBuffer() })
      .then(buf => ctx.decodeAudioData(buf))
      .then(decoded => { bufferRef.current = decoded; offsetRef.current = 0; startNode(decoded, 0) })
      .catch(err => { console.error("TTS failed:", err); setStatus("idle") })
  }

  return (
    <button onClick={handleClick} style={{
      width: 48, height: 48,
      borderRadius: "var(--radius-full)",
      background: "rgba(94,236,216,0.15)",
      border: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer", flexShrink: 0, padding: 0,
      color: status === "playing" ? activeColor : inactiveColor,
      transition: "color 0.15s ease",
    }}>
      {status === "loading" ? <SpinnerIcon size={16} /> : <SpeakerIcon size={18} />}
    </button>
  )
}

// ─── Step Card ────────────────────────────────────────────────────────────────

function StepCard({ step, index }) {
  const isCorrect = step.is_correct === true
  const isError   = step.is_correct === false

  return (
    <div style={{
      background: isError   ? "var(--color-error-tint)"
                : isCorrect ? "var(--color-accent-tint)"
                :             "var(--color-surface)",
      border: `1px solid ${isError   ? "var(--color-border)"
                         : isCorrect ? "var(--color-border)"
                         :             "var(--color-border)"}`,
      borderRadius: "var(--radius-lg)",
      padding: "14px 16px",
      position: "relative",
      overflow: "hidden",
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
      animation: `fadeUp 0.35s ${0.05 + index * 0.07}s ease both`,
    }}>
      {/* Step number badge */}
      <div style={{
        width: 28, height: 28,
        borderRadius: 9,
        background: isError   ? "rgba(201,123,106,0.15)"
                  : isCorrect ? "rgba(126,200,150,0.15)"
                  :             "var(--color-card)",
        color: isError   ? "var(--color-error)"
             : isCorrect ? "var(--color-accent)"
             :             "var(--color-text-secondary)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-display)",
        fontSize: 13, fontWeight: 700,
        flexShrink: 0,
      }}>
        {step.step_number}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* student_work — strikethrough if incorrect, correction in green */}
        <div style={{
          fontFamily: "var(--font-body)",
          fontStyle: "italic",
          fontSize: "var(--text-md)",
          lineHeight: "var(--leading-tight)",
          marginBottom: step.explanation ? 6 : 0,
        }}>
          <span style={{
            color: isError ? "var(--color-error)" : "var(--color-text-primary)",
            textDecoration: isError ? "line-through" : "none",
            textDecorationColor: "rgba(201,123,106,0.5)",
          }}>
            {step.student_work}
          </span>
          {isError && step.correction && (
            <span style={{ color: "var(--color-accent)", marginLeft: 8 }}>
              {step.correction}
            </span>
          )}
        </div>

        {/* Explanation */}
        {step.explanation && (
          <div style={{
            fontSize: "var(--text-sm)",
            color: "var(--color-text-muted)",
            lineHeight: "var(--leading-normal)",
          }}>
            {step.explanation}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <StepPlayButton text={step.explanation || step.student_work} />
        <div style={{
          fontSize: 13,
          color: isError   ? "var(--color-error)"
               : isCorrect ? "var(--color-accent)"
               :             "var(--color-text-secondary)",
        }}>
          {isCorrect ? "✓" : isError ? "✗" : "—"}
        </div>
      </div>
    </div>
  )
}

// ─── Math Background ─────────────────────────────────────────────────────────

const MATH_CHARS = [
  { char: "∫",  top: "3%",  left: "5%",  size: 64, rot: "-8deg",  dur: "28s", delay: "0s"  },
  { char: "≈",  top: "4%",  left: "62%", size: 36, rot: "7deg",   dur: "26s", delay: "11s" },
  { char: "√",  top: "15%", left: "36%", size: 48, rot: "12deg",  dur: "22s", delay: "3s"  },
  { char: "π",  top: "27%", left: "8%",  size: 36, rot: "-5deg",  dur: "31s", delay: "7s"  },
  { char: "∑",  top: "26%", left: "68%", size: 48, rot: "8deg",   dur: "25s", delay: "2s"  },
  { char: "×",  top: "38%", left: "48%", size: 24, rot: "15deg",  dur: "23s", delay: "8s"  },
  { char: "≠",  top: "40%", left: "16%", size: 24, rot: "-12deg", dur: "34s", delay: "5s"  },
  { char: "∞",  top: "51%", left: "64%", size: 48, rot: "6deg",   dur: "27s", delay: "9s"  },
  { char: "Δ",  top: "57%", left: "30%", size: 36, rot: "-7deg",  dur: "20s", delay: "4s"  },
  { char: "x²", top: "66%", left: "6%",  size: 36, rot: "10deg",  dur: "29s", delay: "1s"  },
  { char: "θ",  top: "67%", left: "70%", size: 48, rot: "-11deg", dur: "30s", delay: "2s"  },
  { char: "±",  top: "79%", left: "42%", size: 24, rot: "-9deg",  dur: "32s", delay: "6s"  },
  { char: "÷",  top: "88%", left: "18%", size: 24, rot: "-13deg", dur: "35s", delay: "3s"  },
]

function MathBackground() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {MATH_CHARS.map((c, i) => (
        <span key={i} style={{
          position: "absolute",
          top: c.top, left: c.left,
          fontSize: c.size,
          lineHeight: 1,
          color: "var(--color-accent)",
          opacity: 0.05,
          userSelect: "none",
          "--char-rot": c.rot,
          animation: `mathFloat ${c.dur} ${c.delay} ease-in-out infinite`,
        }}>
          {c.char}
        </span>
      ))}
    </div>
  )
}

// ─── Camera Screen ────────────────────────────────────────────────────────────

function CameraScreen({ onUpload, history, historyLoading, onSelectSession }) {
  const cameraInputRef  = useRef(null)
  const galleryInputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return
    onUpload(file)
  }, [onUpload])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleChange = (e) => {
    handleFile(e.target.files[0])
    e.target.value = ""
  }

  const brackets = [
    { top: 18, left: 18,  borderWidth: "2px 0 0 2px", borderRadius: "4px 0 0 0" },
    { top: 18, right: 18, borderWidth: "2px 2px 0 0", borderRadius: "0 4px 0 0" },
    { bottom: 18, left: 18,  borderWidth: "0 0 2px 2px", borderRadius: "0 0 0 4px" },
    { bottom: 18, right: 18, borderWidth: "0 2px 2px 0", borderRadius: "0 0 4px 0" },
  ]

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100dvh", background: "var(--color-bg)",
      position: "relative",
      maxWidth: 480, margin: "0 auto",
    }}>
      <MathBackground />
      {/* Header */}
      <header style={{ padding: "20px var(--screen-px) 12px", flexShrink: 0 }}>
        <img
          src={reshaemLogo}
          alt="Решаем"
          style={{ height: 72, width: "auto", display: "block", maxWidth: "100%" }}
        />
      </header>

      {/* Hidden file inputs */}
      <input ref={cameraInputRef}  type="file" accept="image/*" capture="environment"
        onChange={handleChange} style={{ display: "none" }} />
      <input ref={galleryInputRef} type="file" accept="image/*"
        onChange={handleChange} style={{ display: "none" }} />

      <div className="camera-body">
      {/* Viewfinder — pinned, never scrolls away */}
      <div className="camera-vf-wrap">
        <div
          onClick={() => cameraInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            width: "100%",
            minHeight: 270,
            borderRadius: "var(--radius-2xl)",
            background: "#0C0A09",
            position: "relative",
            overflow: "hidden",
            border: dragging
              ? "1.5px solid var(--color-accent)"
              : "1px solid var(--color-border)",
            transition: "border-color 0.18s ease",
            boxShadow: dragging
              ? "0 0 0 1px rgba(94,236,216,0.15), inset 0 0 60px rgba(250,223,127,0.04)"
              : "inset 0 0 60px rgba(121,92,95,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {/* Corner brackets */}
          {brackets.map((s, i) => (
            <div key={i} style={{
              position: "absolute",
              width: 24, height: 24,
              borderColor: "var(--color-accent)",
              borderStyle: "solid",
              opacity: 0.7,
              ...s,
            }} />
          ))}

          {/* Scan line */}
          <div className="viewfinder__scan" />

          {/* Center text */}
          <div style={{ textAlign: "center", position: "relative", zIndex: 1, padding: "0 32px" }}>
            <p style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-base)",
              color: "var(--color-text-muted)",
              margin: "0 0 6px",
              lineHeight: "var(--leading-normal)",
            }}>
              Направь камеру на решение
            </p>
            <p style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-xs)",
              color: "var(--color-text-muted)",
              margin: 0,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}>
              или перетащи файл сюда
            </p>
          </div>

          {/* Gallery icon button — bottom right */}
          <button
            onClick={(e) => { e.stopPropagation(); galleryInputRef.current?.click() }}
            style={{
              position: "absolute", bottom: 14, right: 14,
              width: 40, height: 40,
              borderRadius: "var(--radius-md)",
              background: "rgba(42,35,32,0.82)",
              border: "1px solid var(--color-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
              padding: 0,
              zIndex: 2,
              backdropFilter: "blur(6px)",
              transition: "background 0.18s ease",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(61,53,48,0.9)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(42,35,32,0.82)"}
          >
            <GalleryIcon />
          </button>
        </div>
      </div>{/* /camera-vf-wrap */}

      {/* History — scrollable below viewfinder */}
      <div className="camera-hist-wrap">
        <div style={{ marginTop: 20, paddingBottom: 32 }}>
          <p style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-xs)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-wider)",
            textTransform: "uppercase",
            color: "var(--color-text-muted)",
            margin: "0 0 12px",
          }}>
            История
          </p>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {historyLoading ? (
              <SpinnerIcon size={18} />
            ) : history.length === 0 ? (
              <p style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-sm)",
                color: "var(--color-text-muted)",
                margin: 0,
              }}>
                Пока пусто — загрузи первое решение
              </p>
            ) : (
              history.map(item => (
                <div
                  key={item.id}
                  onClick={() => onSelectSession(item)}
                  style={{
                    flexShrink: 0,
                    width: 60, height: 60,
                    borderRadius: "var(--radius-md)",
                    overflow: "hidden",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                    cursor: "pointer",
                    transition: "border-color 0.18s ease",
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--color-border)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-border)"}
                >
                  <img src={item.image_url} alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>{/* /camera-hist-wrap */}
      </div>{/* /camera-body */}

    </div>
  )
}

// ─── Session Detail Sheet ─────────────────────────────────────────────────────

function SessionSheet({ session, onClose }) {
  const [visible, setVisible] = useState(false)
  const [detail, setDetail]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 16)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from("sessions")
        .select("id, image_url, explanation, topic, is_correct, nudge_question, created_at")
        .eq("id", session.id)
        .single()
      if (data) setDetail(data)
      setLoading(false)
    }
    load()
  }, [session.id])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 350)
  }

  const isCorrect = detail?.is_correct === true
  const isWrong   = detail?.is_correct === false

  return (
    <>
      <div onClick={handleClose} style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 60,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease",
      }} />

      <div style={{
        position: "fixed",
        bottom: 0, left: "50%",
        transform: `translateX(-50%) translateY(${visible ? "0" : "105%"})`,
        width: "100%", maxWidth: 480,
        background: "var(--color-surface)",
        borderRadius: "var(--radius-3xl) var(--radius-3xl) 0 0",
        borderTop: "1px solid var(--color-border)",
        padding: "10px var(--screen-px) 48px",
        zIndex: 61,
        transition: "transform 0.42s cubic-bezier(0.32, 0.72, 0, 1)",
        maxHeight: "85vh",
        overflowY: "auto",
      }}>
        {/* Handle */}
        <div style={{ width: 34, height: 4, background: "rgba(217,178,111,0.2)", borderRadius: 4, margin: "0 auto 20px" }} />

        {/* Close button */}
        <button onClick={handleClose} style={{
          position: "absolute", top: 18, right: 18,
          width: 32, height: 32,
          background: "var(--color-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--color-text-muted)",
          cursor: "pointer", padding: 0,
          transition: "background 0.18s",
        }}>
          <XIcon />
        </button>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
            <DotLoader label="Загружаю..." />
          </div>
        ) : detail ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Thumbnail + topic + verdict */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 4 }}>
              {detail.image_url && (
                <div style={{ width: 52, height: 52, borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--color-border)", flexShrink: 0 }}>
                  <img src={detail.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                {detail.topic && (
                  <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 3 }}>
                    {detail.topic}
                  </div>
                )}
                <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", fontWeight: 700, letterSpacing: "var(--tracking-tight)", color: isCorrect ? "var(--color-accent)" : isWrong ? "var(--color-error)" : "var(--color-text-primary)" }}>
                  {isCorrect ? "Верное решение" : isWrong ? "Найдена ошибка" : "Анализ"}
                </div>
              </div>
            </div>

            {/* Explanation */}
            {detail.explanation ? (
              <div style={{ background: isCorrect ? "var(--color-accent-tint)" : "var(--color-card)", border: `1px solid ${isCorrect ? "var(--color-border)" : "var(--color-border)"}`, borderRadius: "var(--radius-xl)", padding: "var(--space-5)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: isCorrect ? "var(--color-accent)" : isWrong ? "var(--color-error)" : "var(--color-text-secondary)", borderRadius: "3px 0 0 3px", opacity: 0.75 }} />
                <div style={{ paddingLeft: 14 }}>
                  <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: isCorrect ? "var(--color-accent)" : isWrong ? "var(--color-error)" : "var(--color-text-secondary)", marginBottom: 8 }}>
                    {isCorrect ? "✓ Верно" : isWrong ? "✗ Есть ошибка" : "Комментарий"}
                  </div>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-md)", color: "var(--color-text-primary)", margin: 0, lineHeight: "var(--leading-loose)" }}>
                    {detail.explanation}
                  </p>
                </div>
              </div>
            ) : (
              <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)", textAlign: "center", padding: "12px 0", margin: 0 }}>
                Разбор недоступен
              </p>
            )}

            {/* Nudge question */}
            {detail.nudge_question && (
              <div style={{ background: "var(--color-accent-tint)", border: "1px solid rgba(94,236,216,0.18)", borderRadius: "var(--radius-xl)", padding: "var(--space-5)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: "var(--color-accent)", borderRadius: "3px 0 0 3px", opacity: 0.75 }} />
                <div style={{ paddingLeft: 14 }}>
                  <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 8 }}>
                    Подумай
                  </div>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-md)", color: "var(--color-text-primary)", margin: 0, lineHeight: "var(--leading-normal)", fontWeight: 500 }}>
                    {detail.nudge_question}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)", textAlign: "center", padding: "20px 0", margin: 0 }}>
            Не удалось загрузить
          </p>
        )}
      </div>
    </>
  )
}

// ─── Topic Problems ───────────────────────────────────────────────────────────

const TOPIC_PROBLEMS = {
  "Уравнения":        "Решите уравнение: 2x² - 5x + 3 = 0",
  "Алгебра":          "Упростите выражение: (a+b)² - (a-b)²",
  "Геометрия":        "В прямоугольном треугольнике катеты равны 3 и 4. Найдите гипотенузу.",
  "Тригонометрия":    "Решите уравнение: sin(x) = √2/2 на отрезке [0; 2π]",
  "Производная":      "Найдите производную функции: f(x) = x³ - 3x² + 2x",
  "Интеграл":         "Вычислите интеграл: ∫(2x + 1)dx",
  "Вероятность":      "В урне 3 белых и 5 чёрных шаров. Какова вероятность извлечь белый?",
  "Неравенства":      "Решите неравенство: x² - 4x - 5 > 0",
  "Функции":          "Найдите область определения функции: f(x) = √(4 - x²)",
  "Числа":            "Найдите НОД чисел 48 и 36",
  "Статистика":       "Найдите среднее арифметическое: 4, 7, 2, 9, 3",
  "Текстовая задача": "Поезд прошёл 240 км за 3 часа. Найдите его среднюю скорость.",
}

// ─── Practice Sheet ───────────────────────────────────────────────────────────

function PracticeSheet({ topic, onUpload, onClose }) {
  const [visible, setVisible]   = useState(false)
  const [dragging, setDragging] = useState(false)
  const cameraRef  = useRef(null)
  const galleryRef = useRef(null)

  const problem = TOPIC_PROBLEMS[topic] ?? "Реши задачу по этой теме"

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 16)
    return () => clearTimeout(t)
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 350)
  }

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return
    setVisible(false)
    onUpload(file)
  }

  const handleChange = (e) => { handleFile(e.target.files[0]); e.target.value = "" }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const brackets = [
    { top: 14,    left: 14,  borderWidth: "2px 0 0 2px", borderRadius: "4px 0 0 0" },
    { top: 14,    right: 14, borderWidth: "2px 2px 0 0", borderRadius: "0 4px 0 0" },
    { bottom: 14, left: 14,  borderWidth: "0 0 2px 2px", borderRadius: "0 0 0 4px" },
    { bottom: 14, right: 14, borderWidth: "0 2px 2px 0", borderRadius: "0 0 4px 0" },
  ]

  return (
    <>
      <div onClick={handleClose} style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 60,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease",
      }} />

      <div style={{
        position: "fixed",
        bottom: 0, left: "50%",
        transform: `translateX(-50%) translateY(${visible ? "0" : "105%"})`,
        width: "100%", maxWidth: 480,
        background: "var(--color-surface)",
        borderRadius: "var(--radius-3xl) var(--radius-3xl) 0 0",
        borderTop: "1px solid var(--color-border)",
        padding: "10px var(--screen-px) 52px",
        zIndex: 61,
        transition: "transform 0.42s cubic-bezier(0.32, 0.72, 0, 1)",
        overflowY: "auto",
        maxHeight: "90vh",
      }}>
        {/* Handle */}
        <div style={{ width: 34, height: 4, background: "rgba(217,178,111,0.2)", borderRadius: 4, margin: "0 auto 20px" }} />

        {/* Close */}
        <button onClick={handleClose} style={{
          position: "absolute", top: 18, right: 18,
          width: 32, height: 32,
          background: "var(--color-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--color-text-muted)",
          cursor: "pointer", padding: 0,
        }}>
          <XIcon />
        </button>

        {/* Eyebrow */}
        <div style={{
          fontSize: "var(--text-xs)", fontWeight: 700,
          letterSpacing: "0.08em", textTransform: "uppercase",
          color: "var(--color-text-muted)", marginBottom: 8,
        }}>
          {topic} · Похожая задача
        </div>

        {/* Problem text */}
        <p style={{
          fontFamily: "var(--font-body)", fontStyle: "italic",
          fontSize: "var(--text-md)", fontWeight: 500,
          color: "var(--color-text-primary)",
          lineHeight: "var(--leading-normal)",
          margin: "0 0 20px",
        }}>
          {problem}
        </p>

        {/* Hidden inputs */}
        <input ref={cameraRef}  type="file" accept="image/*" capture="environment"
          onChange={handleChange} style={{ display: "none" }} />
        <input ref={galleryRef} type="file" accept="image/*"
          onChange={handleChange} style={{ display: "none" }} />

        {/* Viewfinder */}
        <div
          onClick={() => cameraRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            width: "100%", minHeight: 200,
            borderRadius: "var(--radius-2xl)",
            background: "#0C0A09",
            position: "relative", overflow: "hidden",
            border: dragging ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border)",
            transition: "border-color 0.18s ease",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {brackets.map((s, i) => (
            <div key={i} style={{ position: "absolute", width: 20, height: 20, borderColor: "var(--color-accent)", borderStyle: "solid", opacity: 0.7, ...s }} />
          ))}
          <div className="viewfinder__scan" />
          <div style={{ textAlign: "center", position: "relative", zIndex: 1, padding: "0 24px" }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)", margin: "0 0 4px", lineHeight: "var(--leading-normal)" }}>
              Реши задачу и сфотографируй
            </p>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)", margin: 0, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              или перетащи файл
            </p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); galleryRef.current?.click() }}
            style={{
              position: "absolute", bottom: 12, right: 12,
              width: 36, height: 36,
              borderRadius: "var(--radius-md)",
              background: "rgba(42,35,32,0.82)",
              border: "1px solid var(--color-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--color-text-secondary)", cursor: "pointer", padding: 0, zIndex: 2,
            }}
          >
            <GalleryIcon />
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Analysis Screen ──────────────────────────────────────────────────────────

const POSITIVE_LABELS = ["Ясно", "Гуд", "Принято", "ОК", "Дальше"]
const NEGATIVE_LABELS = ["Не ясно", "Не понятно", "Объясни"]
const pickRandom = arr => arr[Math.floor(Math.random() * arr.length)]

function AnalysisScreen({ state, maxResponse, thumbnail, onReset, onUpload }) {
  const [stepIndex, setStepIndex]       = useState(0)
  const [isRethinking, setIsRethinking] = useState(false)
  const [stepsDone, setStepsDone]       = useState(false)
  const [posLabel, setPosLabel]         = useState(() => pickRandom(POSITIVE_LABELS))
  const [negLabel, setNegLabel]         = useState(() => pickRandom(NEGATIVE_LABELS))
  const [localSteps, setLocalSteps]     = useState([])
  const [showPractice, setShowPractice] = useState(false)

  useEffect(() => {
    if (maxResponse) {
      setStepIndex(0)
      setIsRethinking(false)
      setStepsDone(false)
      setPosLabel(pickRandom(POSITIVE_LABELS))
      setNegLabel(pickRandom(NEGATIVE_LABELS))
      setLocalSteps(maxResponse.steps ?? [])
    }
  }, [maxResponse])

  const handlePositive = () => {
    if (stepIndex < localSteps.length - 1) {
      setStepIndex(i => i + 1)
      setPosLabel(pickRandom(POSITIVE_LABELS))
      setNegLabel(pickRandom(NEGATIVE_LABELS))
    } else {
      setStepsDone(true)
    }
  }

  const handleNegative = async () => {
    setIsRethinking(true)
    try {
      const currentExplanation = localSteps[stepIndex]?.explanation ?? ""
      const { data, error } = await supabase.functions.invoke("explain", {
        body: { rephrase: currentExplanation },
      })
      if (!error && data?.rephrased) {
        setLocalSteps(prev => prev.map((s, i) =>
          i === stepIndex ? { ...s, explanation: data.rephrased } : s
        ))
      }
    } catch (err) {
      console.error("Rephrase error:", err)
    } finally {
      setIsRethinking(false)
    }
  }

  const isLoading = state === "loading" || state === "ocr_done"
  const loadingLabel = state === "loading" ? "Распознаю решение..." : "Макс думает..."
  const isCorrect = maxResponse?.is_correct === true
  const isWrong   = maxResponse?.is_correct === false

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100dvh", background: "var(--color-bg)",
      overflow: "hidden", position: "relative",
      maxWidth: 480, margin: "0 auto",
    }}>
      <MathBackground />
      {/* Header */}
      <header style={{
        padding: "14px var(--screen-px) 14px",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderBottom: "1px solid var(--color-border)",
      }}>
        {/* Back button */}
        <button
          onClick={onReset}
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            width: 36, height: 36,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            flexShrink: 0,
            transition: "background 0.18s",
            padding: 0,
          }}
        >
          <ArrowLeftIcon />
        </button>

        {/* Thumbnail */}
        {thumbnail && (
          <div style={{
            width: 40, height: 40,
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
            border: "1px solid var(--color-border)",
            flexShrink: 0,
          }}>
            <img src={thumbnail} alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}

        {/* Title area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {maxResponse?.topic ? (
            <>
              <div style={{
                fontSize: "var(--text-xs)",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
                marginBottom: 2,
              }}>
                {maxResponse.topic}
              </div>
              <div style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                letterSpacing: "var(--tracking-tight)",
                color: isCorrect ? "var(--color-accent)" : "var(--color-text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {isCorrect ? "Верное решение" : isWrong ? "Найдена ошибка" : "Анализ"}
              </div>
            </>
          ) : (
            <div style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-lg)",
              fontWeight: 700,
              letterSpacing: "var(--tracking-tight)",
              color: "var(--color-text-primary)",
            }}>
              Анализ
            </div>
          )}
        </div>
      </header>

      {/* Scrollable content */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "var(--space-5) var(--screen-px)",
        paddingBottom: 130,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}>
        {/* Loading */}
        {isLoading && (
          <div style={{
            flex: 1, display: "flex",
            alignItems: "center", justifyContent: "center",
            minHeight: 240,
          }}>
            <DotLoader label={loadingLabel} />
          </div>
        )}

        {/* OCR uncertain */}
        {state === "ocr_uncertain" && (
          <div className="stagger-1" style={{
            background: "var(--color-error-tint)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
            padding: "var(--space-5)",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: 0, left: 0, bottom: 0,
              width: 3, background: "var(--color-error)",
              borderRadius: "3px 0 0 3px",
            }} />
            <div style={{ paddingLeft: 12 }}>
              <p style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-base)",
                color: "var(--color-text-primary)",
                margin: "0 0 6px",
                fontWeight: 600,
              }}>
                Не удалось разобрать текст
              </p>
              <p style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-sm)",
                color: "var(--color-text-muted)",
                margin: 0,
                lineHeight: "var(--leading-normal)",
              }}>
                Попробуй переснять: лучше освещение, держи ровно, пиши крупнее.
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {state === "error" && (
          <div className="stagger-1" style={{
            background: "var(--color-error-tint)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
            padding: "var(--space-5)",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: 0, left: 0, bottom: 0,
              width: 3, background: "var(--color-error)",
              borderRadius: "3px 0 0 3px",
            }} />
            <div style={{ paddingLeft: 12 }}>
              <p style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-base)",
                color: "var(--color-text-primary)",
                margin: "0 0 6px",
                fontWeight: 600,
              }}>
                Что-то пошло не так
              </p>
              <p style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-sm)",
                color: "var(--color-text-muted)",
                margin: "0 0 16px",
                lineHeight: "var(--leading-normal)",
              }}>
                Не удалось обработать фото. Проверь интернет и попробуй ещё раз.
              </p>
              <button
                onClick={onReset}
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-full)",
                  padding: "8px 18px",
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  cursor: "pointer",
                }}
              >
                Попробовать снова
              </button>
            </div>
          </div>
        )}

        {/* Done — Макс response */}
        {state === "done" && maxResponse && (
          <>
            {/* Step cards — sequential reveal */}
            {localSteps.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Revealed steps so far */}
                {localSteps.slice(0, stepIndex + 1).map((step, i) => (
                  <StepCard key={step.step_number} step={step} index={i} />
                ))}

                {/* Nudge question — shown during step flow once an error is revealed */}
                {!stepsDone && maxResponse.nudge_question && localSteps.slice(0, stepIndex + 1).some(s => s.is_correct === false) && (
                  <div style={{ background: "var(--color-accent-tint)", border: "1px solid rgba(94,236,216,0.18)", borderRadius: "var(--radius-xl)", padding: "var(--space-5)", position: "relative", overflow: "hidden", animation: "fadeUp 0.3s 0.1s ease both" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: "var(--color-accent)", borderRadius: "3px 0 0 3px", opacity: 0.75 }} />
                    <div style={{ paddingLeft: 14 }}>
                      <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 8 }}>
                        Подумай
                      </div>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-md)", color: "var(--color-text-primary)", margin: 0, lineHeight: "var(--leading-normal)", fontWeight: 500 }}>
                        {maxResponse.nudge_question}
                      </p>
                    </div>
                  </div>
                )}

                {/* Per-step action buttons */}
                {!stepsDone && (
                  isRethinking ? (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 4px",
                      animation: "fadeUp 0.2s ease both",
                    }}>
                      <SpinnerIcon size={16} />
                      <span style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "var(--text-sm)",
                        color: "var(--color-text-muted)",
                      }}>
                        Макс думает как объяснить иначе...
                      </span>
                    </div>
                  ) : (
                    <div style={{
                      display: "flex", gap: 8,
                      animation: "fadeUp 0.25s 0.18s ease both",
                    }}>
                      <button onClick={handleNegative} style={{
                        flex: 1,
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-lg)",
                        padding: "12px var(--space-4)",
                        fontFamily: "var(--font-body)",
                        fontSize: "var(--text-sm)",
                        fontWeight: 600,
                        color: "var(--color-text-secondary)",
                        cursor: "pointer",
                      }}>
                        {negLabel}
                      </button>
                      <button onClick={handlePositive} style={{
                        flex: 1,
                        background: "var(--color-accent)",
                        border: "none",
                        borderRadius: "var(--radius-lg)",
                        padding: "12px var(--space-4)",
                        fontFamily: "var(--font-body)",
                        fontSize: "var(--text-sm)",
                        fontWeight: 700,
                        color: "var(--color-bg)",
                        cursor: "pointer",
                      }}>
                        {posLabel}
                      </button>
                    </div>
                  )
                )}

                {/* Final verdict card */}
                {stepsDone && maxResponse.message && (
                  <>
                    <div style={{
                      background: "var(--color-accent)",
                      borderRadius: "var(--radius-xl)",
                      padding: "var(--space-5)",
                      animation: "fadeUp 0.35s ease both",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <div style={{
                          fontSize: "var(--text-xs)",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--color-bg)",
                          opacity: 0.55,
                        }}>
                          Итог
                        </div>
                        <StepPlayButton
                          text={maxResponse.message}
                          activeColor="rgba(28,23,20,0.9)"
                          inactiveColor="rgba(28,23,20,0.35)"
                        />
                      </div>
                      <p style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "var(--text-md)",
                        color: "var(--color-bg)",
                        margin: 0,
                        lineHeight: "var(--leading-loose)",
                        fontWeight: 500,
                      }}>
                        {maxResponse.message}
                      </p>
                    </div>

                    {/* Score predictor */}
                    <div style={{
                      background: "var(--color-accent-tint)",
                      border: "1px solid rgba(250,223,127,0.2)",
                      borderRadius: "var(--radius-xl)",
                      padding: "var(--space-5)",
                      animation: "fadeUp 0.35s 0.12s ease both",
                      textAlign: "center",
                    }}>
                      <p style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "var(--text-base)",
                        fontWeight: 600,
                        color: isCorrect ? "var(--color-accent)" : "var(--color-accent)",
                        margin: 0,
                        lineHeight: "var(--leading-normal)",
                      }}>
                        {isCorrect
                          ? "Прогноз: +3 балла к твоему результату 🎯"
                          : "Исправь эту ошибку → +5 баллов на экзамене"}
                      </p>
                    </div>

                    {/* Post-verdict actions */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, animation: "fadeUp 0.35s 0.22s ease both" }}>
                      {maxResponse.topic && TOPIC_PROBLEMS[maxResponse.topic] && (
                        <button
                          onClick={() => setShowPractice(true)}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "center",
                            width: "100%",
                            background: "var(--color-accent)",
                            color: "var(--color-bg)",
                            border: "none",
                            borderRadius: "var(--radius-lg)",
                            padding: "15px var(--space-6)",
                            fontFamily: "var(--font-display)",
                            fontSize: 16, fontWeight: 700,
                            letterSpacing: "-0.01em",
                            cursor: "pointer",
                            boxShadow: "0 4px 24px rgba(250,223,127,0.2)",
                          }}
                        >
                          Ещё такие задачи →
                        </button>
                      )}
                      <button
                        onClick={onReset}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: "100%",
                          background: "transparent",
                          color: "var(--color-text-muted)",
                          border: "none",
                          padding: "10px var(--space-4)",
                          fontFamily: "var(--font-body)",
                          fontSize: "var(--text-base)", fontWeight: 600,
                          cursor: "pointer",
                          letterSpacing: "0.02em",
                        }}
                      >
                        На главную
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Fallback when no steps */
              <div className="stagger-1" style={{
                background: isCorrect ? "var(--color-accent-tint)" : "var(--color-surface)",
                border: isCorrect
                  ? "1px solid var(--color-border)"
                  : "1px solid var(--color-border)",
                borderRadius: "var(--radius-xl)",
                padding: "var(--space-5)",
                position: "relative",
                overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", top: 0, left: 0, bottom: 0,
                  width: 3,
                  background: isCorrect ? "var(--color-accent)" : isWrong ? "var(--color-error)" : "var(--color-text-secondary)",
                  borderRadius: "3px 0 0 3px",
                  opacity: isCorrect ? 0.7 : 1,
                }} />
                <div style={{ paddingLeft: 14 }}>
                  <div style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: 700,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    color: isCorrect ? "var(--color-accent)" : isWrong ? "var(--color-error)" : "var(--color-text-secondary)",
                    marginBottom: 10,
                  }}>
                    {isCorrect ? "✓ Верно" : isWrong ? "✗ Есть ошибка" : "Ответ"}
                  </div>
                  <p style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-md)",
                    color: "var(--color-text-primary)",
                    margin: 0,
                    lineHeight: "var(--leading-loose)",
                  }}>
                    {maxResponse.message}
                  </p>
                </div>
              </div>
            )}

          </>
        )}
      </div>

      {showPractice && (
        <PracticeSheet
          topic={maxResponse?.topic ?? ""}
          onUpload={onUpload}
          onClose={() => setShowPractice(false)}
        />
      )}

      {/* Bottom action — only for ocr_uncertain state */}
      {state === "ocr_uncertain" && (
        <div className="stagger-3" style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "12px var(--screen-px) 36px",
          background: "linear-gradient(to top, var(--color-bg) 65%, transparent 100%)",
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}>
          <button
            onClick={onReset}
            style={{
              flex: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--color-surface)",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              padding: "14px var(--space-5)",
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-base)",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.18s ease",
            }}
          >
            На главную
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Onboarding Sheet ────────────────────────────────────────────────────────

const ONBOARDING_STEPS = [
  { n: 1, title: "Пиши",    desc: "Реши задачу на бумаге, как на экзамене" },
  { n: 2, title: "Фоткай",  desc: "Сфотографируй своё решение. Камера распознает формулы." },
  { n: 3, title: "Понимай", desc: "Макс покажет, где ошибка и почему, шаг за шагом" },
]

function OnboardingSheet({ onDismiss }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 16)
    return () => clearTimeout(t)
  }, [])

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(onDismiss, 300)
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={handleDismiss}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 50,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Sheet */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? "0" : "105%"})`,
        width: "100%",
        maxWidth: 480,
        background: "var(--color-surface)",
        borderRadius: "var(--radius-3xl) var(--radius-3xl) 0 0",
        borderTop: "1px solid var(--color-border)",
        padding: "10px var(--screen-px) 44px",
        zIndex: 51,
        transition: "transform 0.3s ease-out",
        overflow: "hidden",
      }}>
        {/* Decorative math symbols — bottom-right corner, behind text */}
        <span style={{ position: "absolute", bottom: -8, right: 6,  fontSize: 64, lineHeight: 1, color: "var(--color-accent)", opacity: 0.06, transform: "rotate(15deg)", pointerEvents: "none", userSelect: "none" }}>∫</span>
        <span style={{ position: "absolute", bottom: 8,  right: 64, fontSize: 48, lineHeight: 1, color: "var(--color-accent)", opacity: 0.06, transform: "rotate(-8deg)", pointerEvents: "none", userSelect: "none" }}>π</span>
        <span style={{ position: "absolute", bottom: 4,  right: 36, fontSize: 56, lineHeight: 1, color: "var(--color-accent)", opacity: 0.06, transform: "rotate(5deg)",  pointerEvents: "none", userSelect: "none" }}>√</span>

        {/* Handwritten equation — top-right corner */}
        <svg
          width="118" height="96"
          viewBox="0 0 118 96"
          style={{ position: "absolute", top: 6, right: 10, opacity: 0.18, pointerEvents: "none", userSelect: "none" }}
          fill="none" stroke="var(--color-accent)" strokeLinecap="round" strokeLinejoin="round"
        >
          {/* x² + 1 */}
          {/* x */}
          <path d="M6 12 L18 28" strokeWidth="2.2"/>
          <path d="M18 12 L6 28" strokeWidth="2.2"/>
          {/* superscript 2 */}
          <path d="M21 8 Q25 4 29 8 Q29 12 21 17 L29 17" strokeWidth="1.6"/>
          {/* + */}
          <path d="M36 18 L44 18" strokeWidth="2.2"/>
          <path d="M40 14 L40 22" strokeWidth="2.2"/>
          {/* 1 */}
          <path d="M51 10 L55 8 L55 28" strokeWidth="2.2"/>

          {/* = */}
          <path d="M4 42 L60 42" strokeWidth="2"/>
          <path d="M4 50 L60 50" strokeWidth="2"/>

          {/* 0 */}
          <path d="M14 62 Q14 58 22 58 Q30 58 30 68 Q30 78 22 78 Q14 78 14 68 Q14 62 14 62" strokeWidth="2.2"/>

          {/* small arrow pointing right, below */}
          <path d="M42 68 L62 68" strokeWidth="1.8"/>
          <path d="M56 63 L62 68 L56 73" strokeWidth="1.8"/>

          {/* x = –1/2 stacked, offset right */}
          {/* x */}
          <path d="M70 58 L80 70" strokeWidth="2"/>
          <path d="M80 58 L70 70" strokeWidth="2"/>
          {/* = */}
          <path d="M84 62 L110 62" strokeWidth="1.8"/>
          {/* – (minus, numerator placeholder) */}
          <path d="M88 55 L100 55" strokeWidth="1.8"/>
          {/* 1 (numerator) */}
          <path d="M103 50 L106 48 L106 58" strokeWidth="1.7"/>
          {/* fraction bar */}
          <path d="M88 66 L110 66" strokeWidth="1.8"/>
          {/* 2 (denominator) */}
          <path d="M93 70 Q97 66 101 70 Q101 74 93 80 L101 80" strokeWidth="1.7"/>
        </svg>

        <div style={{ position: "relative", zIndex: 1 }}>
        {/* Handle */}
        <div style={{
          width: 34, height: 4,
          background: "rgba(217,178,111,0.2)",
          borderRadius: 4,
          margin: "0 auto 24px",
        }} />

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <img
            src={reshaemLogo}
            alt="Решаем"
            style={{ height: 80, width: "auto", display: "block", maxWidth: "100%" }}
          />
        </div>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
          {ONBOARDING_STEPS.map(s => (
            <div key={s.n} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{
                width: 28, height: 28,
                borderRadius: 9,
                background: "var(--color-accent-tint)",
                border: "1px solid rgba(250,223,127,0.2)",
                color: "var(--color-accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-display)",
                fontSize: 13, fontWeight: 700,
                flexShrink: 0,
              }}>
                {s.n}
              </div>
              <div>
                <div style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-base)",
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  marginBottom: 2,
                }}>
                  {s.title}
                </div>
                <div style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-sm)",
                  color: "var(--color-text-muted)",
                  lineHeight: "var(--leading-normal)",
                }}>
                  {s.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleDismiss}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "100%",
            background: "var(--color-accent)",
            color: "var(--color-bg)",
            border: "none",
            borderRadius: "var(--radius-lg)",
            padding: "15px var(--space-6)",
            fontFamily: "var(--font-display)",
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            cursor: "pointer",
            boxShadow: "0 4px 24px rgba(250,223,127,0.2)",
          }}
        >
          Снять первое решение →
        </button>
        </div>
      </div>
    </>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [userId, setUserId] = useState(null)
  const [thumbnail, setThumbnail] = useState(null)
  const [explanationState, setExplanationState] = useState("idle")
  const [ocrLatex, setOcrLatex] = useState(null)
  const [maxResponse, setMaxResponse] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)

  useEffect(() => {
    const isDemo = new URLSearchParams(window.location.search).get("demo") === "true"

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUserId(session.user.id)
        fetchHistory(session.user.id)
        const seen = session.user.user_metadata?.onboarding_seen === true
        if (isDemo || !seen) setTimeout(() => setShowOnboarding(true), 700)
      } else {
        const { data, error } = await supabase.auth.signInAnonymously()
        if (error) {
          console.error("Supabase auth error:", error.message)
          setHistoryLoading(false)
          return
        }
        setUserId(data.user.id)
        fetchHistory(data.user.id)
        const seen = data.user.user_metadata?.onboarding_seen === true
        if (isDemo || !seen) setTimeout(() => setShowOnboarding(true), 700)
      }
    }
    init()
  }, [])

  async function fetchHistory(uid) {
    setHistoryLoading(true)
    const { data, error } = await supabase
      .from("sessions")
      .select("id, image_url, created_at")
      .eq("user_id", uid)
      .not("image_url", "is", null)
      .order("created_at", { ascending: false })
    if (!error && data) setHistory(data)
    setHistoryLoading(false)
  }

  const handleUpload = useCallback(async (file) => {
    const localUrl = URL.createObjectURL(file)
    setThumbnail(localUrl)
    setExplanationState("loading")
    setOcrLatex(null)
    setMaxResponse(null)

    let sessionRow = null

    try {
      const { base64, thumbBase64 } = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = reject
        reader.onload = () => {
          const img = new Image()
          img.onerror = reject
          img.onload = () => {
            // Full resolution for OCR (max 1200px)
            const MAX = 1200
            const scale = img.width > MAX ? MAX / img.width : 1
            const canvas = document.createElement("canvas")
            canvas.width  = Math.round(img.width  * scale)
            canvas.height = Math.round(img.height * scale)
            canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height)
            const base64 = canvas.toDataURL("image/jpeg", 0.92)

            // Small thumbnail for DB storage (max 100px)
            const THUMB = 100
            const ts = img.width > THUMB ? THUMB / img.width : 1
            const tc = document.createElement("canvas")
            tc.width  = Math.round(img.width  * ts)
            tc.height = Math.round(img.height * ts)
            tc.getContext("2d").drawImage(img, 0, 0, tc.width, tc.height)
            const thumbBase64 = tc.toDataURL("image/jpeg", 0.75)

            resolve({ base64, thumbBase64 })
          }
          img.src = reader.result
        }
        reader.readAsDataURL(file)
      })

      if (userId) {
        const { data: row, error } = await supabase
          .from("sessions")
          .insert({ user_id: userId, image_url: thumbBase64 })
          .select("id, image_url, created_at")
          .single()
        if (!error && row) {
          sessionRow = row
          setHistory(prev => [row, ...prev])
        }
      }

      const { data: ocrData, error: ocrError } = await supabase.functions.invoke("ocr", {
        body: { image: base64 },
      })
      if (ocrError) throw ocrError

      const { latex, confidence_flag } = ocrData

      if (sessionRow?.id) {
        await supabase.from("sessions").update({ ocr_result: latex }).eq("id", sessionRow.id)
      }

      setOcrLatex(latex)

      if (confidence_flag === "ocr_uncertain") {
        setExplanationState("ocr_uncertain")
      } else {
        setExplanationState("ocr_done")

        const { data: explainData, error: explainError } = await supabase.functions.invoke("explain", {
          body: { latex },
        })
        if (explainError) throw explainError

        if (sessionRow?.id) {
          await supabase.from("sessions").update({
            explanation: explainData.message,
            topic: explainData.topic,
            is_correct: explainData.is_correct,
            nudge_question: explainData.nudge_question,
          }).eq("id", sessionRow.id)
        }

        setMaxResponse(explainData)
        setExplanationState("done")
      }

    } catch (err) {
      console.error("Upload/OCR error:", err.message)
      if (!sessionRow && userId) {
        setHistory(prev => [{ id: Date.now(), image_url: localUrl, created_at: new Date().toISOString() }, ...prev])
      }
      setExplanationState("error")
    }
  }, [userId])

  const resetSession = useCallback(() => {
    setThumbnail(null)
    setExplanationState("idle")
    setOcrLatex(null)
    setMaxResponse(null)
  }, [])

  const dismissOnboarding = useCallback(async () => {
    setShowOnboarding(false)
    try {
      await supabase.auth.updateUser({ data: { onboarding_seen: true } })
    } catch (err) {
      console.error("Failed to save onboarding state:", err)
    }
  }, [])

  return (
    <>
      {explanationState !== "idle" ? (
        <AnalysisScreen
          state={explanationState}
          maxResponse={maxResponse}
          thumbnail={thumbnail}
          onReset={resetSession}
          onUpload={handleUpload}
        />
      ) : (
        <CameraScreen
          onUpload={handleUpload}
          history={history}
          historyLoading={historyLoading}
          onSelectSession={setSelectedSession}
        />
      )}
      {showOnboarding && <OnboardingSheet onDismiss={dismissOnboarding} />}
      {selectedSession && <SessionSheet session={selectedSession} onClose={() => setSelectedSession(null)} />}
    </>
  )
}
