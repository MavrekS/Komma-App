import './TabButton.css'

function TabButton({
	label,
	onClick = () => {},
	isClicked = false,
	disabled = false,
	className = '',
	type = 'button',
}) {
	const tabButtonClassName = `tab-button${isClicked ? ' tab-button--active' : ''}${className ? ` ${className}` : ''}`

	return (
		<button
			type={type}
			className={tabButtonClassName}
			onClick={onClick}
			disabled={disabled}
			aria-pressed={isClicked}
		>
			{label}
		</button>
	)
}

export default TabButton
