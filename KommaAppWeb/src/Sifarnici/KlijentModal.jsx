import { useEffect, useState } from 'react'
import './KlijentModal.css'

function KlijentModal({
  visible,
  onClose,
  onSuccess,
  editingKlijent,
  insertKlijentAction,
  updateKlijentAction,
}) {
  const [naziv_klijenta, setNazivKlijenta] = useState('')
  const [sjediste, setSjediste] = useState('')

  useEffect(() => {
    if (editingKlijent) {
      setNazivKlijenta(editingKlijent.naziv_klijenta || '')
      setSjediste(editingKlijent.sjedište || editingKlijent.sjediste || '')
      return
    }

    setNazivKlijenta('')
    setSjediste('')
  }, [editingKlijent, visible])

  const handleSubmit = async () => {
    if (!naziv_klijenta.trim()) {
      window.alert('Greška: Naziv klijenta je obavezno polje')
      return
    }

    const payload = { naziv_klijenta: naziv_klijenta.trim(), sjedište: sjediste.trim() }

    let result = { ok: true, message: 'Sačuvano' }
    if (editingKlijent && typeof updateKlijentAction === 'function') {
      result = await updateKlijentAction(editingKlijent.id_klijent, payload)
    } else if (!editingKlijent && typeof insertKlijentAction === 'function') {
      result = await insertKlijentAction(payload)
    }

    if (result?.ok) {
      window.alert(result?.message || 'Uspješno')
      setNazivKlijenta('')
      setSjediste('')
      onSuccess?.()
      onClose?.()
    } else {
      window.alert(`Greška: ${result?.error || 'Neuspješno spremanje'}`)
    }
  }

  if (!visible) return null

  return (
    <div className="klijent-modal-overlay" onClick={onClose}>
      <div className="klijent-modal" onClick={(event) => event.stopPropagation()}>
        <h3 className="klijent-modal-title">{editingKlijent ? 'Uredi klijenta' : 'Dodaj novog klijenta'}</h3>

        <p className="klijent-modal-field-label">Naziv klijenta</p>

        <input
          className="klijent-modal-input"
          placeholder="Naziv klijenta"
          value={naziv_klijenta}
          onChange={(event) => setNazivKlijenta(event.target.value)}
        />

        <p className="klijent-modal-field-label">Sjedište</p>

        <input
          className="klijent-modal-input"
          placeholder="Sjedište"
          value={sjediste}
          onChange={(event) => setSjediste(event.target.value)}
        />

        <div className="klijent-modal-actions">
          <button type="button" className="klijent-modal-btn klijent-modal-btn--cancel" onClick={onClose}>
            Otkaži
          </button>
          <button type="button" className="klijent-modal-btn klijent-modal-btn--save" onClick={handleSubmit}>
            Spremi
          </button>
        </div>
      </div>
    </div>
  )
}

export default KlijentModal
