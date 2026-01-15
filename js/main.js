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

    // Gallery elements
    const saveGalleryBtn = document.getElementById('save-gallery-btn');
    const galleryGrid = document.getElementById('gallery-grid');
    const galleryCount = document.getElementById('gallery-count');
    const clearGalleryBtn = document.getElementById('clear-gallery-btn');

    // Zoom/pan state
    let zoom = 1;
    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let startX = 0;
    let startY = 0;
    let currentText = '';

    // Touch gesture state
    let lastTouchDistance = 0;
    let touchStartTime = 0;
    let touchStartPos = { x: 0, y: 0 };
    const TAP_THRESHOLD = 200; // ms
    const TAP_MOVE_THRESHOLD = 10; // px

    // Debounce timer for real-time preview
    let previewTimer = null;

    // GPU acceleration state
    let useGPU = WebGLEncoder.isAvailable();
    let gpuCanvas = null;
    if (useGPU) {
        gpuCanvas = document.createElement('canvas');
        gpuCanvas.style.display = 'none';
        document.body.appendChild(gpuCanvas);
    }

    // Handle file upload (supports TXT, PDF, EPUB, DOCX)
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                stats.textContent = 'Parsing file...';
                const text = await FileParser.parseFile(file);
                textInput.value = text;
                updateStats();
                schedulePreview();
            } catch (error) {
                stats.textContent = `Error: ${error.message}`;
                console.error('File parsing error:', error);
            }
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

    // Touch event helpers
    function getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function showTooltipAtPosition(clientX, clientY) {
        if (!currentText || canvas.width === 0) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = Math.floor((clientX - rect.left) * scaleX);
        const y = Math.floor((clientY - rect.top) * scaleY);

        if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
            const idx = y * canvas.width + x;
            if (idx < currentText.length) {
                const char = currentText[idx];
                const code = char.charCodeAt(0);
                const displayChar = code === 32 ? 'Space' : char;
                tooltip.textContent = `"${displayChar}" (ASCII ${code})`;
                tooltip.style.left = (clientX - canvasWrapper.getBoundingClientRect().left + 10) + 'px';
                tooltip.style.top = (clientY - canvasWrapper.getBoundingClientRect().top - 30) + 'px';
                tooltip.classList.add('visible');
            } else {
                tooltip.classList.remove('visible');
            }
        }
    }

    // Touch start - handle pan and pinch initialization
    canvasWrapper.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            // Single finger - prepare for pan or tap
            isPanning = true;
            startX = e.touches[0].clientX - panX;
            startY = e.touches[0].clientY - panY;
            touchStartTime = Date.now();
            touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            // Two fingers - prepare for pinch zoom
            isPanning = false;
            lastTouchDistance = getTouchDistance(e.touches);
        }
    }, { passive: true });

    // Touch move - handle pan and pinch zoom
    canvasWrapper.addEventListener('touchmove', (e) => {
        e.preventDefault();

        if (e.touches.length === 1 && isPanning) {
            // Single finger pan
            panX = e.touches[0].clientX - startX;
            panY = e.touches[0].clientY - startY;
            updateCanvasTransform();
        } else if (e.touches.length === 2) {
            // Pinch zoom
            const currentDistance = getTouchDistance(e.touches);
            if (lastTouchDistance > 0) {
                const scale = currentDistance / lastTouchDistance;
                setZoom(zoom * scale);
            }
            lastTouchDistance = currentDistance;
        }
    }, { passive: false });

    // Touch end - handle tap detection and cleanup
    canvasWrapper.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) {
            // All fingers lifted
            const touchDuration = Date.now() - touchStartTime;
            const touchEndPos = e.changedTouches[0];
            const moveDistance = Math.sqrt(
                Math.pow(touchEndPos.clientX - touchStartPos.x, 2) +
                Math.pow(touchEndPos.clientY - touchStartPos.y, 2)
            );

            // Detect tap (short duration, minimal movement)
            if (touchDuration < TAP_THRESHOLD && moveDistance < TAP_MOVE_THRESHOLD) {
                showTooltipAtPosition(touchEndPos.clientX, touchEndPos.clientY);
                // Hide tooltip after 2 seconds
                setTimeout(() => tooltip.classList.remove('visible'), 2000);
            }

            isPanning = false;
            lastTouchDistance = 0;
        } else if (e.touches.length === 1) {
            // One finger still down after lifting another
            isPanning = true;
            startX = e.touches[0].clientX - panX;
            startY = e.touches[0].clientY - panY;
            lastTouchDistance = 0;
        }
    }, { passive: true });

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

        // Try GPU-accelerated encoding first
        if (useGPU && gpuCanvas) {
            const success = WebGLEncoder.encode(gpuCanvas, text, ColorMap.charToColor);
            if (success) {
                // Copy from WebGL canvas to display canvas
                canvas.width = size;
                canvas.height = size;
                ctx.drawImage(gpuCanvas, 0, 0);
                downloadBtn.disabled = false;
                saveGalleryBtn.disabled = false;
                return;
            }
            // Fall through to CPU if GPU fails
        }

        // CPU fallback
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
        saveGalleryBtn.disabled = false;
    }

    function downloadImage() {
        const link = document.createElement('a');
        link.download = 'textpixel.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    // Decode progress elements
    const decodeProgress = document.getElementById('decode-progress');
    const decodeProgressBar = document.getElementById('decode-progress-bar');
    const decodeProgressText = document.getElementById('decode-progress-text');

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

    async function decodeImage(img) {
        decodeCanvas.width = img.width;
        decodeCanvas.height = img.height;
        decodeCtx.drawImage(img, 0, 0);

        const imageData = decodeCtx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;
        const totalPixels = img.width * img.height;

        // Show progress bar
        decodeProgress.classList.add('active');
        decodeProgressBar.style.width = '0%';
        decodeProgressText.textContent = '0%';
        decodeStats.innerHTML = '';
        decodeOutput.value = '';

        const chars = [];
        let exactMatches = 0;

        // Process in chunks to allow UI updates
        const chunkSize = 10000;
        let processed = 0;

        function updateProgress(percent) {
            decodeProgressBar.style.width = percent + '%';
            decodeProgressText.textContent = Math.round(percent) + '%';
        }

        await new Promise((resolve) => {
            function processChunk() {
                const end = Math.min(processed + chunkSize, totalPixels);

                for (let i = processed; i < end; i++) {
                    const idx = i * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];

                    const result = ColorMap.colorToChar(r, g, b);
                    chars.push(result.char);
                    if (result.exact) exactMatches++;
                }

                processed = end;
                const percent = (processed / totalPixels) * 100;
                updateProgress(percent);

                if (processed < totalPixels) {
                    setTimeout(processChunk, 0);
                } else {
                    resolve();
                }
            }

            processChunk();
        });

        // Hide progress bar
        decodeProgress.classList.remove('active');

        const text = chars.join('');
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

    // Algorithm description element
    const algorithmDescription = document.getElementById('algorithm-description');

    // Populate algorithm selector
    function initAlgorithmSelector() {
        const algorithms = ColorMap.getAlgorithms();
        algorithms.forEach(alg => {
            const option = document.createElement('option');
            option.value = alg.id;
            option.textContent = alg.name;
            option.dataset.description = alg.description;
            algorithmSelect.appendChild(option);
        });
        updateAlgorithmDescription();
    }

    function updateAlgorithmDescription() {
        const selected = algorithmSelect.options[algorithmSelect.selectedIndex];
        if (selected && selected.dataset.description) {
            algorithmDescription.textContent = selected.dataset.description;
        }
    }

    // Handle algorithm change
    algorithmSelect.addEventListener('change', () => {
        ColorMap.setAlgorithm(algorithmSelect.value);
        updateAlgorithmDescription();
        schedulePreview();
    });

    // Gallery functions
    async function saveToGallery() {
        if (canvas.width === 0) return;

        try {
            const imageData = canvas.toDataURL('image/png');
            const preview = currentText.substring(0, 50) + (currentText.length > 50 ? '...' : '');

            await Gallery.saveImage(imageData, {
                charCount: currentText.length,
                dimensions: `${canvas.width}x${canvas.height}`,
                algorithm: ColorMap.getAlgorithm(),
                preview: preview
            });

            refreshGallery();
        } catch (error) {
            console.error('Failed to save to gallery:', error);
        }
    }

    async function refreshGallery() {
        try {
            const images = await Gallery.getImages();
            const count = images.length;

            galleryCount.textContent = count > 0 ? `(${count})` : '';

            if (count === 0) {
                galleryGrid.innerHTML = '<div class="gallery-empty">No images saved yet</div>';
                return;
            }

            galleryGrid.innerHTML = '';
            images.forEach(item => {
                const el = createGalleryItem(item);
                galleryGrid.appendChild(el);
            });
        } catch (error) {
            console.error('Failed to load gallery:', error);
            galleryGrid.innerHTML = '<div class="gallery-empty">Failed to load gallery</div>';
        }
    }

    function createGalleryItem(item) {
        const div = document.createElement('div');
        div.className = 'gallery-item';

        const img = document.createElement('img');
        img.src = item.imageData;
        img.alt = 'Generated image';

        const meta = document.createElement('div');
        meta.className = 'gallery-item-meta';
        meta.innerHTML = `
            <span class="chars">${item.charCount.toLocaleString()} chars</span>
            <span class="time">${Gallery.formatTimestamp(item.timestamp)}</span>
        `;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'gallery-item-delete';
        deleteBtn.textContent = 'x';
        deleteBtn.onclick = async (e) => {
            e.stopPropagation();
            await Gallery.deleteImage(item.id);
            refreshGallery();
        };

        div.appendChild(img);
        div.appendChild(meta);
        div.appendChild(deleteBtn);

        // Click to download
        div.onclick = () => {
            const link = document.createElement('a');
            link.download = `textpixel-${item.id}.png`;
            link.href = item.imageData;
            link.click();
        };

        return div;
    }

    async function clearGallery() {
        if (confirm('Delete all saved images?')) {
            await Gallery.clearAll();
            refreshGallery();
        }
    }

    // Gallery event listeners
    saveGalleryBtn.addEventListener('click', saveToGallery);
    clearGalleryBtn.addEventListener('click', clearGallery);

    // Initialize
    initAlgorithmSelector();
    updateStats();
    refreshGallery();
});
