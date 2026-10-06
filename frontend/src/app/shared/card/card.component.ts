import { Component, input } from '@angular/core';

/**
 * Contenedor `.card` de la maqueta: radio 15px (valor huérfano, no coincide con ningún token de
 * radio), sombra `--shadow-1`, y una elevación sutil en hover.
 */
@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
})
export class CardComponent {
  readonly heading = input<string>();
}
