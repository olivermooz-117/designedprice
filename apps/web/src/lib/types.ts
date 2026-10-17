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

export interface ScanResponse {
  id: string;
  status: "PROCESSING" | "COMPLETED" | "NO_COMPARABLES" | "FAILED";
  imageUrl: string;
  createdAt: string;
  identification: {
    brand: string | null;
    garmentType: string | null;
    searchQueryString: string | null;
  };
  valuation: null | {
    id: string;
    estimatedLowPrice: number;
    estimatedHighPrice: number;
    medianPrice: number;
    currency: string;
    confidenceScore: number;
    suggestedEra: string;
    comparables: Array<{
      id: string;
      platform: string;
      itemUrl: string;
      price: number;
      title: string;
      thumbnail: string | null;
    }>;
  };
}
