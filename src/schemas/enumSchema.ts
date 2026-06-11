import { z } from "zod";

export const VehicleTypeSchema = z.enum([
  "Truck",
  "Carreta",
  "Cavalo",
  "Van",
  "Vuc",
  "Ultilitário",
]);

export const UserTypeSchema = z.enum([
  "Manager",
  "Admin",
  "Financer",
  "Requestor",
  "Driver",
  "Commum",
]);

export const OrderTypeSchema = z.enum([
  "Coleta",
  "Entrega",
  "Devolução",
  "Reentrega",
  "Avarias",
]);

export const blacklistedDomains = [
  "tempmail.com",
  "mailinator.com",
  "10minutemail.com",
];

export const FuelTypeShema = [
  "Diesel O500",
  "Gasolina aditivada",
  "Etanol",
  "Diesel S10",
  "Gasolina Comum",
];

export type FuelTypeEnum = z.infer<typeof FuelTypeShema>;
export type OrderTypeEnum = z.infer<typeof OrderTypeSchema>;
export type VehicleTypeEnum = z.infer<typeof VehicleTypeSchema>;
export type UserTypeEnum = z.infer<typeof UserTypeSchema>;
