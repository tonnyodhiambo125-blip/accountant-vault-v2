export type PortalCredential = {
  id: string;
  portalId: string;
  label: string;
  username: string;
  secret: string;
  notes: string;
  updatedAt: string;
};

export type ClientRecord = {
  id: string;
  name: string;
  companyNumber: string;
  taxPin: string;
  notes: string;
  portals: PortalCredential[];
  createdAt: string;
  updatedAt: string;
};

export type VaultData = {
  version: number;
  ownerName: string;
  createdAt: string;
  lastOpenedAt: string;
  clients: ClientRecord[];
};
