import { store } from '../state.js';
import { getDefaultEstimate } from '../config.js';
import { downloadFile, readFile, formatCurrency, formatNumber } from '../utils.js';
import { createRoom, getSelectedRoomId, setSelectedRoomId, renderRoomsList, renderRoomEditor } from './rooms.js';
import { calculateEstimate, calculateRoomAreas, getWorkQuantity } from './calculator.js';
import { exportToXlsx, exportToPdf } from './export.js';

let roomsUnsubscribe = null;

export function initEstimate() {
    const roomsList = document.getElementById('rooms-list');
    const roomEditor = document.getElementById('room-editor');
    const worksSelector = document.getElementById('works-selector');
    const preview = document.getElementById('estimate-preview');

    const titleInput = document.getElementById('estimate-title');
    const dateInput = document.getElementById('estimate-date');

    const onRoomSelect = (roomId) => {
        setSelectedRoomId(roomId);
        renderRoomEditor(roomEditor, roomId);
        renderWorksSelector(worksSelector, roomId);
    };

    roomsUnsubscribe = renderRoomsList(roomsList, onRoomSelect);

    // Инициализация выбора
    const estimate = store.getEstimate();
    if (estimate.rooms.length && !getSelectedRoomId()) {
        setSelectedRoomId(estimate.rooms[0].id);
    }
    onRoomSelect(getSelectedRoomId());

    // Шапка сметы
    titleInput.value = estimate.title;
    dateInput.value = estimate.date;

    titleInput.addEventListener('change', () => {
        const updated = store.getEstimate();
        updated.title = titleInput.value;
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
            if (!parsed.title || !Array.isArray(parsed.rooms)) {
                throw new Error('Некорректный формат сметы');
            }
            store.setEstimate(parsed);
            setSelectedRoomId(parsed.rooms[0]?.id || null);
            onRoomSelect(getSelectedRoomId());
            titleInput.value = parsed.title;
            dateInput.value = parsed.date;
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

    // Подписка на изменения сметы для пересчёта итогов и превью
    store.subscribe('estimate', () => {
        renderTotals();
        renderPreview(preview);
        const currentId = getSelectedRoomId();
        renderRoomEditor(roomEditor, currentId);
        renderWorksSelector(worksSelector, currentId);
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

    const grid = document.createElement('div');
    grid.className = 'works-grid';

    config.categories.forEach(category => {
        category.works.forEach(work => {
            const isChecked = (room.works || []).includes(work.id);
            const quantity = parseFloat(room.quantities?.[work.id] ?? getWorkQuantity(enrichedRoom, work.formula));
            const autoQuantity = getWorkQuantity(enrichedRoom, work.formula);
            const isManual = work.formula === 'fixed' || room.quantities?.[work.id] !== undefined;

            const option = document.createElement('label');
            option.className = 'work-option';
            option.innerHTML = `
                <input type="checkbox" class="work-check" value="${work.id}" ${isChecked ? 'checked' : ''}>
                <div class="work-option-info">
                    <div class="work-option-name">${escapeHtml(work.name)}</div>
                    <div class="work-option-meta">${escapeHtml(category.name)} · ${formatCurrency(work.price)} / ${escapeHtml(work.unit)}</div>
                    <div class="work-quantity-row" style="margin-top:0.5rem; display:flex; align-items:center; gap:0.5rem;">
                        <span style="font-size:0.75rem; color:var(--text-muted);">Кол-во:</span>
                        <input type="number" class="input work-qty" value="${formatNumber(quantity, 2)}" step="0.01" min="0" data-work="${work.id}" style="width:90px;" ${!isChecked ? 'disabled' : ''}>
                        ${!isManual ? `<button type="button" class="btn btn-sm btn-secondary btn-reset-qty" data-work="${work.id}">Авто</button>` : ''}
                    </div>
                </div>
            `;

            const checkbox = option.querySelector('.work-check');
            checkbox.addEventListener('change', () => {
                const updated = store.getEstimate();
                const idx = updated.rooms.findIndex(r => r.id === roomId);
                const roomData = updated.rooms[idx];

                if (checkbox.checked) {
                    if (!roomData.works.includes(work.id)) roomData.works.push(work.id);
                    if (!roomData.quantities) roomData.quantities = {};
                    if (work.formula !== 'fixed' && roomData.quantities[work.id] === undefined) {
                        roomData.quantities[work.id] = getWorkQuantity({ ...roomData, ...calculateRoomAreas(roomData) }, work.formula);
                    }
                    if (work.formula === 'fixed' && roomData.quantities[work.id] === undefined) {
                        roomData.quantities[work.id] = 1;
                    }
                } else {
                    roomData.works = roomData.works.filter(id => id !== work.id);
                    if (roomData.quantities) delete roomData.quantities[work.id];
                }

                store.setEstimate(updated);
            });

            const qtyInput = option.querySelector('.work-qty');
            qtyInput.addEventListener('change', () => {
                const updated = store.getEstimate();
                const idx = updated.rooms.findIndex(r => r.id === roomId);
                const roomData = updated.rooms[idx];
                if (!roomData.quantities) roomData.quantities = {};
                roomData.quantities[work.id] = parseFloat(qtyInput.value) || 0;
                store.setEstimate(updated);
            });

            const resetBtn = option.querySelector('.btn-reset-qty');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    const updated = store.getEstimate();
                    const idx = updated.rooms.findIndex(r => r.id === roomId);
                    const roomData = updated.rooms[idx];
                    if (!roomData.quantities) roomData.quantities = {};
                    roomData.quantities[work.id] = getWorkQuantity({ ...roomData, ...calculateRoomAreas(roomData) }, work.formula);
                    store.setEstimate(updated);
                });
            }

            grid.appendChild(option);
        });
    });

    card.appendChild(grid);
    container.appendChild(card);
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
        <p><strong>${escapeHtml(result.title)}</strong> от ${escapeHtml(result.date)}</p>
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
            room.lines.forEach(line => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${globalIndex++}</td>
                    <td>${escapeHtml(line.name)}</td>
                    <td>${escapeHtml(line.unit)}</td>
                    <td class="text-right">${formatNumber(line.quantity, 2)}</td>
                    <td class="text-right">${formatCurrency(line.price)}</td>
                    <td class="text-right">${formatCurrency(line.total)}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    });

    wrapper.appendChild(table);
    container.appendChild(wrapper);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
