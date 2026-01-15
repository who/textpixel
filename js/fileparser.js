// TextPixel - File Parser Module
// Client-side parsing for TXT, PDF, EPUB, and DOCX

const FileParser = (function() {
    // Set PDF.js worker
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    async function parseFile(file) {
        const extension = file.name.split('.').pop().toLowerCase();

        switch (extension) {
            case 'txt':
                return parseTxt(file);
            case 'pdf':
                return parsePdf(file);
            case 'epub':
                return parseEpub(file);
            case 'docx':
                return parseDocx(file);
            default:
                throw new Error(`Unsupported file format: .${extension}`);
        }
    }

    function parseTxt(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read TXT file'));
            reader.readAsText(file);
        });
    }

    async function parsePdf(file) {
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js library not loaded');
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            text += pageText + '\n';
        }

        return text.trim();
    }

    async function parseEpub(file) {
        if (typeof JSZip === 'undefined') {
            throw new Error('JSZip library not loaded');
        }

        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        let text = '';

        // Find content files (XHTML/HTML)
        const contentFiles = [];
        zip.forEach((path, entry) => {
            if (path.match(/\.(xhtml|html|htm)$/i) && !entry.dir) {
                contentFiles.push(path);
            }
        });

        // Sort by path to maintain chapter order
        contentFiles.sort();

        for (const path of contentFiles) {
            const content = await zip.file(path).async('string');
            // Strip HTML tags and decode entities
            const stripped = stripHtml(content);
            if (stripped.trim()) {
                text += stripped + '\n\n';
            }
        }

        return text.trim();
    }

    async function parseDocx(file) {
        if (typeof JSZip === 'undefined') {
            throw new Error('JSZip library not loaded');
        }

        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);

        // DOCX stores content in word/document.xml
        const documentXml = zip.file('word/document.xml');
        if (!documentXml) {
            throw new Error('Invalid DOCX file: missing document.xml');
        }

        const content = await documentXml.async('string');

        // Parse XML and extract text from <w:t> elements
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'application/xml');

        let text = '';
        const paragraphs = doc.getElementsByTagName('w:p');

        for (const para of paragraphs) {
            const textNodes = para.getElementsByTagName('w:t');
            let paraText = '';
            for (const node of textNodes) {
                paraText += node.textContent || '';
            }
            if (paraText) {
                text += paraText + '\n';
            }
        }

        return text.trim();
    }

    function stripHtml(html) {
        // Create a temporary element to parse HTML
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // Remove script and style elements
        const scripts = temp.querySelectorAll('script, style');
        scripts.forEach(el => el.remove());

        // Get text content
        let text = temp.textContent || temp.innerText || '';

        // Decode common HTML entities
        text = text.replace(/&nbsp;/g, ' ')
                   .replace(/&amp;/g, '&')
                   .replace(/&lt;/g, '<')
                   .replace(/&gt;/g, '>')
                   .replace(/&quot;/g, '"')
                   .replace(/&#39;/g, "'");

        // Normalize whitespace
        text = text.replace(/\s+/g, ' ').trim();

        return text;
    }

    function getSupportedFormats() {
        return [
            { ext: 'txt', name: 'Plain Text', mime: 'text/plain' },
            { ext: 'pdf', name: 'PDF Document', mime: 'application/pdf' },
            { ext: 'epub', name: 'EPUB eBook', mime: 'application/epub+zip' },
            { ext: 'docx', name: 'Word Document', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
        ];
    }

    return {
        parseFile,
        getSupportedFormats
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileParser;
}
