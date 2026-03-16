import './NavigationBoads.css'
import TabButton from '../TabComponents/TabButton'

function NavigationBoard({ activeView, onSelectView, loggedInUser }) {
	const role = String(loggedInUser?.role || 'user').toLowerCase()
	const canOpenUnosNaloga = role !== 'user'
	const canOpenSifarnici = role !== 'user'
	const canOpenOdsustva = role !== 'user'
	const canOpenProvjeraUnosa = role !== 'user'

	return (
		<aside className="navigation-board">
			<section className="nav-section">
				<h2 className="nav-section-title">Unos podataka</h2>
				<TabButton
					label="Unesi nalog"
					onClick={() => canOpenUnosNaloga && onSelectView?.('unos-naloga')}
					disabled={!canOpenUnosNaloga}
					isClicked={activeView === 'unos-naloga'}
				/>
				<TabButton
					label="Unesi radni dan"
					onClick={() => onSelectView?.('unos-radni-dan')}
					isClicked={activeView === 'unos-radni-dan'}
				/>
			</section>

			<section className="nav-section">
				<h2 className="nav-section-title">Pregled podataka</h2>
				<TabButton
					label="Pregled naloga"
					onClick={() => onSelectView?.('pregled-naloga')}
					isClicked={activeView === 'pregled-naloga'}
				/>
				<TabButton
					label="Pregled radnih dana"
					onClick={() => onSelectView?.('pregled-radnih-dana')}
					isClicked={activeView === 'pregled-radnih-dana'}
				/>
			</section>

			<section className="nav-section">
				<h2 className="nav-section-title">Šifarnici</h2>
				<TabButton
					label="Radnici"
					onClick={() => canOpenSifarnici && onSelectView?.('sifarnik-radnici')}
					disabled={!canOpenSifarnici}
					isClicked={activeView === 'sifarnik-radnici'}
				/>
				<TabButton
					label="Klijenti"
					onClick={() => canOpenSifarnici && onSelectView?.('sifarnik-klijenti')}
					disabled={!canOpenSifarnici}
					isClicked={activeView === 'sifarnik-klijenti'}
				/>
				<TabButton
					label="Adrese"
					onClick={() => canOpenSifarnici && onSelectView?.('sifarnik-adrese')}
					disabled={!canOpenSifarnici}
					isClicked={activeView === 'sifarnik-adrese'}
				/>
				<TabButton
					label="Kontakti"
					onClick={() => canOpenSifarnici && onSelectView?.('sifarnik-kontakti')}
					disabled={!canOpenSifarnici}
					isClicked={activeView === 'sifarnik-kontakti'}
				/>
				<TabButton
					label="Postavke poslodavca"
					onClick={() => canOpenSifarnici && onSelectView?.('postavke-poslodavca')}
					disabled={!canOpenSifarnici}
					isClicked={activeView === 'postavke-poslodavca'}
				/>
			</section>
			<section className="nav-section nav-section-divider">
				<TabButton
					label="Unos godišnjeg/bolovanja"
					onClick={() => canOpenOdsustva && onSelectView?.('unos-godisnjeg')}
					disabled={!canOpenOdsustva}
					isClicked={activeView === 'unos-godisnjeg'}
				/>

				<TabButton
					label="Provjera unosa"
					onClick={() => canOpenProvjeraUnosa && onSelectView?.('provjera-unosa')}
					disabled={!canOpenProvjeraUnosa}
					isClicked={activeView === 'provjera-unosa'}
				/>

				<TabButton
					label="Izračun dodataka na plaću"
					onClick={() => onSelectView?.('izracun-place')}
					isClicked={activeView === 'izracun-place'}
				/>
				<TabButton
					label="Pregled dodataka po danu"
					onClick={() => onSelectView?.('ispis-dnevnica-mjesec')}
					isClicked={activeView === 'ispis-dnevnica-mjesec'}
				/>
			</section>
		</aside>
	)
}

export default NavigationBoard
