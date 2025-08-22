import { Config, Effect, Layer, RateLimiter, pipe } from 'effect'
import { OrcidConfig } from './Orcid.js'
import { RedisConfig } from './Redis.js'
import { ZenodoConfig } from './Zenodo.js'

const orcidConfig: Config.Config<OrcidConfig> = Config.nested(
  Config.all({
    url: Config.mapAttempt(Config.string('URL'), url => new URL(url)),
  }),
  'ORCID',
)

const redisConfig: Config.Config<RedisConfig> = Config.nested(
  Config.all({
    url: Config.mapAttempt(Config.string('URL'), url => new URL(url)),
  }),
  'REDIS',
)

const zenodoConfig: Config.Config<Omit<ZenodoConfig, 'rateLimit'>> = Config.nested(
  Config.all({
    url: Config.mapAttempt(Config.string('URL'), url => new URL(url)),
  }),
  'ZENODO',
)

export const ConfigLive = Layer.mergeAll(
  Layer.effect(OrcidConfig, orcidConfig),
  Layer.effect(RedisConfig, redisConfig),
  Layer.effect(
    ZenodoConfig,
    pipe(
      zenodoConfig,
      Effect.bind('rateLimit', () =>
        RateLimiter.make({ limit: 1, interval: '1.5 seconds', algorithm: 'fixed-window' }),
      ),
    ),
  ),
)
