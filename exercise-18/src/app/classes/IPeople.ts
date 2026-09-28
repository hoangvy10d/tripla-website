
export interface Customers {
    Id: string;
    Name: string;
    Email: string;
    Age: number;
    Image: string;
}
export interface CustomerGroup {
  CustomerTypeId: number;
  CustomterTypeName: string;
  Customers: Customers[];
}
