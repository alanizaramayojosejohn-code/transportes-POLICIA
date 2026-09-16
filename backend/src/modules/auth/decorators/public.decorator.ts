import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Exime a una query/mutation del guard global de JWT (spec 013). Hoy sólo la
 * usa `login`.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
