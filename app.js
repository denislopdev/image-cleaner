(() => {
  "use strict";

  const MAX_FILE_BYTES = 25 * 1024 * 1024;
  const MAX_SIDE_PX = 8192;
  const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
  const ACCEPTED_EXT = new Set(["jpg", "jpeg", "png", "webp"]);

  const els = {
    dropzone: document.getElementById("dropzone"),
    fileInput: document.getElementById("file-input"),
    uploadBtn: document.getElementById("upload-btn"),
    dropzoneIdle: document.getElementById("dropzone-idle"),
    originalPreviewWrap: document.getElementById("original-preview-wrap"),
    originalPreview: document.getElementById("original-preview"),
    originalMeta: document.getElementById("original-meta"),
    origFilename: document.getElementById("orig-filename"),
    origFormat: document.getElementById("orig-format"),
    origDimensions: document.getElementById("orig-dimensions"),
    origFilesize: document.getElementById("orig-filesize"),
    options: document.getElementById("options"),
    processBtn: document.getElementById("process-btn"),
    optFormat: document.getElementById("opt-format"),
    optQuality: document.getElementById("opt-quality"),
    qualityValue: document.getElementById("quality-value"),
    formatHint: document.getElementById("format-hint"),
    optResize: document.getElementById("opt-resize"),
    optResizeCustom: document.getElementById("opt-resize-custom"),
    optMaxWidth: document.getElementById("opt-max-width"),
    optMaxWidthCustom: document.getElementById("opt-max-width-custom"),
    processedEmpty: document.getElementById("processed-empty"),
    processedPreviewWrap: document.getElementById("processed-preview-wrap"),
    processedPreview: document.getElementById("processed-preview"),
    processedMeta: document.getElementById("processed-meta"),
    procFilename: document.getElementById("proc-filename"),
    procFormat: document.getElementById("proc-format"),
    procDimensions: document.getElementById("proc-dimensions"),
    procFilesize: document.getElementById("proc-filesize"),
    processedActions: document.getElementById("processed-actions"),
    downloadBtn: document.getElementById("download-btn"),
    anotherBtn: document.getElementById("another-btn"),
    flowArrow: document.getElementById("flow-arrow"),
    error: document.getElementById("error"),
    compare: document.getElementById("compare"),
    compareFrame: document.getElementById("compare-frame"),
    compareBeforeClip: document.getElementById("compare-before-clip"),
    compareBefore: document.getElementById("compare-before"),
    compareAfter: document.getElementById("compare-after"),
    compareHandle: document.getElementById("compare-handle"),
  };

  const state = {
    file: null,
    sourceBitmap: null,
    sourceWidth: 0,
    sourceHeight: 0,
    originalUrl: null,
    processedUrl: null,
    processedBlob: null,
    processedName: "",
    comparePos: 50,
  };

  function showError(message) {
    els.error.hidden = !message;
    els.error.textContent = message || "";
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function extensionOf(name) {
    const parts = name.toLowerCase().split(".");
    return parts.length > 1 ? parts.pop() : "";
  }

  function formatLabelFromType(type, name) {
    if (type === "image/jpeg" || /\.jpe?g$/i.test(name)) return "JPG";
    if (type === "image/png" || /\.png$/i.test(name)) return "PNG";
    if (type === "image/webp" || /\.webp$/i.test(name)) return "WEBP";
    return (extensionOf(name) || "Unknown").toUpperCase();
  }

  function mimeFromOutput(format) {
    if (format === "png") return "image/png";
    if (format === "webp") return "image/webp";
    return "image/jpeg";
  }

  function extFromOutput(format) {
    if (format === "png") return "png";
    if (format === "webp") return "webp";
    return "jpg";
  }

  function resolveOutputFormat(sourceType, sourceName) {
    const selected = els.optFormat.value;
    if (selected !== "auto") return selected;

    const label = formatLabelFromType(sourceType, sourceName);
    if (label === "PNG") return "png";
    if (label === "WEBP") return "webp";
    return "jpg";
  }

  function randomHex(len) {
    const bytes = new Uint8Array(Math.ceil(len / 2));
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, len);
  }

  function buildFilename(ext) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `image-${y}${m}${d}-${randomHex(6)}.${ext}`;
  }

  function revokeUrl(url) {
    if (url) URL.revokeObjectURL(url);
  }

  function closeBitmap() {
    if (state.sourceBitmap && typeof state.sourceBitmap.close === "function") {
      state.sourceBitmap.close();
    }
    state.sourceBitmap = null;
  }

  function resetProcessed() {
    revokeUrl(state.processedUrl);
    state.processedUrl = null;
    state.processedBlob = null;
    state.processedName = "";

    els.processedEmpty.classList.remove("hidden");
    els.processedPreviewWrap.classList.add("hidden");
    els.processedMeta.hidden = true;
    els.processedActions.classList.add("hidden");
    els.flowArrow.hidden = true;
    els.compare.classList.add("hidden");
    els.processedPreview.removeAttribute("src");
    els.compareBefore.removeAttribute("src");
    els.compareAfter.removeAttribute("src");
    setComparePosition(50);
  }

  function resetAll() {
    showError("");
    closeBitmap();
    revokeUrl(state.originalUrl);
    state.originalUrl = null;
    state.file = null;
    state.sourceWidth = 0;
    state.sourceHeight = 0;

    els.dropzoneIdle.classList.remove("hidden");
    els.originalPreviewWrap.classList.add("hidden");
    els.originalMeta.hidden = true;
    els.options.hidden = true;
    els.originalPreview.removeAttribute("src");
    els.fileInput.value = "";

    resetProcessed();
  }

  function loadImageElement(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not decode this image. Try another JPG, PNG, or WEBP file."));
      img.src = url;
    });
  }

  async function decodeFile(file) {
    if (typeof createImageBitmap === "function") {
      try {
        return await createImageBitmap(file);
      } catch {
        // Fall through to Image()
      }
    }
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImageElement(url);
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function validateFile(file) {
    if (!file) return "No file selected.";

    const ext = extensionOf(file.name);
    const typeOk = ACCEPTED_TYPES.has(file.type) || ACCEPTED_EXT.has(ext);
    if (!typeOk) {
      return "Unsupported format. Use JPG, PNG, or WEBP.";
    }
    if (file.size > MAX_FILE_BYTES) {
      return "File is too large. Maximum size is 25 MB.";
    }
    return null;
  }

  async function handleFile(file) {
    const validationError = validateFile(file);
    if (validationError) {
      showError(validationError);
      return;
    }

    showError("");
    resetProcessed();
    closeBitmap();
    revokeUrl(state.originalUrl);

    try {
      const bitmap = await decodeFile(file);
      const width = bitmap.width;
      const height = bitmap.height;

      if (width > MAX_SIDE_PX || height > MAX_SIDE_PX) {
        if (typeof bitmap.close === "function") bitmap.close();
        showError(`Image is too large. Maximum side length is ${MAX_SIDE_PX} px.`);
        return;
      }

      state.file = file;
      state.sourceBitmap = bitmap;
      state.sourceWidth = width;
      state.sourceHeight = height;
      state.originalUrl = URL.createObjectURL(file);

      els.originalPreview.src = state.originalUrl;
      els.dropzoneIdle.classList.add("hidden");
      els.originalPreviewWrap.classList.remove("hidden");
      els.originalMeta.hidden = false;
      els.options.hidden = false;

      els.origFilename.textContent = file.name;
      els.origFilename.title = file.name;
      els.origFormat.textContent = formatLabelFromType(file.type, file.name);
      els.origDimensions.textContent = `${width} × ${height}`;
      els.origFilesize.textContent = formatBytes(file.size);

      updateFormatHint();
    } catch (err) {
      showError(err.message || "Could not read this image.");
    }
  }

  function getResizePercent() {
    if (els.optResize.value === "custom") {
      const value = Number(els.optResizeCustom.value);
      if (!Number.isFinite(value) || value < 1 || value > 100) {
        throw new Error("Custom resize must be between 1 and 100%.");
      }
      return value;
    }
    return Number(els.optResize.value);
  }

  function getMaxWidthCap() {
    const mode = els.optMaxWidth.value;
    if (mode === "original") return null;
    if (mode === "custom") {
      const value = Number(els.optMaxWidthCustom.value);
      if (!Number.isFinite(value) || value < 1 || value > MAX_SIDE_PX) {
        throw new Error(`Custom max width must be between 1 and ${MAX_SIDE_PX} px.`);
      }
      return value;
    }
    return Number(mode);
  }

  function computeOutputSize(srcW, srcH) {
    const percent = getResizePercent();
    let width = Math.max(1, Math.round((srcW * percent) / 100));
    let height = Math.max(1, Math.round((srcH * percent) / 100));

    const maxWidth = getMaxWidthCap();
    if (maxWidth && width > maxWidth) {
      const scale = maxWidth / width;
      width = maxWidth;
      height = Math.max(1, Math.round(height * scale));
    }

    return { width, height };
  }

  function canvasToBlob(canvas, mime, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Encoding failed. Try a different format or quality."));
            return;
          }
          resolve(blob);
        },
        mime,
        quality
      );
    });
  }

  async function processImage() {
    if (!state.sourceBitmap || !state.file) {
      showError("Upload an image first.");
      return;
    }

    showError("");
    els.processBtn.disabled = true;
    els.processBtn.textContent = "Processing…";

    try {
      const outputFormat = resolveOutputFormat(state.file.type, state.file.name);
      const mime = mimeFromOutput(outputFormat);
      const ext = extFromOutput(outputFormat);
      const { width, height } = computeOutputSize(state.sourceWidth, state.sourceHeight);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { alpha: outputFormat !== "jpg" });
      if (!ctx) throw new Error("Canvas is not available in this browser.");

      if (outputFormat === "jpg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.clearRect(0, 0, width, height);
      }

      ctx.drawImage(state.sourceBitmap, 0, 0, width, height);

      const quality = Number(els.optQuality.value) / 100;
      const blob =
        outputFormat === "png"
          ? await canvasToBlob(canvas, mime)
          : await canvasToBlob(canvas, mime, quality);

      revokeUrl(state.processedUrl);
      state.processedBlob = blob;
      state.processedUrl = URL.createObjectURL(blob);
      state.processedName = buildFilename(ext);

      els.processedEmpty.classList.add("hidden");
      els.processedPreviewWrap.classList.remove("hidden");
      els.processedPreview.src = state.processedUrl;
      els.processedMeta.hidden = false;
      els.processedActions.classList.remove("hidden");
      els.flowArrow.hidden = false;

      els.procFilename.textContent = state.processedName;
      els.procFilename.title = state.processedName;
      els.procFormat.textContent = ext.toUpperCase();
      els.procDimensions.textContent = `${width} × ${height}`;
      els.procFilesize.textContent = formatBytes(blob.size);

      els.downloadBtn.href = state.processedUrl;
      els.downloadBtn.download = state.processedName;

      els.compareBefore.src = state.originalUrl;
      els.compareAfter.src = state.processedUrl;
      els.compare.classList.remove("hidden");
      setComparePosition(50);
    } catch (err) {
      showError(err.message || "Processing failed.");
      resetProcessed();
    } finally {
      els.processBtn.disabled = false;
      els.processBtn.textContent = "Process Image";
    }
  }

  function updateFormatHint() {
    const format = els.optFormat.value;
    const resolved =
      format === "auto" && state.file
        ? resolveOutputFormat(state.file.type, state.file.name)
        : format;

    if (resolved === "jpg" || (format === "auto" && !state.file)) {
      els.formatHint.textContent = "JPG fills transparent areas with white.";
    } else if (format === "auto") {
      els.formatHint.textContent = `Auto keeps the source family (${resolved.toUpperCase()}).`;
    } else if (resolved === "png") {
      els.formatHint.textContent = "PNG keeps transparency and ignores the quality slider.";
    } else {
      els.formatHint.textContent = "WEBP supports transparency and uses the quality slider.";
    }
  }

  function syncCustomInputs() {
    els.optResizeCustom.classList.toggle("hidden", els.optResize.value !== "custom");
    els.optMaxWidthCustom.classList.toggle("hidden", els.optMaxWidth.value !== "custom");
  }

  function setComparePosition(percent) {
    const clamped = Math.min(100, Math.max(0, percent));
    state.comparePos = clamped;
    els.compareBeforeClip.style.width = `${clamped}%`;
    els.compareHandle.style.left = `${clamped}%`;
    els.compareHandle.setAttribute("aria-valuenow", String(Math.round(clamped)));
  }

  function pointerPercent(clientX) {
    const rect = els.compareFrame.getBoundingClientRect();
    if (rect.width <= 0) return state.comparePos;
    return ((clientX - rect.left) / rect.width) * 100;
  }

  function bindCompare() {
    let dragging = false;

    const onMove = (clientX) => {
      if (!dragging) return;
      setComparePosition(pointerPercent(clientX));
    };

    els.compareHandle.addEventListener("pointerdown", (e) => {
      dragging = true;
      els.compareHandle.setPointerCapture(e.pointerId);
      setComparePosition(pointerPercent(e.clientX));
    });

    els.compareHandle.addEventListener("pointermove", (e) => onMove(e.clientX));
    els.compareHandle.addEventListener("pointerup", () => {
      dragging = false;
    });
    els.compareHandle.addEventListener("pointercancel", () => {
      dragging = false;
    });

    els.compareFrame.addEventListener("pointerdown", (e) => {
      if (e.target === els.compareHandle || els.compareHandle.contains(e.target)) return;
      dragging = true;
      els.compareHandle.setPointerCapture(e.pointerId);
      setComparePosition(pointerPercent(e.clientX));
    });

    els.compareHandle.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setComparePosition(state.comparePos - 2);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setComparePosition(state.comparePos + 2);
      } else if (e.key === "Home") {
        e.preventDefault();
        setComparePosition(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setComparePosition(100);
      }
    });
  }

  function bindUpload() {
    els.uploadBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      els.fileInput.click();
    });

    els.dropzone.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      els.fileInput.click();
    });

    els.dropzone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        els.fileInput.click();
      }
    });

    els.fileInput.addEventListener("change", () => {
      const file = els.fileInput.files && els.fileInput.files[0];
      if (file) handleFile(file);
    });

    ["dragenter", "dragover"].forEach((type) => {
      els.dropzone.addEventListener(type, (e) => {
        e.preventDefault();
        e.stopPropagation();
        els.dropzone.classList.add("is-dragover");
      });
    });

    ["dragleave", "drop"].forEach((type) => {
      els.dropzone.addEventListener(type, (e) => {
        e.preventDefault();
        e.stopPropagation();
        els.dropzone.classList.remove("is-dragover");
      });
    });

    els.dropzone.addEventListener("drop", (e) => {
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleFile(file);
    });
  }

  function bindControls() {
    els.optQuality.addEventListener("input", () => {
      els.qualityValue.textContent = `${els.optQuality.value}%`;
    });

    els.optFormat.addEventListener("change", updateFormatHint);
    els.optResize.addEventListener("change", syncCustomInputs);
    els.optMaxWidth.addEventListener("change", syncCustomInputs);
    els.processBtn.addEventListener("click", processImage);
    els.anotherBtn.addEventListener("click", resetAll);
  }

  bindUpload();
  bindControls();
  bindCompare();
  syncCustomInputs();
  updateFormatHint();
})();
