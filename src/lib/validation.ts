import { z } from 'zod';

// Shared validation schemas (NFR-05). Used on the client; mirrored server-side
// where applicable.

export const signUpSchema = z
  .object({
    full_name: z.string().trim().min(1, 'Please enter your full name'),
    email: z.string().trim().email('Enter a valid email'),
    phone: z.string().trim().optional().or(z.literal('')),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string(),
    disclaimer_accepted: z.literal(true, {
      errorMap: () => ({ message: 'You must acknowledge the safety disclaimer' }),
    }),
  })
  .refine((d) => d.password === d.confirm_password, {
    path: ['confirm_password'],
    message: 'Passwords do not match',
  });

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

export const resetSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
});

export const profileSchema = z.object({
  full_name: z.string().trim().min(1, 'Please enter your full name'),
  phone: z.string().trim().optional().or(z.literal('')),
});

export const contactSchema = z
  .object({
    name: z.string().trim().min(1, 'Contact name is required'),
    phone: z.string().trim().optional().or(z.literal('')),
    email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
    relationship: z.string().trim().optional().or(z.literal('')),
    preferred_method: z.enum(['sms', 'email', 'call', 'app']),
    is_emergency: z.boolean(),
    priority: z.number().int().positive().nullable(),
  })
  .refine((c) => Boolean(c.phone) || Boolean(c.email), {
    path: ['phone'],
    message: 'Add at least a phone number or an email',
  });

export type SignUpInput = z.infer<typeof signUpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
