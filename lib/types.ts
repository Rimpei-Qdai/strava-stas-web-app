export interface StravaToken {
  client_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  client_secret?: string;
  created_at: string;
  athlete_profile: {
    id: number;
    firstname: string;
    lastname: string;
    profile: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: {
    id: number;
    firstname: string;
    lastname: string;
    profile: string;
    city?: string;
    state?: string;
    country?: string;
  };
}
