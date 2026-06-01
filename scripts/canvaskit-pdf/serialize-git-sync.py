#!/usr/bin/env python3
"""Патчит Skia tools/git-sync-deps под нестабильную сеть к googlesource.

Штатная реализация запускает поток на КАЖДЫЙ репозиторий сразу и падает целиком,
если хоть один не склонировался. На зеркалах googlesource отдельные опциональные
кодеки (libavif, libjxl и т.п.) периодически отдают "remote transport reported
error". Здесь:
  - клоны идут ПО ОДНОМУ (без burst-а, который провоцирует 429);
  - каждая зависимость ретраится с бэкоффом;
  - если всё равно не вышло — она ПРОПУСКАЕТСЯ (с логом), а не валит всю сборку.
Пропущенные опциональные зависимости на сборку CanvasKit+PDF не влияют; если бы
вдруг пропустилась нужная — сборка явно упадёт на gn/ninja.

Запуск из корня чекаута Skia:  python3 serialize-git-sync.py
"""
import io
import sys

PATH = "tools/git-sync-deps"
MARKER = "# PATCHED: sequential + skip-on-failure"

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
  ''' + MARKER + '''
  import time
  skipped = []
  for args in list_of_arg_lists:
    ok = False
    for _attempt in range(6):
      try:
        function(*args)
        ok = True
        break
      except Exception:
        time.sleep(20)
    if not ok:
      skipped.append(args)
      print("SKIP (не склонировался после ретраев): %r" % (args,), flush=True)
  if skipped:
    print("git-sync-deps: пропущено %d зависимостей" % len(skipped), flush=True)'''

with io.open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

if MARKER in src:
    print("git-sync-deps уже пропатчен")
    sys.exit(0)

if OLD not in src:
    print("ВНИМАНИЕ: ожидаемый блок multithread не найден — формат изменился", file=sys.stderr)
    sys.exit(1)

with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(src.replace(OLD, NEW))
print("git-sync-deps пропатчен: последовательно + пропуск упавших")
