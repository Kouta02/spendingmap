export interface ThirdParty {
  id: string;
  name: string;
  relationship: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ThirdPartyCreate {
  name: string;
  relationship?: string;
  notes?: string;
}
