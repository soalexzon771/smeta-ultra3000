import { store } from '../state.js';
import { generateId, parseNumber } from '../utils.js';
import { findRoomTemplateById } from '../config.js';
import { calculateRoomAreas } from './calculator.js';

let selectedRoomId = null;

export function getSelectedRoomId() {
    return selectedRoomId;
}

export function setSelectedRoomId(id) {
    selectedRoomId = id;
}

export function createRoom(templateId = null) {
    const config = store.getConfig();
    const template = templateId ? findRoomTemplateById(config, templateId) : null;

    return {
        id: generateId('room'),
        name: template ? template.name : 'Новая комната',
        templateId: template ? template.id : null,
        length: template ? template.defaultLength : 3,
        width: template ? template.defaultWidth : 3,
        height: template ? template.defaultHeight : 2.7,
        works: [],
        quantities: {}
    };
}

export function renderRoomsList(container, onSelect) {
    function refresh() {
        const estimate = store.getEstimate();
        container.innerHTML = '';

        if (!estimate.rooms.length) {
            container.innerHTML = '<div class="empty-state">Нет комнат. Добавьте первую комнату.</div>';
            return;
        }

        estimate.rooms.forEach(room => {
            const areas = calculateRoomAreas(room);
            const item = document.createElement('div');
            item.className = 'room-list-item' + (room.id === selectedRoomId ? ' active' : '');
            item.innerHTML = `
                <div>
                    <div class="room-list-name">${escapeHtml(room.name)}</div>
                    <div class="room-list-area">S пола: ${areas.floorArea} м² | S стен: ${areas.wallsArea} м²</div>
                </div>
                <button class="btn btn-danger btn-sm btn-delete-room" data-id="${room.id}">×</button>
            `;

            item.addEventListener('click', (e) => {
                if (e.target.closest('.btn-delete-room')) return;
                selectedRoomId = room.id;
                refresh();
                onSelect(room.id);
            });

            item.querySelector('.btn-delete-room').addEventListener('click', () => {
                if (confirm('Удалить комнату?')) {
                    const updated = store.getEstimate();
                    updated.rooms = updated.rooms.filter(r => r.id !== room.id);
                    if (selectedRoomId === room.id) {
                        selectedRoomId = updated.rooms[0]?.id || null;
                    }
                    store.setEstimate(updated);
                    onSelect(selectedRoomId);
                }
            });

            container.appendChild(item);
        });
    }

    refresh();
    return store.subscribe('estimate', refresh);
}

export function renderRoomEditor(container, roomId, onSelect, onChange) {
    container.innerHTML = '';

    if (!roomId) {
        container.innerHTML = '<div class="empty-state">Выберите или добавьте комнату</div>';
        return;
    }

    const estimate = store.getEstimate();
    const room = estimate.rooms.find(r => r.id === roomId);
    if (!room) return;

    const config = store.getConfig();
    const areas = calculateRoomAreas(room);

    const wrapper = document.createElement('div');
    wrapper.className = 'room-editor';
    wrapper.innerHTML = `
        <h3>Редактирование комнаты</h3>
        <div class="form-row">
            <input type="text" class="input room-name" value="${escapeHtml(room.name)}" placeholder="Название комнаты" style="flex:2;">
            <select class="select room-template" style="flex:1;">
                <option value="">-- Без шаблона --</option>
                ${config.roomTemplates.map(t => `<option value="${t.id}" ${t.id === room.templateId ? 'selected' : ''}>${escapeHtml(t.name)}</option>`).join('')}
            </select>
        </div>
        <div class="room-dimensions">
            <div class="dimension-field">
                <label>Длина, м</label>
                <input type="number" class="input room-length" value="${room.length}" step="0.01" min="0">
            </div>
            <div class="dimension-field">
                <label>Ширина, м</label>
                <input type="number" class="input room-width" value="${room.width}" step="0.01" min="0">
            </div>
            <div class="dimension-field">
                <label>Высота, м</label>
                <input type="number" class="input room-height" value="${room.height}" step="0.01" min="0">
            </div>
        </div>
        <div class="room-areas">
            <div class="area-badge" data-area="floorArea"><span class="value">${areas.floorArea}</span><span class="label">Пол, м²</span></div>
            <div class="area-badge" data-area="ceilingArea"><span class="value">${areas.ceilingArea}</span><span class="label">Потолок, м²</span></div>
            <div class="area-badge" data-area="wallsArea"><span class="value">${areas.wallsArea}</span><span class="label">Стены, м²</span></div>
            <div class="area-badge" data-area="perimeter"><span class="value">${areas.perimeter}</span><span class="label">Периметр, м</span></div>
        </div>
    `;

    const getRoom = () => {
        const est = store.getEstimate();
        return est.rooms.find(r => r.id === roomId);
    };

    const updateRoom = (updates, triggerChange = false) => {
        const updated = store.getEstimate();
        const idx = updated.rooms.findIndex(r => r.id === roomId);
        if (idx === -1) return;
        updated.rooms[idx] = { ...updated.rooms[idx], ...updates };
        store.setEstimate(updated);
        if (triggerChange && onChange) {
            onChange(roomId, updated.rooms[idx]);
        }
    };

    wrapper.querySelector('.room-name').addEventListener('change', (e) => {
        updateRoom({ name: e.target.value.trim() || 'Без названия' });
    });

    wrapper.querySelector('.room-length').addEventListener('input', (e) => updateRoom({ length: parseNumber(e.target.value) }, true));
    wrapper.querySelector('.room-width').addEventListener('input', (e) => updateRoom({ width: parseNumber(e.target.value) }, true));
    wrapper.querySelector('.room-height').addEventListener('input', (e) => updateRoom({ height: parseNumber(e.target.value) }, true));

    wrapper.querySelector('.room-template').addEventListener('change', (e) => {
        const templateId = e.target.value;
        const template = templateId ? findRoomTemplateById(config, templateId) : null;
        if (template) {
            updateRoom({
                templateId: template.id,
                name: room.name === 'Новая комната' || !room.name ? template.name : room.name,
                length: template.defaultLength,
                width: template.defaultWidth,
                height: template.defaultHeight
            });
        } else {
            updateRoom({ templateId: null });
        }
        onSelect(roomId);
    });

    container.appendChild(wrapper);
}

export function updateRoomAreas(container, room) {
    const areas = calculateRoomAreas(room);
    const badges = container.querySelectorAll('.area-badge');
    badges.forEach(badge => {
        const key = badge.dataset.area;
        if (key && areas[key] !== undefined) {
            badge.querySelector('.value').textContent = areas[key];
        }
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
