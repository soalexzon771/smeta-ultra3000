import { store } from '../state.js';
import { generateId, parseNumber } from '../utils.js';

const STEP_OPTIONS = [0.001, 0.01, 0.1, 1, 10];

export function renderUnitsEditor(container) {
    const config = store.getConfig();

    const wrapper = document.createElement('div');
    wrapper.className = 'units-editor';

    const form = document.createElement('div');
    form.className = 'form-row';
    form.innerHTML = `
        <input type="text" class="input" id="new-unit-input" placeholder="Новая единица измерения" maxlength="20" style="flex:2;">
        <select class="select" id="new-unit-step" style="flex:1;">
            ${STEP_OPTIONS.map(s => `<option value="${s}">Шаг: ${s}</option>`).join('')}
        </select>
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
                <tr><th>Единица</th><th>Шаг</th><th class="actions">Действия</th></tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        cfg.units.forEach((unit, index) => {
            const unitName = typeof unit === 'string' ? unit : (unit?.name || '');
            const unitStep = typeof unit === 'object' && unit ? unit.step : 0.01;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="text" class="input unit-name-input" value="${escapeHtml(unitName)}" data-index="${index}"></td>
                <td>
                    <select class="input unit-step-select" data-index="${index}">
                        ${STEP_OPTIONS.map(s => `<option value="${s}" ${s === unitStep ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </td>
                <td class="actions">
                    <button class="btn btn-danger btn-sm btn-delete-unit" data-index="${index}">Удалить</button>
                </td>
            `;

            const nameInput = tr.querySelector('.unit-name-input');
            nameInput.addEventListener('change', () => {
                const newName = nameInput.value.trim();
                if (newName) {
                    const updated = store.getConfig();
                    if (typeof updated.units[index] === 'string') {
                        updated.units[index] = { name: newName, step: 0.01 };
                    } else {
                        updated.units[index].name = newName;
                    }
                    store.setConfig(updated);
                } else {
                    refresh();
                }
            });

            const stepSelect = tr.querySelector('.unit-step-select');
            stepSelect.addEventListener('change', () => {
                const updated = store.getConfig();
                if (typeof updated.units[index] === 'string') {
                    updated.units[index] = { name: updated.units[index], step: parseNumber(stepSelect.value) };
                } else {
                    updated.units[index].step = parseNumber(stepSelect.value);
                }
                store.setConfig(updated);
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
    const stepSelect = form.querySelector('#new-unit-step');

    function addUnit() {
        const value = input.value.trim();
        if (!value) return;

        const updated = store.getConfig();
        const exists = updated.units.some(u => {
            const name = typeof u === 'string' ? u : u?.name;
            return name === value;
        });
        if (!exists) {
            updated.units.push({ name: value, step: parseNumber(stepSelect.value) });
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
