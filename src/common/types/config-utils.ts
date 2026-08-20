import type { DataSourceConfig, GeneratorConfig, LocalFileConfig } from './interfaces';

/**
 * Compute the effective (merged) LocalFileConfig from a DataSourceConfig
 * and an optional GeneratorConfig override.
 *
 * Result:
 * - If local source is used AND either config has values,
 *   returns a fully resolved LocalFileConfig
 * - Otherwise returns undefined
 */
export type MergeLocalFileConfig<
  TDataSource extends DataSourceConfig,
  TGenerator extends GeneratorConfig | undefined
> =
  TDataSource['useSource'] extends 'local'
    ? (
        // If datasource has localFileConfig or generator has override
        (TDataSource['localFileConfig'] extends LocalFileConfig ? unknown : never)
        | (TGenerator extends { localFileConfig: Partial<LocalFileConfig> } ? unknown : never)
      ) extends never
      ? undefined
      : Required<LocalFileConfig>
    : undefined;
