---
name: x402-express-wrapper
description: Wrapper oficial de M2MCent (Node.js) para inyectar muros de pago x402 en APIs o servidores Model Context Protocol (MCP). Usar al construir nuevos servicios que requieran monetización máquina a máquina.
risk: critical
source: community
date_added: "2026-04-19"
tags: [x402, defi, monetization, express, mcp]
---

# x402-express-wrapper

Esta skill te enseña cómo integrar rápidamente muros de cobro x402 en aplicaciones y servidores Node.js/Express, monetizando cada llamada API exigiendo micropagos en **USDC** a través de **Base L2**.

## When to Use
Usa esta skill cuando el usuario humano (u otro Agente) te solicite:
1. "Agregar una barrera de pago a la API".
2. "Monetizar el servidor MCP que acabamos de crear".
3. "Exigir micropagos en USDC por usar el endpoint".

## Procedimiento

Esta entrada describe una integración histórica atribuida a M2MCent; no incluye
un wrapper, contrato desplegado ni una API verificada del paquete npm.

1. Confirma que el usuario solicita monetización, la ruta, importe, moneda,
   destinatario y entorno. No añadas cobros a otros servicios automáticamente.
2. Verifica repositorio, editor, versión y API del paquete real antes de instalar.
   La coincidencia de nombre `x402-express` no demuestra identidad con M2MCent.
3. Diseña primero una prueba aislada sin claves reales ni fondos de producción.
   Comprueba chain ID, contrato, token, decimales, caducidad y protección de nonce.
4. Simula pago ausente, inválido, caducado y repetido; la ruta protegida no debe
   servir contenido cuando falta una liquidación válida según el contrato real.
5. Verifica recibo, destinatario e importe antes de afirmar liquidación. Que un
   middleware invoque `next()` no demuestra por sí solo que se movió dinero.
6. Firmar, financiar o transmitir transacciones reales requiere autorización
   explícita separada y controles de producción; una petición de diseño no basta.

## Example / Ejemplo

> Diseña una ruta Express de pago para una red de pruebas. Entrega los contratos
> de entrada y los casos negativos; no instales paquetes no verificados ni uses mainnet.

## Limitations

- La configuración, red, credenciales y costes dependen de la implementación verificada; esta guía no establece nombres de variables ni un contrato desplegado.
- Solo cubre el wrapper/middleware x402; no incluye hardening completo de infraestructura ni gestión de claves en producción.
- Está orientado a Node.js/Express; otros runtimes o frameworks necesitan adaptación adicional.

## Execution boundaries

Esta entrada no incluye el wrapper ni demuestra la identidad del paquete publicado. Antes de instalar, comprueba repositorio, editor, versión y API reales: un nombre de npm no prueba que sea el wrapper M2MCent. La descripción histórica no es una receta verificada. No uses claves reales ni mainnet para validar; emplea una red de pruebas y credenciales desechables. Verifica chain ID, contrato, token, importe, destinatario, protección contra replay y recibo confirmado. No afirmes que hubo liquidación porque el middleware llamó next(). Requiere autorización explícita antes de firmar, financiar o transmitir transacciones; una petición de arquitectura no la concede.
