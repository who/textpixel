// TextPixel - Gallery Storage Module
// Store and retrieve generated images using IndexedDB

const Gallery = (function() {
    const DB_NAME = 'textpixel-gallery';
    const DB_VERSION = 1;
    const STORE_NAME = 'images';
    let db = null;

    async function initDB() {
        if (db) return db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(new Error('Failed to open gallery database'));

            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };

            request.onupgradeneeded = (e) => {
                const database = e.target.result;
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    const store = database.createObjectStore(STORE_NAME, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    async function saveImage(imageDataUrl, metadata) {
        const database = await initDB();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            const record = {
                imageData: imageDataUrl,
                timestamp: Date.now(),
                charCount: metadata.charCount || 0,
                dimensions: metadata.dimensions || '0x0',
                algorithm: metadata.algorithm || 'hsl',
                preview: metadata.preview || ''
            };

            const request = store.add(record);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Failed to save image'));
        });
    }

    async function getImages(limit = 50) {
        const database = await initDB();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('timestamp');
            const images = [];

            const request = index.openCursor(null, 'prev');

            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor && images.length < limit) {
                    images.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(images);
                }
            };

            request.onerror = () => reject(new Error('Failed to retrieve images'));
        });
    }

    async function getImage(id) {
        const database = await initDB();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Failed to retrieve image'));
        });
    }

    async function deleteImage(id) {
        const database = await initDB();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to delete image'));
        });
    }

    async function clearAll() {
        const database = await initDB();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to clear gallery'));
        });
    }

    async function getCount() {
        const database = await initDB();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Failed to count images'));
        });
    }

    function formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return {
        initDB,
        saveImage,
        getImages,
        getImage,
        deleteImage,
        clearAll,
        getCount,
        formatTimestamp
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Gallery;
}
