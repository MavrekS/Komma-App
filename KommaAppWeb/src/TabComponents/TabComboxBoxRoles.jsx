import { useEffect, useMemo, useState } from 'react'
import './TabComboxBoxRoles.css'

const ROLE_ITEMS = [
  { id: 'user', label: 'user' },
  { id: 'admin', label: 'admin' },
  { id: 'superadmin', label: 'superadmin' },
]

function TabComboxBoxRoles({ value, onChange, placeholder = 'Odaberite rolu' }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [items, setItems] = useState([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        setItems(ROLE_ITEMS)
        setError(null)
      } catch {
        setItems([])
        setError('Greška pri učitavanju')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const selectedItem = useMemo(
    () => items.find((item) => String(item.id) === String(value)),
    [items, value],
  )

  const handleSelect = (item) => {
    onChange?.(String(item.id))
    setOpen(false)
  }

  return (
    <div className="tab-combobox-roles">
      <button type="button" className="tab-combobox-trigger" onClick={() => setOpen(true)}>
        <span className={selectedItem ? 'tab-combobox-value' : 'tab-combobox-placeholder'}>
          {selectedItem ? selectedItem.label : placeholder}
        </span>
      </button>

      {!!error && <p className="tab-combobox-error">{error}</p>}

      {open && (
        <div className="tab-combobox-modal-overlay" onClick={() => setOpen(false)}>
          <div className="tab-combobox-modal" onClick={(event) => event.stopPropagation()}>
            <h3 className="tab-combobox-title">Odaberite rolu</h3>

            {loading ? (
              <p className="tab-combobox-loading">Učitavanje...</p>
            ) : (
              <ul className="tab-combobox-list">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="tab-combobox-item"
                      onClick={() => handleSelect(item)}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button type="button" className="tab-combobox-close" onClick={() => setOpen(false)}>
              Zatvori
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TabComboxBoxRoles
