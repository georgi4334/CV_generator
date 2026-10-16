import { JOB_STATUSES, JOB_TYPES, type Job } from '@cv/shared'
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  useTable,
  type SortingState,
} from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import { ArrowDown, ArrowUp, ChevronsUpDown, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDate } from '@/shared/lib/format'
import { DateInput, DocumentSelect, InlineText, StatusSelect, TypeSelect } from './fields'
import { statusChange } from '@/features/jobs/jobHelpers'
import { useJobActions } from '@/features/jobs/jobContext'

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric },
})

const helper = createColumnHelper<typeof features, Job>()
const text = (value: string) => value.toLocaleLowerCase()

function DateSavedCell({ job }: { job: Job }) {
  // Re-renders with the interface language so the date follows it.
  useTranslation()
  return <span className="whitespace-nowrap">{formatDate(job.dateSaved)}</span>
}

function PositionCell({ job }: { job: Job }) {
  const { open } = useJobActions()
  return (
    <button
      type="button"
      onClick={() => open(job)}
      className="text-left font-medium hover:text-brand-fg hover:underline"
    >
      {job.position}
    </button>
  )
}

function StatusCell({ job }: { job: Job }) {
  const { t } = useTranslation()
  const { update } = useJobActions()
  return (
    <StatusSelect
      value={job.status}
      label={t('jobs.cell.statusFor', { position: job.position })}
      onChange={(status) => update(job, statusChange(job, status))}
    />
  )
}

function DateAppliedCell({ job }: { job: Job }) {
  const { t } = useTranslation()
  const { update } = useJobActions()
  return (
    <DateInput
      value={job.dateApplied}
      label={t('jobs.cell.dateAppliedFor', { position: job.position })}
      onChange={(dateApplied) => update(job, { dateApplied })}
      className="w-36 rounded-tight border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-line-strong focus:border-brand-line"
    />
  )
}

function TypeCell({ job }: { job: Job }) {
  const { t } = useTranslation()
  const { update } = useJobActions()
  return (
    <TypeSelect
      value={job.type}
      label={t('jobs.cell.typeFor', { position: job.position })}
      onChange={(type) => update(job, { type })}
      className="rounded-tight border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-line-strong"
    />
  )
}

function ResumeCell({ job }: { job: Job }) {
  const { t } = useTranslation()
  const { cvs, update } = useJobActions()
  return (
    <DocumentSelect
      value={job.cvId}
      docs={cvs}
      label={t('jobs.cell.resumeFor', { position: job.position })}
      onChange={(cvId) => update(job, { cvId })}
      className="max-w-44 rounded-tight border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-line-strong"
    />
  )
}

function CoverLetterCell({ job }: { job: Job }) {
  const { t } = useTranslation()
  const { letters, update } = useJobActions()
  return (
    <DocumentSelect
      value={job.coverLetterId}
      docs={letters}
      label={t('jobs.cell.coverLetterFor', { position: job.position })}
      onChange={(coverLetterId) => update(job, { coverLetterId })}
      className="max-w-44 rounded-tight border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-line-strong"
    />
  )
}

function NotesCell({ job }: { job: Job }) {
  const { t } = useTranslation()
  const { update } = useJobActions()
  return (
    <InlineText
      value={job.notes}
      label={t('jobs.cell.notesFor', { position: job.position })}
      placeholder={t('jobs.cell.addNote')}
      onSave={(notes) => update(job, { notes })}
    />
  )
}

function ActionsCell({ job }: { job: Job }) {
  const { t } = useTranslation()
  const { open, remove } = useJobActions()
  const name = t('jobs.cell.name', { position: job.position, company: job.company })
  return (
    <span className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => open(job)}
        aria-label={t('jobs.cell.edit', { name })}
        title={t('jobs.cell.editTitle')}
        className="rounded-tight p-1.5 text-fg-faint hover:bg-brand-soft hover:text-brand-fg"
      >
        <Pencil className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => remove(job)}
        aria-label={t('jobs.cell.delete', { name })}
        title={t('common.delete')}
        className="rounded-tight p-1.5 text-fg-faint hover:bg-danger-soft hover:text-danger-fg"
      >
        <Trash2 className="size-4" />
      </button>
    </span>
  )
}

/** Sort values: statuses and types in their natural order, empty values last. */
const makeColumns = (t: TFunction) =>
  helper.columns([
    helper.accessor((job) => text(job.position), {
      id: 'position',
      header: t('jobs.columns.position'),
      cell: ({ row }) => <PositionCell job={row.original} />,
    }),
    helper.accessor((job) => text(job.company), {
      id: 'company',
      header: t('jobs.columns.company'),
      cell: ({ row }) => row.original.company,
    }),
    helper.accessor((job) => JOB_STATUSES.indexOf(job.status), {
      id: 'status',
      header: t('jobs.columns.status'),
      cell: ({ row }) => <StatusCell job={row.original} />,
    }),
    helper.accessor('dateSaved', {
      header: t('jobs.columns.dateSaved'),
      cell: ({ row }) => <DateSavedCell job={row.original} />,
      sortDescFirst: true,
    }),
    helper.accessor((job) => job.dateApplied ?? undefined, {
      id: 'dateApplied',
      header: t('jobs.columns.dateApplied'),
      cell: ({ row }) => <DateAppliedCell job={row.original} />,
      sortUndefined: 'last',
      sortDescFirst: true,
    }),
    helper.accessor((job) => (job.type ? JOB_TYPES.indexOf(job.type) : undefined), {
      id: 'type',
      header: t('jobs.columns.type'),
      cell: ({ row }) => <TypeCell job={row.original} />,
      sortUndefined: 'last',
    }),
    helper.display({
      id: 'resume',
      header: t('jobs.columns.resume'),
      cell: ({ row }) => <ResumeCell job={row.original} />,
    }),
    helper.display({
      id: 'coverLetter',
      header: t('jobs.columns.coverLetter'),
      cell: ({ row }) => <CoverLetterCell job={row.original} />,
    }),
    helper.display({
      id: 'notes',
      header: t('jobs.columns.notes'),
      cell: ({ row }) => <NotesCell job={row.original} />,
    }),
    helper.display({
      id: 'actions',
      header: () => <span className="sr-only">{t('jobs.columns.actions')}</span>,
      cell: ({ row }) => <ActionsCell job={row.original} />,
    }),
  ])

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const

/** The Saved Jobs table: click a column title to sort; most cells edit in place. */
export function JobsTable({ jobs }: { jobs: Job[] }) {
  const { t } = useTranslation()
  const columns = useMemo(() => makeColumns(t), [t])
  const [sorting, setSorting] = useState<SortingState>([{ id: 'dateSaved', desc: true }])
  const table = useTable({
    features,
    columns,
    data: jobs,
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: (job) => job.id,
  })

  return (
    <table className="w-full min-w-table-wide text-left text-sm">
      <thead className="border-b border-line text-xs tracking-wide text-fg-muted uppercase">
        {table.getHeaderGroups().map((group) => (
          <tr key={group.id}>
            {group.headers.map((header) => {
              const sorted = header.column.getIsSorted()
              const content = <table.FlexRender header={header} />
              return (
                <th
                  key={header.id}
                  scope="col"
                  aria-sort={sorted ? ARIA_SORT[sorted] : undefined}
                  className="px-3 py-3 font-medium"
                >
                  {header.column.getCanSort() ? (
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className="inline-flex items-center gap-1 uppercase hover:text-fg"
                    >
                      {content}
                      {sorted === 'asc' ? (
                        <ArrowUp className="size-3" aria-hidden />
                      ) : sorted === 'desc' ? (
                        <ArrowDown className="size-3" aria-hidden />
                      ) : (
                        <ChevronsUpDown className="size-3 opacity-40" aria-hidden />
                      )}
                    </button>
                  ) : (
                    content
                  )}
                </th>
              )
            })}
          </tr>
        ))}
      </thead>
      <tbody className="divide-y divide-line">
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id} className="hover:bg-glass-hover">
            {row.getAllCells().map((cell) => (
              <td
                key={cell.id}
                className={`px-3 py-2 align-middle ${cell.column.id === 'notes' ? 'w-56 max-w-56' : ''}`}
              >
                <table.FlexRender cell={cell} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
