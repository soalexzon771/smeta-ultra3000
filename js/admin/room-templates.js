import { store } from '../state.js';
import { createRoomTemplate } from '../config.js';
import { parseNumber } from '../utils.js';

export function renderRoomTemplatesEditor(container) {
    function refresh() {
        const config = store.getConfig();
        container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'room-templates-editor';

        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary btn-block';
        addBtn.textContent = '+ Добавить шаблон';
        addBtn.addEventListener('click', () => {
            const updated = store.getConfig();
            updated.roomTemplates.push(createRoomTemplate());
            store.setConfig(updated);
        });

        if (!config.roomTemplates.length) {
            wrapper.innerHTML = '<div class="empty-state">Нет шаблонов комнат</div>';
            wrapper.appendChild(addBtn);
            container.appendChild(wrapper);
            return;
        }

        const table = document.createElement('table');
        table.className = 'table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Название</th>
                    <th>Длина</th>
                    <th>Ширина</th>
                    <th>Высота</th>
                    <th class="actions">Действия</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        config.roomTemplates.forEach((tmpl, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="text" class="input tmpl-name" value="${escapeHtml(tmpl.name)}" data-index="${index}"></td>
                <td><input type="number" class="input tmpl-length" value="${tmpl.defaultLength}" step="0.01" data-index="${index}"></td>
                <td><input type="number" class="input tmpl-width" value="${tmpl.defaultWidth}" step="0.01" data-index="${index}"></td>
                <td><input type="number" class="input tmpl-height" value="${tmpl.defaultHeight}" step="0.01" data-index="${index}"></td>
                <td class="actions"><button class="btn btn-danger btn-sm btn-delete-tmpl" data-index="${index}">Удалить</button></td>
            `;

            const updateField = (field, value) => {
                const updated = store.getConfig();
                updated.roomTemplates[index][field] = value;
                store.setConfig(updated);
            };

            tr.querySelector('.tmpl-name').addEventListener('change', (e) => updateField('name', e.target.value.trim() || 'Без названия'));
            tr.querySelector('.tmpl-length').addEventListener('change', (e) => updateField('defaultLength', parseNumber(e.target.value)));
            tr.querySelector('.tmpl-width').addEventListener('change', (e) => updateField('defaultWidth', parseNumber(e.target.value)));
            tr.querySelector('.tmpl-height').addEventListener('change', (e) => updateField('defaultHeight', parseNumber(e.target.value)));

            tr.querySelector('.btn-delete-tmpl').addEventListener('click', () => {
                if (confirm('Удалить шаблон?')) {
                    const updated = store.getConfig();
                    updated.roomTemplates.splice(index, 1);
                    store.setConfig(updated);
                }
            });

            tbody.appendChild(tr);
        });

        wrapper.appendChild(table);
        wrapper.appendChild(addBtn);
        container.appendChild(wrapper);
    }

    refresh();
    return store.subscribe('config', refresh);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
