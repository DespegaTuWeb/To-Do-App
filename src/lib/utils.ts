/**
 * Obtiene la fecha local del sistema en formato YYYY-MM-DD,
 * con un desplazamiento opcional en días.
 */
export function getLocalDateString(offsetDays = 0): string {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formatea una cadena de fecha YYYY-MM-DD en un formato legible en español.
 * Evita desfasamientos por zona horaria.
 */
export function formatSpanishDate(dateStr: string | null): string {
  if (!dateStr) return 'Sin fecha';

  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  // Formato: "mar, 26 de may"
  const formatted = date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  // Capitalizar la primera letra
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

import { Pendiente } from './supabase';

/**
 * Agrupa una lista de pendientes según su fecha límite para la vista Timeline.
 */
export interface TimelineGroups {
  atrasados: Pendiente[];
  hoy: Pendiente[];
  manana: Pendiente[];
  estaSemana: Pendiente[];
  sinFecha: Pendiente[];
}

export function groupTasksByTimeline(tasks: Pendiente[]): TimelineGroups {
  const todayStr = getLocalDateString(0);
  const tomorrowStr = getLocalDateString(1);
  const endOfWeekStr = getLocalDateString(7); // Próximos 7 días

  const groups: TimelineGroups = {
    atrasados: [],
    hoy: [],
    manana: [],
    estaSemana: [],
    sinFecha: [],
  };

  tasks.forEach((task) => {
    if (task.completado) return; // En la vista timeline, nos enfocamos en pendientes activos

    const dl = task.fecha_limite;

    if (!dl) {
      groups.sinFecha.push(task);
    } else if (dl < todayStr) {
      groups.atrasados.push(task);
    } else if (dl === todayStr) {
      groups.hoy.push(task);
    } else if (dl === tomorrowStr) {
      groups.manana.push(task);
    } else if (dl > tomorrowStr && dl <= endOfWeekStr) {
      groups.estaSemana.push(task);
    } else {
      // Si cae más allá de la semana, lo agrupamos en "Ideas sin Fecha" o una categoría futura
      // Por consistencia visual y simplicidad, agruparemos en sinFecha o extendemos estaSemana.
      // Lo colocamos en sinFecha ya que representa tareas a largo plazo.
      groups.sinFecha.push(task);
    }
  });

  return groups;
}
