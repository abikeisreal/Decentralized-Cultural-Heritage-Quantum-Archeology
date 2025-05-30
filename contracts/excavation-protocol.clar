;; Excavation Protocol Contract
;; Manages quantum-enhanced archaeological methods and permissions

(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u200))
(define-constant err-not-verified (err u201))
(define-constant err-site-occupied (err u202))
(define-constant err-invalid-protocol (err u203))
(define-constant err-excavation-not-found (err u204))

;; Data maps
(define-map excavation-sites uint
  {
    location: (string-ascii 200),
    institution: principal,
    protocol-type: (string-ascii 50),
    start-date: uint,
    estimated-duration: uint,
    quantum-method: (string-ascii 100),
    status: (string-ascii 20),
    findings-count: uint
  })

(define-map site-permissions uint
  {
    authorized-institution: principal,
    permission-level: uint,
    granted-date: uint,
    expires-at: uint,
    quantum-access: bool
  })

;; Data vars
(define-data-var next-site-id uint u1)
(define-data-var institution-verification-contract principal tx-sender)

;; Public functions
(define-public (register-excavation-site
  (location (string-ascii 200))
  (protocol-type (string-ascii 50))
  (estimated-duration uint)
  (quantum-method (string-ascii 100)))
  (let ((site-id (var-get next-site-id))
        (institution tx-sender))
    ;; Check if institution is verified (simplified check)
    (asserts! (> estimated-duration u0) err-invalid-protocol)
    (map-set excavation-sites site-id
      {
        location: location,
        institution: institution,
        protocol-type: protocol-type,
        start-date: block-height,
        estimated-duration: estimated-duration,
        quantum-method: quantum-method,
        status: "active",
        findings-count: u0
      })
    (map-set site-permissions site-id
      {
        authorized-institution: institution,
        permission-level: u5,
        granted-date: block-height,
        expires-at: (+ block-height estimated-duration),
        quantum-access: true
      })
    (var-set next-site-id (+ site-id u1))
    (ok site-id)))

(define-public (update-excavation-status (site-id uint) (new-status (string-ascii 20)))
  (let ((site-data (unwrap! (map-get? excavation-sites site-id) err-excavation-not-found)))
    (asserts! (is-eq tx-sender (get institution site-data)) err-not-verified)
    (map-set excavation-sites site-id
      (merge site-data { status: new-status }))
    (ok true)))

(define-public (record-finding (site-id uint))
  (let ((site-data (unwrap! (map-get? excavation-sites site-id) err-excavation-not-found)))
    (asserts! (is-eq tx-sender (get institution site-data)) err-not-verified)
    (map-set excavation-sites site-id
      (merge site-data { findings-count: (+ (get findings-count site-data) u1) }))
    (ok true)))

;; Read-only functions
(define-read-only (get-excavation-site (site-id uint))
  (map-get? excavation-sites site-id))

(define-read-only (get-site-permissions (site-id uint))
  (map-get? site-permissions site-id))

(define-read-only (get-next-site-id)
  (var-get next-site-id))
