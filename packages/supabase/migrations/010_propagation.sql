-- Migration 010: Seeds & propagation tracker fields on plants table

alter table plants
  add column if not exists propagation_method text
    check (propagation_method in ('seed', 'cutting', 'division', 'bought')),
  add column if not exists germination_date date;
