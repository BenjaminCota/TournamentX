# Módulos de API

Cada módulo nuevo debe encapsular sus rutas, controladores, servicios, validadores y pruebas. Eviten importar directamente archivos internos de otro módulo; compartan contratos mediante el router principal o servicios públicos documentados.

Las carpetas corresponden a los ocho dominios definidos en `docs/MODULE_OWNERSHIP.md`. El código actual de premios se mantiene temporalmente en la estructura por capas existente para conservar compatibilidad mientras los demás módulos definen sus contratos.
