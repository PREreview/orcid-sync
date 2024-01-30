import { Config, Layer } from 'effect'
import { RedisConfig } from './Redis.js'
import { ZenodoConfig } from './Zenodo.js'

const redisConfig: Config.Config<RedisConfig> = Config.nested(
  Config.all({
    url: Config.mapAttempt(Config.string('URL'), url => new URL(url)),
  }),
  'REDIS',
)

const zenodoConfig: Config.Config<ZenodoConfig> = Config.nested(
  Config.all({
    url: Config.mapAttempt(Config.string('URL'), url => new URL(url)),
  }),
  'ZENODO',
)

export const ConfigLive = Layer.mergeAll(
  Layer.effect(RedisConfig, redisConfig),
  Layer.effect(ZenodoConfig, zenodoConfig),
)
