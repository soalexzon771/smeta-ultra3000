import { store } from '../state.js';
import { getDefaultConfig, exportConfig, importConfig, validateConfig, migrateConfig } from '../config.js';
import { renderUnitsEditor } from './units.js';
import { renderCategoriesEditor } from './categories.js';
import { renderRoomTemplatesEditor } from './room-templates.js';

export function initAdmin() {
    const unitsContainer = document.getElementById('units-editor');
    const categoriesContainer = document.getElementById('categories-editor');
    const roomTemplatesContainer = document.getElementById('room-templates-editor');

    renderUnitsEditor(unitsContainer);
    renderCategoriesEditor(categoriesContainer);
    renderRoomTemplatesEditor(roomTemplatesContainer);

    document.getElementById('btn-download-config').addEventListener('click', () => {
        exportConfig(store.getConfig());
    });

    document.getElementById('input-upload-config').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const rawConfig = await importConfig(file);
            const config = migrateConfig(rawConfig);
            const errors = validateConfig(config);
            if (errors.length) {
                alert('Ошибки в файле конфигурации:\n' + errors.join('\n'));
                return;
            }
            store.setConfig(config);
            alert('Конфигурация загружена');
        } catch (err) {
            alert('Не удалось загрузить конфигурацию: ' + err.message);
        } finally {
            e.target.value = '';
        }
    });

    document.getElementById('btn-reset-config').addEventListener('click', () => {
        if (confirm('Сбросить все настройки к значениям по умолчанию? Текущая конфигурация будет потеряна.')) {
            store.setConfig(getDefaultConfig());
        }
    });
}
