import { useEffect, useMemo, useState } from 'react'
import './IspisDnevnicaMeni.css'
import TabLabel from '../TabComponents/TabLabel'
import TabButton from '../TabComponents/TabButton'
import { getAllRadnici } from '../services/radniciApi'
import { getAllRadniDani } from '../services/radniDanApi'
import { getAllNalozi } from '../services/naloziApi'
import { getAllAdrese } from '../services/adreseApi'
import { getAllPutniNalozi } from '../services/putniNaloziApi'

const HALF_PER_DIEM = 15
const FULL_PER_DIEM = 30

const parseTimeToSeconds = (value) => {
  if (!value) return null
  const match = String(value).match(/(\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = Number(match[3] || '0')

  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || !Number.isInteger(seconds)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) return null

  return hours * 3600 + minutes * 60 + seconds
}

const getDurationSecondsFromParsed = (startSeconds, endSeconds) => {
  if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds)) return 0
  if (endSeconds >= startSeconds) return endSeconds - startSeconds
  return 24 * 3600 - startSeconds + endSeconds
}

const toMonthKey = (value) => {
  const text = String(value || '')
  const datePart = text.includes('T') ? text.split('T')[0] : text.includes(' ') ? text.split(' ')[0] : text
  const match = datePart.match(/^(\d{4})-(\d{2})-\d{2}$/)
  if (!match) return ''
  return `${match[1]}-${match[2]}`
}

const toDateKey = (value) => {
  const text = String(value || '')
  const datePart = text.includes('T') ? text.split('T')[0] : text.includes(' ') ? text.split(' ')[0] : text
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return ''
  return `${match[1]}-${match[2]}-${match[3]}`
}

const normalizeDnevnicaMode = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'van_zupanije' || normalized === 'van županije' || normalized === '1') return 'van_zupanije'
  if (normalized === 'van_drzave' || normalized === 'van države' || normalized === '2') return 'van_drzave'
  return 'unutar_zupanije'
}

const isOutsideCounty = (mode) => mode === 'van_zupanije' || mode === 'van_drzave'

const formatDate = (dateKey) => {
  const [year, month, day] = String(dateKey || '').split('-')
  if (!year || !month || !day) return dateKey || 'N/A'
  return `${day}.${month}.${year}`
}

const parseTravelCost = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return parsed
}

const getTravelTotal = (item) => (
  parseTravelCost(item.trosak_spavanja) +
  parseTravelCost(item.trosak_goriva) +
  parseTravelCost(item.trosak_materijala) +
  parseTravelCost(item.cestarina_trajekt) +
  parseTravelCost(item.ostalo)
)

function IspisDnevnicaMeni({ loggedInUser }) {
  const role = String(loggedInUser?.role || 'user').trim().toLowerCase()
  const loggedInRadnikId = Number(loggedInUser?.id_radnik)

  const currentMonth = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }, [])

  const [targetMonth, setTargetMonth] = useState(currentMonth)
  const [radnici, setRadnici] = useState([])
  const [selectedRadnikId, setSelectedRadnikId] = useState('')
  const [rows, setRows] = useState([])
  const [putniRows, setPutniRows] = useState([])
  const [summary, setSummary] = useState({ totalOvertimeHours: 0, totalPerDiemAmount: 0 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadRadnici = async () => {
      const result = await getAllRadnici()
      if (!result?.ok) {
        window.alert(`Greška: ${result?.error || 'Nije moguće učitati radnike'}`)
        setRadnici([])
        return
      }

      const items = result.data || []
      setRadnici(items)

      if (role === 'user') {
        const own = items.find((item) => Number(item.id_radnik) === loggedInRadnikId)
        setSelectedRadnikId(String(own?.id_radnik || loggedInRadnikId || ''))
        return
      }

      setSelectedRadnikId(String(items[0]?.id_radnik || ''))
    }

    loadRadnici()
  }, [role, loggedInRadnikId])

  const selectedRadnikLabel = useMemo(() => {
    const found = radnici.find((item) => String(item.id_radnik) === String(selectedRadnikId))
    if (!found) return 'N/A'
    return [found.ime, found.prezime].filter(Boolean).join(' ').trim() || found.username || `Radnik #${found.id_radnik}`
  }, [radnici, selectedRadnikId])

  const handleGenerate = async () => {
    const radnikIdNum = Number(selectedRadnikId)
    if (!Number.isInteger(radnikIdNum) || radnikIdNum <= 0) {
      window.alert('Greška: Odaberite radnika')
      return
    }

    if (!targetMonth) {
      window.alert('Greška: Odaberite mjesec')
      return
    }

    setLoading(true)
    const [radniDaniResult, naloziResult, adreseResult, putniNaloziResult] = await Promise.all([
      getAllRadniDani(),
      getAllNalozi(),
      getAllAdrese(),
      getAllPutniNalozi(),
    ])
    setLoading(false)

    if (!radniDaniResult?.ok || !naloziResult?.ok || !adreseResult?.ok || !putniNaloziResult?.ok) {
      window.alert('Greška: Nije moguće učitati podatke za ispis dnevnica')
      setRows([])
      setPutniRows([])
      setSummary({ totalOvertimeHours: 0, totalPerDiemAmount: 0 })
      return
    }

    const naloziById = (naloziResult.data || []).reduce((acc, nalog) => {
      acc[String(nalog.id_nalog)] = nalog
      return acc
    }, {})

    const dnevnicaByAdresaId = (adreseResult.data || []).reduce((acc, adresa) => {
      acc[String(adresa.id_adresa)] = normalizeDnevnicaMode(adresa.dnevnica)
      return acc
    }, {})

    const workerRows = (radniDaniResult.data || []).filter(
      (item) =>
        Number(item.id_radnik) === radnikIdNum &&
        toMonthKey(item.datum_rada) === targetMonth &&
        String(item.status_radnog_dana || '').trim().toLowerCase() === 'radni_dan',
    )

    const byDate = {}

    workerRows.forEach((item) => {
      const dateKey = toDateKey(item.datum_rada)
      if (!dateKey) return

      if (!byDate[dateKey]) {
        byDate[dateKey] = {
          earliestPocetak: null,
          latestKraj: null,
          outsideCounty: false,
          earliestPolazak: null,
          latestDolazak: null,
        }
      }

      const stats = byDate[dateKey]
      const pocetakSeconds = parseTimeToSeconds(item.pocetak_rada)
      const krajSeconds = parseTimeToSeconds(item.kraj_rada)
      const polazakSeconds = parseTimeToSeconds(item.polazak)
      const dolazakSeconds = parseTimeToSeconds(item.dolazak)

      const nalog = naloziById[String(item.id_nalog)]
      const mode = normalizeDnevnicaMode(dnevnicaByAdresaId[String(nalog?.adresa)])

      if (pocetakSeconds !== null) {
        stats.earliestPocetak = stats.earliestPocetak === null ? pocetakSeconds : Math.min(stats.earliestPocetak, pocetakSeconds)
      }

      if (krajSeconds !== null) {
        stats.latestKraj = stats.latestKraj === null ? krajSeconds : Math.max(stats.latestKraj, krajSeconds)
      }

      stats.outsideCounty = stats.outsideCounty || isOutsideCounty(mode)

      if (polazakSeconds !== null) {
        stats.earliestPolazak = stats.earliestPolazak === null ? polazakSeconds : Math.min(stats.earliestPolazak, polazakSeconds)
      }

      if (dolazakSeconds !== null) {
        stats.latestDolazak = stats.latestDolazak === null ? dolazakSeconds : Math.max(stats.latestDolazak, dolazakSeconds)
      }
    })

    const generatedRows = Object.entries(byDate)
      .map(([dateKey, stats]) => {
        const dayWorkSeconds =
          stats.earliestPocetak !== null && stats.latestKraj !== null
            ? getDurationSecondsFromParsed(stats.earliestPocetak, stats.latestKraj)
            : 0

        const overtimeSeconds = Math.max(0, dayWorkSeconds - 8 * 3600)
        const overtimeHours = overtimeSeconds / 3600

        let dnevnicaTip = 'Nema'
        let dnevnicaIznos = 0

        if (stats.outsideCounty && stats.earliestPolazak !== null && stats.latestDolazak !== null) {
          let travelSeconds = stats.latestDolazak - stats.earliestPolazak
          if (travelSeconds < 0) travelSeconds += 24 * 3600
          const travelHours = travelSeconds / 3600

          if (travelHours > 12) {
            dnevnicaTip = 'Puna'
            dnevnicaIznos = FULL_PER_DIEM
          } else if (travelHours > 8) {
            dnevnicaTip = 'Pola'
            dnevnicaIznos = HALF_PER_DIEM
          }
        }

        return {
          dateKey,
          overtimeHours,
          dnevnicaTip,
          dnevnicaIznos,
        }
      })
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))

    const totalOvertimeHours = generatedRows.reduce((sum, item) => sum + item.overtimeHours, 0)
    const totalPerDiemAmount = generatedRows.reduce((sum, item) => sum + item.dnevnicaIznos, 0)

    const generatedPutniRows = (putniNaloziResult.data || [])
      .filter(
        (item) =>
          Number(item.id_radnika) === radnikIdNum &&
          toMonthKey(item.kraj_naloga) === targetMonth,
      )
      .map((item) => ({
        id: item.id_putnog_nalog,
        naziv: item.naziv_putnog_naloga || `Putni #${item.id_putnog_nalog}`,
        trosakSpavanja: parseTravelCost(item.trosak_spavanja).toFixed(2),
        trosakGoriva: parseTravelCost(item.trosak_goriva).toFixed(2),
        trosakMaterijala: parseTravelCost(item.trosak_materijala).toFixed(2),
        cestarinaTrajekt: parseTravelCost(item.cestarina_trajekt).toFixed(2),
        ostalo: parseTravelCost(item.ostalo).toFixed(2),
        ukupno: getTravelTotal(item).toFixed(2),
        sortKey: toDateKey(item.kraj_naloga),
      }))
      .sort((a, b) => String(a.sortKey || '').localeCompare(String(b.sortKey || '')))

    setRows(generatedRows)
    setPutniRows(generatedPutniRows)
    setSummary({ totalOvertimeHours, totalPerDiemAmount })
  }

  const visibleRadnici = role === 'user'
    ? radnici.filter((item) => Number(item.id_radnik) === loggedInRadnikId)
    : radnici

  return (
    <section className="ispis-dnevnica-meni">
      <TabLabel label="Mjesec:" />
      <input
        type="month"
        className="ispis-dnevnica-input"
        value={targetMonth}
        onChange={(event) => setTargetMonth(event.target.value)}
      />

      <TabLabel label="Radnik:" />
      {role === 'user' ? (
        <input className="ispis-dnevnica-input" value={selectedRadnikLabel} disabled readOnly />
      ) : (
        <select
          className="ispis-dnevnica-input"
          value={selectedRadnikId}
          onChange={(event) => setSelectedRadnikId(event.target.value)}
        >
          {visibleRadnici.map((item) => {
            const fullName = [item.ime, item.prezime].filter(Boolean).join(' ').trim()
            const label = fullName || item.username || `Radnik #${item.id_radnik}`
            return (
              <option key={item.id_radnik} value={String(item.id_radnik)}>
                {label}
              </option>
            )
          })}
        </select>
      )}

      <div className="ispis-dnevnica-actions">
        <TabButton label={loading ? 'Učitavanje...' : 'Prikaži tablicu'} onClick={handleGenerate} isClicked />
      </div>

      <div className="ispis-dnevnica-table-wrap">
        <table className="ispis-dnevnica-table">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Prekovremeni sati</th>
              <th>Tip dnevnice</th>
              <th>Dnevnica (EUR)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="ispis-dnevnica-empty">Nema podataka za odabrani mjesec.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.dateKey}>
                  <td>{formatDate(row.dateKey)}</td>
                  <td>{row.overtimeHours.toFixed(2)}</td>
                  <td>{row.dnevnicaTip}</td>
                  <td>{row.dnevnicaIznos.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td>Ukupno</td>
                <td>{summary.totalOvertimeHours.toFixed(2)}</td>
                <td>-</td>
                <td>{summary.totalPerDiemAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="ispis-dnevnica-table-wrap">
        <table className="ispis-dnevnica-table ispis-dnevnica-table-putni">
          <thead>
            <tr>
              <th>Putni nalog</th>
              <th>Spavanje (€)</th>
              <th>Gorivo (€)</th>
              <th>Materijal (€)</th>
              <th>Cestarina/Trajekt (€)</th>
              <th>Ostalo (€)</th>
              <th>Ukupno (€)</th>
            </tr>
          </thead>
          <tbody>
            {putniRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="ispis-dnevnica-empty">Nema putnih naloga za odabrani mjesec.</td>
              </tr>
            ) : (
              putniRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.naziv}</td>
                  <td>{row.trosakSpavanja}</td>
                  <td>{row.trosakGoriva}</td>
                  <td>{row.trosakMaterijala}</td>
                  <td>{row.cestarinaTrajekt}</td>
                  <td>{row.ostalo}</td>
                  <td>{row.ukupno}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default IspisDnevnicaMeni
