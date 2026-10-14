export default function PrintButton({ onPrint }) {
  return (
    <button
      type="button"
      onClick={onPrint}
      className="no-print w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded shadow-sm text-sm tracking-wide"
    >
      🖨️ Print Receipt
    </button>
  )
}
