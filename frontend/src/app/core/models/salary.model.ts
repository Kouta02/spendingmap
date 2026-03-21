export interface SalaryConfig {
  id: string;
  padrao: number;
  gdae_perc: number;
  has_aeq: boolean;
  aeq_perc: number;
  vpi: number;
  has_funpresp: boolean;
  funpresp_perc: number;
  funcao_comissionada: string;
  has_creche: boolean;
  num_filhos: number;
  dependentes_ir: number;
  approved_2026: boolean;
  approved_2027: boolean;
  approved_2028: boolean;
  approved_2029: boolean;
  created_at: string;
  updated_at: string;
}

export interface SalaryResult {
  vb: number;
  gal: number;
  gr: number;
  gdae: number;
  aeq: number;
  vpi: number;
  fc: number;
  total_remuneratorio: number;
  abate_teto: number;
  remuneracao_efetiva: number;
  auxilio_alimentacao: number;
  auxilio_creche: number;
  bruto_total: number;
  pss: number;
  funpresp: number;
  irpf: number;
  total_descontos: number;
  liquido: number;
  padrao: number;
  year: number;
  effective_year: number;
}

export interface SalarySnapshot {
  id: string;
  month: string;
  padrao: number;
  effective_year: number;
  vb: number;
  gal: number;
  gr: number;
  gdae: number;
  aeq: number;
  vpi: number;
  fc: number;
  auxilio_alimentacao: number;
  auxilio_creche: number;
  bruto_total: number;
  abate_teto: number;
  pss: number;
  funpresp: number;
  irpf: number;
  liquido: number;
  created_at: string;
}

export interface CalculateRequest {
  padrao: number;
  year: number;
  gdae_perc: number;
  has_aeq: boolean;
  aeq_perc: number;
  vpi: number;
  has_funpresp: boolean;
  funpresp_perc: number;
  funcao_comissionada: string;
  has_creche: boolean;
  num_filhos: number;
  dependentes_ir: number;
  approved_2026: boolean;
  approved_2027: boolean;
  approved_2028: boolean;
  approved_2029: boolean;
}
