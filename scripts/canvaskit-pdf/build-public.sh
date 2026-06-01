#!/usr/bin/env bash
# Альтернатива build.sh на ПУБЛИЧНОМ образе emscripten/emsdk (Docker Hub),
# т.к. официальный gcr.io/skia-public/canvaskit-emsdk закрыт (нужна Google-авторизация).
#
# Использует emscripten из образа (EMSDK=/emsdk). Skia тянется и синкается внутри
# контейнера. Тяжело: ~30–80 ГБ, ~40–90 мин. Чекаут — на большом диске (D:).
#
#   WORK=/d/skiabuild bash scripts/canvaskit-pdf/build-public.sh

set -euo pipefail

# Отключаем авто-конвертацию POSIX-путей git-bash/MSYS — иначе docker-аргументы
# вида `-w /work` мутируют в `C:/Program Files/Git/work`.
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

IMAGE="emscripten/emsdk:3.1.64"
WORK="${WORK:-/d/skiabuild}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$WORK" "$WORK/output"
cp "$SCRIPT_DIR/pdf_bindings.cpp" "$WORK/pdf_bindings.cpp"
cp "$SCRIPT_DIR/serialize-git-sync.py" "$WORK/serialize-git-sync.py"
HOSTWORK="$(echo "$WORK" | sed -E 's#^/([a-zA-Z])/#\1:/#')"

echo ">>> docker pull $IMAGE"
docker pull "$IMAGE"

docker run --rm \
  -v "${HOSTWORK}:/work" \
  -w /work \
  "$IMAGE" \
  bash -lc '
    set -euo pipefail
    apt-get update -y && apt-get install -y --no-install-recommends git python3 ca-certificates curl >/dev/null

    if [ ! -d /work/depot_tools ]; then
      git clone --depth 1 https://chromium.googlesource.com/chromium/tools/depot_tools.git /work/depot_tools
    fi
    export PATH=/work/depot_tools:$PATH

    if [ ! -d /work/skia ]; then
      git clone --depth 1 https://skia.googlesource.com/skia.git /work/skia
    fi
    cd /work/skia

    echo ">>> патчим git-sync-deps на последовательные клоны с ретраями"
    python3 /work/serialize-git-sync.py

    # libavif (AVIF-декодер) не нужен для CanvasKit+PDF (compile.sh его не
    # включает), а его зеркало на googlesource стабильно флапает с
    # "remote transport reported error" — убираем из DEPS, чтобы не тянуть.
    echo ">>> убираем ненужный libavif из DEPS"
    sed -i "\#third_party/externals/libavif#d" DEPS

    echo ">>> git-sync-deps (последовательно; внешний цикл — страховка)"
    n=0
    until python3 tools/git-sync-deps; do
      n=$((n+1))
      if [ "$n" -ge 5 ]; then echo "git-sync-deps не удался после $n попыток"; exit 1; fi
      echo ">>> повтор git-sync-deps ($n) через 60с"; sleep 60
    done

    echo ">>> включаем PDF + добавляем биндинг"
    sed -i "s/skia_enable_pdf=false/skia_enable_pdf=true/g" modules/canvaskit/compile.sh
    cp /work/pdf_bindings.cpp modules/canvaskit/pdf_bindings.cpp
    if ! grep -q "pdf_bindings.cpp" modules/canvaskit/BUILD.gn; then
      sed -i "s#\"canvaskit_bindings.cpp\",#\"canvaskit_bindings.cpp\",\n    \"pdf_bindings.cpp\",#" modules/canvaskit/BUILD.gn
    fi

    # Используем emscripten из образа.
    export EMSDK=/emsdk
    source /emsdk/emsdk_env.sh

    echo ">>> компиляция (release)"
    ./modules/canvaskit/compile.sh release

    cp out/canvaskit_wasm/canvaskit.js   /work/output/canvaskit.js
    cp out/canvaskit_wasm/canvaskit.wasm /work/output/canvaskit.wasm
    echo ">>> ГОТОВО"; ls -la /work/output
  '
