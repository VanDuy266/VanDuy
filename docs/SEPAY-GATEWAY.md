# SePay Payment Gateway: preparation, not active

This branch prepares an isolated server-side adapter. No routes, checkout buttons, IPN receiver, payment records or scheduled cancellations are connected. The live storefront remains unchanged.

Verified against the source distributed in sepay-pg-node 1.0.0 and the dashboard sample: checkout field signing (ordered HMAC SHA256/base64), sandbox/production endpoints, Basic-auth order lookup and QR cancellation API. The SDK README checkout URL table conflicts with its source; the adapter follows its source. Real provider calls are not tested.

The adapter receives amounts from its caller; when wiring routes, obtain the amount from the database after authenticating order ownership and validating order eligibility. Never accept a browser-supplied payment amount. Keep merchant secrets server-side. Never treat success_url as proof of payment.

Before enabling:

1. Obtain official IPN payload, authentication procedure, retry and acknowledgement contract from SePay. Authenticate notifications, verify the transaction with the provider, and match merchant, unique invoice, currency, exact amount and payment status. Record receipts idempotently in a transaction and await persistent backup before acknowledging.
2. Persist payment attempts and provider IDs. SDK supports QR order cancellation but exposes no checkout TTL field. Establish whether cancellation makes an already captured QR unpayable. Do not claim strict 15-minute expiry until confirmed and tested. A timer that hides an image is insufficient. Render Free sleeps; an in-process timer cannot guarantee cancellation at 15 minutes. Require provider-side TTL or another reliable provider-supported mechanism.
3. Test sandbox success, duplicate/forged IPN, incorrect amount/invoice, callback-only spoofing, pending/cancel races, late payment, restart recovery, and gateway cancellation behavior.
4. Follow SePay's dashboard process to activate production and obtain production credentials. Use separate sandbox and production configuration. Check enabled bank/payment methods, account destination, requirements and fees in the merchant dashboard. SP-TEST credentials cannot receive real payments.

No production configuration names or IPN URL have been prescribed yet, since the application does not consume them. Do not replace the existing bank-notification webhook with an assumed gateway IPN contract.

Local validation: node --test tests/sepay-gateway.test.js. Tests use fabricated credentials and mocked provider requests, with no transfer of money.
