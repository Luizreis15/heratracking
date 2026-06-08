-- Per-operation auto-scan interval — lets the UI configure monitoring frequency
-- without touching the worker env. 0 = disabled (uses INTEL_AUTO_SCAN_HOURS env fallback).
alter table operations add column if not exists intel_scan_hours int not null default 0;
