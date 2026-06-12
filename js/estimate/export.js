import { calculateEstimate } from './calculator.js';
import { formatCurrency, formatNumber } from '../utils.js';

export function exportToXlsx(config, estimate) {
    const result = calculateEstimate(config, estimate);

    const rows = [];
    rows.push(['Смета', '', '', '', '', '']);
    rows.push(['Адрес', result.address || '', '', '', '', '']);
    rows.push(['Заказчик', result.customerName || '', '', '', '', '']);
    rows.push(['Дата', result.date, '', '', '', '']);
    rows.push([]);
    rows.push(['№', 'Комната / Работа', 'Ед. изм.', 'Кол-во', 'Цена', 'Сумма']);

    let index = 1;
    result.rooms.forEach(room => {
        rows.push(['', room.name, '', '', '', '']);
        if (!room.lines.length) {
            rows.push(['', 'Нет выбранных работ', '', '', '', '']);
        } else {
            const grouped = groupBy(room.lines, 'categoryName');
            Object.entries(grouped).forEach(([categoryName, lines]) => {
                rows.push(['', '  ' + categoryName, '', '', '', '']);
                lines.forEach(line => {
                    rows.push([
                        index++,
                        '    ' + line.name,
                        line.unit,
                        formatNumber(line.quantity, 2),
                        formatNumber(line.price, 2),
                        formatNumber(line.total, 2)
                    ]);
                });
            });
        }
    });

    rows.push([]);
    rows.push(['', '', '', '', 'ИТОГО:', formatNumber(result.grandTotal, 2)]);

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Смета');

    worksheet['!cols'] = [
        { wch: 6 },
        { wch: 40 },
        { wch: 12 },
        { wch: 12 },
        { wch: 14 },
        { wch: 14 }
    ];

    XLSX.writeFile(workbook, `smeta_${estimate.date || 'export'}.xlsx`);
}

function groupBy(array, key) {
    return array.reduce((result, item) => {
        const group = item[key] || 'Без категории';
        (result[group] = result[group] || []).push(item);
        return result;
    }, {});
}

export async function exportToPdf(config, estimate) {
    const result = calculateEstimate(config, estimate);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    doc.setFontSize(18);
    doc.text('Смета', margin, y);
    y += 8;

    doc.setFontSize(11);
    doc.text(`Адрес: ${result.address || '—'}`, margin, y);
    y += 6;
    doc.text(`Заказчик: ${result.customerName || '—'}`, margin, y);
    y += 6;
    doc.text(`Дата: ${result.date}`, margin, y);
    y += 12;

    doc.setFontSize(10);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
    doc.setFont(undefined, 'bold');
    doc.text('№', margin + 2, y + 5.5);
    doc.text('Комната / Работа', margin + 12, y + 5.5);
    doc.text('Ед.', margin + 95, y + 5.5);
    doc.text('Кол-во', margin + 112, y + 5.5);
    doc.text('Цена', margin + 135, y + 5.5);
    doc.text('Сумма', margin + 160, y + 5.5);
    doc.setFont(undefined, 'normal');
    y += 10;

    let index = 1;
    result.rooms.forEach(room => {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }

        doc.setFont(undefined, 'bold');
        doc.text(`${room.name} (S пола ${room.floorArea} м², S стен ${room.wallsArea} м²)`, margin, y);
        doc.setFont(undefined, 'normal');
        y += 6;

        if (!room.lines.length) {
            doc.text('Нет выбранных работ', margin + 5, y);
            y += 6;
            return;
        }

        const grouped = groupBy(room.lines, 'categoryName');
        Object.entries(grouped).forEach(([categoryName, lines]) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }

            doc.setFont(undefined, 'bold');
            doc.text(categoryName, margin + 5, y);
            doc.setFont(undefined, 'normal');
            y += 6;

            lines.forEach(line => {
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }

                doc.text(String(index++), margin + 2, y);
                const nameLines = doc.splitTextToSize(line.name, 74);
                doc.text(nameLines, margin + 17, y);
                doc.text(line.unit, margin + 95, y);
                doc.text(formatNumber(line.quantity, 2), margin + 112, y);
                doc.text(formatNumber(line.price, 2), margin + 135, y);
                doc.text(formatNumber(line.total, 2), margin + 160, y);

                y += Math.max(6, nameLines.length * 5);
            });
        });

        y += 3;
    });

    if (y > 260) {
        doc.addPage();
        y = 20;
    }

    doc.setFont(undefined, 'bold');
    doc.text(`ИТОГО: ${formatCurrency(result.grandTotal)}`, margin + 120, y);

    doc.save(`smeta_${estimate.date || 'export'}.pdf`);
}
