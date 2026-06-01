#!/usr/bin/env python3
"""Патчит Skia tools/git-sync-deps: последовательные клоны + ретраи на каждую
зависимость. Штатная реализация запускает поток на КАЖДЫЙ репозиторий сразу,
что заваливает googlesource и ловит HTTP 429 / transport errors. Здесь делаем
клоны по одному с бэкоффом — медленнее, но надёжно проходит rate-limit.

Запуск из корня чекаута Skia:  python3 serialize-git-sync.py
"""
import io
import sys

PATH = "tools/git-sync-deps"

OLD = '''def multithread(function, list_of_arg_lists):
  anything_failed = False
  threads = []
  def hook(args):
    nonlocal anything_failed
    anything_failed = True
  threading.excepthook = hook
  for args in list_of_arg_lists:
    thread = threading.Thread(None, function, None, args)
    thread.start()
    threads.append(thread)
  for thread in threads:
    thread.join()
  if anything_failed:
    raise Exception("Thread failure detected")'''

NEW = '''def multithread(function, list_of_arg_lists):
  import time
  for args in list_of_arg_lists:
    for _attempt in range(8):
      try:
        function(*args)
        break
      except Exception:
        if _attempt == 7:
          raise
        time.sleep(25)'''

with io.open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

if NEW.splitlines()[1].strip() in src:
    print("git-sync-deps уже пропатчен")
    sys.exit(0)

if OLD not in src:
    print("ВНИМАНИЕ: ожидаемый блок multithread не найден — формат изменился", file=sys.stderr)
    sys.exit(1)

with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(src.replace(OLD, NEW))
print("git-sync-deps пропатчен на последовательные клоны с ретраями")
