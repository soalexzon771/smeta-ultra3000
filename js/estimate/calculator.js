import { parseNumber } from '../utils.js';
import { findWorkById } from '../config.js';

export function calculateRoomAreas(room) {
    const length = parseNumber(room.length);
    const width = parseNumber(room.width);
    const height = parseNumber(room.height);

    const floorArea = length * width;
    const ceilingArea = floorArea;
    const perimeter = 2 * (length + width);
    const wallsArea = perimeter * height;

    return {
        floorArea: Math.round(floorArea * 100) / 100,
        ceilingArea: Math.round(ceilingArea * 100) / 100,
        wallsArea: Math.round(wallsArea * 100) / 100,
        perimeter: Math.round(perimeter * 100) / 100
    };
}

export function getWorkQuantity(room, formula) {
    switch (formula) {
        case 'walls_area': return room.wallsArea || 0;
        case 'ceiling_area': return room.ceilingArea || 0;
        case 'floor_area': return room.floorArea || 0;
        case 'perimeter': return room.perimeter || 0;
        case 'fixed':
        default: return 0;
    }
}

export function calculateRoomWorks(config, room) {
    const lines = [];

    for (const workId of room.works || []) {
        const work = findWorkById(config, workId);
        if (!work) continue;

        const quantity = parseNumber(room.quantities?.[workId] ?? getWorkQuantity(room, work.formula));
        const total = Math.round(quantity * parseNumber(work.price) * 100) / 100;

        lines.push({
            workId,
            name: work.name,
            unit: work.unit,
            price: parseNumber(work.price),
            quantity,
            total,
            categoryName: work.categoryName
        });
    }

    const roomTotal = lines.reduce((sum, line) => sum + line.total, 0);

    return { lines, roomTotal };
}

export function calculateEstimate(config, estimate) {
    const rooms = [];
    let grandTotal = 0;
    let totalWorksCount = 0;

    for (const room of estimate.rooms || []) {
        const areas = calculateRoomAreas(room);
        const enrichedRoom = { ...room, ...areas };
        const { lines, roomTotal } = calculateRoomWorks(config, enrichedRoom);
        totalWorksCount += lines.length;
        grandTotal += roomTotal;

        rooms.push({
            ...enrichedRoom,
            lines,
            roomTotal
        });
    }

    return {
        ...estimate,
        rooms,
        grandTotal: Math.round(grandTotal * 100) / 100,
        totalWorksCount
    };
}
