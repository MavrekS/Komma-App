import { useEffect, useMemo, useState } from 'react'
import './UnosNalogaMeni.css'
import TabLabel from '../TabComponents/TabLabel'
import TabTextInput from '../TabComponents/TabTextInput'
import TabDatePicker from '../TabComponents/TabDatePicker'
import TabComboBoxKlijenti from '../TabComponents/TabComboBoxKlijenti'
import TabComboBoxAdrese from '../TabComponents/TabComboBoxAdrese'
import TabComboBoxKontakti from '../TabComponents/TabComboBoxKontakti'
import TabComboBoxRadnici from '../TabComponents/TabComboBoxRadnici'
import TabButton from '../TabComponents/TabButton'
import { getAllKlijenti } from '../services/klijentiApi'
import { getAllAdrese, insertAdresa } from '../services/adreseApi'
import { getAllKontakti, insertKontakt } from '../services/kontaktiApi'
import { getAllRadnici } from '../services/radniciApi'
import { insertNalog } from '../services/naloziApi'
import AdresaModal from '../Sifarnici/AdresaModal'
import KontaktModal from '../Sifarnici/KontaktModal'

const toLocalDateString = (date) => {
	if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

function UnosNalogaMeni({
	loggedInUser,
	onSubmitNalog,
	loadKlijenti,
	loadAdrese,
	loadRadnici,
	klijentiItems,
	adreseItems,
	radniciItems,
}) {
	const [naziv_naloga, setNaziv_naloga] = useState('')
	const [klijent, setKlijent] = useState('')
	const [adresa, setAdresa] = useState('')
	const [id_kontakt, setIdKontakt] = useState('')
	const [materijal, setMaterijal] = useState('')
	const [oprema, setOprema] = useState('')
	const [opis_posla, setOpis_posla] = useState('')
	const [status_naloga, setStatusNaloga] = useState('aktivan')
	const [pocetak_naloga, setPocetak_naloga] = useState(null)
	const [izvrsiti_do, setIzvrsiti_do] = useState(null)
	const [id_radnici, setId_radnici] = useState([])
	const [voditelj_naloga, setVoditelj_naloga] = useState('')
	const [localRadniciItems, setLocalRadniciItems] = useState([])
	const [localKlijentiItems, setLocalKlijentiItems] = useState([])
	const [localAdreseItems, setLocalAdreseItems] = useState([])
	const [kontaktiItems, setKontaktiItems] = useState([])
	const [adresaModalVisible, setAdresaModalVisible] = useState(false)
	const [kontaktModalVisible, setKontaktModalVisible] = useState(false)

	const klijentiLoader = loadKlijenti || getAllKlijenti
	const adreseLoader = loadAdrese || getAllAdrese
	const radniciLoader = loadRadnici || getAllRadnici
	const role = String(loggedInUser?.role || 'user').toLowerCase()
	const actorIdRadnik = Number(loggedInUser?.id_radnik)
	const canManageNalog = role !== 'user'
	const availableStatuses = ['aktivan', 'neaktivan', 'izvrseni', 'ponisteni']

	const effectiveKlijentiItems = Array.isArray(klijentiItems) ? klijentiItems : localKlijentiItems
	const effectiveAdreseItems = Array.isArray(adreseItems) ? adreseItems : localAdreseItems
	const effectiveRadniciItems = Array.isArray(radniciItems) ? radniciItems : localRadniciItems

	const loadKontaktiData = async () => {
		const result = await getAllKontakti()
		if (result?.ok) {
			setKontaktiItems(result.data ?? [])
			return
		}
		setKontaktiItems([])
	}

	const loadAdreseData = async () => {
		if (Array.isArray(adreseItems)) {
			setLocalAdreseItems([])
			return
		}

		if (typeof adreseLoader !== 'function') {
			setLocalAdreseItems([])
			return
		}

		const result = await adreseLoader()
		if (result?.ok) {
			setLocalAdreseItems(result.data ?? [])
			return
		}

		setLocalAdreseItems([])
	}

	useEffect(() => {
		loadKontaktiData()
	}, [])

	useEffect(() => {
		const load = async () => {
			try {
				if (Array.isArray(klijentiItems)) {
					setLocalKlijentiItems([])
					return
				}

				if (typeof klijentiLoader !== 'function') {
					setLocalKlijentiItems([])
					return
				}

				const result = await klijentiLoader()
				if (result?.ok) {
					setLocalKlijentiItems(result.data ?? [])
					return
				}

				setLocalKlijentiItems([])
			} catch {
				setLocalKlijentiItems([])
			}
		}

		load()
	}, [klijentiItems, klijentiLoader])

	useEffect(() => {
		const load = async () => {
			try {
				await loadAdreseData()
			} catch {
				setLocalAdreseItems([])
			}
		}

		load()
	}, [adreseItems, adreseLoader])

	useEffect(() => {
		const load = async () => {
			try {
				if (Array.isArray(radniciItems)) {
					setLocalRadniciItems([])
					return
				}

				if (typeof radniciLoader !== 'function') {
					setLocalRadniciItems([])
					return
				}

				const result = await radniciLoader()
				if (result?.ok) {
					setLocalRadniciItems(result.data ?? [])
					return
				}

				setLocalRadniciItems([])
			} catch {
				setLocalRadniciItems([])
			}
		}

		load()
	}, [radniciItems, radniciLoader])

	const voditeljiItems = useMemo(() => {
		const selectedSet = new Set((Array.isArray(id_radnici) ? id_radnici : []).map(String))
		return effectiveRadniciItems.filter((item) => selectedSet.has(String(item.id_radnik)))
	}, [effectiveRadniciItems, id_radnici])

	const handleDateChange = (date) => {
		const cleanDate = new Date(date)
		cleanDate.setHours(0, 0, 0, 0)
		setIzvrsiti_do(cleanDate)
	}

	const handlePocetakNalogaChange = (date) => {
		const cleanDate = new Date(date)
		cleanDate.setHours(0, 0, 0, 0)
		setPocetak_naloga(cleanDate)
	}

	useEffect(() => {
		setAdresa('')
		setIdKontakt('')
	}, [klijent])

	useEffect(() => {
		if (!voditelj_naloga) return
		const existsInSelected = voditeljiItems.some(
			(item) => String(item.id_radnik) === String(voditelj_naloga),
		)
		if (!existsInSelected) {
			setVoditelj_naloga('')
		}
	}, [voditelj_naloga, voditeljiItems])

	const handleSubmit = async () => {
		if (!canManageNalog) {
			window.alert('Greška: Nemate pravo kreirati radni nalog')
			return
		}

		if (!naziv_naloga.trim()) {
			window.alert('Greška: Naziv naloga je obavezno polje')
			return
		}

		const parsedKlijent = Number(klijent)
		if (!Number.isInteger(parsedKlijent) || parsedKlijent <= 0) {
			window.alert('Greška: Klijent je obavezno polje')
			return
		}

		const parsedAdresa = Number(adresa)
		if (!Number.isInteger(parsedAdresa) || parsedAdresa <= 0) {
			window.alert('Greška: Adresa je obavezno polje')
			return
		}

		if (!pocetak_naloga) {
			window.alert('Greška: Početak naloga je obavezno polje')
			return
		}

		if (!izvrsiti_do) {
			window.alert('Greška: Izvršiti do je obavezno polje')
			return
		}

		if (!oprema.trim()) {
			window.alert('Greška: Oprema je obavezno polje')
			return
		}

		const parsedKontakt = Number(id_kontakt)
		if (!Number.isInteger(parsedKontakt) || parsedKontakt <= 0) {
			window.alert('Greška: Kontakt osoba je obavezno polje')
			return
		}

		if (!opis_posla.trim()) {
			window.alert('Greška: Opis posla je obavezno polje')
			return
		}

		const parsedRadnici = id_radnici
			.map((id) => Number(id))
			.filter((id) => Number.isInteger(id) && id > 0)

		if (parsedRadnici.length === 0) {
			window.alert('Greška: Odaberite najmanje jednog radnika')
			return
		}

		const parsedVoditeljNalog = Number(voditelj_naloga)
		if (!Number.isInteger(parsedVoditeljNalog) || parsedVoditeljNalog <= 0) {
			window.alert('Greška: Odaberite voditelja naloga')
			return
		}

		if (!parsedRadnici.includes(parsedVoditeljNalog)) {
			parsedRadnici.push(parsedVoditeljNalog)
		}

		const payload = {
			naziv_naloga: naziv_naloga.trim(),
			klijent: parsedKlijent,
			materijal: materijal.trim(),
			status_naloga,
			id_kontakt: parsedKontakt,
			pocetak_naloga: toLocalDateString(pocetak_naloga),
			Izvrsiti_do: toLocalDateString(izvrsiti_do),
			kreiran_na_datum: new Date().toISOString(),
			adresa: parsedAdresa,
			oprema: oprema.trim(),
			opis_posla: opis_posla.trim(),
			id_radnici: parsedRadnici,
			voditelj_naloga: parsedVoditeljNalog,
			actor_id_radnik: Number.isInteger(actorIdRadnik) && actorIdRadnik > 0 ? actorIdRadnik : null,
		}

		let result = { ok: true, message: 'Nalog uspješno pripremljen' }
		if (typeof onSubmitNalog === 'function') {
			result = await onSubmitNalog(payload)
		} else {
			result = await insertNalog(payload)
		}

		if (result?.ok) {
			window.alert(result?.message || 'Uspješno')
			setNaziv_naloga('')
			setKlijent('')
			setAdresa('')
			setIdKontakt('')
			setMaterijal('')
			setOprema('')
			setOpis_posla('')
			setStatusNaloga('aktivan')
			setPocetak_naloga(null)
			setIzvrsiti_do(null)
			setId_radnici([])
			setVoditelj_naloga('')
		} else {
			window.alert(`Greška: ${result?.error || 'Neuspješno spremanje'}`)
		}
	}

	return (
		<section className="unos-naloga-meni">
			<TabLabel label="Naziv naloga:" />
			<TabTextInput
				placeholder="Unesite naziv"
				value={naziv_naloga}
				onChangeText={setNaziv_naloga}
			/>

			<TabLabel label="Klijent:" />
			<TabComboBoxKlijenti
				placeholder="Odaberite klijenta"
				value={klijent}
				onChange={setKlijent}
				loadKlijenti={klijentiLoader}
				items={klijentiItems}
			/>

			<TabLabel label="Lokacija rada:" />
			<div className="unos-naloga-inline-field-row">
				<TabComboBoxAdrese
					placeholder="Odaberite lokaciju rada"
					value={adresa}
					onChange={setAdresa}
					klijentId={klijent}
					items={effectiveAdreseItems}
				/>
				<button
					type="button"
					className="unos-naloga-inline-add-btn"
					onClick={() => setAdresaModalVisible(true)}
				>
					+ Lokacija
				</button>
			</div>

			<TabLabel label="Kontakt osoba:" />
			<div className="unos-naloga-inline-field-row">
				<TabComboBoxKontakti
					placeholder="Odaberite kontakt osobu"
					value={id_kontakt}
					onChange={setIdKontakt}
					klijentId={klijent}
					items={kontaktiItems}
				/>
				<button
					type="button"
					className="unos-naloga-inline-add-btn"
					onClick={() => setKontaktModalVisible(true)}
				>
					+ Kontakt
				</button>
			</div>

			<TabLabel label="Početak naloga:" />
			<TabDatePicker value={pocetak_naloga} onChange={handlePocetakNalogaChange} />

			<TabLabel label="Izvrsiti do:" />
			<TabDatePicker value={izvrsiti_do} onChange={handleDateChange} />

			
			

			<TabLabel label="Radnici:" />
			<TabComboBoxRadnici
				placeholder="Odaberite jednog ili više radnika"
				value={id_radnici}
				onChange={setId_radnici}
				multiple
				items={effectiveRadniciItems}
			/>

			<TabLabel label="Voditelj naloga:" />
			<TabComboBoxRadnici
				placeholder={id_radnici.length === 0 ? 'Prvo odaberite radnika' : 'Odaberite voditelja naloga'}
				value={voditelj_naloga}
				onChange={setVoditelj_naloga}
				disabled={id_radnici.length === 0}
				items={voditeljiItems}
			/>

			<TabLabel label="Oprema:" />
			<TabTextInput
				placeholder="Unesite opremu"
				value={oprema}
				onChangeText={setOprema}
			/>

			<TabLabel label="Materijal:" />
			<TabTextInput
				placeholder="Unesite materijal"
				value={materijal}
				onChangeText={setMaterijal}
			/>

			<TabLabel label="Status naloga:" />
			<div className="unos-naloga-status-chip-wrap">
				{availableStatuses.map((status) => {
					const isSelected = status_naloga === status
					return (
						<button
							key={status}
							type="button"
							className={`unos-naloga-status-chip${isSelected ? ' is-selected' : ''}`}
							onClick={() => setStatusNaloga(status)}
						>
							{status}
						</button>
					)
				})}
			</div>

			<TabLabel label="Opis posla:" />
			<TabTextInput
				placeholder="Unesite opis"
				value={opis_posla}
				onChangeText={setOpis_posla}
				multiline
				style={{ height: 110, paddingTop: 10 }}
			/>

			<div className="unos-naloga-submit-row">
				<TabButton
					label={canManageNalog ? 'Unesi nalog' : 'Nemate pravo kreiranja'}
					isClicked={canManageNalog}
					onClick={handleSubmit}
				/>
			</div>

			<AdresaModal
				visible={adresaModalVisible}
				onClose={() => setAdresaModalVisible(false)}
				onSuccess={loadAdreseData}
				insertAdresaAction={insertAdresa}
				loadKlijenti={klijentiLoader}
				klijentiItems={effectiveKlijentiItems}
				defaultKlijentId={klijent}
			/>

			<KontaktModal
				visible={kontaktModalVisible}
				onClose={() => setKontaktModalVisible(false)}
				onSuccess={loadKontaktiData}
				insertKontaktAction={insertKontakt}
				loadKlijenti={klijentiLoader}
				klijentiItems={effectiveKlijentiItems}
				defaultKlijentId={klijent}
			/>
		</section>
	)
}

export default UnosNalogaMeni
