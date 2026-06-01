#!/usr/bin/env bash
# Сборка CanvasKit (WASM) со ВКЛЮЧЁННЫМ Skia PDF backend.
#
# Зачем: стоковый canvaskit-wasm собран с skia_enable_pdf=false и не умеет PDF.
# Здесь мы клонируем Skia, включаем PDF, добавляем embind-биндинг
# (pdf_bindings.cpp) и собираем canvaskit.{js,wasm} в официальном Docker-образе
# emscripten от Skia.
#
# Тяжёлая операция: ~30–80 ГБ на диске, ~40–90 мин первая сборка.
# Поэтому весь чекаут Skia и артефакты держим в WORK на большом диске (D:),
# а не в Docker-vhdx.
#
# Запуск (из git-bash на Windows):
#   WORK=/d/skiabuild bash scripts/canvaskit-pdf/build.sh
# Результат: $WORK/output/canvaskit.{js,wasm} -> копируем в public/canvaskit/.

set -euo pipefail

IMAGE="gcr.io/skia-public/canvaskit-emsdk:latest"
WORK="${WORK:-/d/skiabuild}"                 # host-папка под чекаут (большой диск)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$WORK" "$WORK/output"
# Кладём биндинг рядом, чтобы внутри контейнера скопировать в дерево Skia.
cp "$SCRIPT_DIR/pdf_bindings.cpp" "$WORK/pdf_bindings.cpp"

echo ">>> docker pull $IMAGE"
docker pull "$IMAGE"

echo ">>> запуск сборки в контейнере (WORK=$WORK -> /work)"
# Преобразуем /d/skiabuild -> D:\skiabuild для -v на Windows-докере.
HOSTWORK="$(echo "$WORK" | sed -E 's#^/([a-zA-Z])/#\1:/#')"

docker run --rm \
  -v "${HOSTWORK}:/work" \
  -w /work \
  "$IMAGE" \
  bash -lc '
    set -euo pipefail
    export PATH=/work/depot_tools:$PATH

    if [ ! -d /work/depot_tools ]; then
      git clone --depth 1 https://chromium.googlesource.com/chromium/tools/depot_tools.git /work/depot_tools
    fi
    if [ ! -d /work/skia ]; then
      git clone --depth 1 https://skia.googlesource.com/skia.git /work/skia
    fi

    cd /work/skia
    echo ">>> git-sync-deps (долго, тянет third_party/externals)"
    python3 tools/git-sync-deps

    echo ">>> включаем PDF в compile.sh"
    sed -i "s/skia_enable_pdf=false/skia_enable_pdf=true/g" modules/canvaskit/compile.sh

    echo ">>> добавляем pdf_bindings.cpp в дерево и в BUILD.gn"
    cp /work/pdf_bindings.cpp modules/canvaskit/pdf_bindings.cpp
    # Вставляем источник рядом с canvaskit_bindings.cpp в sources цели canvaskit.
    if ! grep -q "pdf_bindings.cpp" modules/canvaskit/BUILD.gn; then
      sed -i "s#\"canvaskit_bindings.cpp\",#\"canvaskit_bindings.cpp\",\n    \"pdf_bindings.cpp\",#" modules/canvaskit/BUILD.gn
    fi

    echo ">>> компиляция (release)"
    ./modules/canvaskit/compile.sh release

    echo ">>> копируем артефакты в /work/output"
    cp out/canvaskit_wasm/canvaskit.js  /work/output/canvaskit.js
    cp out/canvaskit_wasm/canvaskit.wasm /work/output/canvaskit.wasm
    echo ">>> ГОТОВО: /work/output/canvaskit.{js,wasm}"
    ls -la /work/output
  '

echo ">>> Скопируйте артефакты:"
echo "    cp $WORK/output/canvaskit.js   public/canvaskit/canvaskit.js"
echo "    cp $WORK/output/canvaskit.wasm public/canvaskit/canvaskit.wasm"
