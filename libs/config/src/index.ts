/**
 * @edtech/config
 *
 * Configuration utilities for EdTech platform microservices.
 *
 * @example
 * ```typescript
 * import { SSMConfigService } from '@edtech/config';
 *
 * // In module
 * @Module({
 *   providers: [SSMConfigService],
 * })
 *
 * // In service
 * constructor(private readonly ssmConfig: SSMConfigService) {}
 * ```
 */

export { SSMConfigService } from './ssm/ssm-config.service';
