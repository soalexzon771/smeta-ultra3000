import { generateId, downloadFile, readFile, deepClone } from './utils.js';

export const FORMULAS = [
    { id: 'walls_area', name: 'Площадь стен' },
    { id: 'ceiling_area', name: 'Площадь потолка' },
    { id: 'floor_area', name: 'Площадь пола' },
    { id: 'perimeter', name: 'Периметр' },
    { id: 'fixed', name: 'Фиксированное количество' }
];

export function getDefaultConfig() {
    const units = ['м²', 'м.п.', 'шт', 'комплект'];

    const painting = {
        id: generateId('cat'),
        name: 'Покраска',
        works: [
            { id: generateId('work'), name: 'Покраска стен', unit: 'м²', price: 350, formula: 'walls_area' },
            { id: generateId('work'), name: 'Покраска потолка', unit: 'м²', price: 400, formula: 'ceiling_area' }
        ]
    };

    const wallpaper = {
        id: generateId('cat'),
        name: 'Обои',
        works: [
            { id: generateId('work'), name: 'Поклейка обоев', unit: 'м²', price: 450, formula: 'walls_area' }
        ]
    };

    const tile = {
        id: generateId('cat'),
        name: 'Плитка',
        works: [
            { id: generateId('work'), name: 'Укладка плитки на пол', unit: 'м²', price: 1200, formula: 'floor_area' },
            { id: generateId('work'), name: 'Укладка плитки на стены', unit: 'м²', price: 1400, formula: 'walls_area' }
        ]
    };

    const electrics = {
        id: generateId('cat'),
        name: 'Электрика',
        works: [
            { id: generateId('work'), name: 'Установка розетки', unit: 'шт', price: 600, formula: 'fixed' },
            { id: generateId('work'), name: 'Установка выключателя', unit: 'шт', price: 500, formula: 'fixed' },
            { id: generateId('work'), name: 'Прокладка кабеля', unit: 'м.п.', price: 150, formula: 'fixed' }
        ]
    };

    const plumbing = {
        id: generateId('cat'),
        name: 'Сантехника',
        works: [
            { id: generateId('work'), name: 'Установка смесителя', unit: 'шт', price: 1500, formula: 'fixed' },
            { id: generateId('work'), name: 'Установка унитаза', unit: 'шт', price: 3500, formula: 'fixed' }
        ]
    };

    return {
        version: 1,
        units,
        categories: [painting, wallpaper, tile, electrics, plumbing],
        roomTemplates: [
            { id: generateId('tmpl'), name: 'Кухня', defaultLength: 3.0, defaultWidth: 3.0, defaultHeight: 2.7 },
            { id: generateId('tmpl'), name: 'Спальня', defaultLength: 4.0, defaultWidth: 3.5, defaultHeight: 2.7 },
            { id: generateId('tmpl'), name: 'Ванная', defaultLength: 2.0, defaultWidth: 1.8, defaultHeight: 2.5 },
            { id: generateId('tmpl'), name: 'Коридор', defaultLength: 5.0, defaultWidth: 1.2, defaultHeight: 2.7 },
            { id: generateId('tmpl'), name: 'Гостиная', defaultLength: 5.0, defaultWidth: 4.0, defaultHeight: 2.7 }
        ]
    };
}

export function getDefaultEstimate() {
    return {
        title: 'Новая смета',
        date: new Date().toISOString().slice(0, 10),
        rooms: []
    };
}

export function findWorkById(config, workId) {
    for (const category of config.categories) {
        const work = category.works.find(w => w.id === workId);
        if (work) return { ...work, categoryName: category.name };
    }
    return null;
}

export function findRoomTemplateById(config, templateId) {
    return config.roomTemplates.find(t => t.id === templateId) || null;
}

export function exportConfig(config) {
    const json = JSON.stringify(config, null, 2);
    downloadFile(json, 'config.json', 'application/json');
}

export async function importConfig(file) {
    const text = await readFile(file);
    const parsed = JSON.parse(text);
    if (!parsed.units || !Array.isArray(parsed.categories) || !Array.isArray(parsed.roomTemplates)) {
        throw new Error('Некорректный формат config.json');
    }
    return parsed;
}

export function validateConfig(config) {
    const errors = [];
    if (!Array.isArray(config.units)) errors.push('units должен быть массивом');
    if (!Array.isArray(config.categories)) errors.push('categories должен быть массивом');
    if (!Array.isArray(config.roomTemplates)) errors.push('roomTemplates должен быть массивом');
    return errors;
}

export function createCategory(name) {
    return {
        id: generateId('cat'),
        name: name || 'Новая категория',
        works: []
    };
}

export function createWork(unit = 'м²') {
    return {
        id: generateId('work'),
        name: 'Новая работа',
        unit,
        price: 0,
        formula: 'walls_area'
    };
}

export function createRoomTemplate() {
    return {
        id: generateId('tmpl'),
        name: 'Новая комната',
        defaultLength: 3,
        defaultWidth: 3,
        defaultHeight: 2.7
    };
}

export function cloneConfig(config) {
    return deepClone(config);
}
