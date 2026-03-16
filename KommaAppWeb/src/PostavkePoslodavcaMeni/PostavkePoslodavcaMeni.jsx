import { useEffect, useState } from 'react'
import './PostavkePoslodavcaMeni.css'
import TabLabel from '../TabComponents/TabLabel'
import TabTextInput from '../TabComponents/TabTextInput'
import TabButton from '../TabComponents/TabButton'
import { getTvrtka, saveTvrtka } from '../services/tvrtkaApi'

function PostavkePoslodavcaMeni() {
  const [naziv, setNaziv] = useState('Komma d.o.o.')
  const [adresa, setAdresa] = useState('N/A')
  const [postanskiBroj, setPostanskiBroj] = useState('N/A')
  const [jeHrvatska, setJeHrvatska] = useState(true)
  const [oib, setOib] = useState('')
  const [loading, setLoading] = useState(false)

  const applySettings = (data) => {
    setNaziv(String(data?.naziv || 'Komma d.o.o.'))
    setAdresa(String(data?.adresa || 'N/A'))
    setPostanskiBroj(String(data?.postanski_broj || data?.postanskiBroj || 'N/A'))
    setJeHrvatska(Boolean(data?.jeHrvatska))
    setOib(String(data?.oib || '').toUpperCase() === 'N/A' ? '' : String(data?.oib || ''))
  }

  useEffect(() => {
    const loadTvrtka = async () => {
      setLoading(true)
      const result = await getTvrtka()
      if (result?.ok && result.data) {
        applySettings(result.data)
      }
      setLoading(false)
    }

    loadTvrtka()
  }, [])

  const handleSpremi = async () => {
    if (!naziv.trim()) {
      window.alert('Greška: Naziv firme je obavezan')
      return
    }

    if (!adresa.trim()) {
      window.alert('Greška: Adresa firme je obavezna')
      return
    }

    if (!postanskiBroj.trim()) {
      window.alert('Greška: Poštanski broj je obavezan')
      return
    }

    const normalizedOib = String(oib || '').trim()
    if (jeHrvatska && !normalizedOib) {
      window.alert('Greška: OIB je obavezan kada je poslodavac u Hrvatskoj')
      return
    }

    if (jeHrvatska && !/^\d{1,20}$/.test(normalizedOib)) {
      window.alert('Greška: OIB mora imati između 1 i 20 znamenki')
      return
    }

    setLoading(true)
    const result = await saveTvrtka({
      naziv: naziv.trim(),
      adresa: adresa.trim(),
      postanski_broj: postanskiBroj.trim(),
      jeHrvatska,
      oib: jeHrvatska ? normalizedOib : 'N/A'
    })
    setLoading(false)

    if (result?.ok) {
      window.alert(result.message || 'Postavke poslodavca su uspješno spremljene')
    } else {
      window.alert(`Greška: ${result?.error || 'Neuspješno spremanje postavki'}`)
    }
  }

  return (
    <section className="postavke-poslodavca-meni">
      <h2 className="postavke-poslodavca-title">Postavke poslodavca</h2>

      <TabLabel label="Naziv firme:" />
      <TabTextInput
        value={naziv}
        onChangeText={setNaziv}
        placeholder="Unesite naziv firme"
        maxLength={120}
      />

      <TabLabel label="Adresa:" />
      <TabTextInput
        value={adresa}
        onChangeText={setAdresa}
        placeholder="Unesite adresu firme"
        maxLength={180}
      />

      <TabLabel label="Poštanski broj:" />
      <TabTextInput
        value={postanskiBroj}
        onChangeText={setPostanskiBroj}
        placeholder="Unesite poštanski broj"
        maxLength={20}
      />

      <label className="postavke-poslodavca-checkbox-row">
        <input
          type="checkbox"
          checked={jeHrvatska}
          onChange={(event) => setJeHrvatska(event.target.checked)}
        />
        Poslodavac je u Hrvatskoj
      </label>

      {jeHrvatska && (
        <>
          <TabLabel label="OIB:" />
          <TabTextInput
            value={oib}
            onChangeText={(value) => setOib(String(value || '').replace(/\D/g, ''))}
            placeholder="Unesite OIB"
            maxLength={20}
          />
        </>
      )}

      <div className="postavke-poslodavca-actions">
        <TabButton label={loading ? 'Učitavanje...' : 'Spremi postavke'} onClick={handleSpremi} isClicked disabled={loading} />
      </div>
    </section>
  )
}

export default PostavkePoslodavcaMeni
