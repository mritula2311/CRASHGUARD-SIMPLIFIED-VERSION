import { config } from 'dotenv';
config();

import '@/ai/flows/generate-emergency-alert.ts';
import '@/ai/flows/suggest-alert-recipients.ts';