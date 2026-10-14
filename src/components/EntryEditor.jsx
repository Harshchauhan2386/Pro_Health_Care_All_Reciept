/**
 * Editable list of report entries (one row per entry): edit in place, delete
 * a row, add a row. Used by both reports; the columns describe the fields.
 *
 * columns: [{ key, label, type: 'date' | 'text' | 'amount', width, placeholder }]
 * errors:  { [entryId]: { [columnKey]: message } }
 */
export default function EntryEditor({ columns, entries, onChange, onAdd, errors = {}, addLabel = 'Add Entry' }) {
  const template = `28px ${columns.map((c) => c.width).join(' ')} 32px`

  const update = (id, key, value) =>
    onChange(entries.map((e) => (e.id === id ? { ...e, [key]: value } : e)))
  const remove = (id) => onChange(entries.filter((e) => e.id !== id))

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          <div
            className="grid gap-2 text-xs font-medium text-gray-500 mb-1"
            style={{ gridTemplateColumns: template }}
          >
            <span>#</span>
            {columns.map((c) => (
              <span key={c.key} className={c.type === 'amount' ? 'text-right' : ''}>
                {c.label}
              </span>
            ))}
            <span />
          </div>

          {entries.map((entry, index) => {
            const rowErrors = errors[entry.id] || {}
            const messages = [...new Set(Object.values(rowErrors))]
            return (
              <div key={entry.id} className="mb-2">
                <div className="grid gap-2 items-start" style={{ gridTemplateColumns: template }}>
                  <span className="text-xs text-gray-500 pt-2">{index + 1}</span>
                  {columns.map((c) => (
                    <input
                      key={c.key}
                      type={c.type === 'date' ? 'date' : 'text'}
                      value={entry[c.key]}
                      onChange={(e) => update(entry.id, c.key, e.target.value)}
                      placeholder={c.placeholder}
                      autoComplete="off"
                      aria-label={`${c.label}, row ${index + 1}`}
                      className={`w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        rowErrors[c.key] ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      } ${c.type === 'amount' ? 'text-right' : ''}`}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => remove(entry.id)}
                    className="text-red-600 hover:text-red-800 text-sm pt-1.5"
                    aria-label={`Delete entry ${index + 1}`}
                    title="Delete entry"
                  >
                    ✕
                  </button>
                </div>
                {messages.length > 0 ? (
                  <p className="text-xs text-red-600 mt-0.5 pl-8">{messages.join(' · ')}</p>
                ) : null}
              </div>
            )
          })}

          {entries.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-2">No entries yet.</p>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="mt-2 text-xs font-medium bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
      >
        + {addLabel}
      </button>
    </div>
  )
}
