const inputClass =
  'w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
const labelClass = 'text-xs font-medium text-gray-600 mb-1 block'

function Field({ label, error, children }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
      {error ? <p className="text-xs text-red-600 mt-1">{error}</p> : null}
    </div>
  )
}

export default function PatientDetails({ data, onChange, errors }) {
  const set = (field) => (e) => onChange({ ...data, [field]: e.target.value })

  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Receipt No. (optional)">
        <input
          className={inputClass}
          placeholder="PCR-000001"
          value={data.receiptNo}
          onChange={set('receiptNo')}
        />
      </Field>

      <Field label="Patient ID *" error={errors.patientId}>
        <input className={inputClass} value={data.patientId} onChange={set('patientId')} />
      </Field>

      <Field label="Date *" error={errors.date}>
        <input type="date" className={inputClass} value={data.date} onChange={set('date')} />
      </Field>

      <Field label="Patient Name *" error={errors.name}>
        <input className={inputClass} value={data.name} onChange={set('name')} />
      </Field>

      <Field label="Age">
        <input
          type="number"
          min="0"
          className={inputClass}
          value={data.age}
          onChange={set('age')}
        />
      </Field>

      <Field label="Sex">
        <select className={inputClass} value={data.sex} onChange={set('sex')}>
          <option value="">Select</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </Field>

      <Field label="Ref Dr.">
        <input className={inputClass} value={data.refDr} onChange={set('refDr')} />
      </Field>

      <Field label="Payment Mode *" error={errors.paymentMode}>
        <select className={inputClass} value={data.paymentMode} onChange={set('paymentMode')}>
          <option value="">Select</option>
          <option value="Cash">Cash</option>
          <option value="UPI">UPI</option>
          <option value="Card">Card</option>
          <option value="Bank Transfer">Bank Transfer</option>
          <option value="Other">Other</option>
        </select>
      </Field>
    </div>
  )
}
