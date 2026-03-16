import { useEffect, useMemo, useState } from 'react'
import RadnikModal from './RadnikModal'
import './Radnici.css'
import { changePasswordUser } from '../services/authApi'
import {
	deleteRadnik as deleteRadnikApi,
	getAllRadnici,
	insertRadnik as insertRadnikApi,
	updateRadnik as updateRadnikApi,
} from '../services/radniciApi'

function Radnici({
	loggedInUser,
	loadRadnici,
	deleteRadnikAction,
	insertRadnikAction,
	updateRadnikAction,
	initialRadnici = [],
}) {
	const [radnici, setRadnici] = useState(Array.isArray(initialRadnici) ? initialRadnici : [])
	const [modalVisible, setModalVisible] = useState(false)
	const [passwordModalVisible, setPasswordModalVisible] = useState(false)
	const [editingRadnik, setEditingRadnik] = useState(null)
	const [searchQuery, setSearchQuery] = useState('')
	const [oldPassword, setOldPassword] = useState('')
	const [newPassword, setNewPassword] = useState('')
	const [repeatNewPassword, setRepeatNewPassword] = useState('')
	const [changingPassword, setChangingPassword] = useState(false)

	const refreshRadnici = async () => {
		const loadAction = loadRadnici || getAllRadnici

		if (typeof loadAction !== 'function') return

		const result = await loadAction()
		if (result?.ok) {
			setRadnici(result.data ?? [])
		} else {
			window.alert(`Greška: ${result?.error || 'Neuspješno učitavanje radnika'}`)
		}
	}

	useEffect(() => {
		if (Array.isArray(initialRadnici) && initialRadnici.length > 0) {
			setRadnici(initialRadnici)
			return
		}

		refreshRadnici()
	}, [])

	const handleAddRadnik = () => {
		setEditingRadnik(null)
		setModalVisible(true)
	}

	const resetPasswordModalState = () => {
		setOldPassword('')
		setNewPassword('')
		setRepeatNewPassword('')
		setChangingPassword(false)
	}

	const handleOpenChangePassword = () => {
		resetPasswordModalState()
		setPasswordModalVisible(true)
	}

	const handleCloseChangePassword = () => {
		setPasswordModalVisible(false)
		resetPasswordModalState()
	}

	const handleEditRadnik = (radnik) => {
		setEditingRadnik(radnik)
		setModalVisible(true)
	}

	const handleDeleteRadnik = async (id_radnik) => {
		const confirmed = window.confirm('Jeste li sigurni da želite obrisati ovog radnika?')
		if (!confirmed) return

		if (typeof deleteRadnikAction !== 'function') {
			const fallbackDeleteResult = await deleteRadnikApi(id_radnik)
			if (fallbackDeleteResult?.ok) {
				window.alert(fallbackDeleteResult?.message || 'Uspješno obrisano')
				refreshRadnici()
			} else {
				window.alert(`Greška: ${fallbackDeleteResult?.error || 'Neuspješno brisanje'}`)
			}
			return
		}

		const result = await deleteRadnikAction(id_radnik)
		if (result?.ok) {
			window.alert(result?.message || 'Uspješno obrisano')
			refreshRadnici()
		} else {
			window.alert(`Greška: ${result?.error || 'Neuspješno brisanje'}`)
		}
	}

	const handleChangePasswordSubmit = async () => {
		const parsedIdRadnik = Number(loggedInUser?.id_radnik)
		if (!Number.isInteger(parsedIdRadnik) || parsedIdRadnik <= 0) {
			window.alert('Greška: Nije pronađen prijavljeni korisnik')
			return
		}

		if (!oldPassword) {
			window.alert('Greška: Unesite staru lozinku')
			return
		}

		if (!newPassword) {
			window.alert('Greška: Unesite novu lozinku')
			return
		}

		if (!repeatNewPassword) {
			window.alert('Greška: Ponovite novu lozinku')
			return
		}

		if (newPassword !== repeatNewPassword) {
			window.alert('Greška: Nova lozinka i potvrda lozinke se ne podudaraju')
			return
		}

		if (newPassword === oldPassword) {
			window.alert('Greška: Nova lozinka mora biti različita od stare')
			return
		}

		setChangingPassword(true)
		const result = await changePasswordUser({
			id_radnik: parsedIdRadnik,
			old_password: oldPassword,
			new_password: newPassword,
			confirm_new_password: repeatNewPassword,
		})
		setChangingPassword(false)

		if (!result?.ok) {
			window.alert(`Greška: ${result?.error || 'Promjena lozinke nije uspjela'}`)
			return
		}

		window.alert(result?.message || 'Lozinka je uspješno promijenjena')
		handleCloseChangePassword()
	}

	const normalizedSearch = searchQuery.trim().toLowerCase()

	const filteredRadnici = useMemo(
		() =>
			radnici.filter((item) => {
				if (!normalizedSearch) return true
				const username = String(item.username || '').toLowerCase()
				const email = String(item.email || '').toLowerCase()
				const zanimanje = String(item.zanimanje || '').toLowerCase()
				return (
					username.includes(normalizedSearch) ||
					email.includes(normalizedSearch) ||
					zanimanje.includes(normalizedSearch)
				)
			}),
		[radnici, normalizedSearch],
	)

	return (
		<section className="radnici-screen">
			<div className="radnici-top-actions">
				<button type="button" className="radnici-add-btn" onClick={handleAddRadnik}>
					Dodaj novog radnika
				</button>
				<button
					type="button"
					className="radnici-change-password-btn"
					onClick={handleOpenChangePassword}
				>
					Promijeni lozinku
				</button>
			</div>

			<input
				className="radnici-search"
				value={searchQuery}
				onChange={(event) => setSearchQuery(event.target.value)}
				placeholder="Pretraži radnike"
			/>

			{radnici.length === 0 ? (
				<p className="radnici-empty">Nema radnika</p>
			) : filteredRadnici.length === 0 ? (
				<p className="radnici-empty">Nema rezultata pretrage</p>
			) : (
				<div className="radnici-list">
					{filteredRadnici.map((item) => (
						<div className="radnici-row" key={item.id_radnik}>
							<div className="radnici-info">
								<p className="radnici-username">{item.username}</p>
								<p className="radnici-email">{item.zanimanje || 'N/A'}</p>
								<p className="radnici-email">{item.email}</p>
							</div>

							<div className="radnici-actions">
								<button
									type="button"
									className="radnici-action-btn radnici-action-btn--edit"
									onClick={() => handleEditRadnik(item)}
								>
									Uredi
								</button>

								<button
									type="button"
									className="radnici-action-btn radnici-action-btn--delete"
									onClick={() => handleDeleteRadnik(item.id_radnik)}
								>
									Obriši
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			<RadnikModal
				visible={modalVisible}
				onClose={() => setModalVisible(false)}
				onSuccess={refreshRadnici}
				editingRadnik={editingRadnik}
				insertRadnikAction={insertRadnikAction || insertRadnikApi}
				updateRadnikAction={updateRadnikAction || updateRadnikApi}
			/>

			{passwordModalVisible && (
				<div className="radnici-password-modal-overlay" onClick={handleCloseChangePassword}>
					<div className="radnici-password-modal" onClick={(event) => event.stopPropagation()}>
						<h3 className="radnici-password-modal-title">Promijeni lozinku</h3>

						<input
							className="radnici-password-modal-input"
							type="password"
							placeholder="Stara lozinka"
							value={oldPassword}
							onChange={(event) => setOldPassword(event.target.value)}
						/>
						<input
							className="radnici-password-modal-input"
							type="password"
							placeholder="Nova lozinka"
							value={newPassword}
							onChange={(event) => setNewPassword(event.target.value)}
						/>
						<input
							className="radnici-password-modal-input"
							type="password"
							placeholder="Ponovite novu lozinku"
							value={repeatNewPassword}
							onChange={(event) => setRepeatNewPassword(event.target.value)}
						/>

						<div className="radnici-password-modal-actions">
							<button
								type="button"
								className="radnici-password-modal-btn radnici-password-modal-btn--cancel"
								onClick={handleCloseChangePassword}
							>
								Otkaži
							</button>
							<button
								type="button"
								className="radnici-password-modal-btn radnici-password-modal-btn--save"
								onClick={handleChangePasswordSubmit}
								disabled={changingPassword}
							>
								{changingPassword ? 'Spremanje...' : 'Spremi lozinku'}
							</button>
						</div>
					</div>
				</div>
			)}
		</section>
	)
}

export default Radnici
