import { Config, Layer } from 'effect'
import { RedisConfig } from './Redis.js'

const redisConfig: Config.Config<RedisConfig> = Config.nested(
  Config.all({
    url: Config.mapAttempt(Config.string('URL'), url => new URL(url)),
  }),
  'REDIS',
)
export const ConfigLive = Layer.effect(RedisConfig, redisConfig)
