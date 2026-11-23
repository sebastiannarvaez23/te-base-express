# Plan de portabilidad — plataforma de usuarios

Checklist para reconstruir la base en otro framework (Nest, Spring, FastAPI, Express, etc.).

**Alcance actual: usuarios, no empresas.** Hay una sola base y un solo conjunto de usuarios. No hay tenant, no hay schema por cliente, no hay `company_id` y no hay alta de compañías. Un admin de plataforma no es un usuario del producto; eso es lo único que separa las dos sesiones.

`te-base-djbtob` y `te-base-djctoc` sí son productos de empresas (schema por compañía, o compañía leída del usuario). Esa bifurcación no se porta ahora. Si más adelante el producto pasa a ser de empresas, se elige una de las dos y no se mezclan. Hasta entonces los apartados marcados **Más adelante** no se implementan.

**No se porta.** PostgreSQL (`wadb` OLTP + `wadw` analítica), Redis (caché, locks, anillo de incidencias, logs en vivo, broker), Celery/RedBeat o el worker equivalente, almacenamiento de objetos (MinIO), SMTP/Resend, el runtime de inferencia (proceso aparte) y los hosts `app.base.local` / `admin.base.local`.

Cada ítem se marca cuando el framework nuevo cumple el contrato, no cuando “existe una tabla parecida”.

Criterio de paridad de lo que sí se porta ahora: mismas rutas bajo `/api/v1/`, mismas cookies, mismo sobre de respuesta, mismos códigos de error del backend, mismas máquinas de estado de usuario y de sesión. Este plan no cubre pantallas ni los códigos que el cliente muestre por su cuenta.

---

## 0. Contratos transversales

- [x] Prefijo HTTP `/api/v1/`. OpenAPI publicado (swagger + redoc).
- [x] Sobre de éxito: `{ status_code, message, resolved_at, data }`.
- [x] Sobre de error 400: `errors[{ field, code, detail }]`. Nunca un 500 por input inválido.
- [x] Catálogo único de errores del backend: código estable (`AUTH_001`, `USER_001`, `VAL_001`), `http_status`, `message` y `detail` en inglés, texto de operador en español en el mismo registro. Dos causas distintas, dos códigos. El mensaje dice qué no se puede hacer y qué revisar; no UUID, no ORM, no “does not exist”. Los prefijos de empresa y de cobro (`COMP_`, `SUB_`, …) no entran hasta que exista ese producto.
- [x] Validación de entrada en el borde: body, query, path. Tipos, largo máximo, choices/pattern, UUID, email. Rechazar campos desconocidos. Listas, decimales y objetos anidados declarados. Nada de leer el body crudo salvo las excepciones de abajo.
- [x] Excepciones de body: webhook con firma, multipart (el archivo se valida en la vista; el resto del form sí va tipado), POST/PATCH sin body (toggle, logout, confirm, sync).
- [x] Salida: contrato tipado serializado a JSON. Sin capa de serializers paralela.
- [x] Header `X-Request-ID` en cada request. `X-Auth-Context: admin|client` cuando las dos sesiones conviven.
- [x] Cookies (dominio `.base.local`, SameSite Lax): `access_client`, `refresh_client`, `device_client`, `access_admin`, `refresh_admin`.
- [x] JWT de acceso con `user_id`, `user_type` (`client`|`admin`), `sid`, `access_mode`, `username`. `schema_name`, si viaja, queda en `public` y no elige tenant ni empresa.
- [x] Refresh opaco, rotación en cada uso, revocación, TTL distinto si “recordarme”. El refresh silencioso no cuenta como actividad.
- [x] PKs UUID. Borrado de FK que no cascadea en datos de negocio (auditoría). Transacción atómica cuando cambia estado que debe quedar consistente. Cada cambio de ese estado deja rastro.
- [x] Un admin de plataforma no es un usuario del producto, y un usuario del producto no entra al admin. No hay filtro por empresa.
- [x] Logs de aplicación nunca rompen el request (best-effort, try/except).
- [x] Redacción de secretos y PII en logs y en prompts.
- [x] Jerarquía de código: mundo (`client` | `platform` | `handbook`) → feature extraíble → familia → entidad. La arquitectura por capas vive solo en la entidad. Un caso de uso = un `execute`. El dominio no importa infraestructura.

---

## 1. Identidad y sesión

### Usuario del producto

- [ ] Usuario: email, username, activo, rol, `email_verified_at`, perfil (nombre, documento, fecha de nacimiento). Sin empresa.
- [ ] Login con contraseña. Si el correo no está verificado → `AUTH_007`.
- [ ] Confirmación de email por token de un solo uso. Reenvío.
- [ ] Alta de otro usuario con enlace de activación y set de contraseña.
- [ ] Recuperación de contraseña (token, política de clave).
- [ ] 2FA por email OTP solo si el parámetro lo enciende y el device serial es desconocido. OTP 6 dígitos, TTL 5 min, 5 intentos, solo se persiste HMAC. El serial va atado al user id.
- [ ] Challenge: emitir, rotar (no reinicia intentos), recordar “recordarme”, verificar, rechazar OTP malo, IP distinta, usuario inactivo, challenge vencido o desconocido.
- [ ] Device de confianza (`device_client`). Revocar device.
- [ ] IP: ignorar `X-Forwarded-For` salvo flag de confianza. Geo headers igual.
- [ ] Sesiones activas listables y revocables. `sid` en Redis; si no existe la sesión, el access token no vale.
- [ ] Logout limpia cookies. Refresh 401 limpia cookies.
- [ ] El rol administrador del producto recibe los permisos activos. El resto solo los que se le asignen.
- [ ] Permisos de rol: módulos y funcionalidades, activar/desactivar cada uno.
- [ ] Historial de accesos y auditoría de cambios de usuarios.
- [ ] Preferencias de usuario: tema, idioma, zona horaria, formato de fecha.
- [ ] Perfil y foto en el bucket de objetos (bucket `base`).

### Plataforma (equipo de la base)

- [x] `AdminUser` distinto de `User`. Login, refresh, logout, cookies admin.
- [ ] CRUD de admins. Comando para crear el primer admin.
- [ ] Roles admin, módulos admin, secciones, funcionalidades admin.
- [ ] Sesiones admin listables y revocables.
- [ ] Perfil admin y su bucket de objetos.
- [ ] Parámetros de seguridad del admin, distintos de los del usuario del producto.
- [x] El admin de plataforma no depende de un `Domain` ni de una empresa.

### Apps que se conectan a la plataforma

- [ ] Principal de integración (no es un usuario): JWT propio, `client_id`, no llena `user_id` de auditoría.
- [ ] OAuth de conexiones (autorización de conectores).

---

## 2. Autorización

El gate actual es el rol del usuario. No hay licencia de empresa, ni cupo por compañía, ni “miembro de la empresa”. Las claves de suscripción, cobro y configuración de compañía quedan en **Más adelante**.

Permisos de usuario que sí se portan:

- [ ] `users_roles.*` — crear/editar/desactivar usuarios, crear/editar roles, asignar roles, permisos por módulo y por funcionalidad, historial, 2FA, recuperación, política de clave, sesiones, auditoría de cambios.
- [ ] `security.users.view|create|edit|toggle-active`
- [ ] `security.permissions.view|create-role|toggle-role|edit-role|save|view-features|toggle-module|toggle-feature`
- [ ] `integrations.erp-integration|webhooks|integration-logs|data-mapping|oauth`
- [ ] `audit.event-logging|advanced-filters|log-export|critical-alerts|entity-change-history|user-traceability|access-audit|config-change-audit|configurable-retention|audit-reports`
- [ ] `settings.profile.view|edit`, `settings.preferences.view|change-theme|change-language|change-timezone|change-date-format`
- [ ] `assistant.chat`
- [ ] Sync del registry → tablas de módulo + funcionalidad. Lo que ya no está en el registry se desactiva, no se borra.
- [ ] El rol administrador recibe los permisos activos; los demás roles solo si se les asigna.
- [ ] Gate por request: usuario autenticado + permiso del rol.
- [ ] Feature flags con scope de usuario. Evaluación best-effort. País, ciudad y empresa quedan para más adelante.

Códigos de este bloque: `PERM_*`, `ROLE_*`, `SESSION_*`, `USER_*`, filtros de módulo, grants, `SECTION_*`, `MODULE_*`, `FUNC_*`.

---

## Más adelante: empresas

No implementar mientras la plataforma sea de usuarios. Cubre compañía, schema por tenant, onboarding de una empresa, suscripción, cobro, factura y todo lo que aísla datos por `company_id`.

## 3. Empresa y alta

- [ ] `Company`: nombre, NIT único si viene informado, dirección, ciudad, etiqueta `schema_name` única, lifecycle.
- [ ] `Domain`: host, `is_primary`, pertenece a una empresa.
- [ ] Lifecycle: `ACTIVE` → `CLOSED` → `PENDING_PURGE` → `GONE`.
- [ ] Cierre: motivo, admin que cierra, `purge_after`, legal hold + motivo. Con legal hold no se purga.
- [ ] Exportación atestiguada (quién, cuándo, object key) antes de purgar.
- [ ] Purga: tumba usuarios, desengancha filas fiscales (conserva NIT y nombre en la factura/cargo), ancla `ClosedTenantRecord`, marca `GONE`, limpia satélites de auth.
- [ ] En `djbtob` la purga además tira el schema. En `djctoc` no hay schema que tirar.
- [ ] No se cierra ni se purga la fila etiqueta `public`.
- [ ] Onboarding en 5 pasos, en este orden: `company` → `admin_user` → `subscription` → `payment` → `confirmation`.
- [ ] Estados del registro: `in_progress`, `completed`, `expired`, `failed_provisioning`.
- [ ] Finalize crea empresa, dominio, suscripción y usuario admin, y manda el correo de confirmación. Login bloqueado hasta confirmar.
- [ ] Bono opcional en el finalize. Sin bono, cero redenciones.
- [ ] Purga diaria de registros `in_progress` abandonados, `failed_provisioning` viejos y tokens de confirmación ya usados.
- [ ] Purga diaria de empresas cuyo único usuario nunca confirmó el correo, creadas hace más de 7 días, sin cobro capturado ni factura pagada.
- [ ] Parámetros de cierre de empresa (gracia, etc.) como parámetros de plataforma, no hardcode.
- [ ] Registro de la empresa como cliente facturable hacia Neurana.

Códigos: `COMP_*` (incluye dominio que no corresponde), `ONB_*`.

---

## 4. Billing

### Plan y periodo

- [ ] Plan (`Subscription`): precio, activo, descuento anual, módulos y funcionalidades que habilita, límites, complementos.
- [ ] Periodo por empresa (`CompanySubscription`): `active | cancelled | expired | suspended`. Un periodo activo por empresa.
- [ ] Intervalo, `auto_renew`, vigencia, plan pendiente (downgrade programado) + intervalo pendiente.
- [ ] Upgrade inmediato (cobra y abre periodo). Cancel. Reactivar. Reintentar pago suspendido.
- [ ] Downgrade: se agenda; el job diario lo materializa al vencer la vigencia (cobra el plan menor, periodo nuevo +30 días).
- [ ] Renovación diaria: vigencia vencida, sin cambio pendiente, `auto_renew` on → mismo plan, +30 días.
- [ ] Si `auto_renew` está off y no hay cambio pendiente, el periodo pasa a `expired`.
- [ ] Cambio de status administrativo.
- [ ] Catálogo público de planes (sin auth) para el onboarding.
- [ ] Cache de suscripción por empresa. Si Redis cae, se consulta la base.

### Cobro

- [ ] Método de pago: `card | bank_transfer | pse`. Alta, edición, activar, borrar. Token del gateway, nunca el PAN.
- [ ] Cargo. Estados: `pending → processing → requires_action | authorized → captured`, y `failed | canceled | refunded | partially_refunded | disputed`.
- [ ] Terminales: `failed`, `canceled`, `refunded`. Exitosos: `captured`, `authorized`, `partially_refunded`.
- [ ] Proveedor de gateway intercambiable. El adapter traduce nombres externos a este enum. Next action para 3DS/PSE.
- [ ] Webhook del gateway con firma y cuerpo crudo. Idempotencia por evento.
- [ ] Intentos de cobro (operación + resultado) como bitácora.

### Factura y fiscal

- [ ] Factura ligada a la empresa. Al purgar la empresa se conserva NIT y nombre y se suelta el FK.
- [ ] Emisión automática al capturar un pago, con snapshot de la promoción.
- [ ] Outbox fiscal hacia Neurana: lease con skip-locked, backoff, relay cada ~30 s, salud cada 5 min, reconciliación diaria de pendientes.
- [ ] Webhook de vuelta del ecosistema (documento aceptado/rechazado).
- [ ] Modo local: la reconciliación no llama a la red.

### Reembolso

- [ ] Ticket con número único. Kind: `full | difference`.
- [ ] Estados: `pending → accepted → processing → completed | failed`, o `rejected`.
- [ ] El payout y el cambio de plan corren solo después de la aprobación admin.
- [ ] Aviso a la campanita de la empresa.

### Promociones

- [ ] Voucher: `ACTIVE → REDEEMED | EXPIRED`. Ventana de redención. Alcance `OPEN` o `COMPANY` (si es COMPANY, la empresa es obligatoria; si es OPEN, no lleva empresa).
- [ ] Meses de beneficio entre 1 y 36.
- [ ] Redención en el alta y sobre una suscripción viva.
- [ ] Job diario: vencer vouchers. Job siguiente: revertir regalos cuyo `benefit_end` pasó (volver al plan anterior si quedó anotado).
- [ ] Plantillas de correo del bono y de la factura.

Códigos: `SUB_*`, `LIMIT_*`, `INVOICE_*`, `PAY_*`, `REFUND_*`, `PROMO_*`, `COMPLEMENT_*`, `FIS_*`.

---

## Sigue el alcance: usuarios

De aquí en adelante el destinatario es un usuario o el admin de plataforma. Donde el texto viejo decía “empresa”, se lee “usuario” salvo que el ítem esté en los apartados 3 y 4.

## 5. Comunicación

- [ ] Correo: puertos `smtp | resend | fake`, fallback si el primario falla, headers de marca (`Base <noreply@base.local>`).
- [ ] Plantillas versionadas. Remitente por defecto.
- [ ] Campanita del usuario: lista, archivar, compartir un recurso con otros usuarios.
- [ ] Campanita admin (outbox): alcance `SINGLE_USER | ALL_USERS`. Se entrega en la misma base.
- [ ] Kinds: directo o broadcast. Nivel INFO/SUCCESS/…
- [ ] Bienvenida al activar la cuenta.
- [ ] WS `ws/client/inbox/` y `ws/platform/inbox/`. Cookie JWT en el handshake.
- [ ] Catálogo de recursos compartibles. Vacío hasta que el producto registre tipos. Sync de ese catálogo.

Códigos: `EMAIL_*`, `DOC_*` (plantillas de documento), `NOTIF_*`.

---

## 6. Catálogos de plataforma

- [ ] Parámetros del producto: tipo + parámetro. Juego mínimo de seguridad (2FA, política de clave, confirmación de email).
- [ ] Parámetros de admin: tipo + parámetro. Juego mínimo de seguridad admin.
- [ ] Geografía: país, departamento, ciudad. Endpoints de solo lectura y CRUD admin.
- [ ] Moneda y país de moneda. Sync de catálogo.
- [ ] Políticas legales. Aceptación por usuario. Lectura pública de la vigente.
- [ ] Plantillas de documento (la de producto, no el correo).
- [ ] Flags de release (además de los scopes del apartado 2).

Códigos: `PARAM_*`, `ADM_PARAM_*`, `FLAG_*`, `GEO_*`, `POLICY_*`.

---

## 7. Integraciones

- [ ] Catálogo global de conectores. El template trae el fake y el webhook de entrada. El producto registra los demás (ERP, etc.).
- [ ] Conexión del producto: key, nombre, ambiente `PROSANDBOX | CLIENT_TEST | CLIENT_PROD`, config, estado `ACTIVE | PAUSED | DEGRADED | ERROR`, cron, último error.
- [ ] Secreto cifrado (`INTEGRATIONS_SECRET_KEY`). Nunca en logs.
- [ ] Mapeo de campos por conexión.
- [ ] Puerto: `pull_entities`, `push_entities`, test de conexión. Idempotencia. Circuit breaker: un conector caído no tumba el producto.
- [ ] Conflictos: gana el sistema local en `status` y `quantity`.
- [ ] Salud agregada para soporte: cuántas conexiones activas, degradadas, en error, y el detalle de las dañadas.
- [ ] Logs de integración consultables (`integrations.integration-logs`).

Códigos: `INT_*`.

---

## 8. Asistente e IA

- [ ] Chat por usuario: conversación, mensaje, tool call, agent run. Feature `assistant.chat`.
- [ ] WS `ws/assistant/`: el turno corre en un hilo, la cola empuja `thinking → tool → typing → token → done | error`.
- [ ] Credenciales BYOK cifradas por usuario. HITL: la tool peligrosa espera aprobación humana.
- [ ] Cancelación de un run en curso.
- [ ] Registry de tools **vacío** en la base. El producto registra las suyas. Una tool desconocida es `AI_UNKNOWN_TOOL`.
- [ ] Política de runtime, estado on/off, kill switches `AI_ENABLED` / `OR_ENABLED` / `ML_ENABLED`.
- [ ] Proveedor `fake` por defecto (tests y clone sin modelo). Camino real: proceso SLM local. Anthropic es opcional.
- [ ] Toda llamada es best-effort: si el runtime cae, el producto sigue y se devuelve el fallback.
- [ ] No mezclar usuarios en un prompt. Redactar antes de enviar.
- [ ] Usage: tokens, modelo, proveedor, latencia, usuario. Logger `app.ai`.
- [ ] Ajustes admin del asistente (tools habilitadas = ninguna hasta que haya catálogo).
- [ ] Enrutamiento de modelos, capacidades on/off, evals, observación de runs recientes.
- [ ] Uso 24 h (mensajes, conversaciones, errores) para el panel admin.
- [ ] Comando de evals.

Códigos: `AI_*`.

---

## 9. Logging

- [ ] Cuatro tipos configurables: `audit`, `operations`, `integration`, `security`.
- [ ] Audit log: entidad, id, acción, descripción, cambios, actor. Un principal de integración no ocupa `user_id`.
- [ ] Security log: tipo de evento, usuario destino, recurso, detalle.
- [ ] Operaciones: el modelo histórico se sigue llamando `WarehouseEvent`. No renombrarlo al portar si el DW lo lee.
- [ ] Integration log.
- [ ] Retención por tipo, job/comando propio.
- [ ] La escritura va en savepoint propio: un fallo de log no revierte el caso de uso.

---

## 10. Soporte

### Incidencias

- [ ] Un 500 de un usuario puede volverse incidencia. El middleware guarda las últimas 10 transacciones de la sesión en Redis (`sess_txns:<sid>`).
- [ ] El 500 congela snapshot (10 previas + la fallida + stack) bajo un token opaco con TTL y añade `error.incident = { token, report_url }`.
- [ ] `POST /api/v1/incidents/report/` (JWT cliente) materializa la incidencia, idempotente por token, y avisa al admin en best-effort.
- [ ] Alta manual de una incidencia.
- [ ] Estados: `open → in_progress → resolved | closed | discarded`.
- [ ] Adjuntos en el object storage. Purga de terminales por retención (días configurables) borra también los objetos.
- [ ] Redis caído no rompe el request. Buffers acotados. El snapshot es PII de admins.
- [ ] Admin: listar, filtrar, cambiar estado, comentar.

### Tareas

- [ ] Cada task deja run + steps. Compensaciones LIFO si falla.
- [ ] Monitor admin + WS `ws/platform/task-monitor/`.
- [ ] Incidente también cuando una task falla (mismo sistema de incidencias).

### Logs en vivo

- [ ] Handler que empuja al anillo Redis. WS `ws/platform/live-logs/` solo admin.

### Chat de soporte

- [ ] Sesión: `QUEUED → ACTIVE → AWAITING_RATING → CLOSED`, o `CANCELLED`.
- [ ] Emisor `CLIENT | AGENT`. Mensajes. Rating al cerrar.
- [ ] Timeout de cola y TTL de rating. Job cada 60 s.
- [ ] WS cliente `ws/support/sessions/` y WS admin `ws/platform/support/sessions/`.
- [ ] Ajustes: minutos de espera, TTL de rating.

Códigos: `INC_*`, `TASK_*`, `SUP_*`.

---

## 11. Handbook (documentación de la plataforma)

- [ ] Audiencias: `public`, `admin`, `wms` (audiencia de producto; el nombre quedó así).
- [ ] Una página es visible si la audiencia coincide y, cuando lleva `feature_key`, el viewer tiene esa feature.
- [ ] Árbol, página, CRUD de catálogo.
- [ ] Change request de una página (gobierno).
- [ ] Ingesta.
- [ ] Auth dual: el mismo árbol acepta cookie admin o cookie cliente. Sin contexto, gana la sesión admin.
- [ ] Features de admin propias del handbook (comando que las asegura).

Códigos: `HB_*`.

---

## 12. Analítica (`wadw`, no la base OLTP)

- [ ] Alias `analytics` con Postgres normal. El router manda solo las apps de control a `wadw` y niega las apps OLTP ahí.
- [ ] Migrar ese alias con un comando aparte (`migrate_analytics`), no con el migrate de la OLTP.
- [ ] Schemas internos del DW: `ctl`, `stg`, `dw` (son del warehouse, no de las empresas).
- [ ] Dimensión fecha cargable por rango.
- [ ] Dimensión de usuario, sync desde OLTP. La dimensión de empresa queda en los apartados 3 y 4.
- [ ] El ETL no es parte de este checklist más allá del control plane ya existente: lock, skip si hay otro corriendo, extraer de OLTP.

---

## 13. Tiempo real y tareas

Handshake WS, en este orden: cookie → JWT (admin o usuario) → consumer. No hay etiqueta de empresa.

- [ ] `ws/client/inbox/`
- [ ] `ws/platform/inbox/`
- [ ] `ws/assistant/`
- [ ] `ws/platform/task-monitor/`
- [ ] `ws/platform/live-logs/`
- [ ] `ws/support/sessions/`
- [ ] `ws/platform/support/sessions/`

Beat (UTC, con `expires` para no reventar tras una caída):

Los jobs de onboarding, purga de empresas, downgrade, renovación, bonos y el outbox fiscal pertenecen a los apartados 3 y 4. En la plataforma de usuarios el beat conserva:

- [ ] cada 60 s sesiones de soporte estancadas

Utilidades de task que hay que conservar: lock distribuido, reintento con expires, traza de steps, compensación, reporte de incidencia si la task muere. El mensaje de la task no lleva empresa ni cambia de base.

---

## 14. Superficie HTTP (prefijos bajo `/api/v1/`)

Usuario

- [ ] `auth/`
- [ ] `users/` `roles/`
- [ ] `client/inbox/`
- [ ] conexiones, mapeos, oauth, logs de integración
- [ ] assistant chat + credentials + status
- [ ] logs (audit, ops, security, config)

`company-roles/`, `company-features/`, `onboarding/` e identidad de empresa quedan en los apartados 3 y 4.

Plataforma

- [ ] `platform/auth/` `platform/roles/` `platform/admin-catalog/` `platform/users/` `platform/identity/` `platform/sessions/` `platform/sections/` `platform/modules/` `platform/functionalities/`
- [ ] usuarios vistos desde admin.

`companies/`, `billing/`, `ecosystem/webhooks/`, `platform/promotions/` y `subscriptions/` público quedan en los apartados 3 y 4.
- [ ] `platform/email-senders/` `platform/email-templates/`
- [ ] `platform/policies/` y `policies/` (lectura del usuario)
- [ ] `platform/locations/` `locations/` (público) `platform/currencies/` `platform/countries/`
- [ ] `platform/document-templates/`
- [ ] `platform/parameter-types/` `platform/parameters/` + el par admin
- [ ] `platform/assistant-settings/` `platform/ai/model-routing/` `platform/ai/capabilities/` `platform/ai/runs/` `platform/ai/evals/`
- [ ] `platform/feature-flags/`
- [ ] `platform/integrations/catalog/` `platform/integrations/health/`
- [ ] `platform/incidents/` `platform/task-monitor/` `platform/live-logs/` `platform/support/sessions/`
- [ ] `docs/` handbook

---

## 15. Códigos de error que el catálogo ya tiene

Hay que seguir emitiendo la misma clave, el mismo HTTP y el mismo texto. Dominios:

- [ ] Auth y sesión (`AUTH_*`)
- [ ] Permisos, roles, usuarios, módulos, secciones, funcionalidades, filtros, grants
- [ ] Empresa, onboarding, suscripción, límites, complementos, facturas, pagos, reembolsos, promos y fiscal: apartados 3 y 4, no ahora.
- [ ] Correo, documentos, notificaciones
- [ ] Parámetros, parámetros admin, flags
- [ ] Geografía
- [ ] Políticas
- [ ] Storage, incidencias, task monitor, soporte, IA, firma, integraciones
- [ ] Handbook
- [ ] Validación genérica, rate limit, HTTP, error de servidor

Al añadir un código: inglés en `message` y `detail`, español en el texto de operador del mismo registro. No se genera un catálogo para pantallas.

---

## 16. Operación que el producto ya espera

Comandos (o jobs equivalentes). No siembran datos de negocio en migraciones; un ensure solo crea infraestructura o filas de catálogo que el propio comando posee.

- [ ] sync de features, de códigos de módulo y de recursos compartibles
- [ ] sync de monedas y de dim fecha. La dim de empresa queda en los apartados 3 y 4.
- [ ] ensure: storage de perfiles (usuario y admin), remitente de correo, parámetros de seguridad (usuario y admin), features admin del handbook
- [ ] purgas: incidencias, retención de logs, sesiones de soporte. Onboarding, empresas y grants quedan en los apartados 3 y 4.
- [ ] vencer bonos, reparar plantilla de baja, seed del catálogo de conectores y de plantillas de promo (catálogo del producto, no filas de clientes)
- [ ] crear admin de plataforma, generar llave de producto Neurana, evals de IA
- [ ] migrar OLTP y, aparte, migrar `wadw`

Reglas que no cambian con el framework:

- [ ] Migraciones solo tocan esquema. Un backfill solo si una columna nueva `NOT NULL` se puede llenar desde otra columna de la misma fila.
- [ ] Cupos, permisos y features se consultan; no se inventa un rol paralelo.
- [ ] Firma de webhooks y de documentos (`SIGN_*`) antes de fiarse del body.

---

## 17. Orden sugerido al portar

Ahora, plataforma de usuarios:

1. [x] Contratos del apartado 0 (sobre, errores, cookies, validación).
2. [ ] Identidad de usuario + admin de plataforma y el gate por rol.
3. [ ] Correo de cuenta (confirmación, recuperación, bienvenida).
4. [ ] Catálogos que no dependen de una empresa (geo, parámetros de usuario y de admin, políticas, flags de usuario).
5. [ ] Logging y retención.
6. [ ] Incidencias, tasks, logs en vivo, chat de soporte, siempre de un usuario.
7. [ ] Asistente por usuario (fake primero, SLM después).
8. [ ] Handbook.

Más adelante, solo si el producto pasa a ser de empresas: compañía, onboarding, suscripción, factura, fiscal, reembolso y promo. Ahí se elige una bifurcación, schema por empresa o una sola base con la empresa en el usuario, y no se mezclan las dos en el mismo servicio.
