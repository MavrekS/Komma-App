import { useEffect, useMemo, useState } from 'react'
import './TabComboBoxNalozi.css'

function TabComboBoxNalozi({
  value,
  onChange,
  placeholder = 'Odaberite nalog',
  idRadnik = null,
  loadNalozi,
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

      if (typeof loadNalozi !== 'function') {
        setItems([])
        setError(null)
        return
      }

      setLoading(true)
      try {
        const result = await loadNalozi(idRadnik)
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
  }, [itemsProp, loadNalozi, idRadnik])

  const selectedItem = useMemo(
    () => items.find((item) => String(item.id_nalog) === String(value)),
    [items, value],
  )

  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return items

    return items.filter((item) => item.naziv_naloga?.toLowerCase().includes(query))
  }, [items, searchQuery])

  const handleSelect = (item) => {
    onChange?.(String(item.id_nalog))
    setOpen(false)
  }

  return (
    <div className="tab-combobox-nalozi">
      <button
        type="button"
        className="tab-combobox-trigger"
        onClick={() => {
          setSearchQuery('')
          setOpen(true)
        }}
      >
        <span className={selectedItem ? 'tab-combobox-value' : 'tab-combobox-placeholder'}>
          {selectedItem ? selectedItem.naziv_naloga : placeholder}
        </span>
      </button>

      {!!error && <p className="tab-combobox-error">{error}</p>}

      {open && (
        <div className="tab-combobox-modal-overlay" onClick={() => setOpen(false)}>
          <div className="tab-combobox-modal" onClick={(event) => event.stopPropagation()}>
            <h3 className="tab-combobox-title">Odaberite nalog</h3>
            <input
              type="text"
              className="tab-combobox-search"
              placeholder="Pretraži nalog..."
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
                    <li key={item.id_nalog}>
                      <button
                        type="button"
                        className="tab-combobox-item"
                        onClick={() => handleSelect(item)}
                      >
                        {item.naziv_naloga}
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

export default TabComboBoxNalozi
