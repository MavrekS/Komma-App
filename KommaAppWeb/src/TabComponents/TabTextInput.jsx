import './TabTextInput.css'

function TabTextInput({
  value,
  onChangeText,
  placeholder,
  multiline = false,
  sanitize = true,
  disallowPattern,
  transform,
  style,
  className = '',
  ...rest
}) {
  const handleChangeText = (event) => {
    let nextValue = typeof event.target.value === 'string' ? event.target.value : ''

    if (sanitize) {
      nextValue = nextValue.replace(/[\u0000-\u001F\u007F]/g, '')
    }

    if (disallowPattern instanceof RegExp) {
      nextValue = nextValue.replace(disallowPattern, '')
    }

    if (typeof transform === 'function') {
      nextValue = transform(nextValue)
    }

    onChangeText?.(nextValue)
  }

  if (multiline) {
    return (
      <textarea
        className={`tab-text-input tab-text-input--multiline${className ? ` ${className}` : ''}`}
        style={style}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={handleChangeText}
        {...rest}
      />
    )
  }

  return (
    <input
      className={`tab-text-input${className ? ` ${className}` : ''}`}
      style={style}
      placeholder={placeholder}
      value={value ?? ''}
      onChange={handleChangeText}
      autoCorrect="off"
      {...rest}
    />
  )
}

export default TabTextInput
