import './Main.css'
import UnosNalogaMeni from '../UnosNalogaMeni/UnosNalogaMeni'
import UnosRadnogDanaMeni from '../UnosRadnogDanaMeni/UnosRadnogDanaMeni'
import PregledNalogaMeni from '../PregledNalogaMeni/PregledNalogaMeni'
import PregledRadnogDanaMeni from '../PregledRadnogDanaMeni/PregledRadnogDanaMeni'
import Radnici from '../Sifarnici/Radnici'
import Klijenti from '../Sifarnici/Klijenti'
import Adrese from '../Sifarnici/Adrese'
import Kontakti from '../Sifarnici/Kontakti'
import PostavkePoslodavcaMeni from '../PostavkePoslodavcaMeni/PostavkePoslodavcaMeni'
import UnosOdsustvaMeni from '../UnosOdsustvaMeni/UnosOdsustvaMeni'
import ProvjeraUnosaMeni from '../ProvjeraUnosaMeni/ProvjeraUnosaMeni'
import IzracunDodatakaPlacuMeni from '../IzracunDodatakaPlacuMeni/IzracunDodatakaPlacuMeni'
import IspisDnevnicaMeni from '../IspisDnevnicaMeni/IspisDnevnicaMeni'

function Main({ activeView, loggedInUser }) {
	const role = String(loggedInUser?.role || 'user').toLowerCase()

	if (activeView === 'unos-naloga') {
		return (
			<main className="main-content">
				<UnosNalogaMeni loggedInUser={loggedInUser} />
			</main>
		)
	}

	if (activeView === 'unos-radni-dan') {
		return (
			<main className="main-content">
				<UnosRadnogDanaMeni loggedInUser={loggedInUser} />
			</main>
		)
	}

	if (activeView === 'pregled-naloga') {
		return (
			<main className="main-content">
				<PregledNalogaMeni loggedInUser={loggedInUser} />
			</main>
		)
	}

	if (activeView === 'pregled-radnih-dana') {
		return (
			<main className="main-content">
				<PregledRadnogDanaMeni loggedInUser={loggedInUser} />
			</main>
		)
	}

	if (activeView === 'sifarnik-radnici') {
		return (
			<main className="main-content">
				<Radnici loggedInUser={loggedInUser} />
			</main>
		)
	}

	if (activeView === 'sifarnik-klijenti') {
		return (
			<main className="main-content">
				<Klijenti />
			</main>
		)
	}

	if (activeView === 'sifarnik-adrese') {
		return (
			<main className="main-content">
				<Adrese />
			</main>
		)
	}

	if (activeView === 'sifarnik-kontakti') {
		return (
			<main className="main-content">
				<Kontakti />
			</main>
		)
	}

	if (activeView === 'postavke-poslodavca') {
		if (role === 'user') {
			return (
				<main className="main-content">
					<div className="main-placeholder">Nemate ovlasti za ovaj meni.</div>
				</main>
			)
		}

		return (
			<main className="main-content">
				<PostavkePoslodavcaMeni />
			</main>
		)
	}

	if (activeView === 'unos-godisnjeg') {
		return (
			<main className="main-content">
				<UnosOdsustvaMeni loggedInUser={loggedInUser} odsustvoType="godisnji" />
			</main>
		)
	}

	if (activeView === 'unos-bolovanja') {
		return (
			<main className="main-content">
				<UnosOdsustvaMeni loggedInUser={loggedInUser} odsustvoType="bolovanje" />
			</main>
		)
	}

	if (activeView === 'provjera-unosa') {
		if (role === 'user') {
			return (
				<main className="main-content">
					<div className="main-placeholder">Nemate ovlasti za ovaj meni.</div>
				</main>
			)
		}

		return (
			<main className="main-content">
				<ProvjeraUnosaMeni />
			</main>
		)
	}

	if (activeView === 'izracun-place') {
		return (
			<main className="main-content">
				<IzracunDodatakaPlacuMeni loggedInUser={loggedInUser} />
			</main>
		)
	}

	if (activeView === 'ispis-dnevnica-mjesec') {
		return (
			<main className="main-content">
				<IspisDnevnicaMeni loggedInUser={loggedInUser} />
			</main>
		)
	}

	return (
		<main className="main-content">
			<div className="main-placeholder">Odabrani meni: {activeView || 'nema'}</div>
		</main>
	)
}

export default Main
