export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  tokenType: "Bearer";
  expiresIn: number;
}

export interface ScanComparable {
  id: string;
  platform: string;
  itemUrl: string;
  price: number;
  currency: string;
  title: string;
  thumbnail: string | null;
}

export interface ScanValuation {
  id: string;
  estimatedLowPrice: number;
  estimatedHighPrice: number;
  medianPrice: number;
  currency: string;
  confidenceScore: number;
  suggestedEra: string;
  comparables: ScanComparable[];
}

export interface ScanIdentification {
  brand: string | null;
  garmentType: string | null;
  searchQueryString: string | null;
}

export interface ScanResponse {
  id: string;
  status: "PROCESSING" | "COMPLETED" | "NO_COMPARABLES" | "FAILED";
  imageUrl: string;
  createdAt: string;
  identification: ScanIdentification;
  valuation: ScanValuation | null;
}

export interface ScanHistoryItem {
  id: string;
  imageUrl: string;
  brand: string | null;
  garmentType: string | null;
  createdAt: string;
  valuation: null | {
    estimatedLowPrice: number;
    estimatedHighPrice: number;
    medianPrice: number;
    currency?: string;
    confidenceScore: number;
    suggestedEra: string;
  };
}