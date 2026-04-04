import { useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import {
  createEmptyVault,
  decryptVaultPayload,
  encryptVaultPayload,
  loadStoredVault,
  saveStoredVault,
  type StoredVaultPayload
} from "./lib/storage";
import { PORTAL_CATALOG } from "./lib/portalCatalog";
import type { ClientRecord, PortalCredential, VaultData } from "./lib/types";

const AUTO_LOCK_MS = 5 * 60 * 1000;
const CLIPBOARD_CLEAR_MS = 20 * 1000;

type ViewState =
  | { mode: "setup" }
  | { mode: "unlock"; payload: StoredVaultPayload }
  | { mode: "vault"; payload: StoredVaultPayload; password: string; data: VaultData };

type DraftPortal = {
  label: string;
  portalId: string;
  username: string;
  secret: string;
  notes: string;
};

const emptyPortalDraft: DraftPortal = {
  label: "",
  portalId: PORTAL_CATALOG[0].id,
  username: "",
  secret: "",
  notes: ""
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function matchesClient(client: ClientRecord, query: string) {
  const haystack = [
    client.name,
    client.companyNumber,
    client.taxPin,
    client.notes,
    ...client.portals.flatMap((portal) => [portal.label, portal.username, portal.notes])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function App() {
  const [view, setView] = useState<ViewState>(() => {
    const payload = loadStoredVault();
    return payload ? { mode: "unlock", payload } : { mode: "setup" };
  });
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Secure local storage. No server required.");
  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientCompanyNumber, setNewClientCompanyNumber] = useState("");
  const [newClientTaxPin, setNewClientTaxPin] = useState("");
  const [newClientNotes, setNewClientNotes] = useState("");
  const [portalDraft, setPortalDraft] = useState<DraftPortal>(emptyPortalDraft);
  const [editingPortalId, setEditingPortalId] = useState<string | null>(null);
  const [masterName, setMasterName] = useState("Maurice");
  const [masterPassword, setMasterPassword] = useState("");
  const [masterPasswordConfirm, setMasterPasswordConfirm] = useState("");
  const [unlockPassword, setUnlockPassword] = useState("");
  const inactivityTimer = useRef<number | null>(null);

  const vaultData = view.mode === "vault" ? view.data : null;

  const visibleClients = useMemo(() => {
    if (!vaultData) return [];
    if (!search.trim()) return vaultData.clients;
    return vaultData.clients.filter((client) => matchesClient(client, search));
  }, [vaultData, search]);

  const activeClient =
    vaultData?.clients.find((client) => client.id === selectedClientId) ?? visibleClients[0] ?? null;

  useEffect(() => {
    if (view.mode !== "vault") return;
    if (!selectedClientId && visibleClients[0]) {
      setSelectedClientId(visibleClients[0].id);
    }
  }, [selectedClientId, view.mode, visibleClients]);

  useEffect(() => {
    if (view.mode !== "vault") return;

    const bumpTimer = () => {
      if (inactivityTimer.current) {
        window.clearTimeout(inactivityTimer.current);
      }
      inactivityTimer.current = window.setTimeout(() => {
        setStatus("Vault locked after inactivity.");
        setUnlockPassword("");
        setView({ mode: "unlock", payload: view.payload });
      }, AUTO_LOCK_MS);
    };

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "keydown",
      "mousedown",
      "scroll",
      "touchstart"
    ];

    bumpTimer();
    events.forEach((eventName) => window.addEventListener(eventName, bumpTimer));

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, bumpTimer));
      if (inactivityTimer.current) {
        window.clearTimeout(inactivityTimer.current);
      }
    };
  }, [view]);

  async function persistVault(nextData: VaultData, password: string) {
    const currentPayload = view.mode === "vault" ? view.payload : loadStoredVault();
    if (!currentPayload) return;
    const nextPayload = await encryptVaultPayload(nextData, password, currentPayload.salt);
    saveStoredVault(nextPayload);
    setView({ mode: "vault", payload: nextPayload, password, data: nextData });
  }

  async function handleSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (masterPassword.length < 12) {
      setError("Use a master password with at least 12 characters.");
      return;
    }

    if (masterPassword !== masterPasswordConfirm) {
      setError("Your master password confirmation does not match.");
      return;
    }

    const initialVault = createEmptyVault(masterName || "Vault Owner");
    const payload = await encryptVaultPayload(initialVault, masterPassword);
    saveStoredVault(payload);
    setSelectedClientId(null);
    setMasterPassword("");
    setMasterPasswordConfirm("");
    setStatus("Vault created and encrypted locally.");
    setView({ mode: "vault", payload, password: masterPassword, data: initialVault });
  }

  async function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (view.mode !== "unlock") return;

    setError("");

    try {
      const data = await decryptVaultPayload(view.payload, unlockPassword);
      setSelectedClientId(data.clients[0]?.id ?? null);
      setStatus("Vault unlocked.");
      setView({ mode: "vault", payload: view.payload, password: unlockPassword, data });
      setUnlockPassword("");
    } catch {
      setError("Unlock failed. Check your master password and try again.");
    }
  }

  async function addClient() {
    if (view.mode !== "vault") return;
    if (!newClientName.trim()) {
      setError("Add a client or company name first.");
      return;
    }

    const nextClient: ClientRecord = {
      id: crypto.randomUUID(),
      name: newClientName.trim(),
      companyNumber: newClientCompanyNumber.trim(),
      taxPin: newClientTaxPin.trim(),
      notes: newClientNotes.trim(),
      portals: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const nextData: VaultData = {
      ...view.data,
      clients: [nextClient, ...view.data.clients],
      lastOpenedAt: new Date().toISOString()
    };

    await persistVault(nextData, view.password);
    setSelectedClientId(nextClient.id);
    setShowNewClient(false);
    setNewClientName("");
    setNewClientCompanyNumber("");
    setNewClientTaxPin("");
    setNewClientNotes("");
    setStatus(`Added ${nextClient.name}.`);
  }

  async function saveClientSummary() {
    if (view.mode !== "vault" || !activeClient) return;
    const nextData: VaultData = {
      ...view.data,
      clients: view.data.clients.map((client) =>
        client.id === activeClient.id
          ? { ...activeClient, updatedAt: new Date().toISOString() }
          : client
      )
    };
    await persistVault(nextData, view.password);
    setStatus(`Saved ${activeClient.name}.`);
  }

  async function deleteClient(clientId: string) {
    if (view.mode !== "vault") return;
    const target = view.data.clients.find((client) => client.id === clientId);
    if (!target) return;
    const confirmed = window.confirm(`Delete ${target.name} and all saved portals?`);
    if (!confirmed) return;

    const remaining = view.data.clients.filter((client) => client.id !== clientId);
    const nextData = { ...view.data, clients: remaining };
    await persistVault(nextData, view.password);
    setSelectedClientId(remaining[0]?.id ?? null);
    setStatus(`Deleted ${target.name}.`);
  }

  async function savePortal() {
    if (view.mode !== "vault" || !activeClient) return;
    if (!portalDraft.label.trim()) {
      setError("Enter a portal label before saving.");
      return;
    }
    if (!portalDraft.username.trim() || !portalDraft.secret.trim()) {
      setError("Username and secret are required for each portal.");
      return;
    }

    const now = new Date().toISOString();
    const nextPortal: PortalCredential = {
      id: editingPortalId ?? crypto.randomUUID(),
      label: portalDraft.label.trim(),
      portalId: portalDraft.portalId,
      username: portalDraft.username.trim(),
      secret: portalDraft.secret,
      notes: portalDraft.notes.trim(),
      updatedAt: now
    };

    const nextClient: ClientRecord = {
      ...activeClient,
      portals: editingPortalId
        ? activeClient.portals.map((portal) => (portal.id === editingPortalId ? nextPortal : portal))
        : [nextPortal, ...activeClient.portals],
      updatedAt: now
    };

    const nextData = {
      ...view.data,
      clients: view.data.clients.map((client) => (client.id === activeClient.id ? nextClient : client))
    };

    await persistVault(nextData, view.password);
    setPortalDraft(emptyPortalDraft);
    setEditingPortalId(null);
    setStatus(`${nextPortal.label} saved for ${activeClient.name}.`);
  }

  async function deletePortal(portalId: string) {
    if (view.mode !== "vault" || !activeClient) return;
    const nextClient = {
      ...activeClient,
      portals: activeClient.portals.filter((portal) => portal.id !== portalId),
      updatedAt: new Date().toISOString()
    };
    const nextData = {
      ...view.data,
      clients: view.data.clients.map((client) => (client.id === activeClient.id ? nextClient : client))
    };
    await persistVault(nextData, view.password);
    setStatus(`Removed portal from ${activeClient.name}.`);
  }

  async function copySecret(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setStatus(`${label} copied to clipboard. It will be cleared in 20 seconds if the browser allows it.`);
    window.setTimeout(async () => {
      try {
        const currentClipboard = await navigator.clipboard.readText();
        if (currentClipboard === value) {
          await navigator.clipboard.writeText("");
          setStatus("Clipboard cleared.");
        }
      } catch {
        setStatus("Copied to clipboard. Automatic clearing is blocked by this browser.");
      }
    }, CLIPBOARD_CLEAR_MS);
  }

  function startNewPortal() {
    const suggestedPortal = PORTAL_CATALOG[0];
    setEditingPortalId(null);
    setPortalDraft({
      label: suggestedPortal.name,
      portalId: suggestedPortal.id,
      username: "",
      secret: "",
      notes: ""
    });
  }

  function editPortal(portal: PortalCredential) {
    setEditingPortalId(portal.id);
    setPortalDraft({
      label: portal.label,
      portalId: portal.portalId,
      username: portal.username,
      secret: portal.secret,
      notes: portal.notes
    });
  }

  function lockVault() {
    if (view.mode !== "vault") return;
    setStatus("Vault locked.");
    setView({ mode: "unlock", payload: view.payload });
  }

  if (view.mode === "setup") {
    return <main className="vault-app"><section className="brand-panel"><p className="eyebrow">Accountant-ready secure workspace</p><h1>Accountant Vault</h1><p className="lede">Organize client logins, tax portals, and operational notes in one local encrypted vault. The data stays on this device and is decrypted only after unlock.</p></section><section className="workspace-panel"><header className="workspace-header"><div><p className="section-label">Vault status</p><h2>Create your vault</h2></div><p className="status-banner">{status}</p></header>{error ? <div className="error-banner">{error}</div> : null}<form className="setup-grid" onSubmit={handleSetup}><div className="panel"><h3>Initial setup</h3><label className="field"><span>Vault owner name</span><input value={masterName} onChange={(event) => setMasterName(event.target.value)} /></label><label className="field"><span>Master password</span><input type="password" value={masterPassword} onChange={(event) => setMasterPassword(event.target.value)} placeholder="At least 12 characters" /></label><label className="field"><span>Confirm master password</span><input type="password" value={masterPasswordConfirm} onChange={(event) => setMasterPasswordConfirm(event.target.value)} /></label><button className="primary-button" type="submit">Create encrypted vault</button></div><div className="panel"><h3>What gets created</h3><ul className="bullet-list"><li>A local encrypted vault payload stored in this browser profile</li><li>An accountant-focused workspace for clients and portals</li><li>A session that can be locked manually or after inactivity</li></ul></div></form></section></main>;
  }

  if (view.mode === "unlock") {
    return <main className="vault-app"><section className="brand-panel"><p className="eyebrow">Accountant-ready secure workspace</p><h1>Accountant Vault</h1><p className="lede">Organize client logins, tax portals, and operational notes in one local encrypted vault. The data stays on this device and is decrypted only after unlock.</p></section><section className="workspace-panel"><header className="workspace-header"><div><p className="section-label">Vault status</p><h2>Locked</h2></div><p className="status-banner">{status}</p></header>{error ? <div className="error-banner">{error}</div> : null}<form className="unlock-panel panel" onSubmit={handleUnlock}><h3>Unlock vault</h3><p className="muted-text">Last updated {formatDate(view.payload.updatedAt)}. Enter the master password to decrypt the vault.</p><label className="field"><span>Master password</span><input type="password" value={unlockPassword} onChange={(event) => setUnlockPassword(event.target.value)} autoFocus /></label><button className="primary-button" type="submit">Unlock</button></form></section></main>;
  }

  return <VaultWorkspace
    activeClient={activeClient}
    addClient={addClient}
    copySecret={copySecret}
    deleteClient={deleteClient}
    deletePortal={deletePortal}
    editPortal={editPortal}
    editingPortalId={editingPortalId}
    error={error}
    lockVault={lockVault}
    newClientCompanyNumber={newClientCompanyNumber}
    newClientName={newClientName}
    newClientNotes={newClientNotes}
    newClientTaxPin={newClientTaxPin}
    portalDraft={portalDraft}
    saveClientSummary={saveClientSummary}
    savePortal={savePortal}
    search={search}
    selectedClientId={selectedClientId}
    setNewClientCompanyNumber={setNewClientCompanyNumber}
    setNewClientName={setNewClientName}
    setNewClientNotes={setNewClientNotes}
    setNewClientTaxPin={setNewClientTaxPin}
    setPortalDraft={setPortalDraft}
    setEditingPortalId={setEditingPortalId}
    setSearch={setSearch}
    setSelectedClientId={setSelectedClientId}
    setShowNewClient={setShowNewClient}
    setView={setView}
    showNewClient={showNewClient}
    startNewPortal={startNewPortal}
    status={status}
    view={view}
    visibleClients={visibleClients}
  />;
}

type VaultWorkspaceProps = {
  activeClient: ClientRecord | null;
  addClient: () => Promise<void>;
  copySecret: (value: string, label: string) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  deletePortal: (portalId: string) => Promise<void>;
  editPortal: (portal: PortalCredential) => void;
  editingPortalId: string | null;
  error: string;
  lockVault: () => void;
  newClientCompanyNumber: string;
  newClientName: string;
  newClientNotes: string;
  newClientTaxPin: string;
  portalDraft: DraftPortal;
  saveClientSummary: () => Promise<void>;
  savePortal: () => Promise<void>;
  search: string;
  selectedClientId: string | null;
  setNewClientCompanyNumber: (value: string) => void;
  setNewClientName: (value: string) => void;
  setNewClientNotes: (value: string) => void;
  setNewClientTaxPin: (value: string) => void;
  setEditingPortalId: Dispatch<SetStateAction<string | null>>;
  setPortalDraft: Dispatch<SetStateAction<DraftPortal>>;
  setSearch: (value: string) => void;
  setSelectedClientId: (value: string | null) => void;
  setShowNewClient: Dispatch<SetStateAction<boolean>>;
  setView: Dispatch<SetStateAction<ViewState>>;
  showNewClient: boolean;
  startNewPortal: () => void;
  status: string;
  view: Extract<ViewState, { mode: "vault" }>;
  visibleClients: ClientRecord[];
};

function VaultWorkspace(props: VaultWorkspaceProps) {
  const {
    activeClient,
    addClient,
    copySecret,
    deleteClient,
    deletePortal,
    editPortal,
    editingPortalId,
    error,
    lockVault,
    newClientCompanyNumber,
    newClientName,
    newClientNotes,
    newClientTaxPin,
    portalDraft,
    saveClientSummary,
    savePortal,
    search,
    selectedClientId,
    setNewClientCompanyNumber,
    setNewClientName,
    setNewClientNotes,
    setNewClientTaxPin,
    setPortalDraft,
    setEditingPortalId,
    setSearch,
    setSelectedClientId,
    setShowNewClient,
    setView,
    showNewClient,
    startNewPortal,
    status,
    view,
    visibleClients
  } = props;

  const updateClient = (field: "name" | "companyNumber" | "taxPin" | "notes", value: string) => {
    if (!activeClient) return;
    setView({
      ...view,
      data: {
        ...view.data,
        clients: view.data.clients.map((client) =>
          client.id === activeClient.id ? { ...client, [field]: value } : client
        )
      }
    });
  };

  return (
    <main className="vault-app">
      <section className="brand-panel">
        <p className="eyebrow">Accountant-ready secure workspace</p>
        <h1>Accountant Vault</h1>
        <p className="lede">
          Organize client logins, tax portals, and operational notes in one local encrypted vault.
          The data stays on this device and is decrypted only after unlock.
        </p>

        <div className="info-card">
          <h2>What this build does well</h2>
          <ul className="feature-list">
            <li>Creates a master-password-protected vault in local encrypted storage</li>
            <li>Supports client folders, portal entries, notes, and search</li>
            <li>Copies credentials on demand and auto-locks after inactivity</li>
            <li>Opens directly from built files for demos and local use</li>
          </ul>
        </div>

        <div className="info-card">
          <h2>Recommended workflow</h2>
          <p className="muted-text">
            Use a long master password, save only portal credentials you manage directly, and keep this
            device protected with OS login and disk encryption.
          </p>
        </div>
      </section>

      <section className="workspace-panel">
        <header className="workspace-header">
          <div>
            <p className="section-label">Vault status</p>
            <h2>Unlocked</h2>
          </div>
          <p className="status-banner">{status}</p>
        </header>

        {error ? <div className="error-banner">{error}</div> : null}

        <div className="vault-layout">
          <aside className="panel sidebar">
            <div className="sidebar-top">
              <div>
                <p className="section-label">Clients</p>
                <h3>{view.data.ownerName}</h3>
              </div>
              <button className="secondary-button" type="button" onClick={lockVault}>Lock</button>
            </div>

            <label className="field">
              <span>Search clients or portals</span>
              <input
                placeholder="Search by name, tax PIN, portal, notes..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <button className="primary-button" type="button" onClick={() => setShowNewClient((current) => !current)}>
              {showNewClient ? "Close new client form" : "Add client"}
            </button>

            {showNewClient ? (
              <div className="inline-form">
                <label className="field"><span>Client or company name</span><input value={newClientName} onChange={(event) => setNewClientName(event.target.value)} /></label>
                <label className="field"><span>Company number</span><input value={newClientCompanyNumber} onChange={(event) => setNewClientCompanyNumber(event.target.value)} /></label>
                <label className="field"><span>Tax PIN</span><input value={newClientTaxPin} onChange={(event) => setNewClientTaxPin(event.target.value)} /></label>
                <label className="field"><span>Client notes</span><textarea value={newClientNotes} onChange={(event) => setNewClientNotes(event.target.value)} rows={4} /></label>
                <button className="primary-button" type="button" onClick={addClient}>Save client</button>
              </div>
            ) : null}

            <div className="client-list">
              {visibleClients.map((client) => (
                <button
                  className={`client-item ${client.id === selectedClientId ? "client-item-active" : ""}`}
                  key={client.id}
                  type="button"
                  onClick={() => setSelectedClientId(client.id)}
                >
                  <strong>{client.name}</strong>
                  <span>{client.portals.length} portal entries</span>
                </button>
              ))}
              {!visibleClients.length ? <p className="empty-state">No matching clients yet.</p> : null}
            </div>
          </aside>

          <section className="content-stack">
            {activeClient ? (
              <>
                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <p className="section-label">Client profile</p>
                      <h3>{activeClient.name}</h3>
                    </div>
                    <button className="danger-button" type="button" onClick={() => deleteClient(activeClient.id)}>
                      Delete client
                    </button>
                  </div>

                  <div className="three-column-grid">
                    <label className="field"><span>Client name</span><input value={activeClient.name} onChange={(event) => updateClient("name", event.target.value)} /></label>
                    <label className="field"><span>Company number</span><input value={activeClient.companyNumber} onChange={(event) => updateClient("companyNumber", event.target.value)} /></label>
                    <label className="field"><span>Tax PIN</span><input value={activeClient.taxPin} onChange={(event) => updateClient("taxPin", event.target.value)} /></label>
                  </div>

                  <label className="field">
                    <span>Internal notes</span>
                    <textarea rows={4} value={activeClient.notes} onChange={(event) => updateClient("notes", event.target.value)} />
                  </label>

                  <div className="toolbar">
                    <span className="meta-text">Updated {formatDate(activeClient.updatedAt)}. Created {formatDate(activeClient.createdAt)}.</span>
                    <button className="secondary-button" type="button" onClick={saveClientSummary}>Save profile</button>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <p className="section-label">Portal credentials</p>
                      <h3>Client access records</h3>
                    </div>
                    <button className="primary-button" type="button" onClick={startNewPortal}>New portal entry</button>
                  </div>

                  <div className="two-column-grid">
                    <div className="portal-grid">
                      {activeClient.portals.map((portal) => {
                        const knownPortal = PORTAL_CATALOG.find((item) => item.id === portal.portalId);
                        return (
                          <article className="portal-card" key={portal.id}>
                            <div className="portal-card-head">
                              <div>
                                <h4>{portal.label}</h4>
                                <p>{knownPortal?.name ?? "Custom portal"}</p>
                              </div>
                              <span className="tag">{formatDate(portal.updatedAt)}</span>
                            </div>
                            <p className="portal-line">Username: {portal.username}</p>
                            {portal.notes ? <p className="portal-line">Notes: {portal.notes}</p> : null}
                            <div className="toolbar">
                              <button className="secondary-button" type="button" onClick={() => copySecret(portal.username, "Username")}>Copy username</button>
                              <button className="secondary-button" type="button" onClick={() => copySecret(portal.secret, "Secret")}>Copy secret</button>
                              {knownPortal?.url ? <a className="secondary-link" href={knownPortal.url} target="_blank" rel="noreferrer">Open portal</a> : null}
                              <button className="secondary-button" type="button" onClick={() => editPortal(portal)}>Edit</button>
                              <button className="danger-button" type="button" onClick={() => deletePortal(portal.id)}>Delete</button>
                            </div>
                          </article>
                        );
                      })}
                      {!activeClient.portals.length ? <p className="empty-state">No portal credentials saved for this client yet. Start with KRA, SHA, NSSF, eCitizen, or any custom portal.</p> : null}
                    </div>

                    <div className="entry-editor">
                      <h4>{editingPortalId ? "Edit portal entry" : "Portal entry form"}</h4>
                      <label className="field">
                        <span>Portal template</span>
                        <select
                          value={portalDraft.portalId}
                          onChange={(event) => {
                            const nextPortalId = event.target.value;
                            const suggestion = PORTAL_CATALOG.find((item) => item.id === nextPortalId);
                            setPortalDraft((current) => ({
                              ...current,
                              portalId: nextPortalId,
                              label: current.label || suggestion?.name || ""
                            }));
                          }}
                        >
                          {PORTAL_CATALOG.map((portal) => <option key={portal.id} value={portal.id}>{portal.name}</option>)}
                        </select>
                      </label>
                      <label className="field"><span>Entry label</span><input value={portalDraft.label} onChange={(event) => setPortalDraft((current) => ({ ...current, label: event.target.value }))} placeholder="KRA iTax - Main Login" /></label>
                      <label className="field"><span>Username or login ID</span><input value={portalDraft.username} onChange={(event) => setPortalDraft((current) => ({ ...current, username: event.target.value }))} /></label>
                      <label className="field"><span>Password, PIN, or secret</span><input type="password" value={portalDraft.secret} onChange={(event) => setPortalDraft((current) => ({ ...current, secret: event.target.value }))} /></label>
                      <label className="field"><span>Notes</span><textarea rows={5} value={portalDraft.notes} onChange={(event) => setPortalDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Security question hints, filing schedule, contact person..." /></label>
                      <div className="toolbar">
                        <button className="primary-button" type="button" onClick={savePortal}>Save portal entry</button>
                        <button className="secondary-button" type="button" onClick={() => {
                          setEditingPortalId(null);
                          setPortalDraft(emptyPortalDraft);
                        }}>Clear form</button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="panel">
                <h3>No client selected</h3>
                <p className="muted-text">Add your first client from the left column to begin building the vault.</p>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
