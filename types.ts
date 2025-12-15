
export type ContainerStatus = 'planning' | 'transit' | 'yard';
export type Priority = 'Normal' | 'Alta';

// Interface for the raw JSON coming from Google Scripts
// We add [key: string]: any to allow columns like "Item 1 Real" without TS errors
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
  // Correção: Adicionadas chaves sem acento e com acento para compatibilidade
  "Data Inicio"?: string;
  "Data Início"?: string;
  "Data Fim"?: string;
  // Dynamic columns from Sheet
  [key: string]: any; 
}

// Internal Application State Interface
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
  
  // Structured Items Array for easy rendering in Card/Modals
  items: {
    desc: string;
    qtd: string;
    real: string; // Mapped from 'Item X Real'
  }[];

  // CRITICAL: Index signature to allow dynamic access if needed
  [key: string]: any; 
}

export interface ShipmentFormData {
  nf: string;
  date_pickup: string;
  date_arrival: string; 
  items_actual: string[];
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
