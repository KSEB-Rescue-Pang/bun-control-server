// 타입 정의
export type InboundItem = {
  inbound_id: string;
  product_id: string;
  name: string;
  weight: number;
  img: string;
  location_id?: string;
  tote_id?: string;
  priority?: number;
}

export type ToteBox = {
  tote_id: string;
  items: InboundItem[];
  totalWeight: number;
}

export type DatabaseClient = {
  query: (query: string, params?: any[]) => Promise<{ rows: any[] }>;
}

export type shelf = {
  location_id: string;
  ib_distance: number;
  ob_distance: number;
}