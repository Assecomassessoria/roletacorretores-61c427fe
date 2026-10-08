# Architecture rules
- Corretor registration personal-data validation lives in a browser-safe shared schema; persistence uses the existing signup server function to keep validation consistent.
- Use corretores.created_at as the registration start and never accept it from the applicant, so database time remains authoritative.
- Birth date and residential address columns remain server-only reads, preserving the existing personal-data column protection.