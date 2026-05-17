import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a controller or route as publicly accessible (no JWT required).
 *
 * @example
 * @Public()
 * @Get(':username')
 * getResume() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
