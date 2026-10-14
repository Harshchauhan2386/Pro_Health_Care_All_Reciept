export default function PdfPageCard({
  page,
  position,
  selected,
  disabled = false,
  onToggle,
  // Reordering (only passed in the unified view)
  draggable = false,
  isDragOver = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onMoveEarlier,
  onMoveLater,
}) {
  return (
    <div
      draggable={draggable && !disabled}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={() => !disabled && onToggle(page.id)}
      className={`border rounded p-2 select-none ${
        selected
          ? 'border-red-500 ring-2 ring-red-300 bg-red-50'
          : isDragOver
            ? 'border-blue-500 ring-2 ring-blue-300 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-blue-400'
      } ${draggable && !disabled ? 'cursor-move' : 'cursor-pointer'}`}
      title={draggable ? 'Click to select · drag to reorder' : 'Click to select'}
    >
      <div className="flex items-center justify-between mb-1">
        <input
          type="checkbox"
          checked={selected}
          disabled={disabled}
          onChange={() => onToggle(page.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select page ${position} for deletion`}
        />
        <span className="text-xs font-semibold text-gray-700">#{position}</span>
      </div>

      <img
        src={page.dataUrl}
        alt={`Position ${position}: ${page.fileName} page ${page.sourceIndex + 1}`}
        className="w-full border border-gray-200 bg-white"
        draggable={false}
      />

      <div className="mt-1 text-[11px] leading-tight text-gray-500">
        <div className="truncate" title={page.fileName}>
          {page.fileName}
        </div>
        <div>Original p.{page.sourceIndex + 1}</div>
      </div>

      {selected ? (
        <div className="mt-1 text-[11px] font-medium text-red-600 text-center">
          Marked for deletion
        </div>
      ) : null}

      {onMoveEarlier || onMoveLater ? (
        <div className="mt-1 flex justify-between">
          <button
            type="button"
            disabled={disabled || !onMoveEarlier}
            onClick={(e) => {
              e.stopPropagation()
              onMoveEarlier?.()
            }}
            className="text-xs px-2 py-0.5 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-30"
            aria-label="Move earlier"
            title="Move one position earlier"
          >
            ◀
          </button>
          <button
            type="button"
            disabled={disabled || !onMoveLater}
            onClick={(e) => {
              e.stopPropagation()
              onMoveLater?.()
            }}
            className="text-xs px-2 py-0.5 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-30"
            aria-label="Move later"
            title="Move one position later"
          >
            ▶
          </button>
        </div>
      ) : null}
    </div>
  )
}
