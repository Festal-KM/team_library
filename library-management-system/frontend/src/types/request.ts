export type PurchaseRequest = {
  id: number;
  title: string;
  author?: string;
  publisher?: string;
  isbn?: string;
  url?: string;
  reason: string;
  user_id: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  approved_by?: number;
  approved_at?: string;
  amazon_info?: {
    price?: number;
    image_url?: string;
    availability?: string;
  };
};

export type PurchaseRequestCreate = {
  title: string;
  author?: string;
  publisher?: string;
  isbn?: string;
  url?: string;
  reason: string;
  user_id: number;
}; 