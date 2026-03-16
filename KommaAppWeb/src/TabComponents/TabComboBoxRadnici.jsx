import { useEffect, useMemo, useState } from 'react'
import './TabComboBoxRadnici.css'

function TabComboBoxRadnici({
  value,
  onChange,
  placeholder = 'Odaberite radnika',
  multiple = false,
  disabled = false,
  loadRadnici,
  items: itemsProp,
}) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [items, setItems] = useState([])

  useEffect(() => {
    const load = async () => {
      if (Array.isArray(itemsProp)) {
        setItems(itemsProp)
        setError(null)
        return
      }

      if (typeof loadRadnici !== 'function') {
        setItems([])
        setError(null)
        return
      }

      setLoading(true)
      try {
        const result = await loadRadnici()
        if (result?.ok) {
          setItems(result.data ?? [])
          setError(null)
        } else {
          setItems([])
          setError(result?.error ?? 'Greška pri učitavanju')
        }
      } catch {
        setItems([])
        setError('Greška pri učitavanju')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [itemsProp, loadRadnici])

  const selectedItem = useMemo(() => {
    if (multiple) return null
    return items.find((item) => String(item.id_radnik) === String(value))
  }, [items, value, multiple])

  const selectedItems = useMemo(() => {
    if (!multiple) return []
    const selectedSet = new Set((Array.isArray(value) ? value : []).map(String))
    return items.filter((item) => selectedSet.has(String(item.id_radnik)))
  }, [items, value, multiple])

  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return items

    return items.filter((item) => item.username?.toLowerCase().includes(query))
  }, [items, searchQuery])

  const isSelected = (item) => {
    if (!multiple) return String(item.id_radnik) === String(value)
    const selectedValues = Array.isArray(value) ? value.map(String) : []
    return selectedValues.includes(String(item.id_radnik))
  }

  const handleSelect = (item) => {
    const selectedValue = String(item.id_radnik)

    if (!multiple) {
      onChange?.(selectedValue)
      setOpen(false)
      return
    }

    const currentValues = Array.isArray(value) ? value.map(String) : []
    const exists = currentValues.includes(selectedValue)
    const nextValues = exists
      ? currentValues.filter((id) => id !== selectedValue)
      : [...currentValues, selectedValue]

    onChange?.(nextValues)
  }

  const buttonLabel = multiple
    ? selectedItems.length > 0
      ? selectedItems.map((item) => item.username).join(', ')
      : placeholder
    : selectedItem
      ? selectedItem.username
      : placeholder

  return (
    <div className="tab-combobox-radnici">
      <button
        type="button"
        className="tab-combobox-trigger"
        onClick={() => {
          setSearchQuery('')
          setOpen(true)
        }}
        disabled={disabled}
      >
        <span
          className={
            multiple ? (selectedItems.length > 0 ? 'tab-combobox-value' : 'tab-combobox-placeholder') :
              selectedItem ? 'tab-combobox-value' : 'tab-combobox-placeholder'
          }
        >
          {buttonLabel}
        </span>
      </button>

      {!!error && <p className="tab-combobox-error">{error}</p>}

      {open && (
        <div className="tab-combobox-modal-overlay" onClick={() => setOpen(false)}>
          <div className="tab-combobox-modal" onClick={(event) => event.stopPropagation()}>
            <h3 className="tab-combobox-title">Odaberite radnika</h3>
            <input
              type="text"
              className="tab-combobox-search"
              placeholder="Pretraži radnika..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              autoFocus
            />

            {loading ? (
              <p className="tab-combobox-loading">Učitavanje...</p>
            ) : (
              <ul className={`tab-combobox-list${multiple ? ' tab-combobox-list--chips' : ''}`}>
                {visibleItems.map((item) => (
                  <li key={item.id_radnik}>
                    <button
                      type="button"
                      className={`tab-combobox-item${multiple ? ' tab-combobox-item--chip' : ''}${isSelected(item) ? ' tab-combobox-item--selected' : ''}`}
                      onClick={() => handleSelect(item)}
                    >
                      {item.username}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!loading && visibleItems.length === 0 && (
              <p className="tab-combobox-loading">Nema rezultata za pretragu.</p>
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

export default TabComboBoxRadnici
