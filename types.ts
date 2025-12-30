export type ContainerStatus = 'planning' | 'transit' | 'yard';
export type Priority = 'Normal' | 'Alta';

export interface RawApiContainer {
  "Id": string;
  "Fornecedor": string;
  "Status": string;
  "Prioridade": string;
  "Material Solicitado": string; 
  "Material Embarcado": string;
  "Nf": string;
  "Data Coleta": string;
  "Data Chegada": string;
  "Data Inicio"?: string;
  "Data Início"?: string;
  "Data Fim"?: string;
  [key: string]: any; 
}

export interface ContainerItem {
  desc: string;
  qtd: string;
  real: string;
  m3?: string;
  isExtra?: boolean;
}

export interface Container {
  id: string;
  supplier: string;
  status: ContainerStatus;
  priority: string;
  measures_requested: string;
  measures_actual: string;
  nf: string;
  date_pickup: string;
  date_arrival_forecast: string;
  date_start: string;
  date_end: string;
  items: ContainerItem[];
  [key: string]: any; 
}

export interface ShipmentFormData {
  nf: string;
  date_pickup: string;
  date_arrival: string; 
  items_actual: string[];
  extra_items: ContainerItem[];
}

export interface CreateFormData {
  id: string;
  fornecedor: string;
  data_inicio: string;
  data_fim: string;
  items: {
    desc: string;
    qtd: string;
    m3: string;
  }[];
}