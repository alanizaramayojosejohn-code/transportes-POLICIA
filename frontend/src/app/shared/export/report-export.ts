import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Exportación de reportes a Excel/PDF (spec 018 la deja fuera de alcance, pero se pidió
 * explícitamente por fuera del spec — igual que el registro fotográfico). Genera los archivos
 * en el navegador, sin mutación ni endpoint nuevo en el backend: reutiliza exactamente las filas
 * que cada pantalla ya trae con sus filtros vigentes.
 */
/// Techo de filas para "traer todo el filtrado" al exportar. El sistema no
/// maneja volúmenes que se acerquen a esto; es una cota de seguridad, no un
/// límite de producto.
export const REPORT_EXPORT_MAX_ROWS = 5000;

/// Todos los `*FilterArgs` del backend limitan `take` a 100 (`@Max(100)`,
/// ver `backend/src/modules/**/dto/*-filter.args.ts`) — un único pedido con
/// `take: REPORT_EXPORT_MAX_ROWS` lo rechaza con 400 antes de tocar la DB.
/// Por eso `fetchAllPages` no pide todo de una vez: pagina en bloques de
/// este tamaño, respetando el límite que ya existe, y junta el resultado.
const REPORT_EXPORT_PAGE_SIZE = 100;

export interface ReportColumn<T> {
  readonly header: string;
  readonly accessor: (row: T) => string | number | null | undefined;
}

/**
 * Trae todo el resultado filtrado de una consulta paginada, en bloques de
 * `REPORT_EXPORT_PAGE_SIZE`, hasta agotar el total o llegar a
 * `REPORT_EXPORT_MAX_ROWS`. `fetchPage` es la misma consulta de siempre
 * (`network-only`, nunca `watchQuery`+`firstValueFrom`: ver
 * `vehicle-photos.service.ts` para el porqué), sólo parametrizada por
 * `skip`/`take`.
 */
export async function fetchAllPages<T>(
  fetchPage: (skip: number, take: number) => Promise<{ items: T[]; total: number }>,
): Promise<T[]> {
  const items: T[] = [];
  let skip = 0;
  while (items.length < REPORT_EXPORT_MAX_ROWS) {
    const page = await fetchPage(skip, REPORT_EXPORT_PAGE_SIZE);
    items.push(...page.items);
    if (page.items.length === 0 || items.length >= page.total) break;
    skip += REPORT_EXPORT_PAGE_SIZE;
  }
  return items;
}

export interface ReportExportInput<T> {
  readonly filenameBase: string;
  readonly title: string;
  /// Resumen legible de los filtros aplicados (ej. "Vehículo: PRUEBA · Desde: 01/01/2026"),
  /// para que quede constancia en el archivo de qué recorte de datos es. Opcional.
  readonly filtersSummary?: string;
  readonly columns: readonly ReportColumn<T>[];
  readonly rows: readonly T[];
}

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function sanitizeFilename(base: string): string {
  return (
    base
      .replace(/[^a-z0-9-]+/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'reporte'
  );
}

/// Nombre de hoja de Excel: máximo 31 caracteres y sin : \ / ? * [ ].
function sanitizeSheetName(title: string): string {
  const cleaned = title.replace(/[:\\/?*[\]]/g, '-').trim();
  return (cleaned || 'Reporte').slice(0, 31);
}

export function exportReportToExcel<T>({
  filenameBase,
  title,
  columns,
  rows,
}: ReportExportInput<T>): void {
  const header = columns.map((c) => c.header);
  const body = rows.map((row) => columns.map((c) => cell(c.accessor(row))));
  const worksheet = XLSX.utils.aoa_to_sheet([header, ...body]);
  worksheet['!cols'] = columns.map(() => ({ wch: 24 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(title));
  XLSX.writeFile(workbook, `${sanitizeFilename(filenameBase)}.xlsx`);
}

/// Escudo institucional (mismo arte que `IconComponent` name="brand-shield",
/// `icon.component.html`), rasterizado una sola vez: jsPDF necesita una
/// imagen de raster (PNG/JPEG), no puede dibujar el SVG del ícono directo.
const SHIELD_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <path d="M32 4 57 12v17c0 17-10.5 26-25 30C17.5 55 7 46 7 29V12Z" fill="#ffffff" opacity="0.95" />
    <path d="M32 8 53 15v14c0 15-9 22.5-21 26C10 51.5 11 44.5 11 29.5V15Z" fill="#14503d" />
    <path d="M32 15 22 30l7 0 0 12 6 0 0-12 7 0Z" fill="#ffffff" />
  </svg>
`.trim();

let shieldDataUrlPromise: Promise<string> | null = null;

function loadShieldPng(): Promise<string> {
  if (!shieldDataUrlPromise) {
    shieldDataUrlPromise = new Promise((resolve, reject) => {
      const svgUrl = `data:image/svg+xml;base64,${btoa(SHIELD_SVG)}`;
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo generar el membrete'));
          return;
        }
        ctx.drawImage(image, 0, 0, 256, 256);
        resolve(canvas.toDataURL('image/png'));
      };
      image.onerror = () => reject(new Error('No se pudo cargar el escudo institucional'));
      image.src = svgUrl;
    });
  }
  return shieldDataUrlPromise;
}

const GENERATED_AT_FORMAT = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export async function exportReportToPdf<T>({
  filenameBase,
  title,
  filtersSummary,
  columns,
  rows,
}: ReportExportInput<T>): Promise<void> {
  const doc = new jsPDF({
    orientation: columns.length > 6 ? 'landscape' : 'portrait',
    unit: 'pt',
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  let cursorY = 46;

  try {
    const shield = await loadShieldPng();
    doc.addImage(shield, 'PNG', marginX, cursorY - 28, 34, 34);
  } catch {
    // Sin escudo si el navegador no pudo rasterizarlo: el resto del PDF se genera igual.
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20);
  doc.text('POLICÍA BOLIVIANA', marginX + 42, cursorY - 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('Comando Departamental de Policía · Oruro', marginX + 42, cursorY + 2);

  cursorY += 26;
  doc.setDrawColor(190);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text(title, marginX, cursorY);
  cursorY += 15;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(110);
  doc.text(`Generado: ${GENERATED_AT_FORMAT.format(new Date())}`, marginX, cursorY);
  cursorY += 12;
  if (filtersSummary) {
    doc.text(`Filtros: ${filtersSummary}`, marginX, cursorY);
    cursorY += 12;
  }

  autoTable(doc, {
    startY: cursorY + 6,
    margin: { left: marginX, right: marginX },
    head: [columns.map((c) => c.header)],
    body: rows.map((row) => columns.map((c) => cell(c.accessor(row)))),
    styles: { fontSize: 8.5, cellPadding: 5, textColor: 30 },
    headStyles: { fillColor: [20, 80, 61], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 246] },
  });

  doc.save(`${sanitizeFilename(filenameBase)}.pdf`);
}
