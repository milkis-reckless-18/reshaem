# Решаем — Claude Code Context
*Последнее обновление: 17 мая 2026*

## Что это
Веб-приложение на русском языке для подготовки к ЕГЭ по математике.
Ученик фотографирует своё рукописное решение → получает пошаговый разбор от AI-наставника Макса → отслеживает прогресс.
Слоган: "Пиши. Фоткай. Понимай."
Дополнительная строка: "Ошибка? Хорошо. Разберёмся вместе."

## Ключевая продуктовая идея
Физико-цифровой цикл: ученик пишет от руки → фотографирует решение → получает голосовой разбор.
Макс НИКОГДА не даёт готовый ответ — только один наводящий вопрос, который ведёт ученика к пониманию.
Отличие от Photomath: мы не решаем за ученика.

## Стек (зафиксирован, не менять без согласования)
- React + Vite + Tailwind CSS — фронтенд
- Supabase — анонимная авторизация + таблица сессий + граничные функции
- Mathpix API — OCR рукописного текста → LaTeX
- Claude API (claude-sonnet-4-6) — LaTeX → пошаговый разбор JSON
- OpenAI TTS API — текст → речь, голос "echo", язык русский
- Yandex Cloud Object Storage — деплой статического фронтенда

## Деплой
- URL: https://reshaem-foundation.website.yandexcloud.net
- GitHub: https://github.com/milkis-reckless-18/reshaem/
- Фронтенд: Yandex Cloud Object Storage (публичный бакет reshaem-foundation)
- Граничные функции: Supabase (eu-central-1, Frankfurt)
- Для обновления: npm run build → удалить старые файлы в бакете → загрузить dist/

## Логотип
- Файл: `src/assets/reshaem-logo.svg` — вордмарк 680×320, прозрачный фон
- Wordmark: `(Resha)Σm`, Clash Display Bold, Warm White + Cyan Mint акцент
- Также скопирован в `public/favicon.svg` (используется как favicon в index.html)
- Логотип не используется в UI приложения — только как favicon

## Дизайн-система (не менять)
- Фон: тёмная палитра — Midnight #0D0F1C, Deep Navy #1A1D2E, Elevated #2E3150
- Акцент (верно): Cyan Mint #5EECD8 / tint #1A3A36
- Акцент (ошибка): Coral Rose #FF6B6B / tint #2A1A1A
- Текст: Warm White #F0EEE6 / secondary rgba(240,238,230,0.6)
- Радиус скругления: 16px
- Переходы: 200ms ease
- Шрифт: Inter или системный sans-serif
- Без градиентов, без бейджей, без декоративных элементов
- Плавающие математические символы на фоне: ∫ √ π ∑ ≠ ∞ Δ x² ± × ÷ ≈ θ, opacity 0.05
- Полная дизайн-система: см. design-system.md

## Персонаж AI
Имя: Макс
Обращение: ты, тепло, как умный старший друг
Никогда не даёт финальный ответ
Один наводящий вопрос за раз
Возвращает структурированный JSON (см. claude_system_prompt.md)

## Системный промпт Claude API
Версия: v3
Файл: claude_system_prompt.md в корне проекта
ТОЛЬКО владелец продукта редактирует системный промпт — не Claude Code

## Схема таблицы сессий Supabase
```sql
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  image_url TEXT,
  ocr_result TEXT,
  explanation TEXT,
  topic TEXT,
  is_correct BOOLEAN,
  nudge_question TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own sessions"
ON sessions FOR ALL USING (auth.uid() = user_id);
```

## Таксономия тем ЕГЭ (12 тем)
Алгебра, Геометрия, Тригонометрия, Производная, Интеграл, Вероятность, Статистика, Уравнения, Неравенства, Функции, Числа, Текстовая задача

## Поток API (по порядку)
1. Ученик загружает фото → сжимается до макс. 1200px (canvas resize в браузере)
2. Фронтенд → Supabase Storage bucket "solution-images" → путь: {user_id}/{timestamp}.jpg
3. Получаем публичный URL из Storage, сохраняем в sessions.image_url
4. Фронтенд → /ocr с { url: storageUrl } → OCR скачивает изображение → Mathpix → LaTeX (таймаут 10 сек)
5. Фронтенд → /explain → Claude API с системным промптом → возвращает JSON
6. Фронтенд парсит JSON, показывает шаги по одному
7. Кнопка воспроизведения → /speak → OpenAI TTS echo → возвращает аудио blob
8. Все данные сохраняются в таблицу sessions Supabase

## Supabase Storage
- Бакет: solution-images (публичный)
- Путь файлов: {user_id}/{timestamp}.jpg
- Доступ: аутентифицированные пользователи загружают только в свою папку
- OCR edge function принимает { url } или { image: base64 } — оба формата поддерживаются

## Модель взаимодействия (пошаговый разбор)
- Шаги показываются по одному, не все сразу
- После каждого шага — два варианта ответа:
  - Положительный (случайный): Ясно / Гуд / Принято / ОК / Дальше
  - Отрицательный (случайный): Не ясно / Не понятно / Объясни
- Отрицательный ответ → повторный вызов Claude API для перефразировки шага
- После всех шагов → итоговый вердикт → предсказание балла
- Предсказание: +3 балла если верно / +5 баллов если исправить ошибку

## Что возвращает Макс (структура JSON)
```json
{
  "message": "общий вердикт одной фразой",
  "steps": [
    {
      "step_number": 1,
      "is_correct": true,
      "student_work": "что написал ученик — plain text",
      "explanation": "комментарий Макса — plain text",
      "correction": null
    }
  ],
  "input_type": "solution | problem_only | unreadable",
  "is_correct": true,
  "topic": "одна из 12 тем",
  "confidence_flag": "ok | ocr_uncertain",
  "nudge_question": "наводящий вопрос или null"
}
```

## Экраны приложения
1. Главный экран — зона загрузки фото (камера по тапу), история решений внизу
2. Онбординг — слайд снизу при первом визите, ?demo=true всегда показывает
3. Пошаговый разбор — шаги с цветовой индикацией, кнопки ответа, TTS
4. История — тап на миниатюру открывает нижний лист с полным разбором
5. Конец разбора — "Ещё такие задачи →" / "На главную"

## Переменные окружения
```
VITE_SUPABASE_URL=          # безопасно для фронтенда
VITE_SUPABASE_ANON_KEY=     # безопасно для фронтенда (publishable key)
# Секреты граничных функций (никогда не во фронтенд):
MATHPIX_APP_ID=
MATHPIX_APP_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

## Текущий статус
- ✅ UI scaffold с дизайн-системой
- ✅ Онбординг с слайдом снизу
- ✅ Supabase анонимная авторизация + хранение сессий
- ✅ Mathpix OCR интеграция
- ✅ Claude API пошаговый разбор
- ✅ OpenAI TTS голос echo
- ✅ История решений с персистентностью
- ✅ Деплой на Yandex Cloud
- ✅ Изображения хранятся в Supabase Storage (не base64 в БД)
- ✅ TTS исправлен на мобильном (Web Audio API)
- ✅ OCR таймаут 10 сек + обработка ошибок
- ✅ KaTeX рендеринг формул в шагах, correction, nudge_question
- ✅ Unicode → LaTeX постобработка в explain edge function
- ✅ Исправлен возврат на главный экран после съёмки на мобильном (убран capture="environment")

## Следующие шаги
1. UX-тест с 5 учениками
2. Конкурентный анализ

## Что НЕЛЬЗЯ делать
- Давать финальный ответ ученику ни при каких условиях
- Менять цвета дизайн-системы: палитра зафиксирована (Midnight #0D0F1C, Cyan Mint #5EECD8, Coral Rose #FF6B6B)
- Добавлять экран входа/регистрации — только анонимная авторизация
- Добавлять лишние зависимости
- Менять модель Claude — только claude-sonnet-4-6
- Автовоспроизведение звука — только по кнопке
- Отправлять секретные ключи API во фронтенд
- Не менять порядок полей Mathpix: всегда latex_styled || text — не наоборот
- OCR edge function is stable — do not refactor without explicit instruction
