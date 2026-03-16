import { useMemo, useRef } from 'react'
import './TabDatetimePicker.css'

const pad2 = (value) => String(value).padStart(2, '0')

const parseDateValue = (value) => {
  if (!value) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const normalized = String(value).trim()
  const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1])
    const month = Number(dateOnlyMatch[2])
    const day = Number(dateOnlyMatch[3])
    const parsedLocal = new Date(year, month - 1, day)
    if (
      Number.isNaN(parsedLocal.getTime()) ||
      parsedLocal.getFullYear() !== year ||
      parsedLocal.getMonth() !== month - 1 ||
      parsedLocal.getDate() !== day
    ) {
      return null
    }
    return parsedLocal
  }

  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const toDateString = (dateValue) => {
  const year = dateValue.getFullYear()
  const month = pad2(dateValue.getMonth() + 1)
  const day = pad2(dateValue.getDate())
  return `${year}-${month}-${day}`
}

function TabDatePicker({
  value,
  onChange,
  className = '',
  placeholder = 'dd.mm.yyyy',
  output = 'date',
}) {
  const dateInputRef = useRef(null)

  const parsedValue = useMemo(() => parseDateValue(value), [value])

  const dateInputValue = useMemo(() => {
    if (!parsedValue) return ''
    return toDateString(parsedValue)
  }, [parsedValue])

  const dateDisplayValue = useMemo(() => {
    if (!parsedValue) return ''

    const day = pad2(parsedValue.getDate())
    const month = pad2(parsedValue.getMonth() + 1)
    const year = parsedValue.getFullYear()
    return `${day}.${month}.${year}`
  }, [parsedValue])

  const emitChange = (nextDate) => {
    if (!nextDate) {
      onChange?.(output === 'string' ? '' : null)
      return
    }

    nextDate.setHours(0, 0, 0, 0)

    if (output === 'string') {
      onChange?.(toDateString(nextDate))
      return
    }

    onChange?.(nextDate)
  }

  const handleDateChange = (event) => {
    const rawValue = String(event.target.value || '').trim()
    if (!rawValue) {
      emitChange(null)
      return
    }

    const match = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!match) {
      emitChange(null)
      return
    }

    const numericYear = Number(match[1])
    const numericMonth = Number(match[2])
    const numericDay = Number(match[3])

    const nextDate = new Date(numericYear, numericMonth - 1, numericDay)
    if (
      Number.isNaN(nextDate.getTime()) ||
      nextDate.getDate() !== numericDay ||
      nextDate.getMonth() !== numericMonth - 1 ||
      nextDate.getFullYear() !== numericYear
    ) {
      emitChange(null)
      return
    }

    emitChange(nextDate)
  }

  const openDatePicker = () => {
    const element = dateInputRef.current
    if (!element) return

    if (typeof element.showPicker === 'function') {
      element.showPicker()
      return
    }

    element.click()
  }

  return (
    <div className={`tab-datetime-picker tab-datetime-picker-date-wrap ${className}`.trim()}>
      <input
        className="tab-datetime-picker-input"
        value={dateDisplayValue}
        placeholder={placeholder}
        readOnly
        onClick={openDatePicker}
      />
      <button
        type="button"
        className="tab-datetime-picker-calendar-button"
        onClick={openDatePicker}
        aria-label="Odaberi datum"
      >
        📅
      </button>
      <input
        ref={dateInputRef}
        type="date"
        lang="hr-HR"
        className="tab-datetime-picker-native-date"
        value={dateInputValue}
        onChange={handleDateChange}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  )
}

export default TabDatePicker
