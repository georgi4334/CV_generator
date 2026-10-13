/** Test database; the default matches docker-compose.yml (host port 5433). CI sets its own. */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://cv:cv@localhost:5433/cv_generator_test'
