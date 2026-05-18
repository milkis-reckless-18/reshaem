# DESIGN SYSTEM — РЕШАЕМ
## Документ для Claude Code
### Версия 2.0 | Май 2026

---

## 0. КОНТЕКСТ И ПРИНЦИПЫ

**Продукт:** AI-репетитор по математике для подготовки к ЕГЭ. Ученик фотографирует своё решение, получает разбор ошибок и тренировку слабых мест.

**Аудитория:** 14–17 лет (основной пользователь) + родители (плательщик).

**Платформа:** Web app (mobile-first) + Telegram mini-app.

**Дизайн-направление:** «Midnight Lab» — тёмная база с электрическим акцентом. Умный, острый, современный. Не Duolingo, не Khan Academy. Ближе к Raycast + Linear, но с теплом рукописной математики.

**Три принципа:**
1. **Точность важнее красоты** — каждый элемент несёт информацию
2. **Контраст как инструмент** — cyan mint на тёмном фоне = фокус и энергия
3. **Прогресс как факт** — числа крупно, динамика видна без усилий

---

## 1. ЦВЕТОВЫЕ ТОКЕНЫ

```css
:root {
  /* === ФОНЫ === */
  --color-bg:           #0D0F1C;   /* основной фон */
  --color-surface:      #1A1D2E;   /* карточки, панели */
  --color-surface-2:    #2E3150;   /* вложенные элементы, hover */
  --color-surface-3:    #3E4170;   /* активные состояния */

  /* === ОСНОВНОЙ АКЦЕНТ — CYAN MINT (верно, прогресс, CTA) === */
  --color-accent:       #5EECD8;
  --color-accent-tint:  #1A3A36;
  --color-accent-dim:   rgba(94, 236, 216, 0.12);

  /* === ОШИБКА — CORAL ROSE === */
  --color-error:        #FF6B6B;
  --color-error-tint:   #2A1A1A;
  --color-error-bg:     rgba(255, 107, 107, 0.10);
  --color-error-border: rgba(255, 107, 107, 0.25);

  /* === ВЕРНО === */
  --color-correct:        #5EECD8;
  --color-correct-bg:     rgba(94, 236, 216, 0.10);
  --color-correct-border: rgba(94, 236, 216, 0.22);

  /* === ПРЕДУПРЕЖДЕНИЕ === */
  --color-warning:      #F5B942;
  --color-warning-bg:   rgba(245, 185, 66, 0.10);

  /* === ТЕКСТ === */
  --color-text-primary:   #F0EEE6;
  --color-text-secondary: rgba(240, 238, 230, 0.6);
  --color-text-dim:       rgba(240, 238, 230, 0.4);
  --color-text-ghost:     rgba(240, 238, 230, 0.2);

  /* === ГРАНИЦЫ === */
  --color-border:         rgba(94, 236, 216, 0.12);
  --color-border-strong:  rgba(94, 236, 216, 0.25);
  --color-border-subtle:  rgba(94, 236, 216, 0.06);
}
```

### Правила применения цвета

| Ситуация | Цвет |
|---|---|
| Основная кнопка / CTA | `--color-accent` (текст `--color-bg`) |
| Верное решение / успех | `--color-correct` |
| Ошибка / неверно | `--color-error` |
| Слабое место (топик) | `--color-error` полоса сверху карточки |
| Сильное место (топик) | `--color-correct` полоса сверху карточки |
| Прогноз / прогресс | `--color-accent` |
| Цель / целевой балл | `--color-accent` |
| Метки, eyebrow-текст | `--color-text-secondary` или `--color-text-dim` |
| Предупреждение | `--color-warning` |

---

## 2. ТИПОГРАФИКА

```css
/* Подключение */
@import url('https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;500;600;700&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap');

:root {
  /* === СЕМЕЙСТВА === */
  --font-display: 'Clash Display', sans-serif;   /* заголовки, числа, CTA */
  --font-body:    'Instrument Sans', sans-serif; /* весь остальной текст */

  /* === РАЗМЕРЫ === */
  --text-xs:   10px;  /* метки, eyebrow, uppercase */
  --text-sm:   12px;  /* вспомогательный текст */
  --text-base: 14px;  /* основной текст */
  --text-md:   15px;  /* чуть крупнее base */
  --text-lg:   17px;  /* подзаголовки */
  --text-xl:   20px;  /* заголовки секций */
  --text-2xl:  24px;  /* заголовки экранов */
  --text-3xl:  32px;  /* большие числа (баллы) */
  --text-4xl:  44px;  /* hero-числа */

  /* === МЕЖБУКВЕННЫЙ === */
  --tracking-tight:  -0.025em;
  --tracking-normal:  0;
  --tracking-wide:    0.06em;
  --tracking-wider:   0.1em;  /* uppercase метки */

  /* === ВЫСОТА СТРОКИ === */
  --leading-tight:  1.15;
  --leading-normal: 1.5;
  --leading-loose:  1.65;
}
```

### Правила типографики

```css
/* Display — заголовки, числа, кнопки */
.t-display-lg {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 700;
  letter-spacing: var(--tracking-tight);
  line-height: var(--leading-tight);
  color: var(--color-text-primary);
}

.t-display-md {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  letter-spacing: var(--tracking-tight);
  color: var(--color-text-primary);
}

.t-display-sm {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--color-text-primary);
}

/* Числа (баллы, счётчики) */
.t-score {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  font-weight: 700;
  letter-spacing: var(--tracking-tight);
  color: var(--color-accent);
  line-height: 1;
}

/* Body */
.t-body {
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  color: var(--color-text-secondary);
}

/* Формулы (курсив) */
.t-formula {
  font-family: var(--font-body);
  font-style: italic;
  font-size: var(--text-md);
  color: var(--color-text-primary);
  line-height: var(--leading-normal);
}

/* Метки uppercase */
.t-label {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--color-text-dim);
}

/* Кнопки */
.t-btn {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  letter-spacing: -0.01em;
}
```

---

## 3. SPACING & РАДИУСЫ

```css
:root {
  /* === SPACING === */
  --space-1:   4px;
  --space-2:   8px;
  --space-3:   12px;
  --space-4:   16px;
  --space-5:   20px;
  --space-6:   24px;
  --space-8:   32px;
  --space-10:  40px;

  /* Внутренние отступы экрана */
  --screen-px: 18px;   /* горизонтальные поля всего контента */

  /* === РАДИУСЫ === */
  --radius-sm:   8px;   /* теги, чипы */
  --radius-md:   12px;  /* маленькие карточки, кнопки иконок */
  --radius-lg:   16px;  /* кнопки, карточки шагов */
  --radius-xl:   20px;  /* большие карточки */
  --radius-2xl:  24px;  /* панели, вьюфайндер */
  --radius-3xl:  30px;  /* slide-up панель */
  --radius-full: 9999px; /* пилюли, бейджи */
}
```

---

## 4. КОМПОНЕНТЫ

### 4.1 Кнопки

```css
/* PRIMARY — основное действие */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  background: var(--color-accent);
  color: var(--color-bg);
  border: none;
  border-radius: var(--radius-lg);
  padding: 14px var(--space-6);
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  box-shadow: 0 4px 24px rgba(94, 236, 216, 0.2);
  width: 100%; /* full-width по умолчанию на mobile */
}
.btn-primary:hover  { transform: translateY(-1px); box-shadow: 0 8px 32px rgba(94, 236, 216, 0.3); }
.btn-primary:active { transform: translateY(1px); box-shadow: none; }
.btn-primary:disabled { opacity: 0.4; pointer-events: none; }

/* SECONDARY */
.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  background: var(--color-surface);
  color: var(--color-accent);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 14px var(--space-5);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s ease;
  white-space: nowrap;
}
.btn-secondary:hover  { background: var(--color-surface-2); }
.btn-secondary:active { background: var(--color-surface-3); }

/* GHOST */
.btn-ghost {
  background: transparent;
  color: var(--color-text-dim);
  border: none;
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 0.02em;
  transition: color 0.2s;
}
.btn-ghost:hover { color: var(--color-text-primary); }
```

---

### 4.2 Карточки

```css
/* BASE CARD */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-4) var(--space-5);
  position: relative;
  overflow: hidden;
}

/* Цветная полоса слева (статус) */
.card--error   { border-color: var(--color-error-border);   background: var(--color-error-bg); }
.card--correct { border-color: var(--color-correct-border); }
.card--highlight { border-color: rgba(94, 236, 216, 0.22); }

.card--error::before,
.card--correct::before,
.card--highlight::before {
  content: '';
  position: absolute;
  top: 0; bottom: 0; left: 0;
  width: 3px;
  border-radius: 3px 0 0 3px;
}
.card--error::before     { background: var(--color-error); }
.card--correct::before   { background: var(--color-correct); opacity: 0.7; }
.card--highlight::before { background: var(--color-accent); opacity: 0.8; }

/* Полоса сверху (для topic pills) */
.card--weak-top::after   { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--color-error); border-radius: var(--radius-xl) var(--radius-xl) 0 0; }
.card--strong-top::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--color-correct); opacity: 0.7; border-radius: var(--radius-xl) var(--radius-xl) 0 0; }
```

---

### 4.3 Score Ring (кольцо прогресса)

```jsx
// ScoreRing.jsx
// props: value (0-100), goal (0-100), size (default 56)
export function ScoreRing({ value, goal = 100, size = 56 }) {
  const r = (size / 2) - 4;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / goal) * circumference;

  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
           style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke="var(--color-surface-2)" strokeWidth="3.5"
        />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            filter: 'drop-shadow(0 0 5px rgba(94,236,216,0.35))',
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)'
          }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)',
        fontSize: size * 0.27,
        fontWeight: 700,
        color: 'var(--color-accent)'
      }}>
        {value}
      </div>
    </div>
  );
}
```

---

### 4.4 Topic Pill

```jsx
// TopicPill.jsx
// status: 'weak' | 'strong' | 'neutral'
export function TopicPill({ name, stat, statType = 'neutral', status = 'neutral', onClick }) {
  const statColor = {
    error:   'var(--color-error)',
    correct: 'var(--color-correct)',
    neutral: 'var(--color-accent)',
  }[statType];

  return (
    <div
      onClick={onClick}
      className={`card card--${status === 'weak' ? 'weak-top' : status === 'strong' ? 'strong-top' : ''}`}
      style={{
        minWidth: 96,
        padding: '10px 14px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>
        {name}
      </span>
      <span style={{ fontSize: 11, color: statColor, fontWeight: 600 }}>
        {stat}
      </span>
    </div>
  );
}
```

---

### 4.5 Step Card (разбор шага)

```jsx
// StepCard.jsx
// status: 'correct' | 'error' | 'neutral'
export function StepCard({ stepNumber, equation, comment, status = 'neutral' }) {
  const statusIcon = { correct: '✓', error: '✗', neutral: '—' }[status];
  const markerColors = {
    correct: { bg: 'var(--color-correct-bg)', color: 'var(--color-correct)' },
    error:   { bg: 'var(--color-error-bg)',   color: 'var(--color-error)' },
    neutral: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
  }[status];

  return (
    <div
      className={`card card--${status}`}
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        opacity: status === 'neutral' ? 0.6 : 1,
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
        cursor: 'pointer',
      }}
    >
      <div style={{
        width: 28, height: 28,
        borderRadius: 9,
        background: markerColors.bg,
        color: markerColors.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)',
        fontSize: 13, fontWeight: 700,
        flexShrink: 0,
      }}>
        {stepNumber}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontStyle: 'italic',
          fontSize: 15,
          color: 'var(--color-text-primary)',
          marginBottom: 5,
          lineHeight: 1.3,
        }}>
          {equation}
        </div>
        <div style={{
          fontSize: 12,
          color: 'var(--color-text-dim)',
          lineHeight: 1.5,
        }}>
          {comment}
        </div>
      </div>

      <div style={{ fontSize: 16, flexShrink: 0, marginTop: 2, color: markerColors.color }}>
        {statusIcon}
      </div>
    </div>
  );
}
```

---

### 4.6 Slide-Up Panel (Bottom Sheet)

```jsx
// BottomSheet.jsx
export function BottomSheet({ isOpen, onClose, children, title, subtitle }) {
  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 50,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-3xl) var(--radius-3xl) 0 0',
        borderTop: '1px solid var(--color-border)',
        padding: '10px 24px 44px',
        zIndex: 51,
        transform: isOpen ? 'translateY(0)' : 'translateY(105%)',
        transition: 'transform 0.42s cubic-bezier(0.32, 0.72, 0, 1)',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {/* Handle */}
        <div style={{
          width: 34, height: 4,
          background: 'rgba(94,236,216,0.2)',
          borderRadius: 4,
          margin: '0 auto 22px',
        }} />

        {/* Skip */}
        <button
          onClick={onClose}
          className="btn-ghost"
          style={{ position: 'absolute', top: 22, right: 24 }}
        >
          Пропустить →
        </button>

        {title && (
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-2xl)',
            fontWeight: 700,
            letterSpacing: 'var(--tracking-tight)',
            color: 'var(--color-text-primary)',
            lineHeight: 'var(--leading-tight)',
            marginBottom: 6,
          }}>
            {title}
          </div>
        )}

        {subtitle && (
          <div style={{
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-dim)',
            lineHeight: 'var(--leading-normal)',
            marginBottom: 24,
          }}>
            {subtitle}
          </div>
        )}

        {children}
      </div>
    </>
  );
}
```

---

### 4.7 Viewfinder (камера)

```css
.viewfinder {
  width: 100%;
  height: 296px;
  border-radius: var(--radius-2xl);
  background: #080A14;
  position: relative;
  overflow: hidden;
  border: 1px solid var(--color-border);
  cursor: pointer;
}

/* Угловые скобки */
.viewfinder__bracket {
  position: absolute;
  width: 24px; height: 24px;
  border-color: var(--color-accent);
  border-style: solid;
  opacity: 0.75;
}
.viewfinder__bracket--tl { top: 18px; left: 18px;   border-width: 2px 0 0 2px; border-radius: 4px 0 0 0; }
.viewfinder__bracket--tr { top: 18px; right: 18px;  border-width: 2px 2px 0 0; border-radius: 0 4px 0 0; }
.viewfinder__bracket--bl { bottom: 18px; left: 18px;  border-width: 0 0 2px 2px; border-radius: 0 0 0 4px; }
.viewfinder__bracket--br { bottom: 18px; right: 18px; border-width: 0 2px 2px 0; border-radius: 0 0 4px 0; }

/* Скан-линия */
.viewfinder__scan {
  position: absolute; left: 0; right: 0;
  height: 1.5px;
  background: linear-gradient(90deg, transparent 5%, var(--color-accent) 40%, var(--color-accent) 60%, transparent 95%);
  animation: scanLine 3.5s ease-in-out infinite;
  box-shadow: 0 0 14px rgba(94,236,216,0.5);
}
@keyframes scanLine {
  0%   { top: 15%; opacity: 0; }
  8%   { opacity: 0.7; }
  92%  { opacity: 0.7; }
  100% { top: 85%; opacity: 0; }
}

/* Градиент снизу для CTA */
.viewfinder__cta-area {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  padding: 14px 18px 18px;
  background: linear-gradient(to top, rgba(13,15,28,0.96) 0%, transparent 100%);
  display: flex;
  gap: 10px;
}
```

---

### 4.8 Bottom Navigation

```jsx
// BottomNav.jsx
const NAV_ITEMS = [
  { icon: '📷', label: 'Решение', key: 'solve' },
  { icon: '🎯', label: 'Тренировка', key: 'drill' },
  { icon: '🎙️', label: 'Бадди', key: 'buddy' },
  { icon: '📊', label: 'Прогресс', key: 'progress' },
];

export function BottomNav({ active, onChange }) {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      height: 78,
      background: 'var(--color-surface)',
      borderTop: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      padding: '0 8px 14px',
      zIndex: 40,
    }}>
      {NAV_ITEMS.map(item => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 3,
            padding: '8px 14px',
            background: 'none', border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            transition: 'background 0.18s',
          }}
        >
          <span style={{ fontSize: 19, opacity: active === item.key ? 1 : 0.35 }}>
            {item.icon}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600,
            letterSpacing: '0.03em',
            color: active === item.key ? 'var(--color-accent)' : 'var(--color-text-dim)',
          }}>
            {item.label}
          </span>
        </button>
      ))}
    </nav>
  );
}
```

---

## 5. АНИМАЦИИ

```css
/* === БАЗОВЫЕ === */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}

/* Stagger для списков */
.stagger-1 { animation: fadeUp 0.35s 0.05s ease both; }
.stagger-2 { animation: fadeUp 0.35s 0.10s ease both; }
.stagger-3 { animation: fadeUp 0.35s 0.16s ease both; }
.stagger-4 { animation: fadeUp 0.35s 0.22s ease both; }
.stagger-5 { animation: fadeUp 0.35s 0.28s ease both; }

/* Пульс (ошибка, внимание) */
@keyframes pulse {
  0%,100% { transform: scale(1); }
  50%     { transform: scale(1.04); }
}

/* Flame (streak) */
@keyframes flicker {
  0%,100% { transform: scale(1) rotate(-3deg); }
  50%     { transform: scale(1.12) rotate(2deg); }
}

/* Dot pulse (загрузка) */
@keyframes dotPulse {
  0%,100% { transform: scale(1); opacity: 1; }
  50%     { transform: scale(1.4); opacity: 0.7; }
}

/* Spin (спиннер) */
@keyframes spin { to { transform: rotate(360deg); } }
```

### Правила анимаций

| Контекст | Анимация | Длительность |
|---|---|---|
| Появление экрана | `fadeUp` stagger | 0.35s, delay +0.05s каждый |
| Slide-up панель | `translateY` | 0.42s cubic-bezier(0.32,0.72,0,1) |
| Overlay | `opacity` | 0.3s ease |
| Hover кнопок | `translateY(-1px)` + shadow | 0.18s ease |
| Active кнопок | `translateY(1px)` | 0.1s ease |
| Score ring | `stroke-dashoffset` | 1.2s cubic-bezier(0.4,0,0.2,1) |
| Переходы между экранами | `fadeUp` | 0.3s ease |

---

## 6. ТЕКСТУРЫ И ФОНЫ

```css
/* Grain overlay — добавлять на body::before */
.grain-overlay {
  position: fixed; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 9999;
  opacity: 0.5;
}

/* Фон камеры */
.camera-ambient {
  background:
    radial-gradient(ellipse at 25% 35%, rgba(94,236,216,0.06) 0%, transparent 55%),
    radial-gradient(ellipse at 75% 65%, rgba(94,236,216,0.04) 0%, transparent 50%),
    #0D0F1C;
}

/* Линованный фон (как тетрадь) */
.notebook-lines {
  background-image: repeating-linear-gradient(
    to bottom,
    transparent,
    transparent 30px,
    rgba(94,236,216,0.03) 30px,
    rgba(94,236,216,0.03) 31px
  );
}

/* Градиент для bottom action area */
.bottom-fade {
  background: linear-gradient(to top, var(--color-bg) 60%, transparent 100%);
}
```

---

## 7. LAYOUT — МОБИЛЬНЫЙ ЭКРАН

```css
/* Базовая структура каждого экрана */
.screen {
  display: flex;
  flex-direction: column;
  height: 100dvh;         /* dynamic viewport height */
  background: var(--color-bg);
  overflow: hidden;
  position: relative;
}

.screen__header {
  flex-shrink: 0;
  padding: 14px var(--screen-px) 10px;
}

.screen__content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  padding: 0 var(--screen-px);
  padding-bottom: 100px;  /* место для bottom nav + action */
}
.screen__content::-webkit-scrollbar { display: none; }

.screen__bottom-action {
  position: fixed;
  bottom: 78px;           /* над bottom nav */
  left: 0; right: 0;
  padding: 12px var(--screen-px) 12px;
  background: linear-gradient(to top, var(--color-bg) 70%, transparent 100%);
}

/* Если bottom action прямо над nav */
.screen__bottom-action--over-nav {
  bottom: 0;
  padding-bottom: 28px;
}
```

---

## 8. СЕМАНТИЧЕСКИЕ ПАТТЕРНЫ

### Статус ошибки в тексте

```jsx
// Зачёркнутое неверное → правильное рядом
<span>
  D = <span style={{ color: 'var(--color-error)', textDecoration: 'line-through', textDecorationColor: 'rgba(255,107,107,0.5)' }}>
    25 − 24 = 2
  </span>
  <span style={{ color: 'var(--color-correct)', marginLeft: 6 }}>= 1</span>
</span>
```

### Eyebrow + заголовок

```jsx
<div>
  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-error)', marginBottom: 6 }}>
    Найдена ошибка · Шаг 2
  </div>
  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, letterSpacing: 'var(--tracking-tight)' }}>
    Неверный дискриминант
  </div>
</div>
```

### Три числа (stat row)

```jsx
// Используется в "Эта ошибка частая"
<div style={{ display: 'flex', gap: 8 }}>
  {[
    { val: '3',     color: 'var(--color-error)',   label: 'ошибки\nс D' },
    { val: '−6',    color: 'var(--color-warning)',  label: 'баллов\nпотеряно' },
    { val: '78→84', color: 'var(--color-correct)',  label: 'если\nисправить' },
  ].map(({ val, color, label }) => (
    <div key={val} style={{ flex: 1, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', padding: '10px 12px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
      <div style={{ fontSize: 10, color: 'var(--color-text-dim)', marginTop: 3, whiteSpace: 'pre-line' }}>{label}</div>
    </div>
  ))}
</div>
```

---

## 9. ПРАВИЛА ДЛЯ CLAUDE CODE

При генерации компонентов **всегда**:

1. **Использовать CSS-переменные** из раздела 1 — никаких хардкодных цветов.
2. **Шрифты только через переменные** `var(--font-display)` / `var(--font-body)`.
3. **Отступы через переменные** `var(--screen-px)`, `var(--space-N)`.
4. **Анимации из раздела 5** — не изобретать новые без причины.
5. **Мобильный layout** через структуру из раздела 7.
6. **Семантические цвета** — error/correct/warning только из токенов раздела 1.
7. **Grain overlay** на каждом корневом экране через `body::before`.
8. **Никаких белых/светлых фонов** — все поверхности тёмные.
9. **Border-radius** строго из переменных.
10. **Кнопки** — primary (accent/cyan), secondary (surface + accent border), ghost (transparent).

### Запрещено

- `background: white` / `background: #fff`
- `font-family: Inter` / `Roboto` / системные шрифты
- `color: #333` / хардкодные серые
- Янтарные / тёплые жёлтые акценты (`#FADF7F`, `#D9B26F` и подобные) — это старая палитра
- `border-radius: 5px` (слишком мало для этого стиля)
- Тени без cyan-tint: `box-shadow: 0 4px 8px rgba(0,0,0,0.2)` — вместо них `rgba(94,236,216,0.2)` для accent-элементов

---

## 10. ПРИМЕР ПРОМПТА ДЛЯ CLAUDE CODE

```
Используй дизайн-систему из design-system.md.

Создай экран [название].

Данные:
- [перечисли props/данные]

Логика:
- [опиши поведение]

Требования:
- Mobile-first, ширина 390px
- Все цвета через CSS-переменные из design-system.md
- Шрифты: Clash Display (заголовки), Instrument Sans (текст)
- Анимации появления: fadeUp stagger
- Grain overlay на фоне
- Bottom nav с активным пунктом [название]
```

---

*Design System v2.0 — Foundation Lab / Решаем*
*Палитра: Midnight #0D0F1C + Cyan Mint #5EECD8 + Coral Rose #FF6B6B*
*Обновлять при добавлении новых компонентов*
