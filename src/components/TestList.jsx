const inputClass =
  'w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'

let nextId = 1
export function createEmptyTest() {
  return { id: `t${Date.now()}-${nextId++}`, name: '', description: '', price: '' }
}

export default function TestList({ tests, onChange, errors }) {
  const updateTest = (id, field, value) => {
    onChange(tests.map((t) => (t.id === id ? { ...t, [field]: value } : t)))
  }

  const removeTest = (id) => {
    onChange(tests.filter((t) => t.id !== id))
  }

  const addTest = () => {
    onChange([...tests, createEmptyTest()])
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Tests / Services</h3>
        <button
          type="button"
          onClick={addTest}
          className="text-xs font-medium bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
        >
          + Add Test
        </button>
      </div>

      {errors.tests ? <p className="text-xs text-red-600 mb-2">{errors.tests}</p> : null}

      <div className="space-y-2">
        {tests.map((test, index) => (
          <div key={test.id} className="border border-gray-200 rounded p-2 bg-gray-50">
            <div className="flex gap-2 items-start">
              <span className="text-xs text-gray-500 pt-2 w-5">{index + 1}.</span>
              <div className="flex-1 space-y-1">
                <input
                  className={inputClass}
                  placeholder="Test / service name"
                  value={test.name}
                  onChange={(e) => updateTest(test.id, 'name', e.target.value)}
                />
                {errors.testItems?.[test.id]?.name ? (
                  <p className="text-xs text-red-600">{errors.testItems[test.id].name}</p>
                ) : null}
                <input
                  className={`${inputClass} text-xs italic`}
                  placeholder="Optional description, e.g. (Service By Redpath Diagnostics Pvt. Ltd.)"
                  value={test.description}
                  onChange={(e) => updateTest(test.id, 'description', e.target.value)}
                />
              </div>
              <div className="w-28">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  placeholder="Price"
                  value={test.price}
                  onChange={(e) => updateTest(test.id, 'price', e.target.value)}
                />
                {errors.testItems?.[test.id]?.price ? (
                  <p className="text-xs text-red-600">{errors.testItems[test.id].price}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => removeTest(test.id)}
                className="text-red-600 hover:text-red-800 text-sm px-2 pt-1.5"
                aria-label="Remove test"
                title="Remove test"
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        {tests.length === 0 ? (
          <p className="text-sm text-gray-500 italic py-2">
            No tests added yet. Click "+ Add Test" to begin.
          </p>
        ) : null}
      </div>
    </div>
  )
}
