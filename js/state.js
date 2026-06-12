import { deepClone } from './utils.js';

const STORAGE_KEYS = {
    config: 'smeta_config',
    estimate: 'smeta_estimate'
};

class Store {
    constructor() {
        this.state = {
            config: null,
            estimate: null
        };
        this.listeners = {
            config: [],
            estimate: [],
            any: []
        };
    }

    subscribe(key, callback) {
        if (!this.listeners[key]) this.listeners[key] = [];
        this.listeners[key].push(callback);
        return () => {
            this.listeners[key] = this.listeners[key].filter(cb => cb !== callback);
        };
    }

    notify(key) {
        const value = this.state[key];
        (this.listeners[key] || []).forEach(cb => cb(value));
        this.listeners.any.forEach(cb => cb(key, value));
    }

    setConfig(config) {
        this.state.config = deepClone(config);
        this.persist('config');
        this.notify('config');
    }

    getConfig() {
        return deepClone(this.state.config);
    }

    setEstimate(estimate) {
        this.state.estimate = deepClone(estimate);
        this.persist('estimate');
        this.notify('estimate');
    }

    getEstimate() {
        return deepClone(this.state.estimate);
    }

    persist(key) {
        try {
            localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(this.state[key]));
        } catch (e) {
            console.warn(`Не удалось сохранить ${key} в localStorage`, e);
        }
    }

    loadPersisted(createDefaultConfig, createDefaultEstimate) {
        let config = null;
        let estimate = null;

        try {
            const configRaw = localStorage.getItem(STORAGE_KEYS.config);
            if (configRaw) config = JSON.parse(configRaw);
        } catch (e) {
            console.warn('Не удалось загрузить конфиг из localStorage', e);
        }

        try {
            const estimateRaw = localStorage.getItem(STORAGE_KEYS.estimate);
            if (estimateRaw) estimate = JSON.parse(estimateRaw);
        } catch (e) {
            console.warn('Не удалось загрузить смету из localStorage', e);
        }

        this.state.config = config || createDefaultConfig();
        this.state.estimate = estimate || createDefaultEstimate();

        this.notify('config');
        this.notify('estimate');
    }

    clearStorage() {
        localStorage.removeItem(STORAGE_KEYS.config);
        localStorage.removeItem(STORAGE_KEYS.estimate);
    }
}

export const store = new Store();
