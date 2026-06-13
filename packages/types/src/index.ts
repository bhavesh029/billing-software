export type OrgRole = "OWNER" | "MEMBER";

export type InvoiceStatus = "DRAFT" | "ISSUED";

export type DocumentType = "BILL_OF_SUPPLY" | "TAX_INVOICE";

export interface OrganizationPublic {
  id: string;
  legalName: string;
  tradeName: string | null;
  address: string;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  bankName: string | null;
  accountHolderName: string | null;
  termsTemplate: string | null;
  signatureLabel: string | null;
  invoicePrefix: string;
  gstin: string | null;
  bankAccountNumber: string | null;
  ifsc: string | null;
}

export interface InvoiceLineInput {
  description: string;
  hsnSac: string | null;
  quantity: string;
  unit: string;
  unitPrice: string;
  gstRatePercent: string;
}

export interface BuyerSnapshot {
  name: string;
  address: string;
  stateCode: string;
  stateName: string;
}
