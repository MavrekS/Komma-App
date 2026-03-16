import { useEffect, useState } from 'react'
import TabComboxBoxRoles from '../TabComponents/TabComboxBoxRoles'
import './RadnikModal.css'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const OIB_REGEX = /^\d{1,20}$/

function RadnikModal({
  visible,
  onClose,
  onSuccess,
  editingRadnik,
  insertRadnikAction,
  updateRadnikAction,
}) {
  const [username, setUsername] = useState('')
  const [ime, setIme] = useState('')
  const [prezime, setPrezime] = useState('')
  const [zanimanje, setZanimanje] = useState('')
  const [oib, setOib] = useState('')
  const [email, setEmail] = useState('')
  const [hash_password, setHashPassword] = useState('')
  const [role, setRole] = useState('user')

  useEffect(() => {
    if (editingRadnik) {
      setUsername(editingRadnik.username || '')
      setIme(editingRadnik.ime || '')
      setPrezime(editingRadnik.prezime || '')
      setZanimanje(editingRadnik.zanimanje || '')
      setOib(editingRadnik.oib || editingRadnik.OIB || '')
      setEmail(editingRadnik.email || '')
      setHashPassword('')
      setRole(editingRadnik.role || 'user')
      return
    }

    setUsername('')
    setIme('')
    setPrezime('')
    setZanimanje('')
    setOib('')
    setEmail('')
    setHashPassword('')
    setRole('user')
  }, [editingRadnik, visible])

  const handleSubmit = async () => {
    if (!username.trim()) {
      window.alert('Greška: Username je obavezno polje')
      return
    }
    if (!ime.trim()) {
      window.alert('Greška: Ime je obavezno polje')
      return
    }
    if (!prezime.trim()) {
      window.alert('Greška: Prezime je obavezno polje')
      return
    }
    if (!zanimanje.trim()) {
      window.alert('Greška: Zanimanje je obavezno polje')
      return
    }
    if (!oib.trim()) {
      window.alert('Greška: OIB je obavezno polje')
      return
    }
    if (!email.trim()) {
      window.alert('Greška: Email je obavezno polje')
      return
    }

    const normalizedOib = oib.trim()
    if (!OIB_REGEX.test(normalizedOib)) {
      window.alert('Greška: OIB mora imati između 1 i 20 znamenki')
      return
    }

    const normalizedEmail = email.trim().toLowerCase()
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      window.alert('Greška: Unesite ispravan email')
      return
    }

    if (!editingRadnik && !hash_password.trim()) {
      window.alert('Greška: Lozinka je obavezno polje')
      return
    }
    if (!role.trim()) {
      window.alert('Greška: Rola je obavezno polje')
      return
    }

    const payload = {
      username,
      ime,
      prezime,
      zanimanje,
      oib: normalizedOib,
      email: normalizedEmail,
      role,
    }

    if (!editingRadnik) {
      payload.hash_password = hash_password
    }

    let result = { ok: true, message: 'Sačuvano' }
    if (editingRadnik && typeof updateRadnikAction === 'function') {
      result = await updateRadnikAction(editingRadnik.id_radnik, payload)
    } else if (!editingRadnik && typeof insertRadnikAction === 'function') {
      result = await insertRadnikAction(payload)
    }

    if (result?.ok) {
      window.alert(result?.message || 'Uspješno')
      onSuccess?.()
      onClose?.()
    } else {
      window.alert(`Greška: ${result?.error || 'Neuspješno spremanje'}`)
    }
  }

  if (!visible) return null

  return (
    <div className="radnik-modal-overlay" onClick={onClose}>
      <div className="radnik-modal" onClick={(event) => event.stopPropagation()}>
        <h3 className="radnik-modal-title">{editingRadnik ? 'Uredi radnika' : 'Dodaj novog radnika'}</h3>

        <p className="radnik-modal-field-label">Username</p>

        <input
          className="radnik-modal-input"
          placeholder="Username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />

        <p className="radnik-modal-field-label">Ime</p>

        <input
          className="radnik-modal-input"
          placeholder="Ime"
          value={ime}
          onChange={(event) => setIme(event.target.value)}
        />

        <p className="radnik-modal-field-label">Prezime</p>

        <input
          className="radnik-modal-input"
          placeholder="Prezime"
          value={prezime}
          onChange={(event) => setPrezime(event.target.value)}
        />

        <p className="radnik-modal-field-label">Zanimanje</p>

        <input
          className="radnik-modal-input"
          placeholder="Zanimanje"
          value={zanimanje}
          onChange={(event) => setZanimanje(event.target.value)}
        />

        <p className="radnik-modal-field-label">OIB</p>

        <input
          className="radnik-modal-input"
          placeholder="OIB"
          value={oib}
          maxLength={20}
          onChange={(event) => setOib(event.target.value.replace(/\D/g, ''))}
        />

        <p className="radnik-modal-field-label">Email</p>

        <input
          className="radnik-modal-input"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        {!editingRadnik && (
          <>
            <p className="radnik-modal-field-label">Lozinka</p>

            <input
              className="radnik-modal-input"
              placeholder="Lozinka"
              type="password"
              value={hash_password}
              onChange={(event) => setHashPassword(event.target.value)}
            />
          </>
        )}

        <p className="radnik-modal-field-label">Rola</p>

        <TabComboxBoxRoles value={role} onChange={setRole} placeholder="Odaberite rolu" />

        <div className="radnik-modal-actions">
          <button type="button" className="radnik-modal-btn radnik-modal-btn--cancel" onClick={onClose}>
            Otkaži
          </button>
          <button type="button" className="radnik-modal-btn radnik-modal-btn--save" onClick={handleSubmit}>
            Spremi
          </button>
        </div>
      </div>
    </div>
  )
}

export default RadnikModal
