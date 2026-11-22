/**
 * A form field people never see or reach with the keyboard. Bots that fill in every input give themselves away;
 * the API rejects (sign-up) or silently drops (reports) anything that arrives with it filled.
 */
export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
      {/* Neutral name and label so browsers never autofill it for a real person. */}
      <label>
        Leave this field empty
        <input type="text" name="vf_hp_field" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}
