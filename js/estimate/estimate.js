import { store } from '../state.js';
import { getDefaultEstimate, findWorkById, migrateEstimate } from '../config.js';
import { downloadFile, readFile, formatCurrency, formatNumber } from '../utils.js';
import { createRoom, getSelectedRoomId, setSelectedRoomId, renderRoomsList, renderRoomEditor, updateRoomAreas } from './rooms.js';
import { calculateEstimate, calculateRoomAreas, getWorkQuantity } from './calculator.js';
import { exportToXlsx, exportToPdf } from './export.js';

let roomsUnsubscribe = null;

export function initEstimate() {
    const roomsList = document.getElementById('rooms-list');
    const roomEditor = document.getElementById('room-editor');
    const worksSelector = document.getElementById('works-selector');
    const preview = document.getElementById('estimate-preview');

    const addressInput = document.getElementById('estimate-address');
    const customerInput = document.getElementById('estimate-customer');
    const dateInput = document.getElementById('estimate-date');

    const onRoomSelect = (roomId) => {
        setSelectedRoomId(roomId);
        renderRoomEditor(roomEditor, roomId, onRoomSelect, onRoomChange);
        renderWorksSelector(worksSelector, roomId);
        renderTotals();
        renderPreview(preview);
    };

    const onRoomChange = (roomId, room) => {
        updateRoomAreas(roomEditor, room);
        updateAutoQuantities(worksSelector, room);
        renderTotals();
        renderPreview(preview);
    };

    roomsUnsubscribe = renderRoomsList(roomsList, onRoomSelect);

    // Инициализация выбора
    const estimate = store.getEstimate();
    if (estimate.rooms.length && !getSelectedRoomId()) {
        setSelectedRoomId(estimate.rooms[0].id);
    }
    onRoomSelect(getSelectedRoomId());

    // Шапка сметы
    addressInput.value = estimate.address || '';
    customerInput.value = estimate.customerName || '';
    dateInput.value = estimate.date;

    addressInput.addEventListener('change', () => {
        const updated = store.getEstimate();
        updated.address = addressInput.value;
        store.setEstimate(updated);
    });

    customerInput.addEventListener('change', () => {
        const updated = store.getEstimate();
        updated.customerName = customerInput.value;
        store.setEstimate(updated);
    });

    dateInput.addEventListener('change', () => {
        const updated = store.getEstimate();
        updated.date = dateInput.value;
        store.setEstimate(updated);
    });

    // Кнопки
    document.getElementById('btn-add-room').addEventListener('click', () => {
        const config = store.getConfig();
        const templateId = config.roomTemplates[0]?.id || null;
        const newRoom = createRoom(templateId);
        const updated = store.getEstimate();
        updated.rooms.push(newRoom);
        store.setEstimate(updated);
        setSelectedRoomId(newRoom.id);
        onRoomSelect(newRoom.id);
    });

    document.getElementById('btn-download-estimate').addEventListener('click', () => {
        const json = JSON.stringify(store.getEstimate(), null, 2);
        downloadFile(json, 'smeta.json', 'application/json');
    });

    document.getElementById('input-upload-estimate').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const text = await readFile(file);
            const parsed = JSON.parse(text);
            if (!Array.isArray(parsed.rooms)) {
                throw new Error('Некорректный формат сметы');
            }
            const estimate = migrateEstimate(parsed);
            store.setEstimate(estimate);
            setSelectedRoomId(estimate.rooms[0]?.id || null);
            onRoomSelect(getSelectedRoomId());
            addressInput.value = estimate.address || '';
            customerInput.value = estimate.customerName || '';
            dateInput.value = estimate.date;
            alert('Смета загружена');
        } catch (err) {
            alert('Не удалось загрузить смету: ' + err.message);
        } finally {
            e.target.value = '';
        }
    });

    document.getElementById('btn-export-xlsx').addEventListener('click', () => {
        const config = store.getConfig();
        const estimate = store.getEstimate();
        exportToXlsx(config, estimate);
    });

    document.getElementById('btn-export-pdf').addEventListener('click', () => {
        const config = store.getConfig();
        const estimate = store.getEstimate();
        exportToPdf(config, estimate);
    });

    // Подписка на изменения сметы — пересчитываем только итоги и превью
    store.subscribe('estimate', () => {
        renderTotals();
        renderPreview(preview);
    });

    renderTotals();
    renderPreview(preview);
}

function renderWorksSelector(container, roomId) {
    container.innerHTML = '';

    if (!roomId) return;

    const config = store.getConfig();
    const estimate = store.getEstimate();
    const room = estimate.rooms.find(r => r.id === roomId);
    if (!room) return;

    const areas = calculateRoomAreas(room);
    const enrichedRoom = { ...room, ...areas };

    const card = document.createElement('div');
    card.className = 'works-card';
    card.innerHTML = '<h3>Работы в комнате</h3>';

    if (!config.categories.length) {
        card.innerHTML += '<div class="empty-state">В админке нет настроенных работ</div>';
        container.appendChild(card);
        return;
    }

    config.categories.forEach(category => {
        if (!category.works.length) return;

        const categoryTitle = document.createElement('div');
        categoryTitle.className = 'works-category-title';
        categoryTitle.textContent = escapeHtml(category.name);
        card.appendChild(categoryTitle);

        const grid = document.createElement('div');
        grid.className = 'works-grid';

        category.works.forEach(work => {
            const fullWork = findWorkById(config, work.id);
            if (!fullWork) return;

            const isChecked = (room.works || []).includes(fullWork.id);
            const quantity = parseFloat(room.quantities?.[fullWork.id] ?? getWorkQuantity(enrichedRoom, fullWork.formula));
            const isManual = fullWork.formula === 'fixed' || room.quantities?.[fullWork.id] !== undefined;

            const option = document.createElement('label');
            option.className = 'work-option';
            option.dataset.workId = fullWork.id;
            option.innerHTML = `
                <input type="checkbox" class="work-check" value="${fullWork.id}" ${isChecked ? 'checked' : ''}>
                <div class="work-option-info">
                    <div class="work-option-name">${escapeHtml(fullWork.name)}</div>
                    <div class="work-option-meta">${formatCurrency(fullWork.price)} / ${escapeHtml(fullWork.unit)}</div>
                    <div class="work-quantity-row" style="margin-top:0.5rem; display:flex; align-items:center; gap:0.5rem;"></div>
                </div>
            `;

            const quantityRow = option.querySelector('.work-quantity-row');
            renderQuantityRow(quantityRow, fullWork, room, isChecked, quantity, isManual);

            const checkbox = option.querySelector('.work-check');
            checkbox.addEventListener('change', () => {
                const updated = store.getEstimate();
                const idx = updated.rooms.findIndex(r => r.id === roomId);
                const roomData = updated.rooms[idx];

                if (checkbox.checked) {
                    if (!roomData.works.includes(fullWork.id)) roomData.works.push(fullWork.id);
                    if (!roomData.quantities) roomData.quantities = {};
                    if (roomData.quantities[fullWork.id] === undefined) {
                        const qty = fullWork.formula === 'fixed' ? 1 : getWorkQuantity({ ...roomData, ...calculateRoomAreas(roomData) }, fullWork.formula);
                        roomData.quantities[fullWork.id] = qty;
                    }
                } else {
                    roomData.works = roomData.works.filter(id => id !== fullWork.id);
                    if (roomData.quantities) delete roomData.quantities[fullWork.id];
                }

                store.setEstimate(updated);

                const currentQty = checkbox.checked ? roomData.quantities[fullWork.id] : 0;
                const currentManual = fullWork.formula === 'fixed' || roomData.quantities?.[fullWork.id] !== undefined;
                renderQuantityRow(quantityRow, fullWork, roomData, checkbox.checked, currentQty, currentManual);

                renderTotals();
                renderPreview(document.getElementById('estimate-preview'));
            });

            grid.appendChild(option);
        });

        card.appendChild(grid);
    });

    container.appendChild(card);
}

function renderQuantityRow(container, work, room, isChecked, quantity, isManual) {
    container.innerHTML = '';

    const label = document.createElement('span');
    label.style.fontSize = '0.75rem';
    label.style.color = 'var(--text-muted)';
    label.textContent = 'Кол-во:';
    container.appendChild(label);

    const step = work.step ?? 0.01;
    const decimals = step >= 1 ? 0 : (step >= 0.1 ? 1 : 2);

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'input work-qty';
    input.value = Number(quantity).toFixed(decimals);
    input.step = String(step);
    input.min = '0';
    input.style.width = '90px';
    input.disabled = !isChecked;
    input.dataset.work = work.id;
    container.appendChild(input);

    if (isChecked) {
        input.addEventListener('change', () => {
            const updated = store.getEstimate();
            const idx = updated.rooms.findIndex(r => r.id === getSelectedRoomId());
            const roomData = updated.rooms[idx];
            if (!roomData.quantities) roomData.quantities = {};
            roomData.quantities[work.id] = parseFloat(input.value) || 0;
            store.setEstimate(updated);
            renderTotals();
            renderPreview(document.getElementById('estimate-preview'));
        });
    }

    if (work.formula !== 'fixed' && isChecked) {
        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'btn btn-sm btn-secondary btn-reset-qty';
        resetBtn.textContent = 'Авто';
        resetBtn.dataset.work = work.id;
        resetBtn.addEventListener('click', () => {
            const updated = store.getEstimate();
            const idx = updated.rooms.findIndex(r => r.id === getSelectedRoomId());
            const roomData = updated.rooms[idx];
            if (!roomData.quantities) roomData.quantities = {};
            const autoQty = getWorkQuantity({ ...roomData, ...calculateRoomAreas(roomData) }, work.formula);
            roomData.quantities[work.id] = autoQty;
            store.setEstimate(updated);
            input.value = formatNumber(autoQty, 2);
            renderTotals();
            renderPreview(document.getElementById('estimate-preview'));
        });
        container.appendChild(resetBtn);
    }
}

function updateAutoQuantities(container, room) {
    const config = store.getConfig();
    const enrichedRoom = { ...room, ...calculateRoomAreas(room) };

    config.categories.forEach(category => {
        category.works.forEach(work => {
            if (work.formula === 'fixed') return;

            const option = container.querySelector(`.work-option[data-work-id="${work.id}"]`);
            if (!option) return;

            const checkbox = option.querySelector('.work-check');
            if (!checkbox.checked) return;

            const roomEstimate = store.getEstimate();
            const roomData = roomEstimate.rooms.find(r => r.id === room.id);
            if (!roomData || !roomData.works.includes(work.id)) return;

            // Обновляем только если значение было авто (не переопределено вручную после последнего изменения размера)
            // Проще: всегда обновляем авто-значение, т.к. при ручном вводе пользователь нажимает change
            const autoQty = getWorkQuantity(enrichedRoom, work.formula);
            if (roomData.quantities?.[work.id] !== undefined) {
                roomData.quantities[work.id] = autoQty;
            }

            const input = option.querySelector('.work-qty');
            if (input) {
                const step = work.step ?? 0.01;
                const decimals = step >= 1 ? 0 : (step >= 0.1 ? 1 : 2);
                input.value = Number(autoQty).toFixed(decimals);
            }
        });
    });

    // Сохраняем обновлённые авто-количества
    store.setEstimate(store.getEstimate());
}

function renderTotals() {
    const config = store.getConfig();
    const estimate = store.getEstimate();
    const result = calculateEstimate(config, estimate);

    document.getElementById('grand-total').textContent = formatCurrency(result.grandTotal);
    document.getElementById('total-works').textContent = result.totalWorksCount;
}

function renderPreview(container) {
    const config = store.getConfig();
    const estimate = store.getEstimate();
    const result = calculateEstimate(config, estimate);

    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'estimate-preview';
    wrapper.id = 'estimate-preview-content';

    wrapper.innerHTML = `
        <h3>Предварительный просмотр сметы</h3>
        <p><strong>Адрес:</strong> ${escapeHtml(result.address || '—')}</p>
        <p><strong>Заказчик:</strong> ${escapeHtml(result.customerName || '—')}</p>
        <p><strong>Дата:</strong> ${escapeHtml(result.date)}</p>
    `;

    if (!result.rooms.length) {
        wrapper.innerHTML += '<div class="empty-state">Нет данных для отображения</div>';
        container.appendChild(wrapper);
        return;
    }

    const table = document.createElement('table');
    table.className = 'preview-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>№</th>
                <th>Комната / Работа</th>
                <th>Ед. изм.</th>
                <th class="text-right">Кол-во</th>
                <th class="text-right">Цена</th>
                <th class="text-right">Сумма</th>
            </tr>
        </thead>
        <tbody></tbody>
        <tfoot>
            <tr>
                <td colspan="5" class="text-right">ИТОГО:</td>
                <td class="text-right">${formatCurrency(result.grandTotal)}</td>
            </tr>
        </tfoot>
    `;

    const tbody = table.querySelector('tbody');
    let globalIndex = 1;

    result.rooms.forEach(room => {
        const roomRow = document.createElement('tr');
        roomRow.innerHTML = `
            <td colspan="6" style="background:#f1f5f9; font-weight:600;">
                ${escapeHtml(room.name)} (S пола ${room.floorArea} м², S стен ${room.wallsArea} м²)
            </td>
        `;
        tbody.appendChild(roomRow);

        if (!room.lines.length) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `<td colspan="6" class="empty-state">Нет выбранных работ</td>`;
            tbody.appendChild(emptyRow);
        } else {
            const grouped = groupBy(room.lines, 'categoryName');
            Object.entries(grouped).forEach(([categoryName, lines]) => {
                const categoryRow = document.createElement('tr');
                categoryRow.innerHTML = `
                    <td colspan="6" style="background:#f8fafc; font-weight:500; padding-left:1.5rem;">
                        ${escapeHtml(categoryName)}
                    </td>
                `;
                tbody.appendChild(categoryRow);

                lines.forEach(line => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${globalIndex++}</td>
                        <td style="padding-left:1.5rem;">${escapeHtml(line.name)}</td>
                        <td>${escapeHtml(line.unit)}</td>
                        <td class="text-right">${formatNumber(line.quantity, 2)}</td>
                        <td class="text-right">${formatCurrency(line.price)}</td>
                        <td class="text-right">${formatCurrency(line.total)}</td>
                    `;
                    tbody.appendChild(tr);
                });
            });
        }
    });

    function groupBy(array, key) {
        return array.reduce((result, item) => {
            const group = item[key] || 'Без категории';
            (result[group] = result[group] || []).push(item);
            return result;
        }, {});
    }

    wrapper.appendChild(table);
    container.appendChild(wrapper);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
