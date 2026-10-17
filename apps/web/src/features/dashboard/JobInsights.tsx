import type { Job } from '@cv/shared'
import { Activity, MessageSquareReply, Users, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { pipelineStats, type PipelineStats } from './pipelineStats'

/**
 * How far applications get: one bar per stage (saved → applied → interview →
 * offer), all in one teal so the length is the only thing that changes. Each
 * row shows its count and the share of the step before; hovering a bar says
 * it in a sentence.
 */
export function JobFunnel({ stats, className = '' }: { stats: PipelineStats; className?: string }) {
  const { t } = useTranslation()
  const most = Math.max(1, stats.funnel[0]!.count)
  const anyApplied = stats.funnel[1]!.count > 0

  return (
    <section className={`glass flex flex-col p-5 ${className}`} aria-labelledby="funnel-heading">
      <h2 id="funnel-heading" className="font-semibold">
        {t('dashboard.funnel.heading')}
      </h2>
      <p className="mb-5 text-sm text-fg-muted">{t('dashboard.funnel.description')}</p>

      {anyApplied ? (
        <>
          <ol className="flex flex-1 flex-col justify-center gap-3">
            {stats.funnel.map((step, index) => {
              const label = t(`dashboard.funnel.${step.stage}`)
              const previous = index > 0 ? stats.funnel[index - 1]! : null
              return (
                <li
                  key={step.stage}
                  className="group relative grid grid-cols-[var(--spacing-chart-label)_1fr_auto] items-center gap-3 text-sm"
                >
                  <span className="truncate text-fg-soft">{label}</span>
                  <span className="h-6 overflow-hidden rounded-r-sm bg-chart-track">
                    <span
                      className="block h-full rounded-r-sm bg-chart transition-[width] duration-(--duration-zoom) ease-(--ease-spring) group-hover:brightness-110 motion-reduce:transition-none"
                      style={{ width: `${(step.count / most) * 100}%` }}
                    />
                  </span>
                  <span className="min-w-20 text-right tabular-nums">
                    <span className="font-semibold">{step.count}</span>
                    {step.ofPrevious !== null && (
                      <span className="text-fg-muted">
                        {' · '}
                        <span className="sr-only">
                          {t('dashboard.funnel.ofPrevious', { percent: step.ofPrevious })}
                        </span>
                        <span aria-hidden>{step.ofPrevious}%</span>
                      </span>
                    )}
                  </span>
                  {/* Hover: the row in a sentence (also in the visible numbers, for keyboard and touch). */}
                  {previous && step.ofPrevious !== null && (
                    <span
                      aria-hidden
                      className="glass-menu pointer-events-none absolute bottom-full left-(--spacing-chart-label) z-(--z-dropdown) mb-1 hidden px-3 py-1.5 text-xs whitespace-nowrap group-hover:block"
                    >
                      {t('dashboard.funnel.detail', {
                        count: step.count,
                        previous: previous.count,
                        percent: step.ofPrevious,
                        stage: label,
                      })}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
          <p className="mt-4 text-xs text-fg-muted">
            {t('dashboard.funnel.elsewhere', {
              rejected: stats.rejected,
              noAnswer: stats.noAnswer,
            })}
          </p>
        </>
      ) : (
        <p className="py-4 text-sm text-fg-muted">{t('dashboard.funnel.empty')}</p>
      )}
    </section>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="glass flex items-start gap-4 p-5">
      <span className="rounded-control bg-brand-soft p-2 text-brand-fg">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-fg-muted">{label}</p>
        <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
        <p className="text-xs text-fg-muted">{hint}</p>
      </div>
    </div>
  )
}

/** Three headline numbers beside the funnel. */
export function JobStats({ stats }: { stats: PipelineStats }) {
  const { t } = useTranslation()
  return (
    <section
      aria-label={t('dashboard.stats.label')}
      className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1"
    >
      <StatTile
        icon={Activity}
        label={t('dashboard.stats.active')}
        value={String(stats.active)}
        hint={t('dashboard.stats.activeHint')}
      />
      <StatTile
        icon={MessageSquareReply}
        label={t('dashboard.stats.responseRate')}
        value={stats.responseRate === null ? '—' : `${stats.responseRate}%`}
        hint={t('dashboard.stats.responseHint')}
      />
      <StatTile
        icon={Users}
        label={t('dashboard.stats.interviews')}
        value={String(stats.interviews)}
        hint={t('dashboard.stats.interviewsHint')}
      />
    </section>
  )
}

/** The funnel and the stat tiles for a list of jobs. */
export function JobInsights({ jobs }: { jobs: Job[] }) {
  const stats = pipelineStats(jobs)
  return (
    <>
      <JobFunnel stats={stats} className="lg:col-span-2" />
      <JobStats stats={stats} />
    </>
  )
}
