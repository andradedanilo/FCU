import {checkTestBudget} from './scripts/test-budget.ts';
import { defineConfig } from 'vitest/config';
checkTestBudget();
export default defineConfig({ test: { include: ['tests/*.test.ts'], testTimeout: 10000, maxWorkers: 1 } });
