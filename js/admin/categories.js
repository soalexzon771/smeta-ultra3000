import { store } from '../state.js';
import { createCategory, createWork, FORMULAS } from '../config.js';
import { parseNumber } from '../utils.js';

export function renderCategoriesEditor(container) {
    function refresh() {
        const config = store.getConfig();
        container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'categories-editor';

        const addCategoryBtn = document.createElement('button');
        addCategoryBtn.className = 'btn btn-primary';
        addCategoryBtn.textContent = '+ Добавить категорию';
        addCategoryBtn.addEventListener('click', () => {
            const updated = store.getConfig();
            updated.categories.push(createCategory());
            store.setConfig(updated);
        });

        wrapper.appendChild(addCategoryBtn);

        if (!config.categories.length) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.style.marginTop = '1rem';
            empty.textContent = 'Нет категорий работ';
            wrapper.appendChild(empty);
            container.appendChild(wrapper);
            return;
        }

        config.categories.forEach((category, catIndex) => {
            const block = document.createElement('div');
            block.className = 'category-block';

            const header = document.createElement('div');
            header.className = 'category-header';
            header.innerHTML = `
                <input type="text" class="input category-title-input" value="${escapeHtml(category.name)}" data-index="${catIndex}" style="font-weight:600; border:none; background:transparent; font-size:1rem;">
                <button class="btn btn-danger btn-sm btn-delete-category" data-index="${catIndex}">Удалить категорию</button>
            `;

            header.querySelector('.category-title-input').addEventListener('change', (e) => {
                const updated = store.getConfig();
                updated.categories[catIndex].name = e.target.value.trim() || 'Без названия';
                store.setConfig(updated);
            });

            header.querySelector('.btn-delete-category').addEventListener('click', () => {
                if (confirm('Удалить категорию и все её работы?')) {
                    const updated = store.getConfig();
                    updated.categories.splice(catIndex, 1);
                    store.setConfig(updated);
                }
            });

            const body = document.createElement('div');
            body.className = 'category-body';

            if (!category.works.length) {
                body.innerHTML = '<div class="empty-state">Нет работ в этой категории</div>';
            } else {
                const table = document.createElement('table');
                table.className = 'table';
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th>Название</th>
                            <th>Ед. изм.</th>
                            <th>Цена</th>
                            <th>Формула объёма</th>
                            <th class="actions">Действия</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                `;
                const tbody = table.querySelector('tbody');

                category.works.forEach((work, workIndex) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><input type="text" class="input work-name" value="${escapeHtml(work.name)}" data-cat="${catIndex}" data-work="${workIndex}"></td>
                        <td>${renderUnitSelect(config.units, work.unit, catIndex, workIndex)}</td>
                        <td><input type="number" class="input work-price" value="${work.price}" step="0.01" data-cat="${catIndex}" data-work="${workIndex}"></td>
                        <td>${renderFormulaSelect(work.formula, catIndex, workIndex)}</td>
                        <td class="actions"><button class="btn btn-danger btn-sm btn-delete-work" data-cat="${catIndex}" data-work="${workIndex}">Удалить</button></td>
                    `;

                    tr.querySelector('.work-name').addEventListener('change', (e) => updateWork(catIndex, workIndex, 'name', e.target.value.trim() || 'Без названия'));
                    tr.querySelector('.work-price').addEventListener('change', (e) => updateWork(catIndex, workIndex, 'price', parseNumber(e.target.value)));
                    tr.querySelector('.work-unit-select').addEventListener('change', (e) => updateWork(catIndex, workIndex, 'unit', e.target.value));
                    tr.querySelector('.work-formula-select').addEventListener('change', (e) => updateWork(catIndex, workIndex, 'formula', e.target.value));
                    tr.querySelector('.btn-delete-work').addEventListener('click', () => {
                        if (confirm('Удалить работу?')) {
                            const updated = store.getConfig();
                            updated.categories[catIndex].works.splice(workIndex, 1);
                            store.setConfig(updated);
                        }
                    });

                    tbody.appendChild(tr);
                });

                body.appendChild(table);
            }

            const addWorkBtn = document.createElement('button');
            addWorkBtn.className = 'btn btn-secondary btn-sm';
            addWorkBtn.style.marginTop = '0.75rem';
            addWorkBtn.textContent = '+ Добавить работу';
            addWorkBtn.addEventListener('click', () => {
                const updated = store.getConfig();
                const defaultUnit = updated.units[0]?.name || 'м²';
                updated.categories[catIndex].works.push(createWork(defaultUnit));
                store.setConfig(updated);
            });

            body.appendChild(addWorkBtn);
            block.appendChild(header);
            block.appendChild(body);
            wrapper.appendChild(block);
        });

        container.appendChild(wrapper);
    }

    function updateWork(catIndex, workIndex, field, value) {
        const updated = store.getConfig();
        updated.categories[catIndex].works[workIndex][field] = value;
        store.setConfig(updated);
    }

    refresh();
    return store.subscribe('config', refresh);
}

function renderUnitSelect(units, selected, catIndex, workIndex) {
    const options = units.map(u => {
        const name = typeof u === 'string' ? u : u?.name;
        return `<option value="${escapeHtml(name)}" ${name === selected ? 'selected' : ''}>${escapeHtml(name)}</option>`;
    }).join('');
    return `<select class="input work-unit-select" data-cat="${catIndex}" data-work="${workIndex}">${options}</select>`;
}

function renderFormulaSelect(selected, catIndex, workIndex) {
    const options = FORMULAS.map(f => `<option value="${f.id}" ${f.id === selected ? 'selected' : ''}>${f.name}</option>`).join('');
    return `<select class="input work-formula-select" data-cat="${catIndex}" data-work="${workIndex}">${options}</select>`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
