import { useEffect, useMemo, useState } from 'react'
import './UnosOdsustvaMeni.css'
import TabLabel from '../TabComponents/TabLabel'
import TabDatePicker from '../TabComponents/TabDatePicker'
import TabComboBoxRadnici from '../TabComponents/TabComboBoxRadnici'
import TabButton from '../TabComponents/TabButton'
import { getAllRadnici } from '../services/radniciApi'
import { insertRadniDan } from '../services/radniDanApi'

const toDateOnly = (dateValue) => {
  const year = dateValue.getFullYear()
  const month = String(dateValue.getMonth() + 1).padStart(2, '0')
  const day = String(dateValue.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const enumerateDatesInclusive = (startDate, endDate) => {
  const dates = []
  const cursor = new Date(startDate)
  cursor.setHours(0, 0, 0, 0)

  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)

  while (cursor.getTime() <= end.getTime()) {
    dates.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates
}

function UnosOdsustvaMeni({ loggedInUser }) {
  const [odDatuma, setOdDatuma] = useState(null)
  const [doDatuma, setDoDatuma] = useState(null)
  const [idRadnik, setIdRadnik] = useState('')
  const [radniciItems, setRadniciItems] = useState([])

  const role = String(loggedInUser?.role || 'user').toLowerCase()
  const loggedIdRadnik = Number(loggedInUser?.id_radnik)
  const canPickRadnik = role !== 'user'
  const canSubmitGodisnji = role !== 'user'
  const canSubmitBolovanje = role !== 'user'

  useEffect(() => {
    if (!canPickRadnik) {
      setIdRadnik(Number.isInteger(loggedIdRadnik) && loggedIdRadnik > 0 ? String(loggedIdRadnik) : '')
      return
    }

    const load = async () => {
      const result = await getAllRadnici()
      if (result?.ok) {
        setRadniciItems(result.data ?? [])
        return
      }
      setRadniciItems([])
    }

    load()
  }, [canPickRadnik, loggedIdRadnik])

  const previewCount = useMemo(() => {
    if (!odDatuma || !doDatuma) return 0

    const start = new Date(odDatuma)
    start.setHours(0, 0, 0, 0)
    const end = new Date(doDatuma)
    end.setHours(0, 0, 0, 0)

    if (end.getTime() < start.getTime()) return 0
    return enumerateDatesInclusive(start, end).length
  }, [odDatuma, doDatuma])

  const handleSubmit = async (targetStatus) => {
    if (targetStatus === 'godišnji' && !canSubmitGodisnji) {
      window.alert('Greška: Korisnik s rolom user ne može unositi godišnji')
      return
    }

    if (targetStatus === 'bolovanje' && !canSubmitBolovanje) {
      window.alert('Greška: Korisnik s rolom user ne može unositi bolovanje')
      return
    }

    const parsedIdRadnik = Number(idRadnik)
    if (!Number.isInteger(parsedIdRadnik) || parsedIdRadnik <= 0) {
      window.alert('Greška: Radnik je obavezno polje')
      return
    }

    if (!odDatuma || !doDatuma) {
      window.alert('Greška: Od i do datum su obavezna polja')
      return
    }

    const start = new Date(odDatuma)
    start.setHours(0, 0, 0, 0)
    const end = new Date(doDatuma)
    end.setHours(0, 0, 0, 0)

    if (end.getTime() < start.getTime()) {
      window.alert('Greška: Do datum mora biti veći ili jednak od datuma')
      return
    }

    const dates = enumerateDatesInclusive(start, end)
    let successCount = 0
    const statusRadnogDana = targetStatus === 'bolovanje' ? 'bolovanje' : 'godišnji'
    const tekstVrijednost = statusRadnogDana

    for (const day of dates) {
      const payload = {
        id_radnik: parsedIdRadnik,
        pocetak_rada: '00:00:00',
        kraj_rada: '00:00:00',
        polazak: '00:00:00',
        dolazak: '00:00:00',
        datum_rada: toDateOnly(day),
        status_radnog_dana: statusRadnogDana,
        dodatni_radovi: tekstVrijednost,
        id_nalog: -1,
        id_radnici_dodatni: [],
      }

      const result = await insertRadniDan(payload)
      if (!result?.ok) {
        if (result?.status === 409) {
          window.alert(result?.error || 'Konflikt unosa za odabrani datum')
          return
        }
        window.alert(`Greška: ${result?.error || 'Neuspješan unos odsustva'}`)
        return
      }

      successCount += 1
    }

    window.alert(`Uspješno uneseno ${successCount} dana (${statusRadnogDana})`)
    setOdDatuma(null)
    setDoDatuma(null)
  }

  return (
    <section className="unos-odsustva-meni">
      <TabLabel label="Radnik:" />
      <TabComboBoxRadnici
        placeholder={canPickRadnik ? 'Odaberite radnika' : 'Prijavljeni radnik'}
        value={idRadnik}
        onChange={setIdRadnik}
        disabled={!canPickRadnik}
        items={canPickRadnik ? radniciItems : [{ id_radnik: loggedIdRadnik, username: loggedInUser?.username || 'Prijavljeni' }]}
      />

      <TabLabel label="Od datuma:" />
      <TabDatePicker value={odDatuma} onChange={setOdDatuma} />

      <TabLabel label="Do datuma:" />
      <TabDatePicker value={doDatuma} onChange={setDoDatuma} />

      {previewCount > 0 && (
        <p className="unos-radnog-dana-preview-info">
          Bit će uneseno {previewCount} {previewCount === 1 ? 'dan' : 'dana'}.
        </p>
      )}

      {canSubmitGodisnji && (
        <div className="unos-odsustva-submit-row">
          <TabButton
            label="Unesi godišnji"
            isClicked
            onClick={() => handleSubmit('godišnji')}
          />
        </div>
      )}

      {canSubmitBolovanje && (
        <div className="unos-odsustva-submit-row">
          <TabButton
            label="Unesi bolovanje"
            isClicked
            onClick={() => handleSubmit('bolovanje')}
          />
        </div>
      )}
    </section>
  )
}

export default UnosOdsustvaMeni
