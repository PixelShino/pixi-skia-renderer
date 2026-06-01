// pdf_bindings.cpp — embind-обёртка над Skia PDF backend для CanvasKit.
//
// Стоковый canvaskit-wasm собран с `skia_enable_pdf=false` и не экспонирует
// PDF API в JS. Этот файл добавляет минимальный мост:
//   CanvasKit.MakePDFDocument() -> PDFDocument
//   PDFDocument.beginPage(w, h) -> Canvas   (тот же SkCanvas, что и у Surface)
//   PDFDocument.endPage()
//   PDFDocument.close() -> Uint8Array       (готовые байты PDF)
//
// Компилируется В ТОТ ЖЕ модуль, что и canvaskit_bindings.cpp, поэтому
// возвращаемый SkCanvas* совместим с уже зарегистрированным типом Canvas —
// на нём работают все обычные методы рисования CanvasKit (drawPath, drawRect,
// drawImageRect, drawTextBlob и т.д.), а значит графика в PDF остаётся
// ВЕКТОРНОЙ.
//
// Включение: добавить в modules/canvaskit/BUILD.gn в sources цели CanvasKit,
// собрать с skia_enable_pdf=true (см. build.sh).

#include <emscripten.h>
#include <emscripten/bind.h>
#include <emscripten/val.h>

#include <cstdint>
#include <memory>
#include <vector>

#include "include/codec/SkCodec.h"
#include "include/codec/SkJpegDecoder.h"
#include "include/core/SkCanvas.h"
#include "include/core/SkData.h"
#include "include/core/SkDocument.h"
#include "include/core/SkPixmap.h"
#include "include/core/SkRefCnt.h"
#include "include/core/SkStream.h"
#include "include/core/SkString.h"
#include "include/docs/SkPDFDocument.h"
#include "include/encode/SkJpegEncoder.h"

using namespace emscripten;

// Skia PDF backend требует JPEG decoder/encoder (растровые изображения, напр.
// спрайты, вкладываются в PDF как JPEG). В canvaskit-сборке дефолтные
// SkPDF::JPEG::Decode/Encode вырезаны (nullptr) → SkPDF аварийно завершается.
// Прокидываем реальные кодеки сами (jpeg включён в сборке canvaskit).
static std::unique_ptr<SkCodec> PdfJpegDecode(sk_sp<const SkData> data) {
    return SkJpegDecoder::Decode(std::move(data));
}
static bool PdfJpegEncode(SkWStream* dst, const SkPixmap& src, int quality) {
    SkJpegEncoder::Options options;
    options.fQuality = quality;
    return SkJpegEncoder::Encode(dst, src, options);
}

// Держим поток, документ и финальные байты вместе. Байты копируем в член
// `bytes`, чтобы typed_memory_view ссылался на живую память (SkData,
// полученная из detachAsData(), иначе освободилась бы по выходу из close()).
class PDFDocument {
public:
    PDFDocument() {
        SkPDF::Metadata md;
        md.fTitle = SkString("Pixi → Skia export");
        md.fCreator = SkString("pixi-skia-renderer (CanvasKit PDF)");
        md.jpegDecoder = &PdfJpegDecode;
        md.jpegEncoder = &PdfJpegEncode;
        fDoc = SkPDF::MakeDocument(&fStream, md);
    }

    // Начать страницу заданного размера в поинтах (1pt = 1/72").
    // Возвращает SkCanvas*, на который рисуем обычными методами CanvasKit.
    SkCanvas* beginPage(float width, float height) {
        return fDoc->beginPage(width, height);
    }

    void endPage() {
        fDoc->endPage();
    }

    // Финализировать PDF и вернуть байты как Uint8Array (вид на fBytes).
    // JS обязан немедленно скопировать (new Uint8Array(view)) и затем delete().
    val close() {
        fDoc->close();
        sk_sp<SkData> data = fStream.detachAsData();
        const uint8_t* src = static_cast<const uint8_t*>(data->data());
        fBytes.assign(src, src + data->size());
        return val(typed_memory_view(fBytes.size(), fBytes.data()));
    }

private:
    SkDynamicMemoryWStream fStream;
    sk_sp<SkDocument> fDoc;
    std::vector<uint8_t> fBytes;
};

PDFDocument* MakePDFDocument() {
    return new PDFDocument();
}

EMSCRIPTEN_BINDINGS(PDFBackend) {
    class_<PDFDocument>("PDFDocument")
        .function("beginPage", &PDFDocument::beginPage, allow_raw_pointers())
        .function("endPage", &PDFDocument::endPage)
        .function("close", &PDFDocument::close);

    function("MakePDFDocument", &MakePDFDocument, allow_raw_pointers());
}
