---
name: watch-igaming
description: "Reviews a video link or local screen recording from transcript and scene-change frames matched by timecode, then returns a review, QA table, UX audit, comparison or minutes."
category: media
risk: safe
source: community
source_repo: igamingsychov/watch-igaming
source_type: community
date_added: "2026-10-21"
author: "Yevhen Sychov"
tags: [video, transcription, ffmpeg, whisper, qa, screen-recording, timecodes]
tools: [claude]
license: "MIT"
license_source: "https://github.com/igamingsychov/watch-igaming/blob/main/LICENSE"
---

# watch-igaming: video review from transcript and frames

## Overview

A Claude Code skill that watches a whole video instead of reading only its transcript. It takes subtitles with yt-dlp or transcribes speech locally with Whisper, extracts frames on scene changes with ffmpeg, matches what is said with what is on screen by timecode and returns a review or a table in the format the user picks.

Source repository: https://github.com/igamingsychov/watch-igaming (MIT, author Yevhen Sychov). The detailed instructions after the English sections are the original skill text in Russian, kept unchanged. Support files used by the instructions: `templates/qa-table.md`, `templates/other-tables.md`, `examples/qa-review.html`.

## When to Use

- The user asks to watch, review or summarize a video: a link to a video page, a screen or meeting recording, a direct mp4, or a local file (.mov, .mp4).
- The user needs a QA table from one or more walkthrough recordings of a product (own product or a competitor), with timecode, frame, tester quote, expectation, fix and severity for each finding.
- The user needs a competitor comparison, a UX audit, meeting minutes or lecture notes with timecodes.
- Original trigger phrases: `/watch <url>`, "посмотри видео", "разбери ролик", "проанализируй видео", "transcribe", "QA по видео".

## Requirements

- `yt-dlp` (links only), `ffmpeg`, `whisper` (openai-whisper).
- macOS: `brew install yt-dlp ffmpeg openai-whisper`. Linux: ffmpeg and pipx from the system package manager, then `pipx install yt-dlp` and `pipx install openai-whisper`.

## Examples

```text
watch this video and write a review: <link>
watch ~/Movies/walkthrough.mov and build a QA table
here are three competitor walkthrough recordings, compare them: section, us, competitor A, competitor B, conclusion, timecode
review this call recording, I need minutes: topic, decision, owner, deadline
```

## Limitations

- Videos behind a login are not bypassed: the skill reports it.
- Scene detection can return no frames for recordings with smooth transitions. The threshold is then lowered from 0.3 to 0.05-0.1.
- Scene detection misses fast elements (live feeds, timers, animations). These segments are sampled densely, for example 2 frames per second.
- Local speech recognition is slow on long recordings: model `small` is faster, `medium` is more accurate.
- Findings and quotes come only from the recording. A finding without a timecode and a frame is not reported, and a missing frame is marked as "no screenshot".

## Security & Safety Notes

- Runs local commands only: yt-dlp downloads subtitles, audio or video from the URL the user gives, ffmpeg and whisper process them on the machine. Working files go to `/tmp/watch/<slug>`, not into the project.
- When a dependency is missing, the skill shows the install command and asks before installing.
- Nothing is published or sent anywhere without an explicit request. Saving the review to a notes folder happens only after the user confirms.

## Original instructions

The text below is the original skill (Russian), unchanged.

# watch - ассистент смотрит видео целиком

## Зависимости (проверить при первом запуске)
- yt-dlp, ffmpeg, whisper (openai-whisper). Если чего-то нет - предложи установить, покажи команду и сообщи пользователю:
  - macOS: `brew install yt-dlp ffmpeg openai-whisper`
  - Linux: `sudo apt install ffmpeg pipx`, затем `pipx install yt-dlp` и `pipx install openai-whisper`
  - Обычный `pip install` в системный Python новые macOS/Linux блокируют («externally-managed-environment»), поэтому brew или pipx.
- Для локального файла yt-dlp не нужен.

## Workflow

### 1. Подготовка
- Сделай рабочую папку: mkdir -p /tmp/watch/<slug>
- Определи источник: URL (видеохостинг / сервис записи экрана или встречи / прямой видеофайл) или путь к локальному файлу (например, запись экрана).
- Записей может быть несколько (части одного прохождения). Обрабатывай каждую отдельно и веди тайм-коды в виде `Video N · mm:ss`.

### 2. Транскрипт - сначала субтитры (бесплатно, если есть; только для URL)
yt-dlp --write-subs --write-auto-subs --sub-langs "ru,en" --skip-download --convert-subs srt -o "/tmp/watch/<slug>/subs.%(ext)s" "<URL>"

Если .srt появился - это транскрипт с тайм-кодами, используй его.

### 3. Транскрипт - fallback: расшифровка речи (если субтитров нет или это локальный файл)
- URL: yt-dlp -x --audio-format mp3 -o "/tmp/watch/<slug>/audio.mp3" "<URL>"
- Локальный файл: ffmpeg -i "<path>" -vn -acodec libmp3lame -q:a 4 "/tmp/watch/<slug>/audio.mp3"

whisper "/tmp/watch/<slug>/audio.mp3" --model small --language ru --output_format srt --output_dir "/tmp/watch/<slug>/"

`--language` поставь по речи в записи (ru, uk, en...). Для точности можно `--model medium` (медленнее).

### 4. Кадры ПО СМЕНАМ СЦЕН

- URL: yt-dlp -f "bv*[height<=720]+ba/b[height<=720]" -o "/tmp/watch/<slug>/video.mp4" "<URL>"
- Локальный файл: используй его как есть, копию не делай.

mkdir -p "/tmp/watch/<slug>/frames"
ffmpeg -i "<video>" -vf "select='gt(scene,0.3)',showinfo" -fps_mode vfr "/tmp/watch/<slug>/frames/frame_%04d.png" 2> "/tmp/watch/<slug>/scenes.log"

`-fps_mode vfr` работает в ffmpeg 5.1+. В свежих версиях старый ключ `-vsync` удалён (ffmpeg 9 отвечает «Unrecognized option 'vsync'»); на старых ffmpeg (до 5.1) вместо `-fps_mode vfr` используй `-vsync vfr`.

Порог 0.3 можно крутить 0.2-0.4 по плотности сцен (запись экрана с плавными переходами может дать 0 кадров: снизь порог до 0.05-0.1). Тайм-коды кадров бери из showinfo-лога (pts_time), чтобы привязать кадр к моменту: кадр frame_0001 соответствует первому pts_time в логе, и так далее. Не добавляй к команде `-loglevel error`: showinfo пишет в лог уровня info, и лог получится пустым.
grep -o 'pts_time:[0-9.]*' "/tmp/watch/<slug>/scenes.log" | cut -d: -f2 | nl

Если кадров слишком много - оставь до ~150 самых информативных, прореживая близкие по времени.

Кадр ровно по тайм-коду (для находки, цитаты, скриншота в таблице):
ffmpeg -ss 00:07:39 -i "<video>" -frames:v 1 "/tmp/watch/<slug>/shot_0739.png"

Быстрые элементы (живая лента ставок, таймеры, анимации) смена сцен не ловит. Сними нужный отрезок плотнее, например 2 кадра в секунду на 20 секундах:
ffmpeg -ss 00:07:30 -t 20 -i "<video>" -vf fps=2 "/tmp/watch/<slug>/dense_%03d.png"

### 5. Анализ
- Прочитай транскрипт (.srt).
- Просмотри извлечённые кадры: слайды, код, демо, графика, интерфейс.
- Свяжи визуал с транскриптом по тайм-кодам. Транскрипт без экрана бесполезен («вот тут не работает» - где именно?), поэтому слова всегда сверяй с кадром.

### 6. Отчёт
Если пользователь не назвал формат, спроси одной строкой: «Как оформить: обычный разбор, QA-таблица, сравнение конкурентов, UX-аудит, протокол созвона, конспект лекции или свой формат?»

- **Обычный разбор (по умолчанию):** TL;DR (3-5 строк); ключевые концепции с тайм-кодами; что показано НА ЭКРАНЕ, чего нет в тексте; заметные моменты/цитаты с тайм-кодами.
- **QA-таблица** (QA, баг-лист, разбор прохождения, аудит продукта по записи экрана): прочитай `templates/qa-table.md` (лежит в папке этого скилла) и следуй ему. Живой пример - `examples/qa-review.html`.
- **Другие таблицы** (сравнение конкурентов, UX-аудит, протокол созвона, конспект лекции, свой формат): прочитай `templates/other-tables.md`. Колонки подбирай под запрос пользователя; если он не знает, что нужно, предложи 4-6 колонок по образцу оттуда.
- Если можешь собрать HTML-страницу или артефакт, повтори структуру примера: сводка, фильтр по критичности, таблица, блок «Работает хорошо».

### 7. Ингест в базу знаний (опционально)
Спроси: «Сохранить разбор в твою базу заметок?». Если да - запиши markdown-заметку в указанную папку со ссылками на связанные заметки. Без подтверждения - не сохраняй.

## Правила
- Рабочие файлы - во временную папку, проект не засоряй.
- Ничего не публикуй и не отправляй наружу без явной просьбы.
- Приватное видео с логином не обходи - сообщи об этом.
- Любой пункт отчёта опирается на тайм-код. В QA-таблице у находки есть кадр и, если тестировщик что-то сказал, дословная цитата.
- Не выдумывай находки и цитаты: нет в записи - нет в отчёте. Нет кадра - так и пиши «нет скриншота».
