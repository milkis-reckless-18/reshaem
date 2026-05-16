import { useState, useRef, useCallback, useEffect } from "react"
import { supabase } from "./lib/supabase"

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
    viewBox="0 0 24 24" fill="none" stroke="var(--color-jasmine)" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
)

const SpeakerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
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
            background: "var(--color-jasmine)",
            animation: `dotPulse 1.2s ${i * 0.2}s ease-in-out infinite`,
          }} />
        ))}
      </div>
      {label && (
        <p style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-sm)",
          color: "var(--color-text-dim)",
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
  const audioRef = useRef(null)
  const blobUrlRef = useRef(null)

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  const handleClick = async () => {
    if (status === "playing") {
      audioRef.current?.pause()
      setStatus("paused")
      return
    }
    if (status === "paused") {
      await audioRef.current?.play()
      setStatus("playing")
      return
    }
    setStatus("loading")
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "tts-1", input: text, voice: "echo" }),
      })
      if (!res.ok) throw new Error("TTS error " + res.status)
      const blob = await res.blob()
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => setStatus("idle")
      audio.onpause = () => { if (!audio.ended) setStatus("paused") }
      await audio.play()
      setStatus("playing")
    } catch (err) {
      console.error("TTS failed:", err)
      setStatus("idle")
    }
  }

  return (
    <button
      onClick={handleClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        background: "var(--color-surface-2)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-full)",
        padding: "9px 16px",
        color: "var(--color-fawn)",
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

function StepPlayButton({ text, activeColor = "var(--color-jasmine)", inactiveColor = "rgba(250,223,127,0.38)" }) {
  const [status, setStatus] = useState("idle")
  const audioRef   = useRef(null)
  const blobUrlRef = useRef(null)

  useEffect(() => () => {
    audioRef.current?.pause()
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
  }, [])

  const handleClick = async () => {
    if (status === "playing") { audioRef.current?.pause(); setStatus("paused"); return }
    if (status === "paused")  { await audioRef.current?.play(); setStatus("playing"); return }
    setStatus("loading")
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "tts-1", input: text, voice: "echo" }),
      })
      if (!res.ok) throw new Error("TTS " + res.status)
      const blob = await res.blob()
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => setStatus("idle")
      audio.onpause = () => { if (!audio.ended) setStatus("paused") }
      await audio.play()
      setStatus("playing")
    } catch (err) {
      console.error("TTS failed:", err)
      setStatus("idle")
    }
  }

  return (
    <button onClick={handleClick} style={{
      background: "none", border: "none", padding: 3, cursor: "pointer",
      color: status === "playing" ? activeColor : inactiveColor,
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "color 0.15s ease", flexShrink: 0,
    }}>
      {status === "loading" ? <SpinnerIcon size={13} /> : <SpeakerIcon />}
    </button>
  )
}

// ─── Step Card ────────────────────────────────────────────────────────────────

function StepCard({ step, index }) {
  const isCorrect = step.is_correct === true
  const isError   = step.is_correct === false

  return (
    <div style={{
      background: isError   ? "var(--color-error-bg)"
                : isCorrect ? "var(--color-correct-bg)"
                :             "var(--color-surface)",
      border: `1px solid ${isError   ? "var(--color-error-border)"
                         : isCorrect ? "var(--color-correct-border)"
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
                  :             "var(--color-surface-2)",
        color: isError   ? "var(--color-error)"
             : isCorrect ? "var(--color-correct)"
             :             "var(--color-fawn)",
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
            <span style={{ color: "var(--color-correct)", marginLeft: 8 }}>
              {step.correction}
            </span>
          )}
        </div>

        {/* Explanation */}
        {step.explanation && (
          <div style={{
            fontSize: "var(--text-sm)",
            color: "var(--color-text-dim)",
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
               : isCorrect ? "var(--color-correct)"
               :             "var(--color-fawn)",
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
          color: "var(--color-jasmine)",
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

function CameraScreen({ onUpload, history, historyLoading }) {
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
      overflow: "hidden", position: "relative",
      maxWidth: 480, margin: "0 auto",
    }}>
      <MathBackground />
      {/* Header */}
      <header style={{ padding: "20px var(--screen-px) 12px", flexShrink: 0 }}>
        <h1 style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-2xl)",
          fontWeight: 700,
          letterSpacing: "var(--tracking-tight)",
          color: "var(--color-jasmine)",
          lineHeight: "var(--leading-tight)",
        }}>
          Решаем
        </h1>
        <p style={{
          margin: "4px 0 0",
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-sm)",
          color: "var(--color-sand)",
          letterSpacing: "0.04em",
        }}>
          Пиши. Фоткай. Понимай.
        </p>
      </header>

      {/* Scrollable body */}
      <div style={{
        flex: 1, overflowY: "auto", overflowX: "hidden",
        padding: "4px var(--screen-px) 0",
      }}>
        {/* Hidden file inputs */}
        <input ref={cameraInputRef}  type="file" accept="image/*" capture="environment"
          onChange={handleChange} style={{ display: "none" }} />
        <input ref={galleryInputRef} type="file" accept="image/*"
          onChange={handleChange} style={{ display: "none" }} />

        {/* Viewfinder */}
        <div
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
              ? "1.5px solid var(--color-jasmine)"
              : "1px solid var(--color-border)",
            transition: "border-color 0.18s ease",
            boxShadow: dragging
              ? "0 0 0 1px rgba(250,223,127,0.15), inset 0 0 60px rgba(250,223,127,0.04)"
              : "inset 0 0 60px rgba(121,92,95,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Corner brackets */}
          {brackets.map((s, i) => (
            <div key={i} style={{
              position: "absolute",
              width: 24, height: 24,
              borderColor: "var(--color-jasmine)",
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
              color: "var(--color-text-dim)",
              margin: "0 0 6px",
              lineHeight: "var(--leading-normal)",
            }}>
              Направь камеру на решение
            </p>
            <p style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-xs)",
              color: "var(--color-text-ghost)",
              margin: 0,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}>
              или перетащи файл сюда
            </p>
          </div>
        </div>

        {/* History */}
        <div style={{ marginTop: 28, paddingBottom: 120 }}>
          <p style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-xs)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-wider)",
            textTransform: "uppercase",
            color: "var(--color-text-dim)",
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
                color: "var(--color-text-ghost)",
                margin: 0,
              }}>
                Пока пусто — загрузи первое решение
              </p>
            ) : (
              history.map(item => (
                <div key={item.id} style={{
                  flexShrink: 0,
                  width: 60, height: 60,
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                }}>
                  <img src={item.image_url} alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "12px var(--screen-px) 36px",
        background: "linear-gradient(to top, var(--color-bg) 60%, transparent 100%)",
        display: "flex", gap: 10,
      }}>
        <button
          className="camera-only"
          onClick={() => cameraInputRef.current?.click()}
          style={{
            flex: 1, alignItems: "center", justifyContent: "center",
            background: "transparent",
            color: "var(--color-text-primary)",
            border: "1.5px solid var(--color-border-strong)",
            borderRadius: "var(--radius-lg)",
            padding: "14px var(--space-4)",
            fontFamily: "var(--font-display)",
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            cursor: "pointer",
            transition: "border-color 0.18s ease, background 0.18s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-jasmine)"; e.currentTarget.style.background = "var(--color-jasmine-dim)" }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border-strong)"; e.currentTarget.style.background = "transparent" }}
          onMouseDown={e => { e.currentTarget.style.background = "rgba(250,223,127,0.08)" }}
        >
          Сфотографировать
        </button>
        <button
          onClick={() => galleryInputRef.current?.click()}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent",
            color: "var(--color-text-primary)",
            border: "1.5px solid var(--color-border-strong)",
            borderRadius: "var(--radius-lg)",
            padding: "14px var(--space-4)",
            fontFamily: "var(--font-display)",
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            cursor: "pointer",
            transition: "border-color 0.18s ease, background 0.18s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-jasmine)"; e.currentTarget.style.background = "var(--color-jasmine-dim)" }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border-strong)"; e.currentTarget.style.background = "transparent" }}
          onMouseDown={e => { e.currentTarget.style.background = "rgba(250,223,127,0.08)" }}
        >
          Выбрать из галереи
        </button>
      </div>
    </div>
  )
}

// ─── Analysis Screen ──────────────────────────────────────────────────────────

const POSITIVE_LABELS = ["Ясно", "Гуд", "Принято", "ОК", "Дальше"]
const NEGATIVE_LABELS = ["Не ясно", "Не понятно", "Объясни"]
const pickRandom = arr => arr[Math.floor(Math.random() * arr.length)]

function AnalysisScreen({ state, maxResponse, thumbnail, onReset }) {
  const [stepIndex, setStepIndex]       = useState(0)
  const [isRethinking, setIsRethinking] = useState(false)
  const [stepsDone, setStepsDone]       = useState(false)
  const [posLabel, setPosLabel]         = useState(() => pickRandom(POSITIVE_LABELS))
  const [negLabel, setNegLabel]         = useState(() => pickRandom(NEGATIVE_LABELS))
  const [localSteps, setLocalSteps]     = useState([])

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
        borderBottom: "1px solid var(--color-border-subtle)",
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
                color: "var(--color-rose-light)",
                marginBottom: 2,
              }}>
                {maxResponse.topic}
              </div>
              <div style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                letterSpacing: "var(--tracking-tight)",
                color: isCorrect ? "var(--color-correct)" : "var(--color-text-primary)",
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
            background: "var(--color-error-bg)",
            border: "1px solid var(--color-error-border)",
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
                color: "var(--color-text-dim)",
                margin: 0,
                lineHeight: "var(--leading-normal)",
              }}>
                Попробуй переснять: лучше освещение, держи ровно, пиши крупнее.
              </p>
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
                        color: "var(--color-text-dim)",
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
                        background: "var(--color-jasmine)",
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
                      background: "var(--color-jasmine)",
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
                      background: "var(--color-jasmine-dim)",
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
                        color: isCorrect ? "var(--color-correct)" : "var(--color-jasmine)",
                        margin: 0,
                        lineHeight: "var(--leading-normal)",
                      }}>
                        {isCorrect
                          ? "Прогноз: +3 балла к твоему результату 🎯"
                          : "Исправь эту ошибку → +5 баллов на экзамене"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Fallback when no steps */
              <div className="stagger-1" style={{
                background: isCorrect ? "var(--color-correct-bg)" : "var(--color-surface)",
                border: isCorrect
                  ? "1px solid var(--color-correct-border)"
                  : "1px solid var(--color-border)",
                borderRadius: "var(--radius-xl)",
                padding: "var(--space-5)",
                position: "relative",
                overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", top: 0, left: 0, bottom: 0,
                  width: 3,
                  background: isCorrect ? "var(--color-correct)" : isWrong ? "var(--color-error)" : "var(--color-fawn)",
                  borderRadius: "3px 0 0 3px",
                  opacity: isCorrect ? 0.7 : 1,
                }} />
                <div style={{ paddingLeft: 14 }}>
                  <div style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: 700,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    color: isCorrect ? "var(--color-correct)" : isWrong ? "var(--color-error)" : "var(--color-fawn)",
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

            {/* Nudge question card — show after all steps or when no steps */}
            {(stepsDone || !localSteps.length) && maxResponse.nudge_question && (
              <div className="stagger-2" style={{
                background: "var(--color-jasmine-dim)",
                border: "1px solid rgba(250,223,127,0.18)",
                borderRadius: "var(--radius-xl)",
                padding: "var(--space-5)",
                position: "relative",
                overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", top: 0, left: 0, bottom: 0,
                  width: 3, background: "var(--color-jasmine)",
                  borderRadius: "3px 0 0 3px", opacity: 0.75,
                }} />
                <div style={{ paddingLeft: 14 }}>
                  <div style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--color-sand)",
                    marginBottom: 10,
                  }}>
                    Подумай
                  </div>
                  <p style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-md)",
                    color: "var(--color-vanilla)",
                    margin: 0,
                    lineHeight: "var(--leading-normal)",
                    fontWeight: 500,
                  }}>
                    {maxResponse.nudge_question}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom action */}
      {(state === "done" || state === "ocr_uncertain") && (
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
              color: "var(--color-fawn)",
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
            Новое решение
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
        <span style={{ position: "absolute", bottom: -8, right: 6,  fontSize: 64, lineHeight: 1, color: "var(--color-jasmine)", opacity: 0.06, transform: "rotate(15deg)", pointerEvents: "none", userSelect: "none" }}>∫</span>
        <span style={{ position: "absolute", bottom: 8,  right: 64, fontSize: 48, lineHeight: 1, color: "var(--color-jasmine)", opacity: 0.06, transform: "rotate(-8deg)", pointerEvents: "none", userSelect: "none" }}>π</span>
        <span style={{ position: "absolute", bottom: 4,  right: 36, fontSize: 56, lineHeight: 1, color: "var(--color-jasmine)", opacity: 0.06, transform: "rotate(5deg)",  pointerEvents: "none", userSelect: "none" }}>√</span>

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
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-2xl)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-tight)",
            color: "var(--color-text-primary)",
            lineHeight: "var(--leading-tight)",
          }}>
            Решаем
          </div>
          <div style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-base)",
            fontWeight: 500,
            color: "var(--color-jasmine)",
            marginTop: 4,
          }}>
            Пиши. Фоткай. Понимай.
          </div>
          <div style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-base)",
            color: "var(--color-text-dim)",
            marginTop: 8,
            lineHeight: "var(--leading-normal)",
          }}>
            Ошибка? Хорошо. Разберёмся вместе.
          </div>
        </div>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
          {ONBOARDING_STEPS.map(s => (
            <div key={s.n} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{
                width: 28, height: 28,
                borderRadius: 9,
                background: "var(--color-jasmine-dim)",
                border: "1px solid rgba(250,223,127,0.2)",
                color: "var(--color-jasmine)",
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
                  color: "var(--color-text-dim)",
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
            background: "var(--color-jasmine)",
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
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      if (userId) {
        const { data: row, error } = await supabase
          .from("sessions")
          .insert({ user_id: userId, image_url: base64 })
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
      setExplanationState("idle")
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
        />
      ) : (
        <CameraScreen
          onUpload={handleUpload}
          history={history}
          historyLoading={historyLoading}
        />
      )}
      {showOnboarding && <OnboardingSheet onDismiss={dismissOnboarding} />}
    </>
  )
}
