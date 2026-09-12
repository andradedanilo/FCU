import {checkTestBudget} from './scripts/test-budget.ts';
import { defineConfig } from '@playwright/test';
checkTestBudget();
export default defineConfig({testDir:'tests',testMatch:'desktop.e2e.ts',workers:1,retries:0,timeout:110000,expect:{timeout:8000},reporter:'list',use:{trace:'retain-on-failure'}});
