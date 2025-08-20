export enum PurchaseRequestStatus {
  PENDING = "pending",
  APPROVED = "approved",
  ORDERED = "ordered",
  RECEIVED = "received",
  COMPLETED = "completed",
  REJECTED = "rejected",
  PURCHASED = "purchased"
}

export interface PurchaseRequest {
  id: number;
  title: string;
  author?: string;
  publisher?: string;
  isbn?: string;
  url?: string;
  amazon_url?: string;
  image_url?: string;
  reason: string;
  user_id: number;
  status: 'pending' | 'approved' | 'ordered' | 'received' | 'completed' | 'rejected';
  created_at: string;
  updated_at: string;
  approved_by?: number;
  approved_at?: string;
  amazon_info?: AmazonBookInfo;
  user?: {
    id: number;
    full_name: string;
    email: string;
    department?: string;
  };
  approval_history?: Array<{
    id: number;
    action: string;
    comment: string;
    created_at: string;
    user: {
      full_name: string;
    };
  }>;
}

export interface AmazonBookInfo {
  title: string;
  author: string;
  publisher: string;
  isbn: string;
  price: number;
  description: string;
  cover_image: string;
  url: string;
  image_url?: string;
  availability?: string;
} 