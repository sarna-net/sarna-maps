import {
  GeneratorConfigTi,
  GeneratorConfigMapLayerTi,
  GeneratorConfigOverlayTi,
} from './common/types';
import { createCheckers } from 'ts-interface-checker';
import { logger } from './common';

function run() {
  const checkers = createCheckers(
    GeneratorConfigTi,
    GeneratorConfigMapLayerTi,
    GeneratorConfigOverlayTi,
  );
  try {
    checkers.GeneratorConfig.check({
      output: 123,
      fileOutput: 123
    });
  } catch (e) {
    logger.debug(e.message);
  }

  return null;
}

run();
