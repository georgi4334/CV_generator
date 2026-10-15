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
import { ArrowDown, ArrowUp, ChevronsUpDown, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { formatDate } from '../../lib/format'
import { DateInput, DocumentSelect, InlineText, StatusSelect, TypeSelect } from './fields'
import { statusChange } from './jobHelpers'
import { useJobActions } from './jobContext'

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric },
})

const helper = createColumnHelper<typeof features, Job>()
const text = (value: string) => value.toLocaleLowerCase()

function PositionCell({ job }: { job: Job }) {
  const { open } = useJobActions()
  return (
    <button
      type="button"
      onClick={() => open(job)}
      className="text-left font-medium hover:text-teal-700 hover:underline dark:hover:text-teal-300"
    >
      {job.position}
    </button>
  )
}

function StatusCell({ job }: { job: Job }) {
  const { update } = useJobActions()
  return (
    <StatusSelect
      value={job.status}
      label={`Status for ${job.position}`}
      onChange={(status) => update(job, statusChange(job, status))}
    />
  )
}

function DateAppliedCell({ job }: { job: Job }) {
  const { update } = useJobActions()
  return (
    <DateInput
      value={job.dateApplied}
      label={`Date applied for ${job.position}`}
      onChange={(dateApplied) => update(job, { dateApplied })}
      className="w-36 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-slate-300 focus:border-teal-600 dark:hover:border-slate-600"
    />
  )
}

function TypeCell({ job }: { job: Job }) {
  const { update } = useJobActions()
  return (
    <TypeSelect
      value={job.type}
      label={`Type for ${job.position}`}
      onChange={(type) => update(job, { type })}
      className="rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-slate-300 dark:hover:border-slate-600"
    />
  )
}

function ResumeCell({ job }: { job: Job }) {
  const { cvs, update } = useJobActions()
  return (
    <DocumentSelect
      value={job.cvId}
      docs={cvs}
      label={`Resume for ${job.position}`}
      onChange={(cvId) => update(job, { cvId })}
      className="max-w-44 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-slate-300 dark:hover:border-slate-600"
    />
  )
}

function CoverLetterCell({ job }: { job: Job }) {
  const { letters, update } = useJobActions()
  return (
    <DocumentSelect
      value={job.coverLetterId}
      docs={letters}
      label={`Cover letter for ${job.position}`}
      onChange={(coverLetterId) => update(job, { coverLetterId })}
      className="max-w-44 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-slate-300 dark:hover:border-slate-600"
    />
  )
}

function NotesCell({ job }: { job: Job }) {
  const { update } = useJobActions()
  return (
    <InlineText
      value={job.notes}
      label={`Notes for ${job.position}`}
      placeholder="Add a note"
      onSave={(notes) => update(job, { notes })}
    />
  )
}

function ActionsCell({ job }: { job: Job }) {
  const { open, remove } = useJobActions()
  const name = `${job.position} at ${job.company}`
  return (
    <span className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => open(job)}
        aria-label={`Edit ${name}`}
        title="Edit all details"
        className="rounded-md p-1.5 text-slate-400 hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950 dark:hover:text-teal-300"
      >
        <Pencil className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => remove(job)}
        aria-label={`Delete ${name}`}
        title="Delete"
        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
      >
        <Trash2 className="size-4" />
      </button>
    </span>
  )
}

/** Sort values: statuses and types in their natural order, empty values last. */
const columns = helper.columns([
  helper.accessor((job) => text(job.position), {
    id: 'position',
    header: 'Position',
    cell: ({ row }) => <PositionCell job={row.original} />,
  }),
  helper.accessor((job) => text(job.company), {
    id: 'company',
    header: 'Company',
    cell: ({ row }) => row.original.company,
  }),
  helper.accessor((job) => JOB_STATUSES.indexOf(job.status), {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusCell job={row.original} />,
  }),
  helper.accessor('dateSaved', {
    header: 'Date saved',
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{formatDate(row.original.dateSaved)}</span>
    ),
    sortDescFirst: true,
  }),
  helper.accessor((job) => job.dateApplied ?? undefined, {
    id: 'dateApplied',
    header: 'Date applied',
    cell: ({ row }) => <DateAppliedCell job={row.original} />,
    sortUndefined: 'last',
    sortDescFirst: true,
  }),
  helper.accessor((job) => (job.type ? JOB_TYPES.indexOf(job.type) : undefined), {
    id: 'type',
    header: 'Type',
    cell: ({ row }) => <TypeCell job={row.original} />,
    sortUndefined: 'last',
  }),
  helper.display({
    id: 'resume',
    header: 'Resume',
    cell: ({ row }) => <ResumeCell job={row.original} />,
  }),
  helper.display({
    id: 'coverLetter',
    header: 'Cover letter',
    cell: ({ row }) => <CoverLetterCell job={row.original} />,
  }),
  helper.display({
    id: 'notes',
    header: 'Notes',
    cell: ({ row }) => <NotesCell job={row.original} />,
  }),
  helper.display({
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <ActionsCell job={row.original} />,
  }),
])

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const

/** The Saved Jobs table: click a column title to sort; most cells edit in place. */
export function JobsTable({ jobs }: { jobs: Job[] }) {
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
    <table className="w-full min-w-[1100px] text-left text-sm">
      <thead className="border-b border-slate-200 text-xs tracking-wide text-slate-500 uppercase dark:border-slate-800">
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
                      className="inline-flex items-center gap-1 uppercase hover:text-slate-900 dark:hover:text-slate-100"
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
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
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
