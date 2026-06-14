import { IsIn, IsOptional } from 'class-validator';
import { ANALYTICS_RANGES, AnalyticsRange } from '../analytics.types';

export class AccountAnalyticsQueryDto {
  @IsOptional()
  @IsIn(ANALYTICS_RANGES, {
    message: `range must be one of: ${ANALYTICS_RANGES.join(', ')}`,
  })
  range: AnalyticsRange = '30d';
}
