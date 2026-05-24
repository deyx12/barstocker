import { z } from "zod";

export const reportFilterSchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export type ReportFilterValues = z.infer<typeof reportFilterSchema>;
