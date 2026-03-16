import { useEffect, useMemo, useState } from 'react'
import { updateNalog } from '../services/naloziApi'

const toDateInput = (dateString) => {
	if (!dateString) return ''
	if (dateString.includes('T')) return dateString.split('T')[0]
	if (dateString.includes(' ')) return dateString.split(' ')[0]
	return dateString
}

const parseCsvIds = (value) =>
	String(value || '')
		.split(',')
		.map((part) => part.trim())
		.filter((part) => part)

function useEditNalogFlow({
	canEditNalogItem,
	canEditOpisOnly,
	loggedInRadnikId,
	allowedStatuses,
	klijentiItems,
	adreseItems,
	kontaktiItems,
	radniciItems,
	onReloadNalozi,
}) {
	const [modalVisible, setModalVisible] = useState(false)
	const [editingNalog, setEditingNalog] = useState(null)
	const [editNazivNaloga, setEditNazivNaloga] = useState('')
	const [editKlijent, setEditKlijent] = useState('')
	const [editAdresa, setEditAdresa] = useState('')
	const [editKontakt, setEditKontakt] = useState('')
	const [editMaterijal, setEditMaterijal] = useState('')
	const [editOprema, setEditOprema] = useState('')
	const [editPocetakNaloga, setEditPocetakNaloga] = useState('')
	const [editIzvrsitiDo, setEditIzvrsitiDo] = useState('')
	const [editVoditeljNaloga, setEditVoditeljNaloga] = useState('')
	const [editRadnici, setEditRadnici] = useState([])
	const [editOpisPosla, setEditOpisPosla] = useState('')
	const [editStatusNaloga, setEditStatusNaloga] = useState('aktivan')

	const resolveKlijentId = (rawValue) => {
		const directId = Number(rawValue)
		if (Number.isInteger(directId) && directId > 0) {
			const exists = klijentiItems.some((item) => Number(item.id_klijent) === directId)
			if (exists) return String(directId)
		}

		const rawText = String(rawValue ?? '').trim().toLowerCase()
		if (!rawText) return ''

		const matched = klijentiItems.find(
			(item) => String(item.naziv_klijenta ?? '').trim().toLowerCase() === rawText,
		)

		return matched ? String(matched.id_klijent) : ''
	}

	const resolveAdresaId = (rawValue, klijentId) => {
		const directId = Number(rawValue)
		if (Number.isInteger(directId) && directId > 0) {
			const exists = adreseItems.some((item) => Number(item.id_adresa) === directId)
			if (exists) return String(directId)
		}

		const rawText = String(rawValue ?? '').trim().toLowerCase()
		if (!rawText) return ''

		const matched = adreseItems.find((item) => {
			const sameKlijent = klijentId ? String(item.id_klijent) === String(klijentId) : true
			return sameKlijent && String(item.adresa ?? '').trim().toLowerCase() === rawText
		})

		return matched ? String(matched.id_adresa) : ''
	}

	const resolveKontaktId = (rawValue, klijentId) => {
		const directId = Number(rawValue)
		if (Number.isInteger(directId) && directId > 0) {
			const exists = kontaktiItems.some((item) => Number(item.id_kontakt) === directId)
			if (exists) return String(directId)
		}

		const rawText = String(rawValue ?? '').trim().toLowerCase()
		if (!rawText) return ''

		const matched = kontaktiItems.find((item) => {
			const sameKlijent = klijentId ? String(item.id_klijent) === String(klijentId) : true
			return sameKlijent && String(item.naziv ?? '').trim().toLowerCase() === rawText
		})

		return matched ? String(matched.id_kontakt) : ''
	}

	const handleOpenEdit = (item) => {
		if (!canEditNalogItem(item)) {
			window.alert('Greška: Nemate pravo uređivati radni nalog')
			return
		}

		const resolvedKlijentId = resolveKlijentId(item.klijent)
		const resolvedAdresaId = resolveAdresaId(item.adresa, resolvedKlijentId)
		const resolvedKontaktId = resolveKontaktId(item.id_kontakt, resolvedKlijentId)
		const parsedRadnici = parseCsvIds(item.id_radnici_csv)
		const rawVoditelj = String(item.voditelj_naloga || '')
		const parsedRadniciWithVoditelj =
			rawVoditelj && !parsedRadnici.includes(rawVoditelj)
				? [...parsedRadnici, rawVoditelj]
				: parsedRadnici

		setEditingNalog(item)
		setEditNazivNaloga(item.naziv_naloga || '')
		setEditKlijent(resolvedKlijentId)
		setEditAdresa(resolvedAdresaId)
		setEditKontakt(resolvedKontaktId)
		setEditMaterijal(item.materijal || '')
		setEditOprema(item.oprema || '')
		setEditPocetakNaloga(toDateInput(item.pocetak_naloga ?? item.Pocetak_naloga))
		setEditIzvrsitiDo(toDateInput(item.Izvrsiti_do ?? item.izvrsiti_do))
		setEditVoditeljNaloga(rawVoditelj)
		setEditRadnici(parsedRadniciWithVoditelj)
		setEditOpisPosla(item.opis_posla || '')
		setEditStatusNaloga(item.status_naloga || 'aktivan')
		setModalVisible(true)
	}

	const editVoditeljiItems = useMemo(() => {
		const selectedSet = new Set((Array.isArray(editRadnici) ? editRadnici : []).map(String))
		return radniciItems.filter((item) => selectedSet.has(String(item.id_radnik)))
	}, [radniciItems, editRadnici])

	useEffect(() => {
		if (!editVoditeljNaloga) return
		const existsInSelected = editVoditeljiItems.some(
			(item) => String(item.id_radnik) === String(editVoditeljNaloga),
		)
		if (!existsInSelected) {
			setEditVoditeljNaloga('')
		}
	}, [editVoditeljNaloga, editVoditeljiItems])

	const handleSaveEdit = async () => {
		if (!editingNalog) return

		if (!canEditNalogItem(editingNalog)) {
			window.alert('Greška: Nemate pravo uređivati radni nalog')
			return
		}

		if (canEditOpisOnly) {
			if (!editOpisPosla.trim()) {
				window.alert('Greška: Opis posla je obavezno polje')
				return
			}

			const opisPayload = {
				opis_posla: editOpisPosla.trim(),
				materijal: editMaterijal.trim(),
				actor_id_radnik:
					Number.isInteger(loggedInRadnikId) && loggedInRadnikId > 0 ? loggedInRadnikId : null,
			}

			const opisResult = await updateNalog(editingNalog.id_nalog, opisPayload)
			if (opisResult.ok) {
				window.alert(opisResult.message)
				setModalVisible(false)
				setEditingNalog(null)
				setEditRadnici([])
				await onReloadNalozi()
				return
			}

			window.alert(`Greška: ${opisResult.error}`)
			return
		}

		if (!editNazivNaloga.trim()) {
			window.alert('Greška: Naziv naloga je obavezno polje')
			return
		}

		if (!allowedStatuses.includes(editStatusNaloga)) {
			window.alert('Greška: Odaberite ispravan status naloga')
			return
		}

		const parsedKlijent = Number(editKlijent)
		if (!Number.isInteger(parsedKlijent) || parsedKlijent <= 0) {
			window.alert('Greška: Odaberite klijenta iz liste')
			return
		}

		const parsedAdresa = Number(editAdresa)
		if (!Number.isInteger(parsedAdresa) || parsedAdresa <= 0) {
			window.alert('Greška: Odaberite adresu iz liste')
			return
		}

		const parsedKontakt = Number(editKontakt)
		if (!Number.isInteger(parsedKontakt) || parsedKontakt <= 0) {
			window.alert('Greška: Odaberite kontakt osobu iz liste')
			return
		}

		if (!editPocetakNaloga.trim()) {
			window.alert('Greška: Početak naloga je obavezno polje')
			return
		}

		if (!editIzvrsitiDo.trim()) {
			window.alert('Greška: Izvršiti do je obavezno polje')
			return
		}

		if (!editOprema.trim()) {
			window.alert('Greška: Oprema je obavezno polje')
			return
		}

		if (!editOpisPosla.trim()) {
			window.alert('Greška: Opis posla je obavezno polje')
			return
		}

		const parsedVoditeljNaloga = Number(editVoditeljNaloga)
		if (!Number.isInteger(parsedVoditeljNaloga) || parsedVoditeljNaloga <= 0) {
			window.alert('Greška: Odaberite voditelja naloga')
			return
		}

		const parsedRadnici = Array.isArray(editRadnici)
			? [...new Set(editRadnici.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))]
			: []

		if (parsedRadnici.length === 0) {
			window.alert('Greška: Odaberite najmanje jednog radnika')
			return
		}

		if (!parsedRadnici.includes(parsedVoditeljNaloga)) {
			parsedRadnici.push(parsedVoditeljNaloga)
		}

		const payload = {
			naziv_naloga: editNazivNaloga.trim(),
			klijent: parsedKlijent,
			adresa: parsedAdresa,
			id_kontakt: parsedKontakt,
			materijal: editMaterijal.trim(),
			oprema: editOprema.trim(),
			pocetak_naloga: editPocetakNaloga.trim(),
			Izvrsiti_do: editIzvrsitiDo.trim(),
			voditelj_naloga: parsedVoditeljNaloga,
			id_radnici: parsedRadnici,
			opis_posla: editOpisPosla.trim(),
			status_naloga: editStatusNaloga,
			actor_id_radnik:
				Number.isInteger(loggedInRadnikId) && loggedInRadnikId > 0 ? loggedInRadnikId : null,
		}

		const result = await updateNalog(editingNalog.id_nalog, payload)
		if (result.ok) {
			window.alert(result.message)
			setModalVisible(false)
			setEditingNalog(null)
			setEditRadnici([])
			await onReloadNalozi()
			return
		}

		window.alert(`Greška: ${result.error}`)
	}

	const hideEditModal = () => {
		setModalVisible(false)
	}

	const closeEditModal = () => {
		setModalVisible(false)
		setEditingNalog(null)
	}

	return {
		modalVisible,
		editingNalog,
		editNazivNaloga,
		setEditNazivNaloga,
		editKlijent,
		setEditKlijent,
		editAdresa,
		setEditAdresa,
		editKontakt,
		setEditKontakt,
		editMaterijal,
		setEditMaterijal,
		editOprema,
		setEditOprema,
		editPocetakNaloga,
		setEditPocetakNaloga,
		editIzvrsitiDo,
		setEditIzvrsitiDo,
		editVoditeljNaloga,
		setEditVoditeljNaloga,
		editRadnici,
		setEditRadnici,
		editOpisPosla,
		setEditOpisPosla,
		editStatusNaloga,
		setEditStatusNaloga,
		editVoditeljiItems,
		handleOpenEdit,
		handleSaveEdit,
		hideEditModal,
		closeEditModal,
	}
}

export default useEditNalogFlow
