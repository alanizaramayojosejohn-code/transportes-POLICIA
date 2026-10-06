import { Field, InputType } from '@nestjs/graphql';
import { IsString, Matches, MaxLength } from 'class-validator';

/// Tope generoso sobre el data URL ya comprimido en el navegador (900px,
/// calidad 0.72): a ese tamaño una foto ronda los cientos de KB, nunca
/// millones de caracteres en base64.
const MAX_DATA_URL_LENGTH = 8_000_000;

@InputType()
export class SetVehiclePhotoInput {
  @Field(() => String)
  @IsString()
  vehicleId!: string;

  /// Identificador de la vista (frontal, trasero, motor, etc.), definido en
  /// el frontend. Sin `@IsEnum` a propósito: ver comentario en el schema.
  @Field(() => String)
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'slotKey sólo puede tener letras, números, guiones y guiones bajos.',
  })
  slotKey!: string;

  @Field(() => String)
  @IsString()
  @MaxLength(MAX_DATA_URL_LENGTH)
  @Matches(/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/]+=*$/, {
    message:
      'dataUrl debe ser una imagen codificada en base64 (data:image/...;base64,...).',
  })
  dataUrl!: string;
}
