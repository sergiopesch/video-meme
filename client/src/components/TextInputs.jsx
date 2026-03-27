const TextInputs = ({ slots, values, onChange }) => {
  if (!slots.length) {
    return null;
  }

  return (
    <section className="panel-section">
      <div className="section-heading">
        <h2>3. Add your text</h2>
        <p>Keep it short and readable.</p>
      </div>

      <div className="field-grid">
        {slots.map((slot) => (
          <label key={slot.id} className="field-block">
            <span>{slot.label}</span>
            {slot.id === 'caption' ? (
              <textarea
                rows="3"
                value={values[slot.id]}
                maxLength={slot.maxLength}
                placeholder={slot.placeholder}
                onChange={(event) => onChange(slot.id, event.target.value)}
                spellCheck="true"
              />
            ) : (
              <input
                type="text"
                value={values[slot.id]}
                maxLength={slot.maxLength}
                placeholder={slot.placeholder}
                onChange={(event) => onChange(slot.id, event.target.value)}
                spellCheck="true"
              />
            )}
            <small>{values[slot.id]?.length || 0} / {slot.maxLength}</small>
          </label>
        ))}
      </div>
    </section>
  );
};

export default TextInputs;
