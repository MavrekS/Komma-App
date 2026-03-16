import { useEffect, useMemo, useState } from 'react'
import './UnosRadnogDanaMeni.css'
import TabLabel from '../TabComponents/TabLabel'
import TabTextInput from '../TabComponents/TabTextInput'
import TabDatePicker from '../TabComponents/TabDatePicker'
import TabTimePicker from '../TabComponents/TabTimePicker'
import TabComboBoxNalozi from '../TabComponents/TabComboBoxNalozi'
import TabButton from '../TabComponents/TabButton'
import { getAllNalozi } from '../services/naloziApi'
import { insertRadniDan } from '../services/radniDanApi'

const toLocalDateString = (date) => {
	if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

function UnosRadnogDanaMeni({ loggedInUser }) {
	const [pocetak_rada, setPocetakRada] = useState(null)
	const [kraj_rada, setKrajRada] = useState(null)
	const [polazak, setPolazak] = useState(null)
	const [dolazak, setDolazak] = useState(null)
	const [datum_rada, setDatumRada] = useState(null)
	const [dodatni_radovi, setDodatniRadovi] = useState('')
	const [id_nalog, setIdNalog] = useState('')
	const [naloziItems, setNaloziItems] = useState([])

	const id_radnik = Number(loggedInUser?.id_radnik)
	const role = String(loggedInUser?.role || 'user').toLowerCase()
	const nalogFilterRadnikId = role === 'user' ? id_radnik : null

	useEffect(() => {
		const load = async () => {
			const naloziResult = await getAllNalozi(nalogFilterRadnikId)

			setNaloziItems(naloziResult?.ok ? (naloziResult.data ?? []) : [])
		}

		load()
	}, [nalogFilterRadnikId])

	const selectedNalog = useMemo(
		() => naloziItems.find((item) => String(item.id_nalog) === String(id_nalog)) || null,
		[naloziItems, id_nalog],
	)

	const previewInsertCount = useMemo(() => {
		if (!selectedNalog) return 0
		return 1
	}, [selectedNalog])

	const handleSubmit = async () => {
		if (!Number.isInteger(id_radnik) || id_radnik <= 0) {
			window.alert('Greška: Nije pronađen prijavljeni korisnik')
			return
		}
		if (!pocetak_rada) {
			window.alert('Greška: Početak rada je obavezno polje')
			return
		}
		if (!kraj_rada) {
			window.alert('Greška: Kraj rada je obavezno polje')
			return
		}
		if (!datum_rada) {
			window.alert('Greška: Datum rada je obavezno polje')
			return
		}
		if (!polazak) {
			window.alert('Greška: Polazak je obavezno polje')
			return
		}
		if (!dolazak) {
			window.alert('Greška: Dolazak je obavezno polje')
			return
		}
		if (!id_nalog.trim()) {
			window.alert('Greška: ID naloga je obavezno polje')
			return
		}
		if (!dodatni_radovi.trim()) {
			window.alert('Greška: Dodatni radovi su obavezno polje')
			return
		}
		const timeToString = (date) => {
			const hours = String(date.getHours()).padStart(2, '0')
			const minutes = String(date.getMinutes()).padStart(2, '0')
			const seconds = String(date.getSeconds()).padStart(2, '0')
			return `${hours}:${minutes}:${seconds}`
		}

		const toSeconds = (date) => date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()

		if (toSeconds(pocetak_rada) >= toSeconds(kraj_rada)) {
			window.alert('Greška: Početak rada mora biti prije kraja rada')
			return
		}

		if (toSeconds(polazak) >= toSeconds(dolazak)) {
			window.alert('Greška: Polazak mora biti prije dolaska')
			return
		}

		const payload = {
			id_radnik,
			pocetak_rada: timeToString(pocetak_rada),
			kraj_rada: timeToString(kraj_rada),
			polazak: timeToString(polazak),
			dolazak: timeToString(dolazak),
			datum_rada: toLocalDateString(datum_rada),
			status_radnog_dana: 'radni_dan',
			dodatni_radovi: dodatni_radovi.trim(),
			id_nalog: parseInt(id_nalog, 10),
			id_radnici_dodatni: [],
		}

		const result = await insertRadniDan(payload)
		if (result?.ok) {
			window.alert(result?.message || 'Uspješno')
			setPocetakRada(null)
			setKrajRada(null)
			setPolazak(null)
			setDolazak(null)
			setDatumRada(null)
			setDodatniRadovi('')
			setIdNalog('')
		} else {
			if (result?.status === 409) {
				window.alert(result?.error || 'Konflikt unosa za odabrani datum')
				return
			}
			window.alert(`Greška: ${result?.error || 'Neuspješan unos radnog dana'}`)
		}
	}

	return (
		<section className="unos-radnog-dana-meni">
			<TabLabel label="Nalog:" />
			<TabComboBoxNalozi
				placeholder="Odaberite nalog"
				value={id_nalog}
				onChange={setIdNalog}
				items={naloziItems}
			/>

			<TabLabel label="Početak rada:" />
			<TabTimePicker value={pocetak_rada} onChange={setPocetakRada} />

			<TabLabel label="Kraj rada:" />
			<TabTimePicker value={kraj_rada} onChange={setKrajRada} />

			<TabLabel label="Polazak na posao:" />
			<TabTimePicker value={polazak} onChange={setPolazak} />

			<TabLabel label="Dolazak s posla:" />
			<TabTimePicker value={dolazak} onChange={setDolazak} />

			<TabLabel label="Datum rada:" />
			<TabDatePicker value={datum_rada} onChange={setDatumRada} />

			<TabLabel label="Dodatni radovi:" />
			<TabTextInput
				placeholder="Unesite dodatne radove"
				value={dodatni_radovi}
				onChangeText={setDodatniRadovi}
				multiline
				style={{ height: 110, paddingTop: 10 }}
			/>

			

			<div className="unos-radnog-dana-submit-row">
				<TabButton label="Unesi radni dan" isClicked onClick={handleSubmit} />
			</div>
		</section>
	)
}

export default UnosRadnogDanaMeni
