export enum Category {
  Food = "Food",
  Furniture = "Furniture",
  Stationery = "Stationery",
  Medicine = "Medicine",
  BabyAccessories = "Baby Accessories",
  MobileAccessories = "Mobile Accessories",
  PetItems = "Pet Items",
  BankPayment = "Bank Payment",
  Transport = "Transport",
  Other = "Other"
}

export interface ReceiptItem {
  name: string;
  price: number;
  category: Category;
}

export interface Receipt {
  id: string;
  storeName: string;
  date: string;
  time: string;
  items: ReceiptItem[];
  total: number;
  category: Category;
  timestamp: number;
  galleryImageId?: string;
}

export interface GalleryImage {
  id: string;
  base64: string;
  timestamp: number;
  isProcessed: boolean;
  linkedReceiptId?: string;
}
