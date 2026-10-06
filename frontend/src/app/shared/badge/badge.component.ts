import { Component, input } from '@angular/core';

export type BadgeTone = 'green' | 'amber' | 'red' | 'gray' | 'blue';

const TONE_CLASSES: Record<BadgeTone, string> = {
  green: 'bg-green-bg text-green-700 dark:text-green-300',
  amber: 'bg-amber-bg text-amber',
  red: 'bg-red-bg text-red',
  gray: 'bg-gray-bg text-gray',
  blue: 'bg-surface-3 text-ink-muted',
};

/** Insignia de estado con color semántico: usada por vehículos, unidades y asignaciones. */
@Component({
  selector: 'app-badge',
  template: `
    <span
      class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold"
      [class]="toneClass()"
    >
      <ng-content />
    </span>
  `,
})
export class BadgeComponent {
  readonly tone = input<BadgeTone>('gray');
  protected readonly toneClass = () => TONE_CLASSES[this.tone()];
}
