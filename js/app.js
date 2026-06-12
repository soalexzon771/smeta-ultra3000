import { store } from './state.js';
import { getDefaultConfig, getDefaultEstimate, migrateConfig } from './config.js';
import { initAdmin } from './admin/admin.js';
import { initEstimate } from './estimate/estimate.js';

document.addEventListener('DOMContentLoaded', () => {
    // Вкладки
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(`${tab}-panel`).classList.add('active');
        });
    });

    // Загрузка состояния
    store.loadPersisted(() => migrateConfig(getDefaultConfig()), getDefaultEstimate);

    // Инициализация модулей
    initAdmin();
    initEstimate();
});
