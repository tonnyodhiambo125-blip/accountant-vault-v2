const sampleEntries = [
  { name: "Acme Holdings", portals: 6, status: "Needs migration" },
  { name: "Bluewave Traders", portals: 4, status: "Ready for secure import" }
];

export function VaultHome() {
  return (
    <section className="card">
      <div className="section-heading">
        <p className="section-label">Step 2</p>
        <h2>Vault workspace</h2>
      </div>
      <p className="muted">
        The final version will show decrypted records only after a valid unlock
        and will request clipboard actions through the backend.
      </p>
      <div className="entry-list">
        {sampleEntries.map((entry) => (
          <article className="entry-card" key={entry.name}>
            <div>
              <h3>{entry.name}</h3>
              <p>{entry.portals} stored portals</p>
            </div>
            <span className="status-pill">{entry.status}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
