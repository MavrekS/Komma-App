import { useEffect, useState } from 'react'
import TabComboBoxKlijenti from '../TabComponents/TabComboBoxKlijenti'
import './KontaktModal.css'

function KontaktModal({
	visible,
	onClose,
	onSuccess,
	editingKontakt,
	insertKontaktAction,
	updateKontaktAction,
	loadKlijenti,
	klijentiItems,
	defaultKlijentId,
}) {
	const [naziv, setNaziv] = useState('')
	const [id_klijent, setIdKlijent] = useState('')
	const [telefonski_broj, setTelefonskiBroj] = useState('')

	useEffect(() => {
		if (editingKontakt) {
			setNaziv(editingKontakt.naziv || '')
			setIdKlijent(String(editingKontakt.id_klijent || ''))
			setTelefonskiBroj(editingKontakt.telefonski_broj || '')
			return
		}

		setNaziv('')
		setIdKlijent(defaultKlijentId ? String(defaultKlijentId) : '')
		setTelefonskiBroj('')
	}, [defaultKlijentId, editingKontakt, visible])

	const handleSubmit = async () => {
		if (!naziv.trim()) {
			window.alert('Greška: Naziv kontakta je obavezno polje')
			return
		}
		if (!id_klijent.trim()) {
			window.alert('Greška: Klijent je obavezno polje')
			return
		}

		const normalizedTelefon = telefonski_broj.trim()
		const phoneRegex = /^\+?[0-9][0-9\s-]*$/
		if (normalizedTelefon && (normalizedTelefon.length > 20 || !phoneRegex.test(normalizedTelefon))) {
			window.alert('Greška: Telefonski broj nije ispravan (dozvoljeni su +, brojevi, razmak i -; max 20)')
			return
		}

		const payload = {
			naziv: naziv.trim(),
			id_klijent: parseInt(id_klijent, 10),
			telefonski_broj: normalizedTelefon,
		}

		let result = { ok: true, message: 'Sačuvano' }
		if (editingKontakt && typeof updateKontaktAction === 'function') {
			result = await updateKontaktAction(editingKontakt.id_kontakt, payload)
		} else if (!editingKontakt && typeof insertKontaktAction === 'function') {
			result = await insertKontaktAction(payload)
		}

		if (result?.ok) {
			window.alert(result?.message || 'Uspješno')
			setNaziv('')
			setIdKlijent('')
			setTelefonskiBroj('')
			onSuccess?.()
			onClose?.()
		} else {
			window.alert(`Greška: ${result?.error || 'Neuspješno spremanje'}`)
		}
	}

	if (!visible) return null

	return (
		<div className="kontakt-modal-overlay" onClick={onClose}>
			<div className="kontakt-modal" onClick={(event) => event.stopPropagation()}>
				<h3 className="kontakt-modal-title">{editingKontakt ? 'Uredi kontakt' : 'Dodaj novi kontakt'}</h3>

				<p className="kontakt-modal-field-label">Naziv kontakta</p>

				<input
					className="kontakt-modal-input"
					placeholder="Naziv kontakta"
					value={naziv}
					onChange={(event) => setNaziv(event.target.value)}
				/>

				<p className="kontakt-modal-field-label">Telefonski broj</p>

				<input
					className="kontakt-modal-input"
					placeholder="Telefonski broj"
					value={telefonski_broj}
					onChange={(event) => setTelefonskiBroj(event.target.value)}
				/>

				<p className="kontakt-modal-field-label">Klijent</p>

				<div className="kontakt-modal-klijent-wrap">
					<TabComboBoxKlijenti
						placeholder="Odaberite klijenta"
						value={id_klijent}
						onChange={setIdKlijent}
						width="100%"
						loadKlijenti={loadKlijenti}
						items={klijentiItems}
					/>
				</div>

				<div className="kontakt-modal-actions">
					<button type="button" className="kontakt-modal-btn kontakt-modal-btn--cancel" onClick={onClose}>
						Otkaži
					</button>
					<button type="button" className="kontakt-modal-btn kontakt-modal-btn--save" onClick={handleSubmit}>
						Spremi
					</button>
				</div>
			</div>
		</div>
	)
}

export default KontaktModal
