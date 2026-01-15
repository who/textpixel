// TextPixel - Text to Color Image Generator
// Main application entry point

document.addEventListener('DOMContentLoaded', () => {
    // Encode elements
    const textInput = document.getElementById('text-input');
    const fileInput = document.getElementById('file-input');
    const generateBtn = document.getElementById('generate-btn');
    const downloadBtn = document.getElementById('download-btn');
    const canvas = document.getElementById('output-canvas');
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const stats = document.getElementById('stats');
    const ctx = canvas.getContext('2d');
    const tooltip = document.getElementById('tooltip');

    // Zoom controls
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const zoomResetBtn = document.getElementById('zoom-reset-btn');
    const zoomLevelEl = document.getElementById('zoom-level');

    // Algorithm selector
    const algorithmSelect = document.getElementById('algorithm-select');

    // Decode elements
    const decodeFileInput = document.getElementById('decode-file-input');
    const decodeCanvas = document.getElementById('decode-canvas');
    const decodeOutput = document.getElementById('decode-output');
    const decodeStats = document.getElementById('decode-stats');
    const decodeCtx = decodeCanvas.getContext('2d');

    // Zoom/pan state
    let zoom = 1;
    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let startX = 0;
    let startY = 0;
    let currentText = '';

    // Debounce timer for real-time preview
    let previewTimer = null;

    // Handle file upload
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                textInput.value = event.target.result;
                updateStats();
                schedulePreview();
            };
            reader.readAsText(file);
        }
    });

    // Update stats and schedule preview on text input
    textInput.addEventListener('input', () => {
        updateStats();
        schedulePreview();
    });

    // Generate image button (immediate, no debounce)
    generateBtn.addEventListener('click', generateImage);

    // Download image
    downloadBtn.addEventListener('click', downloadImage);

    // Zoom controls
    zoomInBtn.addEventListener('click', () => setZoom(zoom * 1.5));
    zoomOutBtn.addEventListener('click', () => setZoom(zoom / 1.5));
    zoomResetBtn.addEventListener('click', () => {
        zoom = 1;
        panX = 0;
        panY = 0;
        updateCanvasTransform();
    });

    // Pan functionality
    canvasWrapper.addEventListener('mousedown', (e) => {
        if (e.target === canvas || e.target === canvasWrapper) {
            isPanning = true;
            startX = e.clientX - panX;
            startY = e.clientY - panY;
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isPanning) {
            panX = e.clientX - startX;
            panY = e.clientY - startY;
            updateCanvasTransform();
        }
    });

    document.addEventListener('mouseup', () => {
        isPanning = false;
    });

    // Mouse wheel zoom
    canvasWrapper.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(zoom * delta);
    });

    // Tooltip on hover
    canvas.addEventListener('mousemove', (e) => {
        if (!currentText || canvas.width === 0) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);

        if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
            const idx = y * canvas.width + x;
            if (idx < currentText.length) {
                const char = currentText[idx];
                const code = char.charCodeAt(0);
                const displayChar = code === 32 ? 'Space' : char;
                tooltip.textContent = `"${displayChar}" (ASCII ${code})`;
                tooltip.style.left = (e.clientX - canvasWrapper.getBoundingClientRect().left + 10) + 'px';
                tooltip.style.top = (e.clientY - canvasWrapper.getBoundingClientRect().top + 10) + 'px';
                tooltip.classList.add('visible');
            } else {
                tooltip.classList.remove('visible');
            }
        }
    });

    canvas.addEventListener('mouseleave', () => {
        tooltip.classList.remove('visible');
    });

    function setZoom(newZoom) {
        zoom = Math.max(0.1, Math.min(20, newZoom));
        updateCanvasTransform();
    }

    function updateCanvasTransform() {
        canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
        zoomLevelEl.textContent = Math.round(zoom * 100) + '%';
    }

    function schedulePreview() {
        clearTimeout(previewTimer);
        previewTimer = setTimeout(generateImage, 300);
    }

    function updateStats() {
        const text = textInput.value;
        const charCount = text.length;
        if (charCount === 0) {
            stats.textContent = '';
            return;
        }
        const size = Math.ceil(Math.sqrt(charCount));
        stats.textContent = `${charCount.toLocaleString()} characters → ${size}×${size} pixels`;
    }

    function generateImage() {
        const text = textInput.value;
        if (!text) {
            canvas.width = 0;
            canvas.height = 0;
            downloadBtn.disabled = true;
            currentText = '';
            return;
        }

        currentText = text;
        const charCount = text.length;
        const size = Math.ceil(Math.sqrt(charCount));

        canvas.width = size;
        canvas.height = size;

        const imageData = ctx.createImageData(size, size);
        const data = imageData.data;

        for (let i = 0; i < size * size; i++) {
            const char = i < text.length ? text[i] : ' ';
            const color = ColorMap.charToColor(char);
            const idx = i * 4;
            data[idx] = color.r;
            data[idx + 1] = color.g;
            data[idx + 2] = color.b;
            data[idx + 3] = 255;
        }

        ctx.putImageData(imageData, 0, 0);
        downloadBtn.disabled = false;
    }

    function downloadImage() {
        const link = document.createElement('a');
        link.download = 'textpixel.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    // Handle decode file upload
    decodeFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const img = new Image();
            img.onload = () => {
                decodeImage(img);
            };
            img.src = URL.createObjectURL(file);
        }
    });

    function decodeImage(img) {
        decodeCanvas.width = img.width;
        decodeCanvas.height = img.height;
        decodeCtx.drawImage(img, 0, 0);

        const imageData = decodeCtx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;
        const totalPixels = img.width * img.height;

        let text = '';
        let exactMatches = 0;

        for (let i = 0; i < totalPixels; i++) {
            const idx = i * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const result = ColorMap.colorToChar(r, g, b);
            text += result.char;
            if (result.exact) exactMatches++;
        }

        // Trim trailing padding (spaces from square padding)
        const trimmedText = text.replace(/\s+$/, '');

        decodeOutput.value = trimmedText;

        // Calculate confidence
        const confidence = (exactMatches / totalPixels) * 100;
        let confidenceClass = 'high';
        let confidenceLabel = 'High';
        if (confidence < 99) {
            confidenceClass = 'medium';
            confidenceLabel = 'Medium';
        }
        if (confidence < 90) {
            confidenceClass = 'low';
            confidenceLabel = 'Low';
        }

        decodeStats.innerHTML = `${trimmedText.length.toLocaleString()} characters decoded from ${img.width}×${img.height} image <span class="confidence ${confidenceClass}">${confidenceLabel} (${confidence.toFixed(1)}%)</span>`;
    }

    // Populate algorithm selector
    function initAlgorithmSelector() {
        const algorithms = ColorMap.getAlgorithms();
        algorithms.forEach(alg => {
            const option = document.createElement('option');
            option.value = alg.id;
            option.textContent = alg.name;
            option.title = alg.description;
            algorithmSelect.appendChild(option);
        });
    }

    // Handle algorithm change
    algorithmSelect.addEventListener('change', () => {
        ColorMap.setAlgorithm(algorithmSelect.value);
        schedulePreview();
    });

    // Initialize
    initAlgorithmSelector();
    updateStats();
});
