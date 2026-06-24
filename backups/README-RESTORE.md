# Restauración de Base de Datos - FarmaPos

Este directorio contiene los respaldos de la base de datos de FarmaPos en formato SQL plano.

## Instrucciones para Restaurar

Para restaurar un archivo de respaldo en tu base de datos (por ejemplo, Neon PostgreSQL), ejecuta el siguiente comando utilizando `psql` (la herramienta interactiva de terminal de PostgreSQL):

```bash
# Formato general:
psql -d "TU_DATABASE_URL" -f "backups/backup_YYYY-MM-DD_HH-mm.sql"

# Ejemplo con la base de datos actual:
psql -d "postgresql://neondb_owner:npg_hvC8ztIM0Wwc@ep-restless-bonus-ap2ksomq-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" -f "backups/backup_2026-06-23_23-40.sql"
```

> [!IMPORTANT]
> El script de respaldo incluye sentencias `DROP TABLE IF EXISTS` (`--clean`) para cada tabla, por lo que al restaurar, las tablas actuales serán eliminadas y recreadas con los datos del respaldo. Asegúrate de respaldar antes de realizar cualquier cambio manual.

> [!WARNING]
> La restauración sobrescribirá completamente los datos actuales en el servidor de base de datos de destino.
