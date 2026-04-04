export function UnlockScreen() {
  return (
    <section className="card">
      <div className="section-heading">
        <p className="section-label">Step 1</p>
        <h2>Unlock flow</h2>
      </div>
      <p className="muted">
        This screen will be wired to backend key derivation and session
        creation. The renderer will never persist the master password.
      </p>
      <form className="stack" onSubmit={(event) => event.preventDefault()}>
        <label className="field">
          <span>Master password</span>
          <input type="password" placeholder="Enter master password" />
        </label>
        <button type="submit" className="primary-button">
          Unlock vault
        </button>
      </form>
    </section>
  );
}
