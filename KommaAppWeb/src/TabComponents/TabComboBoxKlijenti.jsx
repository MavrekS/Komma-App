import { useEffect, useMemo, useState } from 'react'
import './TabComboBoxKlijenti.css'

function TabComboBoxKlijenti({
  value,
  onChange,
  width = '80%',
  placeholder = 'Odaberite klijenta',
  loadKlijenti,
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

      if (typeof loadKlijenti !== 'function') {
        setItems([])
        setError(null)
        return
      }

      setLoading(true)
      try {
        const result = await loadKlijenti()
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
  }, [itemsProp, loadKlijenti])

  const selectedItem = useMemo(
    () => items.find((item) => String(item.id_klijent) === String(value)),
    [items, value],
  )

  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return items

    return items.filter((item) => item.naziv_klijenta?.toLowerCase().includes(query))
  }, [items, searchQuery])

  const handleSelect = (item) => {
    onChange?.(String(item.id_klijent))
    setOpen(false)
  }

  return (
    <div className="tab-combobox-klijenti" style={{ width }}>
      <button
        type="button"
        className="tab-combobox-trigger"
        onClick={() => {
          setSearchQuery('')
          setOpen(true)
        }}
      >
        <span className={selectedItem ? 'tab-combobox-value' : 'tab-combobox-placeholder'}>
          {selectedItem ? selectedItem.naziv_klijenta : placeholder}
        </span>
      </button>

      {!!error && <p className="tab-combobox-error">{error}</p>}

      {open && (
        <div className="tab-combobox-modal-overlay" onClick={() => setOpen(false)}>
          <div className="tab-combobox-modal" onClick={(event) => event.stopPropagation()}>
            <h3 className="tab-combobox-title">Odaberite klijenta</h3>
            <input
              type="text"
              className="tab-combobox-search"
              placeholder="Pretraži klijenta..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              autoFocus
            />

            {loading ? (
              <p className="tab-combobox-loading">Učitavanje...</p>
            ) : (
              <>
                <ul className="tab-combobox-list">
                  {visibleItems.map((item) => (
                    <li key={item.id_klijent}>
                      <button
                        type="button"
                        className="tab-combobox-item"
                        onClick={() => handleSelect(item)}
                      >
                        {item.naziv_klijenta}
                      </button>
                    </li>
                  ))}
                </ul>
                {visibleItems.length === 0 && (
                  <p className="tab-combobox-loading">Nema rezultata za pretragu.</p>
                )}
              </>
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

export default TabComboBoxKlijenti
