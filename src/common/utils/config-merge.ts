import type { DataSourceConfig, GeneratorConfig, LocalFileConfig } from '../types/interfaces';

/**
 * Merge localFileConfig safely at runtime.
 *
 * Always returns undefined when useSource !== 'local'.
 */
export function mergeLocalFileConfig(
  dataSourceConfig: DataSourceConfig,
  generatorConfig: GeneratorConfig,
): LocalFileConfig | undefined {
  if (dataSourceConfig.useSource !== 'local') {
    return undefined;
  }

  const base = dataSourceConfig.localFileConfig;
  const override = generatorConfig.localFileConfig;

  if (!base && !override) {
    return undefined;
  }

  return {
    directory: override?.directory ?? base?.directory ?? '',
    filename: override?.filename ?? base?.filename ?? '',
  };
}
