/* DataCache - In-memory + sessionStorage cache for API responses */

const DataCache = {
    _memory: {},

    /** Get cached data (checks memory first, then sessionStorage) */
    get(key) {
        if (this._memory[key]) return this._memory[key];
        try {
            const stored = sessionStorage.getItem('ffw_' + key);
            if (stored) {
                const parsed = JSON.parse(stored);
                this._memory[key] = parsed;
                return parsed;
            }
        } catch (e) {}
        return null;
    },

    /** Set cached data (both memory and sessionStorage) */
    set(key, data) {
        this._memory[key] = data;
        try {
            sessionStorage.setItem('ffw_' + key, JSON.stringify(data));
        } catch (e) {
            // sessionStorage full or unavailable, memory cache still works
        }
    },

    /** Generate a cache key from API URL */
    keyFrom(url) {
        return url.replace(/https?:\/\/[^/]+/, '').replace(/[^a-zA-Z0-9]/g, '_');
    },

    /** Cached fetch - returns cached data if available, otherwise fetches */
    async fetch(url) {
        const key = this.keyFrom(url);
        const cached = this.get(key);
        if (cached) return { data: cached, error: null, fromCache: true };

        const { data, error } = await apiFetch(url);
        if (data && !error) {
            this.set(key, data);
        }
        return { data, error, fromCache: false };
    },

    /** Preload - fetch in background without blocking */
    preload(url) {
        const key = this.keyFrom(url);
        if (this.get(key)) return; // Already cached
        apiFetch(url).then(({ data, error }) => {
            if (data && !error) this.set(key, data);
        }).catch(() => {});
    },

    /** Clear all cache */
    clear() {
        this._memory = {};
        try {
            Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith('ffw_')) sessionStorage.removeItem(key);
            });
        } catch (e) {}
    }
};
