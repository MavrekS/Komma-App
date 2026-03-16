import { useEffect, useState } from 'react'
import TabComboBoxKlijenti from '../TabComponents/TabComboBoxKlijenti'
import './AdresaModal.css'

function AdresaModal({
  visible,
  onClose,
  onSuccess,
  editingAdresa,
  insertAdresaAction,
  updateAdresaAction,
  loadKlijenti,
  klijentiItems,
  defaultKlijentId,
}) {
  const [adresa, setAdresa] = useState('')
  const [id_klijent, setIdKlijent] = useState('')
  const [dnevnica, setDnevnica] = useState('unutar_zupanije')

  useEffect(() => {
    if (editingAdresa) {
      setAdresa(editingAdresa.adresa || '')
      setIdKlijent(String(editingAdresa.id_klijent || ''))
      const rawDnevnica = String(editingAdresa.dnevnica || '').trim().toLowerCase()
      setDnevnica(
        rawDnevnica === '2' || rawDnevnica === 'van_drzave' || rawDnevnica === 'van države'
          ? 'van_drzave'
          : rawDnevnica === '1' || rawDnevnica === 'van_zupanije'
          ? 'van_zupanije'
          : 'unutar_zupanije',
      )
      return
    }

    setAdresa('')
    setIdKlijent(defaultKlijentId ? String(defaultKlijentId) : '')
    setDnevnica('unutar_zupanije')
  }, [defaultKlijentId, editingAdresa, visible])

  const handleSubmit = async () => {
    if (!adresa.trim()) {
      window.alert('Greška: Adresa je obavezno polje')
      return
    }
    if (!id_klijent.trim()) {
      window.alert('Greška: ID klijenta je obavezno polje')
      return
    }

    const payload = {
      adresa,
      id_klijent: parseInt(id_klijent, 10),
      dnevnica,
    }

    let result = { ok: true, message: 'Sačuvano' }
    if (editingAdresa && typeof updateAdresaAction === 'function') {
      result = await updateAdresaAction(editingAdresa.id_adresa, payload)
    } else if (!editingAdresa && typeof insertAdresaAction === 'function') {
      result = await insertAdresaAction(payload)
    }

    if (result?.ok) {
      window.alert(result?.message || 'Uspješno')
      setAdresa('')
      setIdKlijent('')
      setDnevnica('unutar_zupanije')
      onSuccess?.()
      onClose?.()
    } else {
      window.alert(`Greška: ${result?.error || 'Neuspješno spremanje'}`)
    }
  }

  if (!visible) return null

  return (
    <div className="adresa-modal-overlay" onClick={onClose}>
      <div className="adresa-modal" onClick={(event) => event.stopPropagation()}>
        <h3 className="adresa-modal-title">{editingAdresa ? 'Uredi adresu' : 'Dodaj novu adresu'}</h3>

        <p className="adresa-modal-field-label">Adresa</p>

        <input
          className="adresa-modal-input"
          placeholder="Adresa"
          value={adresa}
          onChange={(event) => setAdresa(event.target.value)}
        />

        <p className="adresa-modal-field-label">Klijent</p>

        <div className="adresa-modal-klijent-wrap">
          <TabComboBoxKlijenti
            placeholder="Odaberite klijenta"
            value={id_klijent}
            onChange={setIdKlijent}
            width="100%"
            loadKlijenti={loadKlijenti}
            items={klijentiItems}
          />
        </div>

        <p className="adresa-modal-dnevnica-label">Dnevnica:</p>
        <div className="adresa-modal-dnevnica-wrap">
          <button
            type="button"
            className={`adresa-modal-dnevnica-btn${dnevnica === 'unutar_zupanije' ? ' is-selected' : ''}`}
            onClick={() => setDnevnica('unutar_zupanije')}
          >
            Unutar županije
          </button>
          <button
            type="button"
            className={`adresa-modal-dnevnica-btn${dnevnica === 'van_zupanije' ? ' is-selected' : ''}`}
            onClick={() => setDnevnica('van_zupanije')}
          >
            Van županije
          </button>
          <button
            type="button"
            className={`adresa-modal-dnevnica-btn${dnevnica === 'van_drzave' ? ' is-selected' : ''}`}
            onClick={() => setDnevnica('van_drzave')}
          >
            Van države
          </button>
        </div>

        <div className="adresa-modal-actions">
          <button type="button" className="adresa-modal-btn adresa-modal-btn--cancel" onClick={onClose}>
            Otkaži
          </button>
          <button type="button" className="adresa-modal-btn adresa-modal-btn--save" onClick={handleSubmit}>
            Spremi
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdresaModal
