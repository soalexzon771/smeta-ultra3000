import { store } from '../state.js';
import { generateId } from '../utils.js';

export function renderUnitsEditor(container) {
    const config = store.getConfig();

    const wrapper = document.createElement('div');
    wrapper.className = 'units-editor';

    const form = document.createElement('div');
    form.className = 'form-row';
    form.innerHTML = `
        <input type="text" class="input" id="new-unit-input" placeholder="Новая единица измерения" maxlength="20">
        <button class="btn btn-primary" id="btn-add-unit">+ Добавить</button>
    `;

    const list = document.createElement('div');
    list.className = 'units-list';
    list.style.marginTop = '1rem';

    function refresh() {
        const cfg = store.getConfig();
        list.innerHTML = '';

        if (!cfg.units.length) {
            list.innerHTML = '<div class="empty-state">Нет единиц измерения</div>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'table';
        table.innerHTML = `
            <thead>
                <tr><th>Единица</th><th class="actions">Действия</th></tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        cfg.units.forEach((unit, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="text" class="input unit-name-input" value="${escapeHtml(unit)}" data-index="${index}"></td>
                <td class="actions">
                    <button class="btn btn-danger btn-sm btn-delete-unit" data-index="${index}">Удалить</button>
                </td>
            `;

            const nameInput = tr.querySelector('.unit-name-input');
            nameInput.addEventListener('change', () => {
                const newName = nameInput.value.trim();
                if (newName) {
                    const updated = store.getConfig();
                    updated.units[index] = newName;
                    store.setConfig(updated);
                } else {
                    refresh();
                }
            });

            const deleteBtn = tr.querySelector('.btn-delete-unit');
            deleteBtn.addEventListener('click', () => {
                const updated = store.getConfig();
                updated.units.splice(index, 1);
                store.setConfig(updated);
            });

            tbody.appendChild(tr);
        });

        list.appendChild(table);
    }

    const addBtn = form.querySelector('#btn-add-unit');
    const input = form.querySelector('#new-unit-input');

    function addUnit() {
        const value = input.value.trim();
        if (!value) return;

        const updated = store.getConfig();
        if (!updated.units.includes(value)) {
            updated.units.push(value);
            store.setConfig(updated);
            input.value = '';
            input.focus();
        } else {
            alert('Такая единица измерения уже есть');
        }
    }

    addBtn.addEventListener('click', addUnit);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addUnit();
    });

    wrapper.appendChild(form);
    wrapper.appendChild(list);
    container.innerHTML = '';
    container.appendChild(wrapper);

    refresh();
    return store.subscribe('config', refresh);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
