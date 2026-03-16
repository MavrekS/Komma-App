import './Header.css'
import kommaLogo from '../assets/komma_logo.png'

function Header({ onLogout, loggedInUsername }) {
	return (
		<header className="app-header">
			<img src={kommaLogo} alt="Komma logo" className="company-logo" />
			<h1 className="app-title">Menađment naloga i radnih dana</h1>
			<div className="header-actions">
				<span className="header-username">Dobrodošli, {loggedInUsername || 'Prijavljeni korisnik'}</span>
				<button type="button" className="logout-button" onClick={onLogout}>
					Odjava
				</button>
			</div>
		</header>
	)
}

export default Header
