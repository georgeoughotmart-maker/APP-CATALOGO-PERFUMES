# Security Specification - Beauty Pro Catalog

## Data Invariants
1. A Catalog must contain an array of products (max 30).
2. Each product must have a valid name, price, and image.
3. Images must be stored as base64 strings and should not exceed 1MB per field.
4. The `createdAt` timestamp must be set by the server.

## The Dirty Dozen Payloads (Target: DENIED)
1. **Identity Spoofing**: Attempt to create a catalog with a custom `createdAt` in the past.
2. **Resource Poisoning**: Use a 2MB string as a product image.
3. **Array Overflow**: Send a catalog with 100 products.
4. **ID Injection**: Use a forbidden character (e.g., `/`) in the catalog ID.
5. **Schema Bypass**: Omit the `preco` field from a product in the array.
6. **Integrity Breach**: Update a catalog that you didn't create (though catalogs are immutable in our current flow).
7. **Type Mismatch**: Send `preco` as a string instead of a number.
8. **Malicious ID**: Use a extremely long string (1KB+) as the catalog ID.
9. **Blanket Read Exposure**: Attempt to list all catalogs in the collection.
10. **State Shortcut**: Attempt to update a terminal catalog (N/A yet).
11. **PII Leak**: No PII currently stored, but rule must prevent generic reads.
12. **Unauthorized Deletion**: Attempt to delete a catalog without being an admin.

## Test Runner (Logic Check)
- `get(/catalogs/ValidID)` -> ALLOWED
- `list(/catalogs)` -> DENIED
- `create(/catalogs/ValidID, {products: [...], createdAt: request.time})` -> ALLOWED
- `update(/catalogs/ValidID, ...)` -> DENIED (Currently immutable)
- `delete(/catalogs/ValidID, ...)` -> DENIED
