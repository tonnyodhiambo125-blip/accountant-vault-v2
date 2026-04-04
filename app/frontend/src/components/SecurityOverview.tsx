const controls = [
  "Argon2id master-password derivation",
  "Authenticated encryption for vault records",
  "Session key held in memory only",
  "Clipboard timeout and auto-lock"
];

export function SecurityOverview() {
  return (
    <div className="card">
      <h2>Security baseline</h2>
      <ul className="control-list">
        {controls.map((control) => (
          <li key={control}>{control}</li>
        ))}
      </ul>
    </div>
  );
}
