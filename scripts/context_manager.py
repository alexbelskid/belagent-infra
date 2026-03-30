#!/usr/bin/env python3
"""
Auto-context manager для Фрутилупса v2.
Следит за заполнением контекста главной сессии (agent:main:main).
При достижении 70% — собирает последние сообщения и сохраняет в memory/
для суммаризации агентом через heartbeat.

Схема:
1. Скрипт детектирует заполнение контекста
2. Если >= 70%: сохраняет raw диалог в memory/ctx_pending.json
3. Heartbeat видит ctx_pending.json → суммаризирует через свой Claude → делает /new
4. Если <70%: просто репортирует статус
"""

import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

SESSIONS_DIR = Path("/root/.openclaw/agents/main/sessions")
SESSIONS_JSON = SESSIONS_DIR / "sessions.json"
MEMORY_DIR = Path("/root/.openclaw/workspace/memory")
CONTEXT_LIMIT = 200_000
THRESHOLD = 0.70

MEMORY_DIR.mkdir(parents=True, exist_ok=True)


def get_main_session_id() -> str | None:
    """Возвращает UUID главной сессии (agent:main:main)."""
    try:
        with open(SESSIONS_JSON) as f:
            sessions = json.load(f)
        entry = sessions.get("agent:main:main", {})
        return entry.get("sessionId") or entry.get("id")
    except Exception as e:
        print(f"[ERR] sessions.json: {e}", file=sys.stderr)
        return None


def get_context_usage(session_uuid: str) -> int:
    """Возвращает кол-во токенов в текущем контексте."""
    jsonl_path = SESSIONS_DIR / f"{session_uuid}.jsonl"
    if not jsonl_path.exists():
        return 0

    try:
        with open(jsonl_path, "rb") as f:
            f.seek(0, 2)
            size = f.tell()
            chunk = min(size, 65536)
            f.seek(max(0, size - chunk))
            tail = f.read().decode("utf-8", errors="ignore")

        for line in reversed(tail.splitlines()):
            if not line.strip():
                continue
            try:
                msg = json.loads(line)
                usage = msg.get("message", {}).get("usage", {})
                if usage:
                    total = usage.get("cacheRead", 0) + usage.get("input", 0)
                    if total > 0:
                        return total
            except json.JSONDecodeError:
                continue
    except Exception as e:
        print(f"[ERR] get_context_usage: {e}", file=sys.stderr)

    return 0


def clean_message_text(content) -> str:
    """Извлекает чистый текст из content, убирает системные метаданные."""
    if isinstance(content, list):
        parts = [p.get("text", "") for p in content
                 if isinstance(p, dict) and p.get("type") == "text"]
        text = " ".join(parts)
    elif isinstance(content, str):
        text = content
    else:
        return ""

    # Убираем блоки с метаданными OpenClaw
    text = re.sub(r"Conversation info \(untrusted metadata\):[\s\S]*?(?=\n\n|\Z)", "", text)
    text = re.sub(r"Sender \(untrusted metadata\):[\s\S]*?(?=\n\n|\Z)", "", text)
    text = re.sub(r"```json[\s\S]*?```", "", text)
    text = re.sub(r"\[media attached:[^\]]+\]", "[медиафайл]", text)
    text = re.sub(r"A new session was started.*", "", text)
    text = re.sub(r"Run your Session Startup.*", "", text)
    text = " ".join(text.split())

    return text.strip()


def get_recent_messages(session_uuid: str, limit: int = 50) -> list:
    """Извлекает последние N user/assistant сообщений."""
    jsonl_path = SESSIONS_DIR / f"{session_uuid}.jsonl"
    if not jsonl_path.exists():
        return []

    messages = []
    try:
        with open(jsonl_path, "r", errors="ignore") as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    msg = json.loads(line)
                    role = msg.get("message", {}).get("role", "")
                    content = msg.get("message", {}).get("content", "")
                    if role in ("user", "assistant"):
                        text = clean_message_text(content)
                        if text and len(text) > 10:
                            messages.append({
                                "role": role,
                                "content": text[:800]
                            })
                except json.JSONDecodeError:
                    continue
    except Exception as e:
        print(f"[ERR] get_recent_messages: {e}", file=sys.stderr)

    return messages[-limit:]


def main():
    now_str = datetime.now().strftime("%H:%M:%S")
    print(f"[{now_str}] Context Manager — Фрутилупс v2")

    session_uuid = get_main_session_id()
    if not session_uuid:
        print("[ERR] Не нашёл UUID главной сессии (agent:main:main)")
        return

    tokens = get_context_usage(session_uuid)
    if tokens == 0:
        print("  Нет данных об использовании контекста")
        return

    pct = tokens / CONTEXT_LIMIT
    bar = "█" * int(pct * 10) + "░" * (10 - int(pct * 10))
    print(f"  Контекст: [{bar}] {pct:.0%} ({tokens:,} / {CONTEXT_LIMIT:,} токенов)")

    if pct >= THRESHOLD:
        print("  ⚠️  Порог 70% — готовлю данные для суммаризации...")
        messages = get_recent_messages(session_uuid)
        if len(messages) < 3:
            print(f"  Слишком мало сообщений ({len(messages)}), пропускаю")
            return

        # Сохраняем pending файл для агента
        pending_file = MEMORY_DIR / "ctx_pending.json"
        pending_data = {
            "detected_at": datetime.now().isoformat(),
            "tokens": tokens,
            "pct": round(pct, 3),
            "session_uuid": session_uuid,
            "messages": messages
        }
        pending_file.write_text(json.dumps(pending_data, ensure_ascii=False, indent=2))
        print(f"  📝 Сохранено в memory/ctx_pending.json ({len(messages)} сообщений)")
        print(f"  ➡️  Heartbeat-агент должен суммаризировать и сбросить сессию")

        # Print special marker for heartbeat to detect
        print("CONTEXT_OVERFLOW_DETECTED")
    else:
        # Check if there's a pending file from before
        pending_file = MEMORY_DIR / "ctx_pending.json"
        if pending_file.exists():
            print("  ⚠️  Найден ctx_pending.json от предыдущего сброса")
            print("CONTEXT_PENDING_EXISTS")
        else:
            print("  ✅ Контекст в норме")


if __name__ == "__main__":
    main()
