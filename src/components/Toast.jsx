import useDataStore from '../store/DataStore'

export default function Toast() {
  const { toastMessage, toastVisible } = useDataStore()
  if (!toastVisible) return null
  return (
    <div className="toast">
      {toastMessage}
    </div>
  )
}

